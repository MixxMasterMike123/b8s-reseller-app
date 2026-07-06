// Content Studio callable 2 — renderSocialVideo.
//
// Assembles a vertical (1080×1920) beat-cut social clip from the shop's own
// uploaded images and/or video clips, synced to a chosen BPM, over an audio
// track. PURE COMPUTE: it renders an mp4, uploads it to Storage and returns the
// download URL — the CLIENT persists { path, url, durationSec } onto the
// socialPosts.video field (the write path is client-side per the add-on
// contract). This function never writes Firestore.
//
// Rendering is done by the ffmpeg-static binary via child_process (NOT
// fluent-ffmpeg): one ffmpeg invocation with one input per beat-segment, each
// scaled/cropped to 1080×1920 then concatenated, with the audio trimmed +
// faded. ffprobe-static probes video durations so a clip's segments advance
// through it instead of always replaying its first seconds.

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getStorage } from 'firebase-admin/storage';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { appUrls } from '../config/app-urls';
import { requireContentStudio, isShopMediaPath } from './gate';

const COMMON = {
  region: 'us-central1' as const,
  memory: '2GiB' as const,
  timeoutSeconds: 540,
  cors: appUrls.CORS_ORIGINS,
  // 2 GiB instances are expensive — cap concurrency so an enthusiastic admin
  // (or a bug) can't fan out a fleet of renderers.
  maxInstances: 3,
};

// Limits. /tmp on Cloud Functions is memory-backed and counts against the
// 2 GiB, so cap both per-file and aggregate download size.
const MAX_ASSETS = 12;
const MAX_FILE_BYTES = 80 * 1024 * 1024; // 80 MB per file
const MAX_TOTAL_BYTES = 300 * 1024 * 1024; // 300 MB total

interface RenderRequest {
  shopId: string;
  assetPaths: string[];
  audioPath?: string;
  targetSec?: number;
  bpm?: number;
}

type AssetKind = 'image' | 'video';

interface LocalAsset {
  path: string; // storage path
  file: string; // local temp path
  kind: AssetKind;
  duration: number; // seconds (videos only; 0 for images)
  offset: number; // advancing playhead for video reuse (seconds)
}

// Surface ffmpeg/ffprobe/Storage failures as readable Swedish HttpsErrors
// instead of a bare INTERNAL. Auth/validation HttpsErrors pass through.
function toHttpsError(e: any): HttpsError {
  if (e instanceof HttpsError) return e;
  const msg = e?.message || 'Okänt fel vid videoproduktion';
  return new HttpsError('internal', `Videoproduktion: ${msg}`);
}

// Run a binary, resolving with a stderr tail on failure so errors are useful.
function run(bin: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args);
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      // Keep only the tail so a long ffmpeg log doesn't grow unbounded.
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) return resolve(stderr);
      const tail = stderr.slice(-300).trim();
      reject(new Error(tail || `avslutades med kod ${code}`));
    });
  });
}

// ffprobe a video's duration in seconds (float). Throws readable on failure.
async function probeDuration(file: string): Promise<number> {
  const out = await new Promise<string>((resolve, reject) => {
    const child = spawn(ffprobeStatic.path, [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      file,
    ]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => (stdout += c.toString()));
    child.stderr.on('data', (c) => (stderr += c.toString()));
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) return resolve(stdout);
      reject(new Error(stderr.slice(-300).trim() || `ffprobe kod ${code}`));
    });
  });
  const dur = parseFloat(out.trim());
  if (!Number.isFinite(dur) || dur <= 0) {
    throw new HttpsError('invalid-argument', 'Ett videoklipp saknar giltig längd.');
  }
  return dur;
}

