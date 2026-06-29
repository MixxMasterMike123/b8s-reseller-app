// podTier.js — shared mapping of a validation tier → admin StatusPill tone + label.
// Used by the upload modal, the artwork library list, and the mapping picker so the
// PASS/WARN/FAIL verdict reads identically everywhere.
export const TIER_TONE = { PASS: 'success', WARN: 'warning', FAIL: 'danger' };
export const TIER_LABEL = { PASS: 'Godkänd', WARN: 'Varning', FAIL: 'Underkänd' };

export const tierTone = (tier) => TIER_TONE[tier] || 'neutral';
export const tierLabel = (tier) => TIER_LABEL[tier] || tier || '—';
