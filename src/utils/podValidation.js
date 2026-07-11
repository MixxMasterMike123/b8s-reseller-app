// podValidation.js — the POD artwork validation ENGINE. Pure functions, no I/O.
//
// Given measured facts about an uploaded file + a spec profile (from
// settings/podProfiles), returns a three-tier verdict with the computed effective
// DPI and plain-Swedish reasons. ADVISORY: WARN/FAIL never blocks — it guides the
// seller; the printer decides. Thresholds derive ENTIRELY from the profile, so
// changing a profile's size/DPI/formats in config changes the verdict with no code
// change.
//
// Tier precedence: any FAIL → FAIL; else any WARN → WARN; else PASS.

const MM_PER_INCH = 25.4;

// Required pixels for a physical size at a target DPI. Config-driven threshold.
const requiredPx = (mm, dpi) => Math.round((mm / MM_PER_INCH) * dpi);

// Effective DPI achieved by widthPx×heightPx printed onto a w×h mm area: the
// smaller of the two axis DPIs (the limiting dimension). ROUND (not floor): a file
// at exactly the displayed required pixels computes to e.g. 299.97 DPI, which must
// read as 300 (PASS), not 299 (a spurious WARN). requiredPx() rounds too, so
// rounding here keeps the "required px ↔ DPI" pair consistent at the boundary.
// Exported for the Design Studio compositor, which computes the SAME effective DPI
// against the seller's chosen placement size instead of the full print area.
export const effectiveDpiFor = (widthPx, heightPx, areaMm) => {
  const dpiW = widthPx / (areaMm.w / MM_PER_INCH);
  const dpiH = heightPx / (areaMm.h / MM_PER_INCH);
  return Math.round(Math.min(dpiW, dpiH));
};

// Extension aliases: sellers name files .tif/.jpeg as often as .tiff/.jpg —
// canonicalize BOTH sides of the format match so profiles only list one spelling.
const EXT_ALIAS = { tif: 'tiff', jpeg: 'jpg' };
const norm = (s) => {
  const e = String(s || '').trim().toLowerCase();
  return EXT_ALIAS[e] || e;
};

// Find the accepted-format entry for an ext (case-insensitive). Returns the entry
// ({ext, preferred}) or null if the format isn't accepted at all.
const formatEntry = (profile, ext) =>
  (profile.accepted_formats || []).find((f) => norm(f.ext) === norm(ext)) || null;

/**
 * validateArtwork(measured, profile) → { tier, effectiveDpi, reasons:[{code,severity,message}] }
 *
 * measured:
 *   widthPx, heightPx          natural pixel dims (null for PDF/SVG/TIFF the browser can't decode)
 *   ext, mimeType              file extension / mime
 *   colorModeKnown             'rgb' | undefined (browsers can't reliably read CMYK)
 *   hasAlphaChannel            bool | undefined (undefined for non-raster)
 *   transparentPixelRatio      0..1 fraction of sampled pixels with alpha<250 | undefined
 *   fileSizeBytes              number
 *
 * profile: a settings/podProfiles entry (see scripts/seed-pod-profiles.cjs).
 */
