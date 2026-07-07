// podMockupTemplates.js — cached loader for the Design Studio garment mockup
// templates (settings/podMockupTemplates).
//
// These templates are GLOBAL config (not per-shop), mirroring podProfiles.js: a
// single settings doc holding the array of mockup templates the Design Studio
// composes artwork onto. They are SEEDED/edited by an Admin-SDK script
// (scripts/seed-pod-mockup-templates.cjs) and the platform — firestore.rules makes
// settings/{id} read=isActiveUser, write=isPlatform — so the app only ever READS
// them. Changing a template's print-area coords/colorways auto-updates the studio
// (no code change).
//
// SHAPE of settings/podMockupTemplates:
//   { version, provisional, templates: [ template, … ] }
// where each template is:
//   {
//     id: 'tee_flat',              // stable template id
//     label: 'T-shirt',            // Swedish UI label
//     garment: 'tee',              // which SVG flat renders this ('tee' | 'hoodie')
//     profileId: 'apparel_dtg',    // ↔ settings/podProfiles profile (print specs/DPI)
//     colorways: [{ id, label, hex }, …],   // selectable garment colours
//     printAreas: { front: {x,y,w,h}, … },  // in SVG viewBox coords (800×900)
//     printAreaMm: { front: {w,h}, … },      // physical print size ↔ profile.print_area_mm
//   }
//
// px↔mm MAPPING (what the compositor uses): printAreas[slot] gives the rect in SVG
// viewBox pixels where the artwork is placed; printAreaMm[slot] gives that same
// rect's physical size in millimetres. The compositor computes effective DPI per
// placement from the artwork's source pixels and the physical mm — e.g.
//   effectiveDpi = artworkWidthPx / (printAreaMm.w / 25.4).
// The two must describe the SAME physical region; printAreas is only the on-screen
// preview geometry (aspect ratio should match printAreaMm's w:h).
//
// Degrades to [] on missing/error so callers never crash (same contract as
// loadPodProfiles).
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const TEMPLATES_REF = () => doc(db, 'settings', 'podMockupTemplates');

// Module-level cache. `null` = not loaded yet; an array (possibly empty) = loaded.
let _cache = null;
let _meta = { version: 0, provisional: true };

/**
 * loadPodMockupTemplates() → Promise<Array<template>>
 * Reads settings/podMockupTemplates once and caches the templates array. Returns []
 * if the doc is missing (not seeded yet) or on any read error — the Design Studio
 * then shows an empty template list rather than throwing.
 */
export const loadPodMockupTemplates = async () => {
  if (_cache !== null) return _cache;
  try {
    const snap = await getDoc(TEMPLATES_REF());
    if (snap.exists()) {
      const data = snap.data() || {};
      _cache = Array.isArray(data.templates) ? data.templates : [];
      _meta = { version: data.version || 0, provisional: data.provisional !== false };
    } else {
      _cache = [];
    }
  } catch (err) {
    console.warn('podMockupTemplates: could not load settings/podMockupTemplates, using [] :', err?.message);
    _cache = [];
  }
  return _cache;
};

/** The version/provisional metadata of the last successful load (for banners). */
export const getPodMockupTemplatesMeta = () => _meta;

/** Find a loaded template by its id (e.g. 'tee_flat'). Returns null if absent. */
export const getTemplateById = (templates, id) =>
  (Array.isArray(templates) ? templates : []).find((t) => t && t.id === id) || null;

/** The slots a template actually defines a print area for (e.g. ['front','back']). */
export const templateSlots = (template) =>
  template && template.printAreas ? Object.keys(template.printAreas) : [];

/** Drop the cache (e.g. after a platform edit) so the next load re-reads Firestore. */
export const clearPodMockupTemplatesCache = () => {
  _cache = null;
  _meta = { version: 0, provisional: true };
};
