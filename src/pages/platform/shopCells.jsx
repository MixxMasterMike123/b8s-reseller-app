// Shared platform-console shop cells — used by both PlatformShops (fleet row)
// and PlatformShopDetail (drill-down page). Extracted so there is exactly ONE
// source for the commission editor, legal-readiness badge, and Connect-status
// label (avoids drift between the two surfaces). DARK platform design.
import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase/config';
import { getLegalReadiness } from '../../utils/legalPageReadiness';
import toast from 'react-hot-toast';

// Stripe Connect status label for a shop, derived from the payments map (which is
// platform-/Stripe-set only). Precedence: charging > has account (onboarding) >
// invited (connectEnabled) > off.
export const connectLabel = (shop) => {
  const p = shop.payments || {};
  if (p.chargesEnabled) return { text: 'Aktivt', cls: 'bg-green-500/15 text-green-300' };
  if (p.stripeAccountId) return { text: 'Onboarding', cls: 'bg-amber-500/15 text-amber-300' };
  if (p.connectEnabled) return { text: 'Inbjuden', cls: 'bg-sky-500/15 text-sky-300' };
  return { text: 'Av', cls: 'bg-white/5 text-gray-500' };
};

// Legal-pages readiness for the operator. Reads the same gate the seller's
// AdminSettings + the storefront use (legalPageReadiness.js) against the shop's
// stored storeIdentity, so the operator sees at a glance whether a shop's
// auto-generated legal pages are publishable (return address + VAT status set).
// No extra fetch: storeIdentity already rides on the loaded shop doc.
// DARK platform design: emerald = ready, amber = incomplete (mirrors connectLabel).
export const LegalCell = ({ shop }) => {
  const { ready, blockers } = getLegalReadiness(shop.storeIdentity || {});
  if (ready) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-500/15 text-green-300">
        Klar
      </span>
    );
  }
  return (
    <span
      title={blockers.map((b) => b.label).join('\n')}
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-500/15 text-amber-300"
    >
      Ofullständig ({blockers.length})
    </span>
  );
};

// Per-shop platform commission — PLATFORM-ONLY (negotiate a lower fee for a big
// seller). Shows the effective fee or "Standard" (platform default applies when
// unset), with an inline editor. Percentage in/out; stored as integer basis
// points via setShopCommission (requirePlatform server-side; firestore.rules
// also blocks a direct payments-map write). The shop owner never sees this.
export const CommissionCell = ({ shop, onSaved }) => {
  const currentBps = Number.isInteger(shop.payments?.commissionBps) ? shop.payments.commissionBps : null;
  const [editing, setEditing] = useState(false);
  const [pct, setPct] = useState(currentBps != null ? (currentBps / 100).toString() : '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const n = parseFloat((pct || '').replace(',', '.'));
    if (!Number.isFinite(n) || n < 0 || n > 100) { toast.error('Ange 0–100 %.'); return; }
    const bps = Math.round(n * 100);
    try {
      setSaving(true);
      await httpsCallable(functions, 'setShopCommission')({ shopId: shop.id, commissionBps: bps });
      toast.success(`Avgift sparad: ${(bps / 100).toFixed(2)} %`);
      onSaved?.(bps);
      setEditing(false);
    } catch (e) {
      toast.error(e.message || 'Kunde inte spara avgift.');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => { setPct(currentBps != null ? (currentBps / 100).toString() : ''); setEditing(true); }}
        title="Sätt plattformsavgift för denna butik"
        className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-200 hover:bg-indigo-500/15 hover:text-indigo-300"
      >
        {currentBps != null ? `${(currentBps / 100).toFixed(2)} %` : <span className="text-gray-500">Standard</span>}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number" min="0" max="100" step="0.01" value={pct} autoFocus
        onChange={(e) => setPct(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
        placeholder="5"
        className="w-16 rounded-lg border border-white/10 bg-gray-950 px-2 py-1 text-xs text-gray-100 focus:border-indigo-500 focus:outline-none"
      />
      <span className="text-xs text-gray-500">%</span>
      <button disabled={saving} onClick={save} className="rounded-lg bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
        {saving ? '…' : 'Spara'}
      </button>
      <button onClick={() => setEditing(false)} className="rounded-lg bg-white/5 px-2 py-1 text-xs text-gray-400 hover:bg-white/10">✕</button>
    </div>
  );
};
