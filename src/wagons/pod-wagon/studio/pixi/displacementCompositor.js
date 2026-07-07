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
// TUNING KNOBS (cfg.tuning):
//   displacementScale     — warp strength in px at full black/white
//   displacementBlur      — gaussian blur (map px) at load; kills JPEG block noise
//   displacementContrast  — amplifies the map's folds; MEAN-CENTERED on the map's
//                           print-area mean (not fixed mid-gray), so it does NOT
//                           slide the artwork off the mask and maps need not be
//                           authored centred on mid-gray. Applied ALWAYS: even at
//                           C=1 it re-centres the print area on 128, cancelling the
//                           map's DC offset (a small uniform de-bias, folds intact).
//   blend / alpha         — how the warped artwork inks into the garment
//   output                — product-image resolution, independent of print DPI
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
// Side-effect import REQUIRED for multiply/overlay & co in Pixi v8: they are
// "advanced" blend modes implemented via backdrop-reading filters — without this
// they don't composite (multiply rendered the artwork as a black slab).
import 'pixi.js/advanced-blend-modes';

// Blend modes we allow from config ('overlay' is often the most fabric-real:
// shadows darken the ink, highlights lift it).
const ALLOWED_BLENDS = new Set(['normal', 'multiply', 'screen', 'overlay', 'add']);

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

// Grayscale mean (Rec.601 luminance) over a rect of a 2D context, sampling every
// 4th pixel for speed. Used to find the map's DC level in the PRINT AREA.
const rectMeanLuminance = (g, rect, cw, ch) => {
  const x0 = Math.max(0, Math.min(cw - 1, Math.round(rect?.x ?? 0)));
  const y0 = Math.max(0, Math.min(ch - 1, Math.round(rect?.y ?? 0)));
  const rw = Math.max(1, Math.min(cw - x0, Math.round(rect?.w ?? cw)));
  const rh = Math.max(1, Math.min(ch - y0, Math.round(rect?.h ?? ch)));
  const { data } = g.getImageData(x0, y0, rw, rh);
  let sum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 16) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    n += 1;
  }
  return n ? sum / n : 128;
};

// Build the displacement texture that drives the warp. Two passes, in order:
//
//  1) BLUR. JPEG maps carry 8×8 block noise that QUANTIZES the displacement field
//     — artwork edges then shift in discrete jumps and read as stair-steps. A
//     gaussian blur at load (the Affinity recipe's "blur the map" step) smooths
//     the field; blurPx is in MAP pixels (JPEG blocks are 8px → default 6 kills
//     them without flattening folds). Old Safari lacks ctx.filter → downscale→
//     upscale resample approximates the blur.
//
//  2) MEAN-CENTERED CONTRAST. DisplacementFilter shifts each artwork pixel by
//     (luminance/255 − 0.5) × scale, so the map's MEAN luminance is a uniform DC
//     translation of the whole artwork, and only the DEVIATION from the mean is
//     the fold detail. We remap  v' = clamp((v − mean)*C + 128)  where `mean` is
//     measured over the PRINT AREA (blurred). This:
//       • RE-CENTERS the print area on 128 → cancels the map's DC offset, so the
//         artwork no longer carries a constant sideways/vertical bias (dev map
//         print-area mean ≈166 → ~4.5px bias removed at C=1). Folds unchanged.
//       • AMPLIFIES the folds by C WITHOUT sliding the artwork off the mask (a
//         fixed-128 pivot would multiply the DC offset too and shove weak maps
//         out of the print area — the exact failure this replaces).
//     Maps therefore need NOT be authored centred on mid-gray. Applied ALWAYS
//     (even at C=1, for the DC-neutralising re-centre).
//
// Returns a canvas-backed Pixi Texture.
const loadDisplacementTexture = async (img, blurPx, contrast = 1, printArea = null) => {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d');
  const C = contrast > 0 ? contrast : 1;

  // Pass 1 — blur.
  if (typeof g.filter === 'string') {
    g.filter = blurPx ? `blur(${blurPx}px)` : 'none';
    g.drawImage(img, 0, 0);
    g.filter = 'none';
  } else if (blurPx) {
    const small = document.createElement('canvas');
    const f = Math.max(2, Math.round(blurPx));
    small.width = Math.max(1, Math.round(img.naturalWidth / f));
    small.height = Math.max(1, Math.round(img.naturalHeight / f));
    small.getContext('2d').drawImage(img, 0, 0, small.width, small.height);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(small, 0, 0, c.width, c.height);
  } else {
    g.drawImage(img, 0, 0);
  }

  // Pass 2 — mean-centered contrast (manual pixel loop; a canvas filter can't
  // pivot on an arbitrary mean). Measure the mean AFTER the blur so it reflects
  // the field the warp actually samples.
  const mean = rectMeanLuminance(g, printArea, c.width, c.height);
  const data = g.getImageData(0, 0, c.width, c.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    px[i] = Math.max(0, Math.min(255, (px[i] - mean) * C + 128));
    px[i + 1] = Math.max(0, Math.min(255, (px[i + 1] - mean) * C + 128));
    px[i + 2] = Math.max(0, Math.min(255, (px[i + 2] - mean) * C + 128));
  }
  g.putImageData(data, 0, 0);
  return Texture.from(c);
};