export const validateArtwork = (measured, profile) => {
  const reasons = [];
  const add = (severity, code, message) => reasons.push({ code, severity, message });

  if (!profile) {
    return { tier: 'FAIL', effectiveDpi: null, reasons: [{ code: 'no_profile', severity: 'FAIL', message: 'Ingen tryckprofil vald.' }] };
  }

  const {
    widthPx, heightPx, ext, colorModeKnown,
    hasAlphaChannel, transparentPixelRatio, fileSizeBytes,
  } = measured || {};

  // ---- file size (vs max_file_mb) ----
  const maxBytes = (profile.max_file_mb || 0) * 1024 * 1024;
  if (maxBytes && typeof fileSizeBytes === 'number' && fileSizeBytes > maxBytes) {
    add('FAIL', 'file_too_large',
      `Filen är ${(fileSizeBytes / 1024 / 1024).toFixed(1)} MB — max ${profile.max_file_mb} MB för ${profile.label}.`);
  }

  // ---- format (accepted? preferred?) ----
  const fmt = formatEntry(profile, ext);
  if (!fmt) {
    const allowed = (profile.accepted_formats || []).map((f) => f.ext.toUpperCase()).join(', ');
    add('FAIL', 'format_not_accepted',
      `Formatet .${norm(ext) || '?'} stöds inte för ${profile.label}. Tillåtna: ${allowed || '—'}.`);
  } else if (fmt.preferred === false) {
    const preferred = (profile.accepted_formats || []).filter((f) => f.preferred).map((f) => f.ext.toUpperCase()).join('/');
    add('WARN', 'format_not_preferred',
      `.${norm(ext).toUpperCase()} fungerar men är inte idealiskt${preferred ? ` — föredra ${preferred}` : ''}.`);
  }

  // ---- resolution (effective DPI vs min/target) — only when dimensions are known ----
  const dimsUnknown = widthPx == null || heightPx == null;
  let effectiveDpi = null;

  if (dimsUnknown) {
    // PDF/SVG/TIFF: browser can't read pixel dims. Don't FAIL on resolution or
    // transparency; emit an ACTIONABLE WARN naming the required pixels so the
    // seller can self-check in their design tool. (PDF is the preferred poster
    // format, so this is the common path for posters.)
    const reqW = requiredPx(profile.print_area_mm.w, profile.target_dpi);
    const reqH = requiredPx(profile.print_area_mm.h, profile.target_dpi);
    add('WARN', 'dimensions_unknown',
      `Kunde inte läsa måtten för .${norm(ext).toUpperCase()} automatiskt. För ${profile.label} ` +
      `behöver originalet vara minst ${reqW}×${reqH} px vid ${profile.target_dpi} DPI ` +
      `(${profile.print_area_mm.w}×${profile.print_area_mm.h} mm). Kontrollera måtten i ditt designprogram.`);
  } else {
    // Compute effective DPI against the main print area AND any alt_sizes; the
    // seller may legitimately target a smaller alternate, so take the BEST (max).
    const sizes = [{ label: 'huvudformat', w: profile.print_area_mm.w, h: profile.print_area_mm.h }]
      .concat(Array.isArray(profile.alt_sizes) ? profile.alt_sizes : []);
    let best = { dpi: -1, label: '' };
    for (const s of sizes) {
      const dpi = effectiveDpiFor(widthPx, heightPx, { w: s.w, h: s.h });
      if (dpi > best.dpi) best = { dpi, label: s.label };
    }
    effectiveDpi = best.dpi;
    const sizeNote = best.label && best.label !== 'huvudformat' ? ` (vid ${best.label})` : '';

    if (effectiveDpi < profile.min_dpi) {
      add('FAIL', 'resolution_too_low',
        `Upplösningen ger ${effectiveDpi} DPI${sizeNote} — under minimum ${profile.min_dpi} DPI. ` +
        `Bilden blir suddig i tryck. Ladda upp en större fil.`);
    } else if (effectiveDpi < profile.target_dpi) {
      add('WARN', 'resolution_below_target',
        `Upplösningen ger ${effectiveDpi} DPI${sizeNote} — under rekommenderade ${profile.target_dpi} DPI ` +
        `(men över minimum ${profile.min_dpi}). Acceptabelt men inte optimalt.`);
    }

    // ---- transparency (only meaningful for raster with a known alpha story) ----
    if (profile.transparency === 'required') {
      if (hasAlphaChannel === false) {
        // No alpha channel at all (e.g. JPEG) → can't be cut out.
        add('FAIL', 'transparency_missing',
          `${profile.label} kräver transparent bakgrund, men filen saknar transparens (t.ex. JPEG). ` +
          `Exportera som PNG med genomskinlig bakgrund.`);
      } else if (hasAlphaChannel === true && typeof transparentPixelRatio === 'number' && transparentPixelRatio < 0.005) {
        // Alpha channel present but effectively all-opaque (solid background) →
        // would print as a filled rectangle. WARN (some sellers want that), don't FAIL.
        add('WARN', 'transparency_effectively_opaque',
          `Bilden har inga genomskinliga ytor – den trycks som en fylld rektangel. ` +
          `Vill du bara ha motivet på produkten, exportera med transparent bakgrund.`);
      }
    }

    // ---- color mode (cmyk_preferred profile, RGB source) ----
    if (profile.color_mode === 'cmyk_preferred' && colorModeKnown === 'rgb') {
      add('WARN', 'color_mode_rgb',
        `Filen är RGB; ${profile.label} trycks i CMYK. Färgerna konverteras och kan skilja något. ` +
        `Leverera gärna CMYK för exakt färg.`);
    }
  }

  // ---- worst-severity wins ----
  let tier = 'PASS';
  if (reasons.some((r) => r.severity === 'FAIL')) tier = 'FAIL';
  else if (reasons.some((r) => r.severity === 'WARN')) tier = 'WARN';

  return { tier, effectiveDpi, reasons };
};

export default validateArtwork;
