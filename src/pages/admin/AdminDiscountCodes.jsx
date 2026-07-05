import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase/config';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import AppLayout from '../../components/layout/AppLayout';
import { useShopId } from '../../contexts/ShopContext';
import { withShopId } from '../../config/withShopId';
import { normalizeAffiliateCode } from '../../utils/affiliateCalculations';
import {
  Page,
  MetricsBar,
  DataTable,
  StatusPill,
  Button,
  Field,
  Input,
  Select,
} from '../../components/admin/ui';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

// Empty create/edit form. Mirrors the discountCodes data model. Dates are held
// as YYYY-MM-DD strings for the <input type="date"> and converted to Timestamps
// (or null) on write.
const emptyForm = () => ({
  code: '',
  type: 'percent',
  value: 10,
  scope: 'all',
  productIds: [],
  minSpend: '',
  startsAt: '',
  endsAt: '',
  maxUses: '',
  active: true,
});

const AdminDiscountCodes = () => {
  const shopId = useShopId();
  const [codes, setCodes] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const codesQuery = query(
        collection(db, 'discountCodes'),
        where('shopId', '==', shopId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(codesQuery);
      setCodes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // Products for the scope='products' picker (active only, name-sorted) —
      // same pattern as CampaignCreate.fetchProducts.
      const productsQuery = query(
        collection(db, 'products'),
        where('shopId', '==', shopId),
        orderBy('name', 'asc')
      );
      const pSnap = await getDocs(productsQuery);
      setProducts(
        pSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p.isActive !== false)
      );
    } catch (error) {
      console.error('Error fetching discount codes:', error);
      toast.error('Kunde inte hämta rabattkoder.');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const active = codes.filter((c) => c.active !== false).length;
    const totalUses = codes.reduce((sum, c) => sum + (c.usedCount || 0), 0);
    return { total: codes.length, active, totalUses };
  }, [codes]);

  const metrics = [
    { key: 'total', label: 'Antal koder', value: stats.total },
    { key: 'active', label: 'Aktiva koder', value: stats.active },
    { key: 'uses', label: 'Totalt använda', value: stats.totalUses.toLocaleString('sv-SE') },
  ];

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditingId(c.id);
    setForm({
      code: c.code || '',
      type: c.type || 'percent',
      value: c.value ?? 0,
      scope: c.scope || 'all',
      productIds: Array.isArray(c.productIds) ? c.productIds : [],
      minSpend: c.minSpend != null ? String(c.minSpend) : '',
      startsAt: tsToInput(c.startsAt),
      endsAt: tsToInput(c.endsAt),
      maxUses: c.maxUses != null ? String(c.maxUses) : '',
      active: c.active !== false,
    });
    setModalOpen(true);
  };

  const toggleProduct = (productId) => {
    setForm((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter((id) => id !== productId)
        : [...prev.productIds, productId],
    }));
  };

  const handleSave = async () => {
    // Codes are normalized UPPERCASE (trimmed) — matches the server lookup +
    // affiliate convention, so a lowercase entry still validates at checkout.
    const normalizedCode = normalizeAffiliateCode(form.code);
    if (!normalizedCode) {
      toast.error('Ange en kod.');
      return;
    }
    const value = Number(form.value);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Ange ett giltigt rabattvärde.');
      return;
    }
    if (form.type === 'percent' && value > 100) {
      toast.error('Procentrabatt kan inte överstiga 100 %.');
      return;
    }
    if (form.scope === 'products' && form.productIds.length === 0) {
      toast.error('Välj minst en produkt när koden gäller valda produkter.');
      return;
    }
    const maxUses = form.maxUses === '' ? null : Math.max(1, Math.floor(Number(form.maxUses)));
    if (form.maxUses !== '' && (!Number.isFinite(maxUses) || maxUses < 1)) {
      toast.error('Användningsgräns måste vara ett positivt heltal.');
      return;
    }
    const minSpend = form.minSpend === '' ? null : Math.max(0, Math.floor(Number(form.minSpend)));
    if (form.minSpend !== '' && (!Number.isFinite(minSpend) || minSpend < 0)) {
      toast.error('Lägsta ordervärde måste vara ett positivt tal.');
      return;
    }
    const startsAt = inputToDate(form.startsAt);
    const endsAt = inputToDate(form.endsAt);
    if (startsAt && endsAt && startsAt > endsAt) {
      toast.error('Startdatum måste vara före slutdatum.');
      return;
    }

    setSaving(true);
    const toastId = toast.loading(editingId ? 'Sparar…' : 'Skapar kod…');
    try {
      // Uniqueness (code, shopId) enforced app-layer: query before create.
      // On edit, an identical code on the SAME doc is allowed.
      const dupQuery = query(
        collection(db, 'discountCodes'),
        where('shopId', '==', shopId),
        where('code', '==', normalizedCode)
      );
      const dupSnap = await getDocs(dupQuery);
      const clash = dupSnap.docs.find((d) => d.id !== editingId);
      if (clash) {
        toast.error('En kod med detta namn finns redan.', { id: toastId });
        setSaving(false);
        return;
      }

      const payload = {
        code: normalizedCode,
        type: form.type,
        value,
        scope: form.scope,
        productIds: form.scope === 'products' ? form.productIds : [],
        minSpend,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        maxUses,
        active: !!form.active,
      };

      if (editingId) {
        await updateDoc(doc(db, 'discountCodes', editingId), payload);
        toast.success('Rabattkod uppdaterad.', { id: toastId });
      } else {
        await addDoc(
          collection(db, 'discountCodes'),
          withShopId(
            {
              ...payload,
              usedCount: 0,
              createdAt: serverTimestamp(),
            },
            shopId
          )
        );
        toast.success('Rabattkod skapad.', { id: toastId });
      }
      setModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving discount code:', error);
      toast.error('Kunde inte spara rabattkoden.', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c) => {
    try {
      await updateDoc(doc(db, 'discountCodes', c.id), { active: !(c.active !== false) });
      setCodes((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, active: !(c.active !== false) } : x))
      );
    } catch (error) {
      console.error('Error toggling code:', error);
      toast.error('Kunde inte ändra status.');
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Radera rabattkoden "${c.code}"?`)) return;
    const toastId = toast.loading('Raderar…');
    try {
      await deleteDoc(doc(db, 'discountCodes', c.id));
      toast.success('Rabattkod raderad.', { id: toastId });
      setCodes((prev) => prev.filter((x) => x.id !== c.id));
    } catch (error) {
      console.error('Error deleting code:', error);
      toast.error('Kunde inte radera koden.', { id: toastId });
    }
  };

  const columns = [
    {
      key: 'code',
      header: 'Kod',
      render: (c) => (
        <span className="rounded-[var(--radius-admin-el)] bg-admin-surface-2 px-2 py-0.5 font-mono text-[12px] text-admin-text">
          {c.code}
        </span>
      ),
    },
    {
      key: 'value',
      header: 'Rabatt',
      render: (c) => (
        <span className="text-admin-text">
          {c.type === 'percent' ? `${c.value} %` : `${c.value} kr`}
        </span>
      ),
    },
    {
      key: 'scope',
      header: 'Gäller',
      render: (c) => (
        <span className="text-admin-text-muted">
          {c.scope === 'products'
            ? `${(c.productIds || []).length} produkter`
            : 'Hela kundvagnen'}
          {c.minSpend != null && (
            <span className="block text-[12px] text-admin-text-faint">
              från {c.minSpend} kr
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'window',
      header: 'Period',
      render: (c) => (
        <span className="text-[12px] text-admin-text-muted">
          {fmtDate(c.startsAt) || '—'} → {fmtDate(c.endsAt) || '∞'}
        </span>
      ),
    },
    {
      key: 'uses',
      header: 'Använt',
      align: 'right',
      render: (c) => (
        <span className="tabular-nums text-admin-text-muted">
          {(c.usedCount || 0).toLocaleString('sv-SE')}
          {c.maxUses != null ? ` / ${c.maxUses}` : ''}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <button type="button" onClick={(e) => { e.stopPropagation(); handleToggleActive(c); }}>
          <StatusPill tone={c.active !== false ? 'success' : 'neutral'}>
            {c.active !== false ? 'Aktiv' : 'Inaktiv'}
          </StatusPill>
        </button>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      className: 'w-24',
      render: (c) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => openEdit(c)}
            title="Redigera"
            aria-label="Redigera"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-admin-el)] text-admin-text-faint hover:bg-admin-surface-2 hover:text-admin-text"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(c)}
            title="Radera"
            aria-label="Radera"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-admin-el)] text-admin-text-faint hover:bg-admin-surface-2 hover:text-red-600"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const headerActions = (
    <Button variant="primary" onClick={openCreate}>
      Skapa rabattkod
    </Button>
  );

  return (
    <AppLayout>
      <Page
        title="Rabattkoder"
        subtitle="Skapa kampanjkoder med rabatt på hela kundvagnen eller valda produkter."
        actions={headerActions}
      >
        <div className="space-y-5">
          <MetricsBar metrics={metrics} />
          <DataTable
            columns={columns}
            rows={codes}
            rowKey={(c) => c.id}
            loading={loading}
            onRowClick={(c) => openEdit(c)}
            empty="Inga rabattkoder ännu. Skapa din första kampanjkod."
          />
        </div>
      </Page>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="mt-8 w-full max-w-lg rounded-[var(--radius-admin-card)] bg-admin-surface p-5 shadow-xl">
            <h2 className="mb-4 text-[15px] font-semibold text-admin-text">
              {editingId ? 'Redigera rabattkod' : 'Skapa rabattkod'}
            </h2>

            <div className="space-y-4">
              <Field label="Kod" required help="Skrivs alltid med versaler. T.ex. SOMMAR20">
                <Input
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                  placeholder="SOMMAR20"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Typ" required>
                  <Select
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                  >
                    <option value="percent">Procent (%)</option>
                    <option value="fixed">Fast belopp (kr)</option>
                  </Select>
                </Field>
                <Field label={form.type === 'percent' ? 'Rabatt (%)' : 'Rabatt (kr)'} required>
                  <Input
                    type="number"
                    min="0"
                    max={form.type === 'percent' ? '100' : undefined}
                    value={form.value}
                    onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                  />
                </Field>
              </div>

              <Field label="Gäller">
                <Select
                  value={form.scope}
                  onChange={(e) => setForm((p) => ({ ...p, scope: e.target.value }))}
                >
                  <option value="all">Hela kundvagnen</option>
                  <option value="products">Valda produkter</option>
                </Select>
              </Field>

              {form.scope === 'products' && (
                <div className="max-h-56 overflow-y-auto rounded-[var(--radius-admin-el)] border border-admin-border p-2">
                  {products.length === 0 ? (
                    <div className="p-2 text-center text-[13px] text-admin-text-muted">
                      Inga aktiva produkter.
                    </div>
                  ) : (
                    products.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 rounded-[var(--radius-admin-el)] p-1.5 hover:bg-admin-surface-2"
                      >
                        <input
                          type="checkbox"
                          checked={form.productIds.includes(p.id)}
                          onChange={() => toggleProduct(p.id)}
                          className="h-4 w-4"
                        />
                        <span className="text-[13px] text-admin-text">
                          {typeof p.name === 'string' ? p.name : p.name?.['sv-SE'] || p.sku || 'Produkt'}
                        </span>
                        <span className="ml-auto font-mono text-[11px] text-admin-text-faint">{p.sku}</span>
                      </label>
                    ))
                  )}
                </div>
              )}

              <Field
                label="Lägsta ordervärde (kr)"
                help="Valfritt. Koden gäller endast om delsumman är minst detta belopp."
              >
                <Input
                  type="number"
                  min="0"
                  value={form.minSpend}
                  onChange={(e) => setForm((p) => ({ ...p, minSpend: e.target.value }))}
                  placeholder="Inget krav"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Startdatum" help="Valfritt.">
                  <Input
                    type="date"
                    value={form.startsAt}
                    onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))}
                  />
                </Field>
                <Field label="Slutdatum" help="Valfritt.">
                  <Input
                    type="date"
                    value={form.endsAt}
                    onChange={(e) => setForm((p) => ({ ...p, endsAt: e.target.value }))}
                  />
                </Field>
              </div>

              <Field
                label="Användningsgräns"
                help="Valfritt. Max antal gånger koden kan användas totalt."
              >
                <Input
                  type="number"
                  min="1"
                  value={form.maxUses}
                  onChange={(e) => setForm((p) => ({ ...p, maxUses: e.target.value }))}
                  placeholder="Obegränsat"
                />
              </Field>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                  className="h-4 w-4"
                />
                <span className="text-[13px] text-admin-text">Aktiv</span>
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
                Avbryt
              </Button>
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Sparar…' : editingId ? 'Spara' : 'Skapa'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

// Firestore Timestamp | Date | null → YYYY-MM-DD for <input type="date">.
function tsToInput(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : ts instanceof Date ? ts : null;
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}
// YYYY-MM-DD string → Date (local midnight) | null.
function inputToDate(s) {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}
// Firestore Timestamp | Date | null → localized display date.
function fmtDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : ts instanceof Date ? ts : null;
  if (!d) return '';
  return d.toLocaleDateString('sv-SE');
}

export default AdminDiscountCodes;