/**
 * createDisplacementCompositor(cfg) → Promise<compositor>
 *
 * cfg:
 *   view        — { w, h, printArea: {x,y,w,h} }  (photo px space)
 *   printAreaMm — { w, h }                        (physical size of printArea)
 *   assets      — { photoUrl, displacementUrl, maskUrl? }
 *   tuning      — { displacementScale, displacementBlur, displacementContrast, blend, alpha }
 *   output      — { w, h }  canvas/PNG resolution (independent of print DPI)
 *
 * compositor:
 *   canvas                       — the live <canvas> (append it to the DOM)
 *   setArtwork(url) → Promise    — load/replace the artwork texture
 *   setPlacement({xMm,yMm,wMm,rotationDeg}) — reposition (artwork aspect from its texture)
 *   setTuning({displacementScale?, displacementContrast?, blend?, alpha?}) — live tuning knobs
 *                                (contrast triggers a guarded async map rebuild)
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

  // The map's ORIGINAL HTMLImageElement is kept in closure so displacementContrast
  // can be re-applied LIVE (rebuild the canvas pass) without re-fetching.
  const dispBlur = tuning.displacementBlur ?? 6;
  const [photoTex, dispImg, maskTex] = await Promise.all([
    loadTexture(assets.photoUrl),
    loadImage(assets.displacementUrl),
    assets.maskUrl ? loadTexture(assets.maskUrl) : Promise.resolve(null),
  ]);
  const dispTex = await loadDisplacementTexture(dispImg, dispBlur, tuning.displacementContrast ?? 1, view.printArea);

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
    displacementContrast: tuning.displacementContrast ?? 1,
    blend: ALLOWED_BLENDS.has(tuning.blend) ? tuning.blend : 'multiply',
    alpha: tuning.alpha ?? 0.8,
    placement: null,
  };
  let destroyed = false;
  let contrastToken = 0; // guards against out-of-order async rebuilds
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

  // Rebuild the displacement texture with the current contrast (re-runs the
  // canvas pass on the original map image) and hot-swap it into the sprite. The
  // DisplacementFilter re-reads sprite.texture.source on every apply(), so the
  // swap alone updates the warp — no filter poking needed.
  //
  // A monotonic token defeats out-of-order async: a slower older rebuild that
  // resolves after a newer one must NOT overwrite the newer texture. Bails if the
  // compositor was destroyed mid-rebuild.
  //
  // TEXTURE LIFECYCLE: we do NOT free swapped-out displacement textures during a
  // live session. Pixi caches a GPU BindGroup keyed on the map's TextureSource,
  // and destroy(true) frees that source out from under a still-cached bind group
  // → a null-resource crash inside DisplacementFilter.apply on the very next
  // render (reproduced: rapid slider drags). Even deferring one generation isn't
  // safe — the cache can hold it longer. Instead we PARK old textures and free
  // them all in destroy() (app.destroy(texture:true) also frees the live one).
  // A slider session leaks a handful of small canvas textures until teardown —
  // negligible, and correctness beats it. The dead ones from stale/aborted
  // rebuilds (never rendered, never bound) ARE safe to free immediately.
  const parkedTextures = [];
  const rebuildDisplacement = async () => {
    const myToken = ++contrastToken;
    const nextTex = await loadDisplacementTexture(dispImg, dispBlur, state.displacementContrast, view.printArea);
    if (destroyed) { nextTex.destroy(true); return; }
    if (myToken !== contrastToken) { nextTex.destroy(true); return; } // never bound
    const oldTex = dispSprite.texture;
    dispSprite.texture = nextTex;
    if (oldTex && oldTex !== nextTex) parkedTextures.push(oldTex); // free at teardown
    render();
  };

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

    setTuning({ displacementScale, displacementContrast, blend, alpha } = {}) {
      if (displacementScale !== undefined) state.displacementScale = displacementScale;
      if (blend !== undefined && ALLOWED_BLENDS.has(blend)) state.blend = blend;
      if (alpha !== undefined) state.alpha = alpha;
      // Contrast changes the MAP TEXTURE → async rebuild (guarded), not applyTuning.
      const contrastChanged =
        displacementContrast !== undefined && displacementContrast !== state.displacementContrast;
      if (displacementContrast !== undefined) state.displacementContrast = displacementContrast;
      applyTuning();
      render();
      if (contrastChanged) rebuildDisplacement();
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
      destroyed = true; // any in-flight contrast rebuild will no-op on resolve
      // Free the parked (swapped-out) displacement textures. The LIVE one is
      // owned by dispSprite and freed by app.destroy(texture:true) below.
      for (const t of parkedTextures) { try { t.destroy(true); } catch { /* already gone */ } }
      parkedTextures.length = 0;
      app.destroy(true, { children: true, texture: true });
    },
  };
};
