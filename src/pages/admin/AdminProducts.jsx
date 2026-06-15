// AdminProducts — the product LIST for a shop. The create/edit form lives in
// components/admin/ProductForm.jsx (extracted 2026-06-15: de-B2B, single tab, no
// translations, single price). This page owns: load (shop-scoped), the list
// table, open/edit/delete, and group-name collection for the form's autocomplete.
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useShopId } from '../../contexts/ShopContext';
import toast from 'react-hot-toast';
import ProductMenu from '../../components/ProductMenu';
import AppLayout from '../../components/layout/AppLayout';
import ProductForm from '../../components/admin/ProductForm';
import { Page, DataTable, StatusPill, Button } from '../../components/admin/ui';
import { TrashIcon } from '@heroicons/react/24/outline';

// Read a product name that may be a legacy per-locale object or a plain string.
const productName = (name) => {
  if (typeof name === 'string') return name;
  if (name && typeof name === 'object') {
    return name['sv-SE'] || Object.values(name).find((v) => typeof v === 'string') || '';
  }
  return '';
};

const AdminProducts = () => {
  const { isAdmin } = useAuth();
  const shopId = useShopId();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);

  // Form state: null = list view; { product: null } = create; { product } = edit.
  const [editing, setEditing] = useState(null);

  // List filter (ProductMenu).
  const [filteredProduct, setFilteredProduct] = useState(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', shopId)));
      const data = [];
      const categories = new Set();
      const tags = new Set();
      snap.forEach((d) => {
        const p = { ...d.data(), id: d.id };
        data.push(p);
        // category (new) with fallback to the legacy `group` field.
        const cat = (p.category || p.group || '').trim();
        if (cat) categories.add(cat);
        if (Array.isArray(p.tags)) p.tags.forEach((t) => t && t.trim() && tags.add(t.trim()));
      });
      data.sort((a, b) => productName(a.name).localeCompare(productName(b.name)));
      setProducts(data);
      setAvailableCategories(Array.from(categories).sort());
      setAvailableTags(Array.from(tags).sort());
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Kunde inte ladda produkter');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const handleDeleteProduct = async (productId) => {
    if (!productId) {
      toast.error('Fel: Produkt-ID saknas.');
      return;
    }
    if (!window.confirm('Är du säker på att du vill ta bort denna produkt? Denna åtgärd kan inte ångras.')) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'products', productId));
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      if (editing?.product?.id === productId) setEditing(null);
      toast.success('Produkten har tagits bort');
    } catch (err) {
      if (err.code === 'not-found') {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        if (editing?.product?.id === productId) setEditing(null);
        toast.success('Produkten har tagits bort');
      } else {
        console.error('Error deleting product:', err);
        toast.error('Kunde inte ta bort produkten: ' + (err.message || 'Okänt fel'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <Page title="Produkter">
          <p className="text-[13px] text-admin-text">Du har inte behörighet att komma åt denna sida.</p>
          <Link to="/" className="text-[13px] text-admin-text underline">Tillbaka till Dashboard</Link>
        </Page>
      </AppLayout>
    );
  }

  const onSaved = async () => {
    await fetchProducts();
    setEditing(null);
  };

  const formatSek = (n) =>
    new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 2 }).format(n || 0);

  const productPrice = (p) => p.b2cPrice || p.basePrice || 0;
  const productImg = (p) => p.imageUrl || p.b2cImageUrl;

  // Shopify Products IndexTable columns. NO inventory column — we don't track
  // stock (honesty rule: render only real data).
  const columns = [
    {
      key: 'product',
      header: 'Produkt',
      render: (p) => {
        const img = productImg(p);
        return (
          <div className="flex items-center gap-3">
            {img ? (
              <img src={img} alt="" className="h-9 w-9 shrink-0 rounded-[6px] border border-admin-border object-cover" />
            ) : (
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[6px] border border-admin-border bg-admin-surface-2 text-[10px] text-admin-text-faint">
                —
              </div>
            )}
            <span className="min-w-0">
              <span className="block truncate font-medium text-admin-text group-hover:underline">
                {productName(p.name) || 'Namnlös'}
              </span>
              {p.sku && <span className="block truncate text-[12px] text-admin-text-faint">{p.sku}</span>}
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) =>
        p.isActive ? (
          <StatusPill tone="success">Aktiv</StatusPill>
        ) : (
          <StatusPill tone="neutral">Utkast</StatusPill>
        ),
    },
    {
      key: 'category',
      header: 'Kategori',
      render: (p) => <span className="text-admin-text-muted">{p.category || p.group || '—'}</span>,
    },
    {
      key: 'variants',
      header: 'Varianter',
      align: 'right',
      render: (p) => (
        <span className="tabular-nums text-admin-text-muted">
          {Array.isArray(p.variants) && p.variants.length > 0 ? p.variants.length : '—'}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Pris',
      align: 'right',
      render: (p) => <span className="font-medium tabular-nums text-admin-text">{formatSek(productPrice(p))}</span>,
    },
    {
      // Trailing delete action; stop row click so it doesn't open the editor.
      key: 'actions',
      header: '',
      align: 'right',
      className: 'w-12',
      render: (p) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteProduct(p.id);
          }}
          title="Ta bort produkt"
          aria-label="Ta bort produkt"
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-admin-el)] text-admin-text-faint hover:bg-admin-surface-2 hover:text-admin-critical-dot"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      ),
    },
  ];

  const rows = filteredProduct ? [filteredProduct] : products;

  // ── Form view: keep ProductForm host untouched (slice 1e redesigns it). ──
  if (editing) {
    return (
      <AppLayout>
        <Page title={editing.product ? 'Redigera produkt' : 'Ny produkt'} back={{ to: '/admin/products', label: 'Produkter' }}>
          <ProductForm
            product={editing.product}
            shopId={shopId}
            availableCategories={availableCategories}
            availableTags={availableTags}
            onSaved={onSaved}
            onCancel={() => setEditing(null)}
          />
        </Page>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Page
        title="Produkter"
        actions={
          <Button variant="primary" onClick={() => setEditing({ product: null })}>
            Lägg till produkt
          </Button>
        }
      >
        {error && (
          <div className="mb-3 rounded-[var(--radius-admin)] border border-admin-critical-dot/30 bg-admin-critical-bg px-4 py-3 text-[13px] text-admin-critical-text">
            {error}
          </div>
        )}

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(p) => p.id}
          loading={loading}
          onRowClick={(p) => setEditing({ product: { ...p, documentId: p.id } })}
          empty="Inga produkter hittades."
          toolbar={
            <div className="w-full sm:max-w-xs">
              <ProductMenu
                products={products}
                selectedProduct={filteredProduct}
                onProductSelect={(p) => setFilteredProduct(p)}
              />
            </div>
          }
        />
      </Page>
    </AppLayout>
  );
};

export default AdminProducts;
