// PrintShopOrderDetail — one order's PRODUCTION view. Calls getPrintJob (per-
// resource scope check server-side); renders ship-to + per-line production fields
// + signed-URL downloads. The callable returns ONLY production data, so there is
// no customer PII here to leak by accident. Unresolved lines (renamed SKU / deleted
// artwork) show a visible problem, never a silent gap.
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase/config';
import PrintShopLayout from '../../components/print/PrintShopLayout';

const fmtDate = (iso) => { try { return iso ? new Date(iso).toLocaleDateString('sv-SE') : ''; } catch { return iso || ''; } };

const TIER_BADGE = {
  PASS: 'bg-emerald-500/15 text-emerald-300',
  WARN: 'bg-amber-500/15 text-amber-300',
  FAIL: 'bg-red-500/15 text-red-300',
};

const PrintShopOrderDetail = () => {
  const { orderId } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError('');
      try {
        const res = await httpsCallable(functions, 'getPrintJob')({ orderId });
        if (!cancelled) setJob(res.data);
      } catch (e) {
        console.error('getPrintJob failed:', e);
        if (!cancelled) setError(e?.message || 'Kunde inte ladda ordern.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orderId]);

  return (
    <PrintShopLayout>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <Link to="/" className="text-sm text-indigo-300 hover:text-indigo-200">← Tillbaka till kön</Link>

        {loading ? (
          <p className="mt-4 text-sm text-gray-400">Laddar…</p>
        ) : error ? (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
        ) : job ? (
          <>
            <div className="mt-3 mb-5">
              <h1 className="text-lg font-bold">Order {job.order.orderNumber}</h1>
              <p className="text-sm text-gray-400">
                {job.shopName} · {fmtDate(job.order.orderDate)} · status: {job.order.status || '—'}
              </p>
            </div>

            {/* Ship-to (production-scoped — no email/phone) */}
            <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
              <h2 className="mb-1 text-xs uppercase tracking-wide text-gray-400">Leveransadress</h2>
              <p className="text-sm text-gray-200">
                {job.shipTo.name}<br />
                {job.shipTo.line1}{job.shipTo.line2 ? `, ${job.shipTo.line2}` : ''}<br />
                {job.shipTo.postalCode} {job.shipTo.city}<br />
                {job.shipTo.country}
              </p>
            </div>

            {/* Production lines */}
            <h2 className="mb-2 text-xs uppercase tracking-wide text-gray-400">Produktionsrader</h2>
            <div className="space-y-3">
              {job.lines.map((ln, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-4">
                    {ln.artwork?.previewUrl && (
                      <img src={ln.artwork.previewUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg border border-white/10 object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-white">{ln.productName}</span>
                        <span className="font-mono text-xs text-gray-400">{ln.sku}</span>
                        {ln.variantLabel && <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-gray-300">{ln.variantLabel}</span>}
                        <span className="text-xs text-gray-400">× {ln.quantity}</span>
                        {ln.artwork?.tier && (
                          <span className={`rounded px-1.5 py-0.5 text-xs ${TIER_BADGE[ln.artwork.tier] || 'bg-white/10 text-gray-300'}`}>{ln.artwork.tier}</span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-400">
                        {ln.purpose ? `Profil: ${ln.purpose}` : ''}{ln.placement ? ` · Placering: ${ln.placement}` : ''}
                      </div>

                      {ln.artwork?.unresolved ? (
                        <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                          ⚠ Kunde inte hämta original: {ln.artwork.reason}. Kontakta butiken.
                        </div>
                      ) : ln.artwork?.downloadUrl ? (
                        <a
                          href={ln.artwork.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block rounded-lg bg-indigo-500/20 px-3 py-1.5 text-sm font-medium text-indigo-200 hover:bg-indigo-500/30"
                        >
                          Ladda ner original{ln.artwork.fileName ? ` (${ln.artwork.fileName})` : ''}
                        </a>
                      ) : (
                        <p className="mt-2 text-sm text-gray-500">Ingen nedladdningslänk tillgänglig.</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {job.lines.length === 0 && <p className="text-sm text-gray-400">Inga POD-rader i denna order.</p>}
            </div>
          </>
        ) : null}
      </div>
    </PrintShopLayout>
  );
};

export default PrintShopOrderDetail;
