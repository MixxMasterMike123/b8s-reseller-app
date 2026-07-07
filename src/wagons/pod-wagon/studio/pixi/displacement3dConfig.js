// displacement3dConfig.js — per-garment config for the 2.5D photo-displacement
// mockups ("Create design in 3D"). SCHEMA + the dev stub garment.
//
// Each garment: per-VIEW (camera angle) × per-COLORWAY asset sets. The photo,
// displacement map and (optional) mask of one colorway/view are REGISTERED to
// each other — same pixel dimensions, shot/derived from the same frame. Print
// area is calibrated per view in photo px and paired with the physical mm size,
// exactly like podMockupTemplates (placements stay mm — the same {xMm,yMm,wMm}
// renders identically in the flat studio and here).
//
// TUNING KNOBS (all config, no code):
//   displacementScale — warp strength in px at full black/white (start ~20-40)
//   displacementBlur  — gaussian blur (map px) applied to the map at load; kills
//                       JPEG block noise that stair-steps artwork edges (default 6)
//   blend/alpha       — 'multiply' @ 0.8 for LIGHT garments (picks up shadows);
//                       override per colorway, e.g. 'screen' for DARK garments
//   output            — product-image resolution, independent of print DPI
//
// v1: this is a LOCAL dev module wired to the test files in /public/dev-3d/.
// Once the pipeline is proven it promotes into settings/podMockupTemplates
// (photo3d block on a template) via the seed script, like all garment config.
//
// SHAPE:
//   {
//     id, label,
//     views: {
//       front: {
//         w, h,                        // photo px = this view's coordinate space
//         printArea: { x, y, w, h },   // px rect in photo coords (also mask fallback)
//         colorways: {
//           white: { photoUrl, displacementUrl, maskUrl? },
//         },
//       },
//     },
//     printAreaMm: { front: { w, h } },  // physical size ↔ views[view].printArea
//     displacementScale, blend, alpha,
//     perColorway: { black: { blend: 'screen', alpha: 0.9 } },  // optional overrides
//     output: { w, h },
//   }

export const DEV_3D_GARMENTS = [
  {
    id: 'tee_model_white_dev',
    label: 'T-shirt på modell (dev)',
    views: {
      front: {
        w: 3200,
        h: 3871,
        // Chest print area, calibrated to /dev-3d/DisplaceOriginalImage.jpg:
        // centred on the shirt, below the collar, above the hem. 3:4 = 300×400 mm.
        printArea: { x: 1095, y: 1750, w: 1050, h: 1400 },
        colorways: {
          white: {
            photoUrl: '/dev-3d/DisplaceOriginalImage.jpg',
            displacementUrl: '/dev-3d/displacementMapOnlyTest1.jpg',
            // maskUrl: none — the printArea rect masks the artwork for now.
          },
        },
      },
    },
    printAreaMm: { front: { w: 300, h: 400 } },
    displacementScale: 30,
    displacementBlur: 6,   // map-px gaussian blur — kills JPEG 8×8 block stair-steps
    blend: 'multiply',
    alpha: 0.8,
    perColorway: {},
    output: { w: 1600, h: 1936 }, // photo aspect (3200×3871 halved)
  },
];

/** Resolve one (garment, view, colorway) into the compositor's flat config. */
export const compositorConfigFor = (garment, viewId = 'front', colorwayId = 'white') => {
  const view = garment?.views?.[viewId];
  const cw = view?.colorways?.[colorwayId];
  if (!view || !cw) return null;
  const per = garment.perColorway?.[colorwayId] || {};
  return {
    view: { w: view.w, h: view.h, printArea: view.printArea },
    printAreaMm: garment.printAreaMm?.[viewId],
    assets: { photoUrl: cw.photoUrl, displacementUrl: cw.displacementUrl, maskUrl: cw.maskUrl },
    tuning: {
      displacementScale: per.displacementScale ?? garment.displacementScale,
      displacementBlur: per.displacementBlur ?? garment.displacementBlur,
      blend: per.blend ?? garment.blend,
      alpha: per.alpha ?? garment.alpha,
    },
    output: garment.output,
  };
};
