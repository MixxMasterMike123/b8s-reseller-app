// displacementCompositor.js — the 2.5D photo-displacement mockup engine (Pixi v8).
//
// The Printful/Printify "smart mockup" recipe, real-time in WebGL:
//   photo of the blank garment (base sprite)
//   → artwork sprite placed in the print area (position/scale/ROTATION, mm-driven)
//   → masked to the print area (never spills onto collar/sleeves/background)
//   → DisplacementFilter warps the artwork along the fabric folds (grayscale map,
//     mid-gray = zero shift; the map is registered to ITS photo — same px dims)
//   → blendMode + alpha ink the artwork into the garment's shadows
//   → render → extract PNG.
//
// NOT CGI, NOT three.js, NOT AI — a deterministic image compositor. Pixi v8 API
// throughout: async Application.init, Assets.load, string blend modes.
//
// COORDINATES: everything inside the root container lives in PHOTO PIXELS (the
// view's w/h); the root is scaled once to the OUTPUT resolution. Placement stays
// in physical mm exactly like the flat studio: printArea (photo px) ↔ printAreaMm
// give the px-per-mm bridge, so the same {xMm,yMm,wMm} renders identically here
// and in the flat mockup. rotationDeg rotates around the artwork's centre.
//
// PRINT PATH: untouched by construction — the print file is the artwork ORIGINAL
// (podUpload), never a render of any mockup. This module is display-only.
//
// Import this module LAZILY (dynamic import) — pixi.js is its own chunk and must
// not enter the main admin bundle.
import {
  Application, Container, Sprite, Graphics, DisplacementFilter, Texture,
} from 'pixi.js';

// Core v8 blend modes we allow from config (advanced modes need a separate pixi
// import — extend deliberately if a garment ever needs one).
const ALLOWED_BLENDS = new Set(['normal', 'multiply', 'screen', 'add']);

// Load an image from ANY url kind. NOT Assets.load: it sniffs the loader from
// the file extension, so extension-less blob:/object URLs (uploaded artwork) and
// token-suffixed Storage URLs fail parser detection. A manual <img> decode is
// deterministic for every source we feed it.
const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous'; // Storage download URLs serve ACAO:* — no canvas taint
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Kunde inte läsa bilden för 3D-mockupen.'));
  // CACHE FOOTGUN: the same Storage URL is loaded elsewhere on the page by plain
  // <img> tags (picker/canvas/strip) WITHOUT CORS mode. The browser may serve
  // that cached non-CORS response to THIS crossOrigin request, which then
  // rejects. A fixed query param gives the CORS variant its own cache entry.
  // data:/blob: URLs are untouched (no network, no CORS).
  img.src = /^https?:/i.test(src)
    ? `${src}${src.includes('?') ? '&' : '?'}corsbust=2`
    : src;
});

const loadTexture = async (src) => Texture.from(await loadImage(src));

// Soften the displacement map before it drives the warp. JPEG maps carry 8×8
// block noise that QUANTIZES the displacement field — artwork edges then shift
// in discrete jumps and read as stair-steps. A gaussian blur at load time (the
// Affinity recipe's "blur the map" step) smooths the field; blurPx is in MAP
// pixels (JPEG blocks are 8px → default 6 kills them without flattening folds).
// Safari <18 lacks ctx.filter: fall back to a downscale→upscale pass, whose
// bilinear resampling approximates the blur.
const loadDisplacementTexture = async (src, blurPx) => {
  const img = await loadImage(src);
  if (!blurPx) return Texture.from(img);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d');
  if (typeof g.filter === 'string') {
    g.filter = `blur(${blurPx}px)`;
    g.drawImage(img, 0, 0);
  } else {
    const small = document.createElement('canvas');
    const f = Math.max(2, Math.round(blurPx));
    small.width = Math.max(1, Math.round(img.naturalWidth / f));
    small.height = Math.max(1, Math.round(img.naturalHeight / f));
    small.getContext('2d').drawImage(img, 0, 0, small.width, small.height);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(small, 0, 0, c.width, c.height);
  }
  return Texture.from(c);
};

/**
 * createDisplacementCompositor(cfg) → Promise<compositor>
 *
 * cfg:
 *   view        — { w, h, printArea: {x,y,w,h} }  (photo px space)
 *   printAreaMm — { w, h }                        (physical size of printArea)
 *   assets      — { photoUrl, displacementUrl, maskUrl? }
 *   tuning      — { displacementScale, blend, alpha }
 *   output      — { w, h }  canvas/PNG resolution (independent of print DPI)
 *
 * compositor:
 *   canvas                       — the live <canvas> (append it to the DOM)
 *   setArtwork(url) → Promise    — load/replace the artwork texture
 *   setPlacement({xMm,yMm,wMm,rotationDeg}) — reposition (artwork aspect from its texture)
 *   setTuning({displacementScale?, blend?, alpha?}) — live tuning knobs
 *   extractPNG() → Promise<Blob> — the product image at output resolution
 *   destroy()                    — full teardown (GPU + textures)
 */
