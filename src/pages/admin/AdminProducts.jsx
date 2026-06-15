// AdminProducts — the product LIST for a shop. The create/edit form lives in
// components/admin/ProductForm.jsx (extracted 2026-06-15: de-B2B, single tab, no
// translations, single price). This page owns: load (shop-scoped), the list
// table, open/edit/delete, and group-name collection for the form's autocomplete.
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, deleteDoc, query, where } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useShopId } from '../../contexts/ShopContext';
import toast from 'react-hot-toast';
import ProductMenu from '../../components/ProductMenu';
import AppLayout from '../../components/layout/AppLayout';
import ProductForm from '../../components/admin/ProductForm';

// Read a product name that may be a legacy per-locale object or a plain string.
const productName = (name) => {
  if (typeof name === 'string') return name;
  if (name && typeof name === 'object') {
    return name['sv-SE'] || Object.values(name).find((v) => typeof v === 'string') || '';
  }
  return '';
};

const AdminProducts = () => {
  const { isAdmin, user } = useAuth();
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
        <div className="p-6">
          <p>Du har inte behörighet att komma åt denna sida.</p>
          <Link to="/" className="text-blue-600 hover:underline">Tillbaka till Dashboard</Link>
        </div>
      </AppLayout>
    );
  }

  const onSaved = async () => {
    await fetchProducts();
    setEditing(null);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Produkthantering</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Hantera produkter i butiken</p>
            </div>
            {!editing && (
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/admin"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Tillbaka till Admin
                </Link>
                <button
                  onClick={() => setEditing({ product: null })}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  Lägg till ny produkt
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900 border-l-4 border-red-400 dark:border-red-600 p-4">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        {editing ? (
          <ProductForm
            product={editing.product}
            shopId={shopId}
            userUid={user?.uid || auth.currentUser?.uid || null}
            availableCategories={availableCategories}
            availableTags={availableTags}
            onSaved={onSaved}
            onCancel={() => setEditing(null)}
          />
        ) : loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        ) : (
          /* Product List */
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Produktlista</h2>
                <div className="w-full sm:w-64">
                  <ProductMenu
                    products={products}
                    selectedProduct={filteredProduct}
                    onProductSelect={(p) => setFilteredProduct(p)}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Produkt &amp; detaljer</th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pris &amp; status</th>
                    <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Åtgärder</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="px-4 md:px-6 py-8 text-center text-gray-500 dark:text-gray-400">Inga produkter hittades</td>
                    </tr>
                  ) : (
                    (filteredProduct ? [filteredProduct] : products).map((product) => {
                      const price = product.b2cPrice || product.basePrice || 0;
                      const img = product.imageUrl || product.b2cImageUrl;
                      return (
                        <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          {/* Product & details */}
                          <td className="px-4 md:px-6 py-4">
                            <div className="flex items-start">
                              {img ? (
                                <img src={img} alt={productName(product.name)} className="w-16 h-16 mr-4 object-cover rounded-md border border-gray-200 dark:border-gray-600 shrink-0" />
                              ) : (
                                <div className="w-16 h-16 mr-4 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center border border-gray-200 dark:border-gray-600 shrink-0">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">Ingen bild</span>
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{productName(product.name) || 'Namnlös'}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">SKU: <span className="font-mono">{product.sku || 'Ej angivet'}</span></div>
                                <div className="flex flex-wrap gap-2 text-xs">
                                  {(product.category || product.group) && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300" style={{ fontSize: '10px' }}>{product.category || product.group}</span>
                                  )}
                                  {Array.isArray(product.variants) && product.variants.length > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300" style={{ fontSize: '10px' }}>{product.variants.length} varianter</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Price & status */}
                          <td className="px-4 md:px-6 py-4">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900 dark:text-gray-100 mb-2">{price.toFixed(2)} SEK</div>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${product.isActive ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'}`}>
                                {product.isActive ? 'Aktiv' : 'Inaktiv'}
                              </span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-4 md:px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setEditing({ product: { ...product, documentId: product.id } })}
                                className="min-h-[32px] inline-flex items-center px-4 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900 border border-blue-300 dark:border-blue-600 rounded-sm transition-colors"
                              >
                                Redigera
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="min-h-[32px] inline-flex items-center px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900 border border-red-300 dark:border-red-600 rounded-sm transition-colors"
                              >
                                Ta bort
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminProducts;