// True if the file has at least one audio stream. A muted phone clip is common;
// mapping [n:a] on such a file makes ffmpeg abort, so probe before building the
// graph and fail (or pick another source) with a readable message instead.
async function hasAudioStream(file: string): Promise<boolean> {
  const out = await new Promise<string>((resolve, reject) => {
    const child = spawn(ffprobeStatic.path, [
      '-v', 'error',
      '-select_streams', 'a',
      '-show_entries', 'stream=index',
      '-of', 'csv=p=0',
      file,
    ]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => (stdout += c.toString()));
    child.stderr.on('data', (c) => (stderr += c.toString()));
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) return resolve(stdout);
      reject(new Error(stderr.slice(-300).trim() || `ffprobe kod ${code}`));
    });
  });
  return out.trim().length > 0;
}

export const renderSocialVideo = onCall<RenderRequest>(COMMON, async (request) => {
  const d = request.data || ({} as RenderRequest);

  // Auth + opt-in feature gate (loads the shop doc once).
  const { shopId } = await requireContentStudio(d.shopId, request.auth?.uid);

  // ── Input validation (readable Swedish errors) ──────────────────────────
  // Sources may come from the persistent library OR the disposable
  // quick-upload area — isShopMediaPath enforces tenant isolation for both.
  const assetPaths = Array.isArray(d.assetPaths)
    ? d.assetPaths.map((p) => String(p).trim()).filter(Boolean)
    : [];
  if (assetPaths.length < 1 || assetPaths.length > MAX_ASSETS) {
    throw new HttpsError(
      'invalid-argument',
      `Välj mellan 1 och ${MAX_ASSETS} bilder/klipp.`
    );
  }
  for (const p of assetPaths) {
    if (!isShopMediaPath(shopId, p)) {
      throw new HttpsError(
        'permission-denied',
        `Filen "${p}" ligger utanför butikens mapp.`
      );
    }
  }

  const audioPath = (d.audioPath || '').trim();
  if (audioPath && !isShopMediaPath(shopId, audioPath)) {
    throw new HttpsError(
      'permission-denied',
      `Ljudfilen "${audioPath}" ligger utanför butikens mapp.`
    );
  }

  const targetSec = d.targetSec;
  if (targetSec !== 15 && targetSec !== 30) {
    throw new HttpsError('invalid-argument', 'Längden måste vara 15 eller 30 sekunder.');
  }

  const bpm = d.bpm === undefined ? 135 : d.bpm;
  if (!Number.isInteger(bpm) || bpm < 60 || bpm > 200) {
    throw new HttpsError('invalid-argument', 'BPM måste vara ett heltal mellan 60 och 200.');
  }

  // ffmpeg-static downloads its binary at npm-install time (it is NOT in the
  // published tarball, unlike ffprobe-static) — if that download failed during
  // deploy, the import still yields a path string pointing at nothing. Check
  // the file actually exists so the failure mode is readable, not ENOENT.
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
    throw new HttpsError('failed-precondition', 'Videoverktyget är inte konfigurerat.');
  }
  const ffmpeg = ffmpegPath;

  const bucket = getStorage().bucket();

  // Unique working dir under os.tmpdir(); ALWAYS cleaned up in finally.
  const workDir = path.join(os.tmpdir(), `cs-render-${randomUUID()}`);
  fs.mkdirSync(workDir, { recursive: true });

  try {
    // ── 1. Download all assets (+ audio) with size enforcement ────────────
    let totalBytes = 0;
    const assets: LocalAsset[] = [];

    for (let i = 0; i < assetPaths.length; i++) {
      const p = assetPaths[i];
      const file = bucket.file(p);

      let contentType = '';
      try {
        const [meta] = await file.getMetadata();
        contentType = (meta.contentType || '').toLowerCase();
        const size = parseInt(String(meta.size || '0'), 10);
        if (Number.isFinite(size) && size > MAX_FILE_BYTES) {
          throw new HttpsError('invalid-argument', `Filen "${p}" är för stor (max 80 MB).`);
        }
      } catch (e: any) {
        if (e instanceof HttpsError) throw e;
        throw new HttpsError('not-found', `Kunde inte läsa filen "${p}".`);
      }

      // 2. Classify by contentType.
      let kind: AssetKind;
      if (contentType.startsWith('video/')) kind = 'video';
      else if (contentType.startsWith('image/')) kind = 'image';
      else {
        throw new HttpsError(
          'invalid-argument',
          `Filen "${p}" måste vara en bild eller ett videoklipp.`
        );
      }

      const local = path.join(workDir, `asset_${i}`);
      try {
        await file.download({ destination: local });
      } catch (e: any) {
        throw new HttpsError('not-found', `Kunde inte hämta filen "${p}".`);
      }
      const bytes = fs.statSync(local).size;
      if (bytes > MAX_FILE_BYTES) {
        throw new HttpsError('invalid-argument', `Filen "${p}" är för stor (max 80 MB).`);
      }
      totalBytes += bytes;
      if (totalBytes > MAX_TOTAL_BYTES) {
        throw new HttpsError('invalid-argument', 'De valda filerna är för stora tillsammans (max 300 MB).');
      }

      assets.push({ path: p, file: local, kind, duration: 0, offset: 0 });
    }

    // 3. Probe video durations.
    for (const a of assets) {
      if (a.kind === 'video') {
        a.duration = await probeDuration(a.file);
      }
    }

    // Resolve the audio source: explicit audioPath, else the FIRST video asset.
    let audioFile: string | null = null;
    if (audioPath) {
      const aFile = bucket.file(audioPath);
      let aType = '';
      try {
        const [meta] = await aFile.getMetadata();
        aType = (meta.contentType || '').toLowerCase();
        const size = parseInt(String(meta.size || '0'), 10);
        if (Number.isFinite(size) && size > MAX_FILE_BYTES) {
          throw new HttpsError('invalid-argument', `Ljudfilen "${audioPath}" är för stor (max 80 MB).`);
        }
      } catch (e: any) {
        if (e instanceof HttpsError) throw e;
        throw new HttpsError('not-found', `Kunde inte läsa ljudfilen "${audioPath}".`);
      }
      if (!aType.startsWith('audio/') && !aType.startsWith('video/')) {
        throw new HttpsError('invalid-argument', 'Ljudfilen måste vara en ljud- eller videofil.');
      }
      const local = path.join(workDir, 'audio_src');
      try {
        await aFile.download({ destination: local });
      } catch (e: any) {
        throw new HttpsError('not-found', `Kunde inte hämta ljudfilen "${audioPath}".`);
      }
      const bytes = fs.statSync(local).size;
      if (bytes > MAX_FILE_BYTES) {
        throw new HttpsError('invalid-argument', `Ljudfilen "${audioPath}" är för stor (max 80 MB).`);
      }
      totalBytes += bytes;
      if (totalBytes > MAX_TOTAL_BYTES) {
        throw new HttpsError('invalid-argument', 'De valda filerna är för stora tillsammans (max 300 MB).');
      }
      if (!(await hasAudioStream(local))) {
        throw new HttpsError('invalid-argument', 'Ljudfilen saknar ljudspår.');
      }
      audioFile = local;
    } else {
      // No explicit audio: use the first video that actually HAS an audio
      // stream (muted clips are common and would make ffmpeg abort).
      for (const a of assets) {
        if (a.kind === 'video' && (await hasAudioStream(a.file))) {
          audioFile = a.file;
          break;
        }
      }
      if (!audioFile) {
        throw new HttpsError(
          'failed-precondition',
          'Lägg till en ljudfil eller ett videoklipp med ljud.'
        );
      }
    }

    // ── 4. Build beat-cut segments ────────────────────────────────────────
    // Cut every 2 beats: segDur = (60/bpm)*2 seconds.
    const segDur = (60 / bpm) * 2;
    const numSegments = Math.ceil(targetSec / segDur);
    const totalDur = numSegments * segDur;

    // Cycle through assets in order. For a video, each use takes
    // [offset, offset+segDur] then advances offset by segDur; wrap to 0 when the
    // window would run past the clip's end.
    const inputs: { file: string; kind: AssetKind; ss: number }[] = [];
    for (let s = 0; s < numSegments; s++) {
      const a = assets[s % assets.length];
      if (a.kind === 'video') {
        if (a.offset + segDur > a.duration) a.offset = 0;
        inputs.push({ file: a.file, kind: 'video', ss: a.offset });
        a.offset += segDur;
      } else {
        inputs.push({ file: a.file, kind: 'image', ss: 0 });
      }
    }

    // ── 5. One ffmpeg invocation ──────────────────────────────────────────
    const args: string[] = ['-y'];

    // Segment inputs.
    for (const inp of inputs) {
      if (inp.kind === 'video') {
        args.push('-ss', inp.ss.toFixed(3), '-t', segDur.toFixed(3), '-i', inp.file);
      } else {
        args.push('-loop', '1', '-t', segDur.toFixed(3), '-i', inp.file);
      }
    }
    // Audio input goes LAST so its index is inputs.length.
    const audioIdx = inputs.length;
    args.push('-i', audioFile);

    // filter_complex: normalize each video segment, then concat.
    const filterParts: string[] = [];
    const concatLabels: string[] = [];
    for (let i = 0; i < inputs.length; i++) {
      filterParts.push(
        `[${i}:v]scale=1080:1920:force_original_aspect_ratio=increase,` +
        `crop=1080:1920,fps=30,setsar=1[v${i}]`
      );
      concatLabels.push(`[v${i}]`);
    }
    filterParts.push(`${concatLabels.join('')}concat=n=${inputs.length}:v=1:a=0[vout]`);

    // Audio: trim to total duration, pad with silence if the source is SHORTER
    // than the target (otherwise -shortest would truncate the whole video to
    // the audio length), then fade out the last second.
    const fadeStart = Math.max(0, totalDur - 1);
    filterParts.push(
      `[${audioIdx}:a]atrim=0:${totalDur.toFixed(3)},asetpts=PTS-STARTPTS,` +
      `apad=whole_dur=${totalDur.toFixed(3)},` +
      `afade=t=out:st=${fadeStart.toFixed(3)}:d=1[aout]`
    );

    args.push('-filter_complex', filterParts.join(';'));
    args.push('-map', '[vout]', '-map', '[aout]');
    args.push(
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-shortest'
    );

    const outFile = path.join(workDir, 'out.mp4');
    args.push(outFile);

    try {
      await run(ffmpeg, args);
    } catch (e: any) {
      throw new HttpsError('internal', `Videoproduktion misslyckades: ${e?.message || 'okänt fel'}`);
    }

    if (!fs.existsSync(outFile) || fs.statSync(outFile).size === 0) {
      throw new HttpsError('internal', 'Videoproduktionen gav ingen fil.');
    }

    // ── 6. Upload result ──────────────────────────────────────────────────
    const destPath = `content-studio/${shopId}/renders/${Date.now()}.mp4`;
    const token = randomUUID();
    try {
      await bucket.upload(outFile, {
        destination: destPath,
        metadata: {
          contentType: 'video/mp4',
          metadata: { firebaseStorageDownloadTokens: token },
        },
      });
    } catch (e: any) {
      throw new HttpsError('internal', `Kunde inte spara videon: ${e?.message || 'okänt fel'}`);
    }

    const url =
      `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
      `${encodeURIComponent(destPath)}?alt=media&token=${token}`;

    // 7. Return.
    return {
      path: destPath,
      url,
      durationSec: Math.round(totalDur * 10) / 10,
    };
  } catch (e) {
    throw toHttpsError(e);
  } finally {
    // /tmp is memory-backed — always release it.
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
});
