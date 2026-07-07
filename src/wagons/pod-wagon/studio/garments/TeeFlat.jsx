// TeeFlat.jsx — a clean, minimal front-view flat illustration of a crew-neck t-shirt.
//
// This is a GARMENT FLAT (a technical fashion "flat" drawing): a professional,
// proportional line illustration used as the mockup base. The compositor (slice 2)
// overlays the artwork print area on top of this SVG — the SVG itself draws NO
// print area (that is the compositor's job).
//
// Props:
//   • color   — the garment body fill. Works across the full range white
//               (#ffffff) → black (#1a1a1a). A subtle grey stroke + soft inner
//               shadow keeps a WHITE garment visible on a white admin canvas.
//   • className / style / ...rest — passed to the root <svg> (sizing is caller's job).
//
// viewBox is 800×900 (see TEE_VIEWBOX). The print-area geometry that must agree
// visually with this drawing lives in ../../../../config/podMockupTemplates.js
// (template id 'tee_flat', printAreas.front). If you nudge the collar/shoulders
// here, re-check that rect.
import React from 'react';

export const TEE_VIEWBOX = { w: 800, h: 900 };

// A gentle outline colour that reads on both a white garment (needs a visible edge)
// and a black garment (a slightly lighter hairline). Mid-grey works for both.
const OUTLINE = '#9aa0a6';

const TeeFlat = ({ color = '#ffffff', className = '', style, ...rest }) => {
  // Stable-ish id suffix so multiple TeeFlats on one page don't clash on the
  // gradient/shadow defs. (Math.random is fine — this is presentational only.)
  const uid = React.useMemo(() => `tee-${Math.random().toString(36).slice(2, 8)}`, []);
  const shadowId = `${uid}-shadow`;

  return (
    <svg
      viewBox={`0 0 ${TEE_VIEWBOX.w} ${TEE_VIEWBOX.h}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      role="img"
      aria-label="T-shirt (framvy)"
      {...rest}
    >
      <defs>
        {/* Soft inner shadow so the body reads as a garment (subtle volume) and a
            white tee is never invisible on a white background. */}
        <radialGradient id={shadowId} cx="50%" cy="38%" r="72%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0" />
          <stop offset="82%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.10" />
        </radialGradient>
      </defs>

      {/* ── Body + sleeves as ONE silhouette path ───────────────────────────
          Symmetric crew-neck tee. Coordinates hand-tuned for the 800×900 box:
          shoulders ~x120..680, hem ~y820, sleeve tips ~x60/740 y360. */}
      <path
        d="
          M 300 96
          C 300 150, 500 150, 500 96
          L 512 100
          C 560 112, 604 132, 644 160
          L 748 250
          C 760 260, 762 276, 752 288
          L 672 388
          C 664 398, 650 400, 640 392
          L 604 362
          L 604 812
          C 604 822, 596 830, 586 830
          L 214 830
          C 204 830, 196 822, 196 812
          L 196 362
          L 160 392
          C 150 400, 136 398, 128 388
          L 48 288
          C 38 276, 40 260, 52 250
          L 156 160
          C 196 132, 240 112, 288 100
          Z
        "
        fill={color}
        stroke={OUTLINE}
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Inner-shadow overlay (same silhouette, non-interactive). */}
      <path
        d="
          M 300 96
          C 300 150, 500 150, 500 96
          L 512 100
          C 560 112, 604 132, 644 160
          L 748 250
          C 760 260, 762 276, 752 288
          L 672 388
          C 664 398, 650 400, 640 392
          L 604 362
          L 604 812
          C 604 822, 596 830, 586 830
          L 214 830
          C 204 830, 196 822, 196 812
          L 196 362
          L 160 392
          C 150 400, 136 398, 128 388
          L 48 288
          C 38 276, 40 260, 52 250
          L 156 160
          C 196 132, 240 112, 288 100
          Z
        "
        fill={`url(#${shadowId})`}
        pointerEvents="none"
      />

      {/* ── Ribbed crew collar ──────────────────────────────────────────────
          Outer neckline + an inner rib line to read as a ribbed collar. */}
      <path
        d="M 300 96 C 300 150, 500 150, 500 96"
        fill="none"
        stroke={OUTLINE}
        strokeWidth="3"
      />
      <path
        d="M 296 112 C 300 158, 500 158, 504 112"
        fill="none"
        stroke={OUTLINE}
        strokeWidth="2"
        opacity="0.7"
      />

      {/* Sleeve hem accents (short lines near each cuff) — reads as sleeve openings. */}
      <path d="M 128 388 L 196 356" fill="none" stroke={OUTLINE} strokeWidth="2" opacity="0.6" />
      <path d="M 672 388 L 604 356" fill="none" stroke={OUTLINE} strokeWidth="2" opacity="0.6" />
    </svg>
  );
};

export default TeeFlat;
