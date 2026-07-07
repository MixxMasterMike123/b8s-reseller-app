// pod3dModels.js — cached loader for the platform-managed 3D model library
// (the Firestore collection `pod3dModels`).
//
// These models are PLATFORM config (not per-shop), replacing the hardcoded
// DEV_3D_GARMENTS stub the 2.5D photo-displacement studio ("3D-vy") used to
// render. Unlike podProfiles/podMockupTemplates (which are single settings docs),
// the model library is a COLLECTION — one doc per garment model — because the
// platform CRUD UI (slice 2) creates/edits/deletes them independently and each
// model owns a Storage prefix under pod-3d-models/{modelId}/. They are written
// ONLY by the platform (firestore.rules: read=isActiveUser, write=isPlatform), so
// the app (studio picker, slice 3) only ever READS them.
//
// SHAPE of a pod3dModels doc (mirrors displacement3dConfig.js's garment schema so
// the pixi compositor consumes it unchanged — see compositorConfigFor there):
//   {
//     label,                          // Swedish UI label
//     scope: 'platform',              // marker; all library models are platform-owned
//     active: true,                   // false → hidden from the studio picker
//     views: {
//       front: {
//         w, h,                       // derivative px = this view's coordinate space
//         printArea: { x, y, w, h },  // px rect in derivative coords (mask fallback)
//         originalDims: { w, h },     // OPTIONAL — original px the colorways registered
//                                     //   against (pod3dUpload validates new colorways
//                                     //   in a view against this)
//         colorways: {
//           white: { label, photoUrl, displacementUrl, maskUrl?, originalPaths? },
//         },
//       },
//     },
//     printAreaMm: { front: { w, h } }, // physical size ↔ views[view].printArea
//     displacementScale, displacementBlur, displacementContrast, blend, alpha,
//                                        // displacementContrast (default 1) amplifies
//                                        //   the map's folds for weak/flat maps
//     perColorway: { black: { blend: 'screen', alpha: 0.9 } }, // optional overrides
//     output: { w, h },
//     createdAt, updatedAt,
//   }
//
// Degrades to [] on missing/empty/error so callers never crash (same contract as
// loadPodProfiles / loadPodMockupTemplates).
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const MODELS_REF = () => collection(db, 'pod3dModels');

// Module-level cache. `null` = not loaded yet; an array (possibly empty) = loaded.
let _cache = null;

/**
 * loadPod3dModels() → Promise<Array<model>>
 * Reads the whole pod3dModels collection once and caches the models array. Drops
 * models with active === false, sorts by label (Swedish locale). Returns [] if the
 * collection is empty (not seeded yet) or on any read error — the studio picker
 * then shows an empty model list rather than throwing.
 */
export const loadPod3dModels = async () => {
  if (_cache !== null) return _cache;
  try {
    const snap = await getDocs(MODELS_REF());
    const models = [];
    snap.forEach((d) => models.push({ id: d.id, ...(d.data() || {}) }));
    _cache = models
      .filter((m) => m && m.active !== false)
      .sort((a, b) => String(a.label || '').localeCompare(String(b.label || ''), 'sv'));
  } catch (err) {
    console.warn('pod3dModels: could not load pod3dModels collection, using [] :', err?.message);
    _cache = [];
  }
  return _cache;
};

/** Find a loaded model by its id. Returns null if absent. */
export const getPod3dModelById = (models, id) =>
  (Array.isArray(models) ? models : []).find((m) => m && m.id === id) || null;

/** Drop the cache (e.g. after a platform edit) so the next load re-reads Firestore. */
export const clearPod3dModelsCache = () => {
  _cache = null;
};
