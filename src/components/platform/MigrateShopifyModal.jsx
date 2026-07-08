// MigrateShopifyModal — platform operator imports a Shopify store's PUBLIC
// catalog into a target shop as a DEMO (products + variants + prices + images).
// Calls the platform-gated migrateFromShopify callable (fetch + reupload happen
// server-side because /products.json is CORS-blocked in the browser).
//
// DEMO-ONLY, and the UI says so: no orders/customers/inventory/print-files.
import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase/config';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const MigrateShopifyModal = ({ shop, onClose }) => {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = url.trim();
    if (!trimmed) return setError('Ange butikens Shopify-adress.');
    setBusy(true);
    try {
      const res = await httpsCallable(functions, 'migrateFromShopify')({
        shopId: shop.id,
        shopifyDomain: trimmed,
      });
      setResult(res.data || {});
    } catch (err) {
      console.error('migrateFromShopify failed:', err);
      setError(err?.message || 'Migreringen misslyckades.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={busy ? undefined : onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-gray-900 border border-white/10 shadow-2xl text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-white/10 px-6 py-5">
          <div className="rounded-lg bg-emerald-500/15 p-2">
            <ArrowDownTrayIcon className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Migrera från Shopify</h2>
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
            {result.productsFound > result.created && (
              <p className="text-gray-400">{result.productsFound} hittades totalt.</p>
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
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Klart
              </button>
            </div>
          </div>
        ) : (
          // ── Input form ──────────────────────────────────────────────────
          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Shopify-adress <span className="text-emerald-400">*</span>
              </label>
              <input
                autoFocus
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="t.ex. shop.ninetone.com"
                className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-emerald-400 focus:outline-none"
              />
              <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                Hämtar produkter, varianter, priser och bilder från butikens publika
                katalog. Lager, ordrar, kunder och tryckfiler ingår inte (demo).
              </p>
            </div>

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
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
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

export default MigrateShopifyModal;
