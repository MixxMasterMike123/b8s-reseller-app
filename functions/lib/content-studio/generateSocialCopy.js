"use strict";
// Content Studio callable 1 — generateSocialCopy.
//
// Turns a short description (+ optional reference images and artist hashtags)
// into ready-to-post social copy for TikTok, Instagram Reels and YouTube Shorts
// at once, in Swedish, tuned to a chosen tone. PURE COMPUTE: it returns the copy
// and the CLIENT persists it onto the socialPosts doc — this function never
// writes Firestore (the write path is client-side per the add-on contract).
//
// Model note: uses claude-opus-4-8 with adaptive thinking and structured JSON
// output (output_config.format json_schema). temperature/top_p/top_k and
// budget_tokens are NOT sent — they 400 on this model. See the claude-api skill.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSocialCopy = void 0;
const https_1 = require("firebase-functions/v2/https");
const storage_1 = require("firebase-admin/storage");
const child_process_1 = require("child_process");
const crypto_1 = require("crypto");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
const ffprobe_static_1 = __importDefault(require("ffprobe-static"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const app_urls_1 = require("../config/app-urls");
const gate_1 = require("./gate");
// 1GiB/300s: video keyframe extraction downloads clips to /tmp (memory-backed)
// and runs ffmpeg before the Claude call.
const COMMON = {
    region: 'us-central1',
    memory: '1GiB',
    timeoutSeconds: 300,
    cors: app_urls_1.appUrls.CORS_ORIGINS,
    secrets: ['ANTHROPIC_API_KEY'],
};
const TONE_GUIDES = {
    hype: 'Hype & Energi — maxad livekänsla, utropstecken, energi',
    nostalgi: 'Nostalgi & Modern — mixa nostalgi med dagens scen',
    karlek: 'Kärlek & Community — tacksamhet, värme, gemenskap',
};
// Per-channel schema block: hook, caption, hashtags[]. No length constraints
// (minLength/maxLength are unsupported by the structured-output schema).
const CHANNEL_SCHEMA = {
    type: 'object',
    properties: {
        hook: { type: 'string' },
        caption: { type: 'string' },
        hashtags: { type: 'array', items: { type: 'string' } },
    },
    required: ['hook', 'caption', 'hashtags'],
    additionalProperties: false,
};
const OUTPUT_SCHEMA = {
    type: 'object',
    properties: {
        tiktok: CHANNEL_SCHEMA,
        reels: CHANNEL_SCHEMA,
        shorts: CHANNEL_SCHEMA,
    },
    required: ['tiktok', 'reels', 'shorts'],
    additionalProperties: false,
};
const IMAGE_MEDIA_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
]);
const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB per image
// Video analysis: keyframes are extracted server-side with ffmpeg and sent to
// Claude as ordinary images — "watching" the clip without any video-capable
// third-party API. Frames at 10/35/60/85% cover intro, build-up, and climax.
const MAX_VIDEOS = 2;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024; // 80 MB per clip (matches render cap)
const FRAME_POSITIONS = [0.1, 0.35, 0.6, 0.85];
// Download up to MAX_IMAGES reference images from Storage and turn them into
// Anthropic image content blocks. Non-image / oversized / unreadable files are
// surfaced as readable Swedish errors (not silently swallowed) so the admin
// knows why a picture was ignored.
async function buildImageBlocks(shopId, imagePaths) {
    const bucket = (0, storage_1.getStorage)().bucket();
    const paths = imagePaths.slice(0, MAX_IMAGES);
    const blocks = [];
    for (const path of paths) {
        // Tenant isolation: only this shop's library or quick uploads.
        if (!(0, gate_1.isShopMediaPath)(shopId, path)) {
            throw new https_1.HttpsError('permission-denied', `Bilden "${path}" ligger utanför butikens mapp.`);
        }
        const file = bucket.file(path);
        let contentType = '';
        try {
            const [meta] = await file.getMetadata();
            contentType = (meta.contentType || '').toLowerCase();
        }
        catch (e) {
            throw new https_1.HttpsError('not-found', `Kunde inte läsa bilden "${path}".`);
        }
        if (!IMAGE_MEDIA_TYPES.has(contentType)) {
            // Skip non-image files (e.g. a video was passed by mistake).
            continue;
        }
        let buf;
        try {
            const [data] = await file.download();
            buf = data;
        }
        catch (e) {
            throw new https_1.HttpsError('not-found', `Kunde inte hämta bilden "${path}".`);
        }
        if (buf.length > MAX_IMAGE_BYTES) {
            throw new https_1.HttpsError('invalid-argument', `Bilden "${path}" är för stor (max 5 MB).`);
        }
        blocks.push({
            type: 'image',
            source: { type: 'base64', media_type: contentType, data: buf.toString('base64') },
        });
    }
    return blocks;
}
// Run a binary, rejecting with a stderr tail so failures are debuggable.
function run(bin, args) {
    return new Promise((resolve, reject) => {
        const child = (0, child_process_1.spawn)(bin, args);
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (c) => (stdout += c.toString()));
        child.stderr.on('data', (c) => {
            stderr += c.toString();
            if (stderr.length > 2000)
                stderr = stderr.slice(-2000);
        });
        child.on('error', (err) => reject(err));
        child.on('close', (code) => {
            if (code === 0)
                return resolve(stdout);
            reject(new Error(stderr.slice(-300).trim() || `avslutades med kod ${code}`));
        });
    });
}
// Download up to MAX_VIDEOS clips and extract FRAME_POSITIONS keyframes from
// each (scaled to 800px wide JPEGs) as Anthropic image blocks.
async function buildVideoFrameBlocks(shopId, videoPaths, workDir) {
    if (!ffmpeg_static_1.default || !fs.existsSync(ffmpeg_static_1.default)) {
        throw new https_1.HttpsError('failed-precondition', 'Videoverktyget är inte konfigurerat.');
    }
    const bucket = (0, storage_1.getStorage)().bucket();
    const blocks = [];
    for (let v = 0; v < Math.min(videoPaths.length, MAX_VIDEOS); v++) {
        const p = videoPaths[v];
        if (!(0, gate_1.isShopMediaPath)(shopId, p)) {
            throw new https_1.HttpsError('permission-denied', `Filen "${p}" ligger utanför butikens mapp.`);
        }
        const file = bucket.file(p);
        let contentType = '';
        try {
            const [meta] = await file.getMetadata();
            contentType = (meta.contentType || '').toLowerCase();
            const size = parseInt(String(meta.size || '0'), 10);
            if (Number.isFinite(size) && size > MAX_VIDEO_BYTES) {
                throw new https_1.HttpsError('invalid-argument', `Videon "${p}" är för stor (max 80 MB).`);
            }
        }
        catch (e) {
            if (e instanceof https_1.HttpsError)
                throw e;
            throw new https_1.HttpsError('not-found', `Kunde inte läsa videon "${p}".`);
        }
        if (!contentType.startsWith('video/'))
            continue;
        const local = path.join(workDir, `vid_${v}`);
        try {
            await file.download({ destination: local });
        }
        catch {
            throw new https_1.HttpsError('not-found', `Kunde inte hämta videon "${p}".`);
        }
        let duration = 0;
        try {
            const out = await run(ffprobe_static_1.default.path, [
                '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                local,
            ]);
            duration = parseFloat(out.trim());
        }
        catch {
            // Unreadable clip — skip it rather than failing the whole generation.
            continue;
        }
        if (!Number.isFinite(duration) || duration <= 0)
            continue;
        for (let i = 0; i < FRAME_POSITIONS.length; i++) {
            const ts = duration * FRAME_POSITIONS[i];
            const frame = path.join(workDir, `vid_${v}_f${i}.jpg`);
            try {
                await run(ffmpeg_static_1.default, [
                    '-y',
                    '-ss', ts.toFixed(2),
                    '-i', local,
                    '-frames:v', '1',
                    '-vf', 'scale=800:-2',
                    '-q:v', '5',
                    frame,
                ]);
            }
            catch {
                continue; // one bad frame shouldn't kill the rest
            }
            if (!fs.existsSync(frame))
                continue;
            blocks.push({
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: fs.readFileSync(frame).toString('base64'),
                },
            });
        }
    }
    return blocks;
}
// Surface Anthropic failures as readable Swedish HttpsErrors instead of a bare
// INTERNAL. Auth/validation HttpsErrors pass through untouched.
function toHttpsError(e) {
    if (e instanceof https_1.HttpsError)
        return e;
    const msg = e?.error?.message || e?.message || 'Okänt fel mot AI-tjänsten';
    return new https_1.HttpsError('internal', `AI-tjänsten: ${msg}`);
}
exports.generateSocialCopy = (0, https_1.onCall)(COMMON, async (request) => {
    const d = request.data || {};
    // Auth + opt-in feature gate (loads the shop doc once).
    const { shopId, data } = await (0, gate_1.requireContentStudio)(d.shopId, request.auth?.uid);
    // ── Input validation (readable Swedish errors) ──────────────────────────
    const description = (d.description || '').trim();
    if (!TONE_GUIDES[d.tone]) {
        throw new https_1.HttpsError('invalid-argument', 'Ogiltig ton.');
    }
    const includeTags = d.includeTags === true;
    const artistTags = Array.isArray(d.artistTags)
        ? d.artistTags.map((t) => String(t).trim()).filter(Boolean)
        : [];
    const imagePaths = Array.isArray(d.imagePaths)
        ? d.imagePaths.map((p) => String(p).trim()).filter(Boolean)
        : [];
    if (imagePaths.length > MAX_IMAGES) {
        throw new https_1.HttpsError('invalid-argument', `Max ${MAX_IMAGES} bilder kan analyseras.`);
    }
    const videoPaths = Array.isArray(d.videoPaths)
        ? d.videoPaths.map((p) => String(p).trim()).filter(Boolean)
        : [];
    if (videoPaths.length > MAX_VIDEOS) {
        throw new https_1.HttpsError('invalid-argument', `Max ${MAX_VIDEOS} videoklipp kan analyseras.`);
    }
    // A typed description is optional as long as there is material to analyze —
    // the whole point is copy generated FROM the uploaded content.
    if (!description && imagePaths.length === 0 && videoPaths.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'Välj material att analysera eller skriv en beskrivning.');
    }
    const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
    if (!apiKey) {
        throw new https_1.HttpsError('failed-precondition', 'AI-tjänsten är inte konfigurerad.');
    }
    const brand = (0, gate_1.shopBrandName)(shopId, data);
    const system = [
        `Du är en expert på copywriting för sociala medier åt svenska småföretag.`,
        `Varumärket du skriver för heter "${brand}".`,
        ``,
        `Skapa innehåll anpassat per kanal:`,
        `- TikTok: hooky, rått, trend-medvetet, ledigt.`,
        `- Instagram Reels: estetiskt, storytelling, lite mer polerat.`,
        `- YouTube Shorts: kärnfullt, nyfikenhetsdrivet, för en bred publik.`,
        ``,
        `Ton: ${TONE_GUIDES[d.tone]}.`,
        ``,
        `Skriv på svenska i du-form. Hooks max 90 tecken. Captions 2–4 meningar och`,
        `avsluta med en CTA-fråga. 4–7 hashtags per kanal, blanda breda och nischade.`,
        includeTags && artistTags.length
            ? `Väv naturligt in dessa taggar där det passar: ${artistTags.join(' ')}.`
            : `Inga särskilda artist-taggar ska tvingas in.`,
    ].join('\n');
    // Media blocks go BEFORE the text block in the user message. Video keyframes
    // are extracted to /tmp (memory-backed — cleaned up in finally).
    const imageBlocks = imagePaths.length
        ? await buildImageBlocks(shopId, imagePaths)
        : [];
    let frameBlocks = [];
    const workDir = path.join(os.tmpdir(), `cs-frames-${(0, crypto_1.randomUUID)()}`);
    try {
        if (videoPaths.length) {
            fs.mkdirSync(workDir, { recursive: true });
            frameBlocks = await buildVideoFrameBlocks(shopId, videoPaths, workDir);
        }
        const mediaNotes = [];
        if (imageBlocks.length) {
            mediaNotes.push(`${imageBlocks.length} uppladdade bilder från materialet.`);
        }
        if (frameBlocks.length) {
            mediaNotes.push(`${frameBlocks.length} stillbilder (keyframes) i kronologisk ordning ur ` +
                `${Math.min(videoPaths.length, MAX_VIDEOS)} uppladdade videoklipp — beskriv det ` +
                `som händer i klippen utifrån dessa.`);
        }
        const textParts = [];
        if (mediaNotes.length) {
            textParts.push(`Bifogat material: ${mediaNotes.join(' ')}`);
            textParts.push('Basera innehållet på vad du faktiskt SER i materialet (plats, stämning, publik, detaljer).');
        }
        textParts.push(description
            ? `Beskrivning av inlägget:\n${description}`
            : 'Ingen beskrivning angiven — utgå helt från materialet.');
        const userContent = [
            ...imageBlocks,
            ...frameBlocks,
            {
                type: 'text',
                text: textParts.join('\n\n'),
            },
        ];
        const client = new sdk_1.default({ apiKey });
        let response;
        try {
            response = await client.messages.create({
                model: 'claude-opus-4-8',
                max_tokens: 4000,
                thinking: { type: 'adaptive' },
                output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
                system,
                messages: [{ role: 'user', content: userContent }],
            });
        }
        catch (e) {
            throw toHttpsError(e);
        }
        if (response.stop_reason === 'refusal') {
            throw new https_1.HttpsError('failed-precondition', 'AI-tjänsten kunde inte skapa innehåll för den här beskrivningen. Försök formulera om.');
        }
        // Truncated output means the JSON is incomplete — say so instead of letting
        // JSON.parse fail with a cryptic "kunde inte tolkas".
        if (response.stop_reason === 'max_tokens') {
            throw new https_1.HttpsError('internal', 'AI-svaret blev för långt och kapades. Försök igen.');
        }
        // Find the text block and parse its JSON payload.
        const textBlock = Array.isArray(response.content)
            ? response.content.find((b) => b?.type === 'text')
            : null;
        if (!textBlock?.text) {
            throw new https_1.HttpsError('internal', 'AI-tjänsten gav inget svar.');
        }
        let copy;
        try {
            copy = JSON.parse(textBlock.text);
        }
        catch (e) {
            throw new https_1.HttpsError('internal', 'AI-tjänsten gav ett svar som inte kunde tolkas.');
        }
        return { copy };
    }
    finally {
        // /tmp is memory-backed — always release extracted frames.
        try {
            fs.rmSync(workDir, { recursive: true, force: true });
        }
        catch {
            // best-effort cleanup
        }
    }
});
//# sourceMappingURL=generateSocialCopy.js.map