// PlatformDac7 — the operator's DAC7 reportable-seller export (Slice E).
//
// DAC7 (EU Council Directive 2021/514) obliges the platform to report, per
// reportable seller per calendar year, the gross consideration + transaction
// count. This page runs exportDac7Report (platform-only callable) for a chosen
// year and lists each seller with their DAC7 profile completeness + the
// de-minimis verdict. Skatteverket registration/filing is a separate manual
// step; this is the data the operator files (or cross-checks against Stripe's
// own DAC7 export). CSV download for hand-off.
import React, { useState, useCallback, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, functions } from '../../firebase/config';
import PlatformLayout from '../../components/platform/PlatformLayout';
import toast from 'react-hot-toast';

// Pending identity-correction requests from sellers → platform approves/rejects.
const CorrectionRequests = () => {
  const [reqs, setReqs] = useState([]);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'dac7CorrectionRequests'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, (snap) => setReqs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {});
    return () => unsub();
  }, []);

  const resolve = async (requestId, approve) => {
    setBusy(requestId);
    try {
      await httpsCallable(functions, 'resolveDac7Correction')({ requestId, approve });
      toast.success(approve ? 'Godkänd och tillämpad.' : 'Avvisad.');
    } catch (e) { toast.error(e.message); } finally { setBusy(''); }
  };

  if (reqs.length === 0) return null;
  return (
    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h2 className="text-sm font-semibold text-amber-900 mb-2">Begärda rättelser ({reqs.length})</h2>
      <div className="space-y-2">
        {reqs.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 rounded bg-white px-3 py-2 text-sm">
            <span><strong>{r.shopId}</strong> · {r.field} → <span className="font-mono">{r.requestedValue}</span></span>
            <span className="flex gap-2">
              <button disabled={busy === r.id} onClick={() => resolve(r.id, true)} className="rounded bg-green-600 px-3 py-1 text-white disabled:opacity-50">Godkänn</button>
              <button disabled={busy === r.id} onClick={() => resolve(r.id, false)} className="rounded border border-gray-300 px-3 py-1">Avvisa</button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CURRENT_YEAR = new Date().getFullYear();

// Platform per-seller DAC7 editor: pull from Stripe + manually fill the fields
// Stripe redacts (full tax-ID). Platform owns the authoritative record.
const SellerEditor = ({ shopId, shopName, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await httpsCallable(functions, 'getDac7SellerProfile')({ shopId });
      setProfile(res.data?.profile || { shopId });
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  }, [shopId]);
  React.useEffect(() => { load(); }, [load]);

  const pull = async () => {
    setBusy('pull');
    try {
      await httpsCallable(functions, 'pullDac7FromStripe')({ shopId });
      toast.success('Hämtat från Stripe.');
      await load();
    } catch (e) { toast.error(e.message); } finally { setBusy(''); }
  };

  const save = async () => {
    setBusy('save');
    try {
      const { shopId: _s, updatedAt: _u, ...rest } = profile || {};
      await httpsCallable(functions, 'saveDac7SellerProfile')({ shopId, profile: rest });
      toast.success('Sparat.');
      onClose?.();
    } catch (e) { toast.error(e.message); } finally { setBusy(''); }
  };

  const set = (k, v) => setProfile((p) => ({ ...(p || {}), [k]: v }));
  const isIndividual = profile?.sellerType === 'individual';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">DAC7-uppgifter — {shopName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
        {loading ? <p className="text-sm text-gray-500">Laddar…</p> : (
          <div className="space-y-3">
            <button onClick={pull} disabled={busy === 'pull'} className="rounded border border-gray-300 px-3 py-1.5 text-sm">
              {busy === 'pull' ? 'Hämtar…' : 'Hämta från Stripe Express'}
            </button>
            <label className="block text-sm">
              <span className="text-gray-600">Säljartyp</span>
              <select value={profile?.sellerType || ''} onChange={(e) => set('sellerType', e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5">
                <option value="">—</option>
                <option value="individual">Privatperson</option>
                <option value="company">Företag</option>
              </select>
            </label>
            {[
              { k: 'legalName', label: 'Juridiskt namn' },
              { k: 'taxId', label: isIndividual ? 'Personnummer' : 'Organisationsnummer' },
              { k: 'vatNumber', label: 'VAT-nummer' },
              { k: 'address', label: 'Adress' },
              { k: 'countryOfResidence', label: 'Hemvistland (ISO, t.ex. SE)' },
              ...(isIndividual ? [{ k: 'dateOfBirth', label: 'Födelsedatum (YYYY-MM-DD)' }] : []),
            ].map(({ k, label }) => (
              <label key={k} className="block text-sm">
                <span className="text-gray-600">{label}</span>
                <input value={profile?.[k] || ''} onChange={(e) => set(k, e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5" />
              </label>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="rounded border border-gray-300 px-4 py-2 text-sm">Avbryt</button>
              <button onClick={save} disabled={busy === 'save'} className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy === 'save' ? 'Sparar…' : 'Spara'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PlatformDac7 = () => {
  const [editing, setEditing] = useState(null); // {shopId, shopName} | null
  const [year, setYear] = useState(CURRENT_YEAR - 1); // DAC7 reports the PRIOR calendar year
  const [rate, setRate] = useState('0.087');
  const [includeBelow, setIncludeBelow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const run = useCallback(async () => {
    setLoading(true);
    setReport(null);
    try {
      const res = await httpsCallable(functions, 'exportDac7Report')({
        year: Number(year),
        sekToEurRate: parseFloat((rate || '').replace(',', '.')) || undefined,
        includeBelowDeMinimis: includeBelow,
      });
      setReport(res.data);
    } catch (e) {
      toast.error(e.message || 'Kunde inte hämta DAC7-rapport.');
    } finally {
      setLoading(false);
    }
  }, [year, rate, includeBelow]);

  const downloadCsv = useCallback(() => {
    if (!report?.rows?.length) return;
    const head = ['shopId', 'shopName', 'sellerType', 'legalName', 'taxId', 'vatNumber', 'countryOfResidence', 'transactionCount', 'grossSEK', 'grossEUR', 'reportable', 'profileComplete'];
    const lines = [head.join(',')];
    for (const r of report.rows) {
      const p = r.profile || {};
      const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      lines.push([
        r.shopId, r.shopName, p.sellerType, p.legalName, p.taxId, p.vatNumber, p.countryOfResidence,
        r.aggregate.transactionCount, r.aggregate.grossConsiderationSek, r.aggregate.grossConsiderationEur,
        r.aggregate.reportable, r.profileComplete,
      ].map(cell).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `dac7-${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [report, year]);

  return (
    <PlatformLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-1">DAC7 — rapporterbara säljare</h1>
        <p className="text-sm text-gray-500 mb-6">
          Bruttoersättning + antal transaktioner per säljare och kalenderår. De-minimis: färre än 30 försäljningar OCH ≤ 2 000 EUR → undantagen (men beräknas ändå). Registrering hos Skatteverket sker separat.
        </p>

        <CorrectionRequests />

        <div className="flex flex-wrap items-end gap-4 mb-6 rounded-lg border border-gray-200 bg-white p-4">
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">År</span>
            <input type="number" min="2020" max={CURRENT_YEAR} value={year} onChange={(e) => setYear(e.target.value)} className="w-28 rounded border border-gray-300 px-2 py-1.5" />
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">SEK→EUR-kurs</span>
            <input type="text" value={rate} onChange={(e) => setRate(e.target.value)} className="w-28 rounded border border-gray-300 px-2 py-1.5" />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={includeBelow} onChange={(e) => setIncludeBelow(e.target.checked)} />
            Inkludera undantagna (de-minimis)
          </label>
          <button onClick={run} disabled={loading} className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {loading ? 'Hämtar…' : 'Hämta rapport'}
          </button>
          {report?.rows?.length > 0 && (
            <button onClick={downloadCsv} className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">
              Ladda ner CSV
            </button>
          )}
        </div>

        {report && (
          <>
            <p className="text-sm text-gray-600 mb-3">
              {report.rows.length} säljare visas · {report.reportableCount} rapporterbara · kurs {report.sekToEurRate}
            </p>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Butik</th>
                    <th className="px-3 py-2">Typ</th>
                    <th className="px-3 py-2">Juridiskt namn</th>
                    <th className="px-3 py-2 text-right">Transaktioner</th>
                    <th className="px-3 py-2 text-right">Brutto SEK</th>
                    <th className="px-3 py-2 text-right">Brutto EUR</th>
                    <th className="px-3 py-2">Rapporterbar</th>
                    <th className="px-3 py-2">Profil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.rows.map((r) => (
                    <tr key={r.shopId}>
                      <td className="px-3 py-2 font-medium text-gray-900">{r.shopName}</td>
                      <td className="px-3 py-2">{r.profile?.sellerType || '—'}</td>
                      <td className="px-3 py-2">{r.profile?.legalName || '—'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.aggregate.transactionCount}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.aggregate.grossConsiderationSek.toLocaleString('sv-SE')}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.aggregate.grossConsiderationEur.toLocaleString('sv-SE')}</td>
                      <td className="px-3 py-2">
                        {r.aggregate.reportable
                          ? <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">Ja</span>
                          : <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600">Undantagen</span>}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => setEditing({ shopId: r.shopId, shopName: r.shopName })}
                          className="underline underline-offset-2 hover:opacity-70"
                        >
                          {r.profileComplete
                            ? <span className="text-green-700">Komplett</span>
                            : <span className="text-red-600">Komplettera</span>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {report.rows.some((r) => r.aggregate.reportable && !r.profileComplete) && (
              <p className="mt-3 rounded bg-red-50 border-l-4 border-red-400 p-3 text-sm text-red-700">
                ⚠️ En eller flera rapporterbara säljare saknar komplett DAC7-profil (juridiskt namn, skatte-ID, adress, land, ev. födelsedatum). Komplettera innan rapportering.
              </p>
            )}
          </>
        )}
      </div>
      {editing && (
        <SellerEditor
          shopId={editing.shopId}
          shopName={editing.shopName}
          onClose={() => { setEditing(null); run(); }}
        />
      )}
    </PlatformLayout>
  );
};

export default PlatformDac7;
