// HoodieFlat.jsx — a clean, minimal front-view flat illustration of a pullover hoodie.
//
// Garment flat (technical fashion drawing) used as the mockup base. The compositor
// (slice 2) overlays the artwork print area; the SVG draws NO print area itself.
// Includes the hoodie-defining details: a hood, LONG sleeves ending in ribbed cuffs,
// a kangaroo pocket and drawstrings.
//
// Props:
//   • color   — the garment body fill (white #ffffff → black #1a1a1a). A subtle
//               grey stroke + soft inner shadow keeps a white hoodie visible on a
//               white admin canvas.
//   • className / style / ...rest — passed to the root <svg>.
//
// viewBox is 800×900 (HOODIE_VIEWBOX). The print-area geometry that must agree with
// this drawing lives in ../../../../config/podMockupTemplates.js (template id
// 'hoodie_flat', printAreas.front = {x:285,y:250,w:230,h:307}) — placed BELOW the
// drawstring bobbins (which end above y≈240) and ABOVE the kangaroo pocket (top
// y≈596). If you move the drawstrings/pocket here, re-check that rect.
import React from 'react';

export const HOODIE_VIEWBOX = { w: 800, h: 900 };

const OUTLINE = '#9aa0a6';

const HoodieFlat = ({ color = '#ffffff', className = '', style, ...rest }) => {
  const uid = React.useMemo(() => `hoodie-${Math.random().toString(36).slice(2, 8)}`, []);
  const shadowId = `${uid}-shadow`;

  // Body + LONG sleeves as one silhouette. Sleeves angle slightly outward and run
  // the full torso length, ending in ribbed cuffs (~y740). Torso spans x205..595,
  // hem y830 — symmetric about x=400.
  const bodyPath = `
    M 300 150
    C 288 158, 276 165, 262 170
    C 232 180, 200 192, 178 210
    C 142 250, 110 430, 100 655
    L 98 696
    C 97 706, 98 716, 100 726
    C 101 736, 108 742, 118 741
    L 172 736
    C 180 735, 184 728, 184 720
    L 182 690
    C 188 560, 196 430, 207 348
    L 205 812
    C 205 822, 213 830, 223 830
    L 577 830
    C 587 830, 595 822, 595 812
    L 593 348
    C 604 430, 612 560, 618 690
    L 616 720
    C 616 728, 620 735, 628 736
    L 682 741
    C 692 742, 699 736, 700 726
    C 702 716, 703 706, 702 696
    L 700 655
    C 690 430, 658 250, 622 210
    C 600 192, 568 180, 538 170
    C 524 165, 512 158, 500 150
    Z
  `;

  return (
    <svg
      viewBox={`0 0 ${HOODIE_VIEWBOX.w} ${HOODIE_VIEWBOX.h}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      role="img"
      aria-label="Hoodie (framvy)"
      {...rest}
    >
      <defs>
        <radialGradient id={shadowId} cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0" />
          <stop offset="80%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.12" />
        </radialGradient>
      </defs>

      {/* ── Body + long sleeves silhouette ────────────────────────────────── */}
      <path
        d={bodyPath}
        fill={color}
        stroke={OUTLINE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d={bodyPath} fill={`url(#${shadowId})`} pointerEvents="none" />

      {/* Sleeve inner seams — separate the sleeves from the torso visually
          (armpit down to cuff, following the silhouette's inner sleeve edge). */}
      <path d="M 207 348 C 196 430, 188 560, 182 690" fill="none" stroke={OUTLINE} strokeWidth="2.5" opacity="0.8" />
      <path d="M 593 348 C 604 430, 612 560, 618 690" fill="none" stroke={OUTLINE} strokeWidth="2.5" opacity="0.8" />

      {/* ── Ribbed cuffs ────────────────────────────────────────────────────
          Cuff top line + short rib ticks at each sleeve end. */}
      <path d="M 99 692 L 183 697" fill="none" stroke={OUTLINE} strokeWidth="2.5" opacity="0.85" />
      <path d="M 120 695 L 118 740" fill="none" stroke={OUTLINE} strokeWidth="1.5" opacity="0.5" />
      <path d="M 142 694 L 141 739" fill="none" stroke={OUTLINE} strokeWidth="1.5" opacity="0.5" />
      <path d="M 163 693 L 163 738" fill="none" stroke={OUTLINE} strokeWidth="1.5" opacity="0.5" />
      <path d="M 701 692 L 617 697" fill="none" stroke={OUTLINE} strokeWidth="2.5" opacity="0.85" />
      <path d="M 680 695 L 682 740" fill="none" stroke={OUTLINE} strokeWidth="1.5" opacity="0.5" />
      <path d="M 658 694 L 659 739" fill="none" stroke={OUTLINE} strokeWidth="1.5" opacity="0.5" />
      <path d="M 637 693 L 637 738" fill="none" stroke={OUTLINE} strokeWidth="1.5" opacity="0.5" />

      {/* ── Hood ────────────────────────────────────────────────────────────
          Two arcs forming the hood behind the neck + the inner lining recess. */}
      <path
        d="
          M 300 150
          C 320 96, 480 96, 500 150
          C 470 128, 330 128, 300 150
          Z
        "
        fill={color}
        stroke={OUTLINE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Inner hood opening (darker recess) */}
      <path
        d="M 316 150 C 340 122, 460 122, 484 150 C 456 176, 344 176, 316 150 Z"
        fill="#000000"
        fillOpacity="0.12"
        stroke={OUTLINE}
        strokeWidth="2"
      />

      {/* ── Neck rib ────────────────────────────────────────────────────────*/}
      <path
        d="M 300 150 C 330 172, 470 172, 500 150"
        fill="none"
        stroke={OUTLINE}
        strokeWidth="2.5"
        opacity="0.8"
      />

      {/* ── Drawstrings ─────────────────────────────────────────────────────
          SHORT cords — they must stay ABOVE the front print area (top y=250):
          cords end y≈228, bobbins bottom y≈240. Visible but clear of artwork. */}
      <path d="M 374 164 L 370 228" fill="none" stroke={OUTLINE} strokeWidth="3" strokeLinecap="round" />
      <path d="M 426 164 L 430 228" fill="none" stroke={OUTLINE} strokeWidth="3" strokeLinecap="round" />
      <circle cx="370" cy="233" r="6" fill={color} stroke={OUTLINE} strokeWidth="2.5" />
      <circle cx="430" cy="233" r="6" fill={color} stroke={OUTLINE} strokeWidth="2.5" />

      {/* ── Kangaroo pocket ─────────────────────────────────────────────────
          A wide pouch across the lower torso. The print area sits ABOVE this. */}
      <path
        d="
          M 262 596
          L 538 596
          L 566 720
          C 568 728, 562 736, 554 736
          L 246 736
          C 238 736, 232 728, 234 720
          Z
        "
        fill="none"
        stroke={OUTLINE}
        strokeWidth="2.5"
        strokeLinejoin="round"
        opacity="0.85"
      />
      {/* Pocket hand openings (slanted slits at each end) */}
      <path d="M 262 596 L 246 660" fill="none" stroke={OUTLINE} strokeWidth="2.5" opacity="0.85" />
      <path d="M 538 596 L 554 660" fill="none" stroke={OUTLINE} strokeWidth="2.5" opacity="0.85" />

      {/* ── Ribbed hem ──────────────────────────────────────────────────────*/}
      <path d="M 205 806 L 595 806" fill="none" stroke={OUTLINE} strokeWidth="2" opacity="0.55" />
    </svg>
  );
};

export default HoodieFlat;
