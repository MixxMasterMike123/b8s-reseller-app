// MigrateWooModal — platform operator imports a WooCommerce store's PUBLIC catalog
// (WooCommerce Store API) into a target shop as a DEMO (products + variants + prices
// + images). Calls the platform-gated migrateFromWoo callable. Shows a LIVE progress
// bar: the client generates a migrationId, subscribes to migrations/{id} via
// onSnapshot BEFORE awaiting the callable (so it sees progress as it happens), and
// renders done/total + phase. DEMO-ONLY (no orders/customers/inventory/print-files).
import React, { useState, useRef, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { functions, db } from '../../firebase/config';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const newMigrationId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `mig-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const phaseLabel = (phase) => ({
  fetching: 'Hämtar katalog…',
  creating: 'Skapar produkter…',
  done: 'Klar',
  error: 'Fel',
}[phase] || 'Migrerar…');

const MigrateWooModal = ({ shop, onClose }) => {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(null);
  const unsubRef = useRef(null);

  // Close the progress subscription if the modal unmounts mid-import (e.g. route
  // change) — the submit() finally only runs when the callable settles.
  useEffect(() => () => { if (unsubRef.current) unsubRef.current(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = url.trim();
    if (!trimmed) return setError('Ange butikens WooCommerce-adress.');
    setBusy(true);
    setProgress(null);

    // Client-generated id + subscribe BEFORE the call, so the bar animates live
    // (if the server generated it, we'd only learn it when the call resolves).
    const migrationId = newMigrationId();
    unsubRef.current = onSnapshot(
      doc(db, 'migrations', migrationId),
      (snap) => { if (snap.exists()) setProgress(snap.data()); },
      (err) => console.warn('migration progress subscription error:', err?.message)
    );

    try {
      const res = await httpsCallable(functions, 'migrateFromWoo', { timeout: 540000 })({
        shopId: shop.id,
        wooDomain: trimmed,
        migrationId,
      });
      setResult(res.data || {});
    } catch (err) {
      console.error('migrateFromWoo failed:', err);
      // Resumable (skips already-imported), so a big-catalog timeout is recoverable.
      if (err?.code === 'functions/deadline-exceeded' || /deadline/i.test(err?.message || '')) {
        setError('Tidsgränsen nåddes för en stor katalog. En del importerades — klicka "Importera katalog" igen för att fortsätta med resten (redan importerade hoppas över).');
      } else {
        setError(err?.message || 'Migreringen misslyckades.');
      }
    } finally {
      setBusy(false);
      if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    }
  };

  const pct = progress?.total ? Math.min(100, Math.round((100 * (progress.done || 0)) / progress.total)) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={busy ? undefined : onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-gray-900 border border-white/10 shadow-2xl text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-white/10 px-6 py-5">
          <div className="rounded-lg bg-purple-500/15 p-2">
            <ArrowDownTrayIcon className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Migrera från WooCommerce</h2>
            <p className="mt-0.5 text-sm text-gray-400">
              Importerar den publika katalogen till{' '}
              <span className="font-medium text-gray-200">{shop.name || shop.id}</span> som demo.
            </p>
          </div>
        </div>

        {result ? (
          // ── Result summary ──────────────────────────────────────────────
          <div className="px-6 py-5 space-y-3 text-sm">
            <p className="text-emerald-300">
              ✓ {result.created} produkter importerade från {result.source}.
            </p>
            {result.productsFound > 0 && (
              <p className="text-gray-400">{result.productsFound} hittades totalt.</p>
            )}
            {result.alreadyImported > 0 && (
              <p className="text-gray-400">{result.alreadyImported} fanns redan (hoppades över).</p>
            )}
            {result.imageFailures > 0 && (
              <p className="text-amber-300">{result.imageFailures} bilder kunde inte hämtas.</p>
            )}
            {Array.isArray(result.skipped) && result.skipped.length > 0 && (
              <p className="text-amber-300">
                {result.skipped.length} produkter hoppades över: {result.skipped.slice(0, 5).join(', ')}
                {result.skipped.length > 5 ? '…' : ''}
              </p>
            )}
            {result.note && (
              <p className="rounded-lg bg-white/5 px-3 py-2 text-xs leading-relaxed text-gray-400">
                {result.note}
              </p>
            )}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500"
              >
                Klart
              </button>
            </div>
          </div>
        ) : (
          // ── Input form + live progress ──────────────────────────────────
          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                WooCommerce-adress <span className="text-purple-400">*</span>
              </label>
              <input
                autoFocus
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={busy}
                placeholder="t.ex. giffarna.sportmerch.se"
                className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-purple-400 focus:outline-none disabled:opacity-60"
              />
              <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                Hämtar produkter, varianter, priser och bilder från butikens publika
                katalog (WooCommerce Store API). Lager, ordrar, kunder och tryckfiler ingår inte (demo).
              </p>
            </div>

            {/* Live progress bar */}
            {busy && progress && (
              <div>
                <div className="mb-1 flex justify-between text-xs text-gray-400">
                  <span>{phaseLabel(progress.phase)}</span>
                  <span>
                    {progress.done || 0}
                    {progress.total ? ` / ${progress.total}` : ''} produkter
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded bg-white/10">
                  <div
                    className={'h-full bg-purple-500 transition-all ' + (pct === null ? 'animate-pulse' : '')}
                    style={{ width: pct === null ? '15%' : `${pct}%` }}
                  />
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-gray-200 disabled:opacity-50"
              >
                Avbryt
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
              >
                {busy ? 'Importerar…' : 'Importera katalog'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default MigrateWooModal;
