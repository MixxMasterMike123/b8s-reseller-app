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

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getStorage } from 'firebase-admin/storage';
import Anthropic from '@anthropic-ai/sdk';
import { appUrls } from '../config/app-urls';
import { requireContentStudio, shopBrandName } from './gate';

const COMMON = {
  region: 'us-central1' as const,
  memory: '512MiB' as const,
  timeoutSeconds: 120,
  cors: appUrls.CORS_ORIGINS,
  secrets: ['ANTHROPIC_API_KEY'],
};

const TONE_GUIDES: Record<string, string> = {
  hype: 'Hype & Energi — maxad livekänsla, utropstecken, energi',
  nostalgi: 'Nostalgi & Modern — mixa nostalgi med dagens scen',
  karlek: 'Kärlek & Community — tacksamhet, värme, gemenskap',
};

type Tone = 'hype' | 'nostalgi' | 'karlek';

interface GenerateRequest {
  shopId: string;
  description: string;
  tone: Tone;
  includeTags: boolean;
  artistTags?: string[];
  imagePaths?: string[];
}

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

// Download up to MAX_IMAGES reference images from Storage and turn them into
// Anthropic image content blocks. Non-image / oversized / unreadable files are
// surfaced as readable Swedish errors (not silently swallowed) so the admin
// knows why a picture was ignored.
async function buildImageBlocks(shopId: string, imagePaths: string[]): Promise<any[]> {
  const bucket = getStorage().bucket();
  const paths = imagePaths.slice(0, MAX_IMAGES);
  const blocks: any[] = [];
  for (const path of paths) {
    // Tenant isolation: only this shop's uploads may be analyzed.
    if (!path.startsWith(`content-studio/${shopId}/`)) {
      throw new HttpsError(
        'permission-denied',
        `Bilden "${path}" ligger utanför butikens mapp.`
      );
    }
    const file = bucket.file(path);
    let contentType = '';
    try {
      const [meta] = await file.getMetadata();
      contentType = (meta.contentType || '').toLowerCase();
    } catch (e: any) {
      throw new HttpsError('not-found', `Kunde inte läsa bilden "${path}".`);
    }
    if (!IMAGE_MEDIA_TYPES.has(contentType)) {
      // Skip non-image files (e.g. a video was passed by mistake).
      continue;
    }
    let buf: Buffer;
    try {
      const [data] = await file.download();
      buf = data;
    } catch (e: any) {
      throw new HttpsError('not-found', `Kunde inte hämta bilden "${path}".`);
    }
    if (buf.length > MAX_IMAGE_BYTES) {
      throw new HttpsError(
        'invalid-argument',
        `Bilden "${path}" är för stor (max 5 MB).`
      );
    }
    blocks.push({
      type: 'image',
      source: { type: 'base64', media_type: contentType, data: buf.toString('base64') },
    });
  }
  return blocks;
}

// Surface Anthropic failures as readable Swedish HttpsErrors instead of a bare
// INTERNAL. Auth/validation HttpsErrors pass through untouched.
function toHttpsError(e: any): HttpsError {
  if (e instanceof HttpsError) return e;
  const msg = e?.error?.message || e?.message || 'Okänt fel mot AI-tjänsten';
  return new HttpsError('internal', `AI-tjänsten: ${msg}`);
}

export const generateSocialCopy = onCall<GenerateRequest>(COMMON, async (request) => {
  const d = request.data || ({} as GenerateRequest);

  // Auth + opt-in feature gate (loads the shop doc once).
  const { shopId, data } = await requireContentStudio(d.shopId, request.auth?.uid);

  // ── Input validation (readable Swedish errors) ──────────────────────────
  const description = (d.description || '').trim();
  if (!description) {
    throw new HttpsError('invalid-argument', 'Beskriv vad inlägget ska handla om.');
  }
  if (!TONE_GUIDES[d.tone]) {
    throw new HttpsError('invalid-argument', 'Ogiltig ton.');
  }
  const includeTags = d.includeTags === true;
  const artistTags = Array.isArray(d.artistTags)
    ? d.artistTags.map((t) => String(t).trim()).filter(Boolean)
    : [];
  const imagePaths = Array.isArray(d.imagePaths)
    ? d.imagePaths.map((p) => String(p).trim()).filter(Boolean)
    : [];
  if (imagePaths.length > MAX_IMAGES) {
    throw new HttpsError('invalid-argument', `Max ${MAX_IMAGES} bilder kan analyseras.`);
  }

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'AI-tjänsten är inte konfigurerad.');
  }

  const brand = shopBrandName(shopId, data);

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

  // Image blocks go BEFORE the text block in the user message.
  const imageBlocks = imagePaths.length
    ? await buildImageBlocks(shopId, imagePaths)
    : [];

  const userContent: any[] = [
    ...imageBlocks,
    {
      type: 'text',
      text: `Beskrivning av inlägget:\n${description}`,
    },
  ];

  const client = new Anthropic({ apiKey });

  let response: any;
  try {
    response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4000,
      thinking: { type: 'adaptive' },
      output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      system,
      messages: [{ role: 'user', content: userContent }],
    } as any);
  } catch (e) {
    throw toHttpsError(e);
  }

  if (response.stop_reason === 'refusal') {
    throw new HttpsError(
      'failed-precondition',
      'AI-tjänsten kunde inte skapa innehåll för den här beskrivningen. Försök formulera om.'
    );
  }

  // Truncated output means the JSON is incomplete — say so instead of letting
  // JSON.parse fail with a cryptic "kunde inte tolkas".
  if (response.stop_reason === 'max_tokens') {
    throw new HttpsError('internal', 'AI-svaret blev för långt och kapades. Försök igen.');
  }

  // Find the text block and parse its JSON payload.
  const textBlock = Array.isArray(response.content)
    ? response.content.find((b: any) => b?.type === 'text')
    : null;
  if (!textBlock?.text) {
    throw new HttpsError('internal', 'AI-tjänsten gav inget svar.');
  }
  let copy: any;
  try {
    copy = JSON.parse(textBlock.text);
  } catch (e) {
    throw new HttpsError('internal', 'AI-tjänsten gav ett svar som inte kunde tolkas.');
  }

  return { copy };
});
