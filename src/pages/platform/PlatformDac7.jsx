// PlatformDac7 — the operator's DAC7 reportable-seller export (Slice E).
//
// DAC7 (EU Council Directive 2021/514) obliges the platform to report, per
// reportable seller per calendar year, the gross consideration + transaction
// count. This page runs exportDac7Report (platform-only callable) for a chosen
// year and lists each seller with their DAC7 profile completeness + the
// de-minimis verdict. Skatteverket registration/filing is a separate manual
// step; this is the data the operator files (or cross-checks against Stripe's
// own DAC7 export). CSV download for hand-off.
//
// Styling matches the dark platform console (PlatformLayout / PlatformShops):
// bg-gray-950 surface, bg-gray-900 cards, border-white/10, indigo accent.
import React, { useState, useCallback, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db, functions } from '../../firebase/config';
import PlatformLayout from '../../components/platform/PlatformLayout';
import toast from 'react-hot-toast';

// Shared field styles (dark console).
const inputCls = 'rounded-lg border border-white/10 bg-gray-950 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-600 focus:border-indigo-500 focus:outline-none';
const labelCls = 'block text-xs font-medium uppercase tracking-wider text-gray-500 mb-1';
const btnPrimary = 'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50';
const btnGhost = 'rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-white/10 disabled:opacity-50';

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
    <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <h2 className="text-sm font-semibold text-amber-300 mb-3">Begärda rättelser ({reqs.length})</h2>
      <div className="space-y-2">
        {reqs.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-sm text-gray-200">
            <span><strong className="text-white">{r.shopId}</strong> · {r.field} → <span className="font-mono text-indigo-300">{r.requestedValue}</span></span>
            <span className="flex gap-2">
              <button disabled={busy === r.id} onClick={() => resolve(r.id, true)} className="rounded-lg bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50">Godkänn</button>
              <button disabled={busy === r.id} onClick={() => resolve(r.id, false)} className="rounded-lg bg-white/5 px-3 py-1 text-xs font-medium text-gray-300 hover:bg-red-500/15 hover:text-red-300 disabled:opacity-50">Avvisa</button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CURRENT_YEAR = new Date().getFullYear();

function dac7ProfileComplete(p) {
  if (!p) return false;
  if (p.sellerType !== 'individual' && p.sellerType !== 'company') return false;
  if (!p.legalName || !p.taxId || !p.address || !p.countryOfResidence) return false;
  if (p.sellerType === 'individual' && !p.dateOfBirth) return false;
  return true;
}

// ALL shops — edit any shop's DAC7 tax data regardless of sales/year. This is
// the way to enter due-diligence data at onboarding (before a shop is even
// reportable); the report table below only shows shops with qualifying orders.
const AllShopsDac7 = ({ onEdit, refreshKey }) => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Platform may list shops (firestore.rules). For each, pull its DAC7
      // profile (platform-only callable) to show the status.
      const snap = await getDocs(collection(db, 'shops'));
      const base = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      base.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
      const withProfiles = await Promise.all(base.map(async (s) => {
        try {
          const res = await httpsCallable(functions, 'getDac7SellerProfile')({ shopId: s.id });
          return { ...s, dac7: res.data?.profile || null };
        } catch { return { ...s, dac7: null }; }
      }));
      setShops(withProfiles);
    } catch (e) {
      toast.error(e.message || 'Kunde inte ladda butiker.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">Alla butiker — skatteuppgifter</h2>
      {loading ? (
        <div className="rounded-xl border border-white/10 bg-gray-900 py-8 text-center text-gray-500">Laddar…</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-gray-900">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Butik</th>
                <th className="px-4 py-3">Säljartyp</th>
                <th className="px-4 py-3">Juridiskt namn</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Åtgärd</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {shops.map((s) => {
                const complete = dac7ProfileComplete(s.dac7);
                const typeLabel = s.dac7?.sellerType === 'company' ? 'Företag'
                  : s.dac7?.sellerType === 'individual' ? 'Privatperson' : '—';
                return (
                  <tr key={s.id} className="hover:bg-white/5">
                    <td className="px-4 py-3"><span className="font-medium text-white">{s.name || s.id}</span> <span className="text-xs text-gray-500">{s.id}</span></td>
                    <td className="px-4 py-3 text-gray-300">{typeLabel}</td>
                    <td className="px-4 py-3 text-gray-300">{s.dac7?.legalName || '—'}</td>
                    <td className="px-4 py-3">
                      {!s.dac7
                        ? <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs font-medium text-gray-500">Inga uppgifter</span>
                        : complete
                          ? <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">Komplett</span>
                          : <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300">Ofullständig</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onEdit({ shopId: s.id, shopName: s.name || s.id })}
                        className="rounded-lg bg-white/5 px-3 py-1 text-xs font-medium text-gray-200 hover:bg-indigo-500/15 hover:text-indigo-300"
                      >
                        Redigera
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-gray-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">DAC7-uppgifter — {shopName}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
        </div>
        {loading ? <p className="text-sm text-gray-500">Laddar…</p> : (
          <div className="space-y-4">
            <button onClick={pull} disabled={busy === 'pull'} className={btnGhost}>
              {busy === 'pull' ? 'Hämtar…' : 'Hämta från Stripe Express'}
            </button>
            <div>
              <label className={labelCls}>Säljartyp</label>
              <select value={profile?.sellerType || ''} onChange={(e) => set('sellerType', e.target.value)} className={`w-full ${inputCls}`}>
                <option value="">—</option>
                <option value="individual">Privatperson</option>
                <option value="company">Företag</option>
              </select>
            </div>
            {[
              { k: 'legalName', label: 'Juridiskt namn' },
              { k: 'taxId', label: isIndividual ? 'Personnummer' : 'Organisationsnummer' },
              { k: 'vatNumber', label: 'VAT-nummer (momsregistreringsnummer)' },
              { k: 'address', label: 'Adress' },
              { k: 'countryOfResidence', label: 'Hemvistland (ISO, t.ex. SE)' },
              ...(isIndividual ? [{ k: 'dateOfBirth', label: 'Födelsedatum (YYYY-MM-DD)' }] : []),
            ].map(({ k, label }) => (
              <div key={k}>
                <label className={labelCls}>{label}</label>
                <input value={profile?.[k] || ''} onChange={(e) => set(k, e.target.value)} className={`w-full ${inputCls}`} />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className={btnGhost}>Avbryt</button>
              <button onClick={save} disabled={busy === 'save'} className={btnPrimary}>
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
  const [editKey, setEditKey] = useState(0); // bump to refresh the all-shops list after a save
  const [year, setYear] = useState(CURRENT_YEAR - 1); // DAC7 reports the PRIOR calendar year
  const [rate, setRate] = useState('0.087');
  const [includeBelow, setIncludeBelow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const run = useCallback(async (markReported = false) => {
    setLoading(true);
    if (!markReported) setReport(null);
    try {
      const res = await httpsCallable(functions, 'exportDac7Report')({
        year: Number(year),
        sekToEurRate: parseFloat((rate || '').replace(',', '.')) || undefined,
        includeBelowDeMinimis: includeBelow,
        ...(markReported && { markReported: true }),
      });
      setReport(res.data);
      if (markReported) {
        toast.success(`Markerade ${res.data?.markedReported ?? 0} säljare som rapporterade för ${year}. De informeras i sin admin.`);
      }
    } catch (e) {
      toast.error(e.message || 'Kunde inte hämta DAC7-rapport.');
    } finally {
      setLoading(false);
    }
  }, [year, rate, includeBelow]);

  // Finalise: writes the per-seller transparency record for every reportable
  // seller this year. Deliberate + confirmed (it tells sellers they were reported).
  const markReported = useCallback(() => {
    if (!window.confirm(`Markera alla rapporterbara säljare som rapporterade för ${year}? Varje berörd säljare informeras i sin admin (DAC7-transparens). Detta är efter att du lämnat rapporten till Skatteverket.`)) return;
    run(true);
  }, [run, year]);

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
      <div className="px-6 lg:px-10 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">DAC7 — rapporterbara säljare</h1>
          <p className="text-gray-400 mt-1 max-w-3xl">
            Bruttoersättning + antal transaktioner per säljare och kalenderår. De-minimis: färre än 30 försäljningar OCH ≤ 2 000 EUR → undantagen (men beräknas ändå). Registrering hos Skatteverket sker separat.
          </p>
        </div>

        <CorrectionRequests />

        {/* Edit ANY shop's tax data, regardless of sales/year (onboarding). */}
        <AllShopsDac7 onEdit={setEditing} refreshKey={editKey} />

        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">Årsrapport</h2>
        <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-white/10 bg-gray-900 p-5">
          <div>
            <label className={labelCls}>År</label>
            <input type="number" min="2020" max={CURRENT_YEAR} value={year} onChange={(e) => setYear(e.target.value)} className={`w-28 ${inputCls}`} />
          </div>
          <div>
            <label className={labelCls}>SEK→EUR-kurs</label>
            <input type="text" value={rate} onChange={(e) => setRate(e.target.value)} className={`w-28 ${inputCls}`} />
          </div>
          <label className="flex items-center gap-2 pb-1.5 text-sm text-gray-300">
            <input type="checkbox" checked={includeBelow} onChange={(e) => setIncludeBelow(e.target.checked)} className="rounded border-white/20 bg-gray-950 text-indigo-500 focus:ring-indigo-500" />
            Inkludera undantagna (de-minimis)
          </label>
          <button onClick={() => run()} disabled={loading} className={btnPrimary}>
            {loading ? 'Hämtar…' : 'Hämta rapport'}
          </button>
          {report?.rows?.length > 0 && (
            <button onClick={downloadCsv} className={btnGhost}>
              Ladda ner CSV
            </button>
          )}
          {report?.reportableCount > 0 && (
            <button onClick={markReported} disabled={loading} className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/20 disabled:opacity-50">
              Markera som rapporterad ({report.reportableCount})
            </button>
          )}
        </div>

        {report && (
          <>
            <p className="text-sm text-gray-400 mb-3">
              {report.rows.length} säljare visas · {report.reportableCount} rapporterbara · kurs {report.sekToEurRate}
            </p>
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-gray-900">
              <table className="min-w-full divide-y divide-white/10 text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3">Butik</th>
                    <th className="px-4 py-3">Typ</th>
                    <th className="px-4 py-3">Juridiskt namn</th>
                    <th className="px-4 py-3 text-right">Transaktioner</th>
                    <th className="px-4 py-3 text-right">Brutto SEK</th>
                    <th className="px-4 py-3 text-right">Brutto EUR</th>
                    <th className="px-4 py-3">Rapporterbar</th>
                    <th className="px-4 py-3">Profil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {report.rows.map((r) => (
                    <tr key={r.shopId} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-medium text-white">{r.shopName}</td>
                      <td className="px-4 py-3 text-gray-300">{r.profile?.sellerType || '—'}</td>
                      <td className="px-4 py-3 text-gray-300">{r.profile?.legalName || '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-200">{r.aggregate.transactionCount}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-200">{r.aggregate.grossConsiderationSek.toLocaleString('sv-SE')}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-200">{r.aggregate.grossConsiderationEur.toLocaleString('sv-SE')}</td>
                      <td className="px-4 py-3">
                        {r.aggregate.reportable
                          ? <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-300">Ja</span>
                          : <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs font-medium text-gray-500">Undantagen</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setEditing({ shopId: r.shopId, shopName: r.shopName })}
                          className="text-xs font-medium underline underline-offset-2 hover:opacity-80"
                        >
                          {r.profileComplete
                            ? <span className="text-emerald-400">Komplett</span>
                            : <span className="text-red-400">Komplettera</span>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {report.rows.some((r) => r.aggregate.reportable && !r.profileComplete) && (
              <p className="mt-4 rounded-lg border-l-4 border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">
                ⚠️ En eller flera rapporterbara säljare saknar komplett DAC7-profil (juridiskt namn, skatte-ID, adress, land, ev. födelsedatum). Komplettera innan rapportering.
              </p>
            )}
          </>
        )}

        {!report && !loading && (
          <div className="rounded-xl border border-white/10 bg-gray-900 py-16 text-center text-gray-500">
            Välj år och kurs, klicka <span className="text-gray-300">Hämta rapport</span>.
          </div>
        )}
      </div>
      {editing && (
        <SellerEditor
          shopId={editing.shopId}
          shopName={editing.shopName}
          onClose={() => {
            setEditing(null);
            setEditKey((k) => k + 1);   // refresh the all-shops list
            if (report) run();          // refresh the year report only if one is loaded
          }}
        />
      )}
    </PlatformLayout>
  );
};

export default PlatformDac7;
