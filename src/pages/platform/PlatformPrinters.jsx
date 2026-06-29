// PlatformPrinters — operator UI to provision + manage print-shop accounts.
// Create a print_shop user (Auth + users/{uid} doc via createPrintShopUser
// callable) assigned to one or more shops; list existing printers; toggle active.
// Platform-only (PlatformRoute). Dark PlatformLayout.
import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase/config';
import PlatformLayout from '../../components/platform/PlatformLayout';
import toast from 'react-hot-toast';

const PlatformPrinters = () => {
  const [shops, setShops] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // create form
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [selectedShops, setSelectedShops] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [shopSnap, printerSnap] = await Promise.all([
        getDocs(collection(db, 'shops')),
        getDocs(query(collection(db, 'users'), where('role', '==', 'print_shop'))),
      ]);
      setShops(shopSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setPrinters(printerSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('PlatformPrinters load failed:', e);
      toast.error('Kunde inte ladda tryckerier.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleShop = (id) =>
    setSelectedShops((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!email.trim()) { toast.error('Ange e-post.'); return; }
    if (selectedShops.length === 0) { toast.error('Välj minst en butik.'); return; }
    setSaving(true);
    try {
      const res = await httpsCallable(functions, 'createPrintShopUser')({
        email: email.trim(), name: name.trim(), printShopShops: selectedShops,
      });
      const pw = res.data?.tempPassword;
      toast.success(`Tryckerikonto skapat${pw ? ` · tillfälligt lösenord: ${pw}` : ''}`, { duration: 12000 });
      setEmail(''); setName(''); setSelectedShops([]);
      load();
    } catch (err) {
      console.error('createPrintShopUser failed:', err);
      toast.error(err?.message || 'Kunde inte skapa tryckerikonto.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (printer) => {
    try {
      await updateDoc(doc(db, 'users', printer.id), { active: !printer.active });
      toast.success(printer.active ? 'Konto inaktiverat' : 'Konto aktiverat');
      load();
    } catch (e) {
      toast.error('Kunde inte ändra status.');
    }
  };

  const shopName = (id) => shops.find((s) => s.id === id)?.name || id;

  return (
    <PlatformLayout>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <h1 className="mb-1 text-lg font-bold">Tryckerier</h1>
        <p className="mb-5 text-sm text-gray-400">
          Skapa och hantera tryckerikonton. Ett tryckeri ser endast POD-ordrar för sina tilldelade butiker
          (via säkra serveranrop — ingen direkt databasåtkomst, inga kunduppgifter utöver leveransadress).
        </p>

        {/* Create form */}
        <form onSubmit={handleCreate} className="mb-8 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="mb-3 text-sm font-semibold">Nytt tryckerikonto</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">E-post</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
                className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-indigo-400 focus:outline-none"
                placeholder="tryckeri@exempel.se" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Namn</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-indigo-400 focus:outline-none"
                placeholder="t.ex. Tryckeri AB" />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs text-gray-400">Tilldelade butiker</label>
            <div className="flex flex-wrap gap-2">
              {shops.map((s) => {
                const on = selectedShops.includes(s.id);
                return (
                  <button key={s.id} type="button" onClick={() => toggleShop(s.id)}
                    className={'rounded-lg border px-3 py-1.5 text-sm ' + (on ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200' : 'border-white/10 bg-gray-800 text-gray-300 hover:bg-white/10')}>
                    {s.name || s.id}
                  </button>
                );
              })}
              {shops.length === 0 && <span className="text-sm text-gray-500">Inga butiker.</span>}
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
              {saving ? 'Skapar…' : 'Skapa tryckerikonto'}
            </button>
          </div>
        </form>

        {/* Existing printers */}
        <h2 className="mb-2 text-sm font-semibold">Befintliga tryckerier</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Laddar…</p>
        ) : printers.length === 0 ? (
          <p className="text-sm text-gray-400">Inga tryckerikonton ännu.</p>
        ) : (
          <div className="space-y-2">
            {printers.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{p.contactPerson || p.email}</span>
                    <span className={'rounded px-1.5 py-0.5 text-xs ' + (p.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-gray-500/20 text-gray-400')}>
                      {p.active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </div>
                  <div className="truncate text-xs text-gray-400">
                    {p.email} · butiker: {(p.printShopShops || []).map(shopName).join(', ') || '—'}
                  </div>
                </div>
                <button onClick={() => toggleActive(p)}
                  className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-200 hover:bg-white/10">
                  {p.active ? 'Inaktivera' : 'Aktivera'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </PlatformLayout>
  );
};

export default PlatformPrinters;
