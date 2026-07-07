// garments/index.js — registry of garment flats keyed by the template's `garment`
// field (settings/podMockupTemplates). CompositorCanvas + the DesignStudio template
// picker resolve the right SVG component + its viewBox from here, so adding a new
// garment flat is: drop a *Flat.jsx, register it in both maps below.
import TeeFlat, { TEE_VIEWBOX } from './TeeFlat';
import HoodieFlat, { HOODIE_VIEWBOX } from './HoodieFlat';

// garment key → React component that renders the flat (takes a `color` prop).
export const GARMENT_FLATS = {
  tee: TeeFlat,
  hoodie: HoodieFlat,
};

// garment key → the flat's SVG viewBox { w, h } (print-area px coords are in this space).
export const GARMENT_VIEWBOX = {
  tee: TEE_VIEWBOX,
  hoodie: HOODIE_VIEWBOX,
};

export { TeeFlat, HoodieFlat, TEE_VIEWBOX, HOODIE_VIEWBOX };
