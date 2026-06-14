// WCAG contrast helpers for the NORD accent token.
//
// DESIGN.md requires the per-shop accent to "pass AA as a button background
// with white text." This computes the contrast ratio of white on a given hex
// so the branding UI can warn a shop owner before they pick an unreadable
// accent. No dependencies.

// Parse a #rgb / #rrggbb hex to { r, g, b } (0–255), or null if invalid.
export const hexToRgb = (hex) => {
  if (typeof hex !== 'string') return null;
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
};

// Relative luminance per WCAG 2.1.
const relativeLuminance = ({ r, g, b }) => {
  const channel = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

// Contrast ratio between two rgb colors (1–21). Returns null on bad input.
export const contrastRatio = (rgb1, rgb2) => {
  if (!rgb1 || !rgb2) return null;
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const [lighter, darker] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
};

const WHITE = { r: 255, g: 255, b: 255 };

// Evaluate white text on the given accent hex. Returns:
//   { ratio, passAA, passAALarge, valid }
// AA normal text needs ≥ 4.5; AA large/UI (≥18px bold buttons) needs ≥ 3.0.
export const evaluateAccentContrast = (accentHex) => {
  const rgb = hexToRgb(accentHex);
  if (!rgb) return { ratio: null, passAA: false, passAALarge: false, valid: false };
  const ratio = contrastRatio(WHITE, rgb);
  return {
    ratio,
    passAA: ratio >= 4.5,
    passAALarge: ratio >= 3.0,
    valid: true,
  };
};