export const createDisplacementCompositor = async ({ view, printAreaMm, assets, tuning = {}, output }) => {
  if (!view?.w || !view?.h || !view?.printArea) throw new Error('3D-mockup: ogiltig vy-konfiguration.');
  if (!printAreaMm?.w || !printAreaMm?.h) throw new Error('3D-mockup: printAreaMm saknas.');
  if (!assets?.photoUrl || !assets?.displacementUrl) throw new Error('3D-mockup: foto eller displacement-karta saknas i konfigurationen.');

  const outW = Math.round(output?.w || 1600);
  const outH = Math.round(output?.h || Math.round((outW * view.h) / view.w));

  const app = new Application();
  await app.init({
    width: outW,
    height: outH,
    autoStart: false,          // render-on-demand — this is a compositor, not a scene
    antialias: true,
    backgroundAlpha: 1,
    background: '#ffffff',
    preference: 'webgl',
  });

  // Root container in PHOTO px space, scaled once to the output resolution.
  const root = new Container();
  root.scale.set(outW / view.w, outH / view.h);
  app.stage.addChild(root);

  const [photoTex, dispTex, maskTex] = await Promise.all([
    loadTexture(assets.photoUrl),
    loadDisplacementTexture(assets.displacementUrl, tuning.displacementBlur ?? 6),
    assets.maskUrl ? loadTexture(assets.maskUrl) : Promise.resolve(null),
  ]);

  // 1) Base: the blank-garment photograph, filling the view.
  const photo = new Sprite(photoTex);
  photo.width = view.w;
  photo.height = view.h;
  root.addChild(photo);

  // 3-prep) Displacement sprite: the grayscale map, registered to the photo →
  // same placement, full view. In the tree so the filter picks up its transform,
  // but never drawn (it would paint the gray map over the photo).
  const dispSprite = new Sprite(dispTex);
  dispSprite.width = view.w;
  dispSprite.height = view.h;
  dispSprite.renderable = false;
  root.addChild(dispSprite);

  // 2) Artwork layer: a container masked to the print area; the sprite inside is
  // anchored at its centre so rotationDeg rotates in place.
  const artLayer = new Container();
  root.addChild(artLayer);

  let mask;
  if (maskTex) {
    mask = new Sprite(maskTex);
    mask.width = view.w;
    mask.height = view.h;
  } else {
    const r = view.printArea;
    mask = new Graphics().rect(r.x, r.y, r.w, r.h).fill(0xffffff);
  }
  root.addChild(mask);
  artLayer.mask = mask;

  const artSprite = new Sprite();
  artSprite.anchor.set(0.5);
  artLayer.addChild(artSprite);

  // 3+4) The warp + the ink.
  const state = {
    displacementScale: tuning.displacementScale ?? 30,
    blend: ALLOWED_BLENDS.has(tuning.blend) ? tuning.blend : 'multiply',
    alpha: tuning.alpha ?? 0.8,
    placement: null,
  };
  const dispFilter = new DisplacementFilter({ sprite: dispSprite, scale: state.displacementScale });
  artLayer.filters = [dispFilter];

  const pxPerMmX = view.printArea.w / printAreaMm.w;
  const pxPerMmY = view.printArea.h / printAreaMm.h;

  const applyTuning = () => {
    dispFilter.scale.set(state.displacementScale);
    // Blend/alpha go on the FILTERED CONTAINER, not the sprite: a filtered
    // container renders its children into an intermediate texture first, so a
    // sprite-level multiply blends against that buffer's EMPTY (black) backdrop
    // → solid black artwork. On the container, the blend applies where the
    // filter's OUTPUT composites with the photo — which is the whole point.
    artLayer.blendMode = state.blend;
    artLayer.alpha = state.alpha;
  };

  const applyPlacement = () => {
    const p = state.placement;
    const tex = artSprite.texture;
    if (!p || !tex || tex.width <= 1) { artSprite.visible = false; return; }
    artSprite.visible = true;
    const wPx = p.wMm * pxPerMmX;
    const hPx = wPx * (tex.height / tex.width); // aspect from the artwork itself
    artSprite.width = wPx;
    artSprite.height = hPx;
    // xMm/yMm are the artwork's TOP-LEFT within the print area (studio convention);
    // the sprite is centre-anchored for rotation, so offset by half.
    artSprite.position.set(
      view.printArea.x + p.xMm * pxPerMmX + wPx / 2,
      view.printArea.y + p.yMm * pxPerMmY + hPx / 2
    );
    artSprite.rotation = ((p.rotationDeg || 0) * Math.PI) / 180;
  };

  const render = () => app.render();

  applyTuning();
  render();

  return {
    canvas: app.canvas,

    async setArtwork(url) {
      const tex = await loadTexture(url);
      artSprite.texture = tex;
      applyPlacement();
      render();
    },

    setPlacement(placement) {
      state.placement = placement;
      applyPlacement();
      render();
    },

    setTuning({ displacementScale, blend, alpha } = {}) {
      if (displacementScale !== undefined) state.displacementScale = displacementScale;
      if (blend !== undefined && ALLOWED_BLENDS.has(blend)) state.blend = blend;
      if (alpha !== undefined) state.alpha = alpha;
      applyTuning();
      render();
    },

    async extractPNG() {
      render();
      const canvas = app.renderer.extract.canvas(app.stage);
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Kunde inte skapa produktbilden.'))),
          'image/png'
        );
      });
    },

    destroy() {
      app.destroy(true, { children: true, texture: true });
    },
  };
};
