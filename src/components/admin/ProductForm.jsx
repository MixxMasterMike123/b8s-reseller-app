// ProductForm — the create/edit form for a shop's products, extracted from the
// old AdminProducts.jsx 4-tab monolith (2026-06-15 redesign).
//
// What changed vs the old inline form:
//  • ONE section (no Allmänt/B2B/B2C tabs). All info + images on one page.
//  • B2B removed entirely (reseller descriptions/images, EAN fields,
//    manufacturingCost, the B2B availability toggles).
//  • Translations removed: fields are plain Swedish strings. Existing products
//    that stored name/descriptions as per-locale objects ({'sv-SE': '...'}) are
//    READ-COMPATIBLE — plainText() pulls the Swedish value — but writes are
//    plain strings going forward. No data migration.
//  • ONE price field ("Pris, inkl. moms") that writes BOTH b2cPrice and
//    basePrice, because consumer price resolves as `b2cPrice || basePrice`
//    everywhere (incl. the server-side Stripe charge). Keeping both in sync
//    means the storefront + payment fallback always agree.
//  • Relaxed validation: nothing is hard-required (name still recommended; an
//    empty name just falls back to the SKU for display). No `*`/required attrs.
//  • availability.b2c defaults to true and is preserved (it's a live storefront
//    query filter: where('availability.b2c','==',true)).
//
// Tenancy: create stamps shopId via withShopId(...) and the parent passes
// shopId from useShopId(). Group content (ProductGroupTab) still saves
// separately to productGroupContents via saveProductGroupContent.
import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, addDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { uploadImageToStorage } from '../../utils/imageUpload';
import { db, storage } from '../../firebase/config';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ProductGroupTab from './ProductGroupTab';
import SortableImageGallery from './SortableImageGallery';
import { saveProductGroupContent } from '../../utils/productGroups';
import { withShopId } from '../../config/withShopId';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Read a field that may be a legacy per-locale object or a plain string.
const plainText = (field) => {
  if (typeof field === 'string') return field;
  if (field && typeof field === 'object') {
    return field['sv-SE'] || Object.values(field).find((v) => typeof v === 'string') || '';
  }
  return '';
};

const COLORS = ['Transparent', 'Röd', 'Fluorescerande', 'Glitter'];

const emptyForm = () => ({
  id: '',
  name: '',
  sku: '',
  size: '',
  color: '',
  group: '',
  tags: [],
  price: 0,
  isActive: true,
  imageUrl: '',
  b2cImageUrl: '',
  b2cImageGallery: [],
  launchDate: '',
  availability: { b2c: true },
  descriptions: { b2c: '', b2cMoreInfo: '' },
  weight: { value: 0, unit: 'g' },
  dimensions: {
    length: { value: 0, unit: 'mm' },
    width: { value: 0, unit: 'mm' },
    height: { value: 0, unit: 'mm' },
  },
  shipping: {
    sweden: { cost: 0, service: 'Standard' },
    nordic: { cost: 0, service: 'Nordic' },
    eu: { cost: 0, service: 'EU' },
    worldwide: { cost: 0, service: 'International' },
  },
});

// Build the form state from an existing product doc (read-compatible).
const formFromProduct = (p) => ({
  ...emptyForm(),
  id: p.id || '',
  name: plainText(p.name),
  sku: p.sku || '',
  size: p.size || '',
  color: p.color || '',
  group: p.group || '',
  tags: Array.isArray(p.tags) ? p.tags : [],
  // Single price sourced from the consumer price (b2cPrice || basePrice).
  price: p.b2cPrice || p.basePrice || 0,
  isActive: p.isActive ?? true,
  imageUrl: p.imageUrl || '',
  b2cImageUrl: p.b2cImageUrl || '',
  b2cImageGallery: Array.isArray(p.b2cImageGallery) ? p.b2cImageGallery : [],
  launchDate: p.launchDate
    ? new Date(p.launchDate.toDate ? p.launchDate.toDate() : p.launchDate).toISOString().slice(0, 16)
    : '',
  availability: { b2c: p.availability?.b2c !== false },
  descriptions: {
    b2c: plainText(p.descriptions?.b2c),
    b2cMoreInfo: plainText(p.descriptions?.b2cMoreInfo),
  },
  weight: { value: p.weight?.value || 0, unit: p.weight?.unit || 'g' },
  dimensions: {
    length: { value: p.dimensions?.length?.value || 0, unit: p.dimensions?.length?.unit || 'mm' },
    width: { value: p.dimensions?.width?.value || 0, unit: p.dimensions?.width?.unit || 'mm' },
    height: { value: p.dimensions?.height?.value || 0, unit: p.dimensions?.height?.unit || 'mm' },
  },
  shipping: {
    sweden: { cost: p.shipping?.sweden?.cost || 0, service: p.shipping?.sweden?.service || 'Standard' },
    nordic: { cost: p.shipping?.nordic?.cost || 0, service: p.shipping?.nordic?.service || 'Nordic' },
    eu: { cost: p.shipping?.eu?.cost || 0, service: p.shipping?.eu?.service || 'EU' },
    worldwide: { cost: p.shipping?.worldwide?.cost || 0, service: p.shipping?.worldwide?.service || 'International' },
  },
});

/**
 * @param {object|null} product   the product being edited, or null to create
 * @param {string} shopId         the active shop (tenancy)
 * @param {string[]} availableGroups  existing group names (autocomplete)
 * @param {string[]} availableTags    existing tag names across the shop (autocomplete)
 * @param {() => void} onSaved     called after a successful save (parent reloads + closes)
 * @param {() => void} onCancel    close without saving
 */
const ProductForm = ({ product, shopId, userUid = null, availableGroups = [], availableTags = [], onSaved, onCancel }) => {
  const [formData, setFormData] = useState(() => (product ? formFromProduct(product) : emptyForm()));
  const [saving, setSaving] = useState(false);

  // Group content (separate collection) loaded/edited via ProductGroupTab.
  const [groupContent, setGroupContent] = useState(null);

  // Main B2C image.
  const [mainImageFile, setMainImageFile] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState(product?.b2cImageUrl || product?.imageUrl || null);

  // Gallery: existing (URLs, reorderable) + new (files to upload).
  const [existingGallery, setExistingGallery] = useState(
    Array.isArray(product?.b2cImageGallery) ? product.b2cImageGallery : []
  );
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);

  // Group autocomplete.
  const [groupInput, setGroupInput] = useState(product?.group || '');
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false);
  const [filteredGroups, setFilteredGroups] = useState([]);

  // Tags: a chip input with autocomplete. tags = filtering labels (cross-cutting,
  // many products), distinct from `group` (size/colour variants of ONE product).
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  const addTag = (raw) => {
    const tag = (raw ?? tagInput).trim();
    if (!tag) return;
    if (!formData.tags.includes(tag)) setField('tags', [...formData.tags, tag]);
    setTagInput('');
    setShowTagSuggestions(false);
  };
  const removeTag = (tag) => setField('tags', formData.tags.filter((t) => t !== tag));
  // Suggestions = shop tags not already on this product, matching the input.
  const tagSuggestions = availableTags
    .filter((t) => !formData.tags.includes(t) && (!tagInput.trim() || t.toLowerCase().includes(tagInput.toLowerCase())));

  // Revoke object URLs on unmount to avoid leaks.
  useEffect(() => {
    return () => {
      if (mainImagePreview && mainImagePreview.startsWith('blob:')) URL.revokeObjectURL(mainImagePreview);
      galleryPreviews.forEach((u) => u.startsWith('blob:') && URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }));

  const handleInput = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') setField(name, checked);
    else if (type === 'number') setField(name, parseFloat(value) || 0);
    else setField(name, value);
  };

  // ----- group autocomplete -----
  const onGroupChange = (e) => {
    const v = e.target.value;
    setGroupInput(v);
    setField('group', v);
    if (v.trim()) {
      const f = availableGroups.filter((g) => g.toLowerCase().includes(v.toLowerCase()));
      setFilteredGroups(f);
      setShowGroupSuggestions(f.length > 0);
    } else {
      setFilteredGroups([]);
      setShowGroupSuggestions(false);
    }
  };
  const pickGroup = (g) => {
    setGroupInput(g);
    setField('group', g);
    setShowGroupSuggestions(false);
  };

  // ----- images -----
  const onMainImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(`Bilden är för stor. Max ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`);
      return;
    }
    setMainImagePreview(URL.createObjectURL(file));
    setMainImageFile(file);
  };

  const onGalleryChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const tooBig = files.filter((f) => f.size > MAX_IMAGE_SIZE);
    if (tooBig.length) {
      toast.error(`${tooBig.length} filer är för stora. Max ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`);
      return;
    }
    setGalleryPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    setGalleryFiles((prev) => [...prev, ...files]);
  };

  const removeNewGalleryImage = (index) => {
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index));
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
  };
  const removeExistingGalleryImage = (index) => {
    setImagesToDelete((prev) => [...prev, existingGallery[index]]);
    setExistingGallery((prev) => prev.filter((_, i) => i !== index));
  };

  const deleteImageFromStorage = async (imageUrl) => {
    try {
      const url = new URL(imageUrl);
      const pathStart = url.pathname.indexOf('/o/') + 3;
      const pathEnd = url.pathname.indexOf('?');
      const storagePath = decodeURIComponent(url.pathname.substring(pathStart, pathEnd));
      await deleteObject(ref(storage, storagePath));
    } catch (err) {
      console.error('Error deleting image from storage:', err);
      // non-fatal — continue
    }
  };

  // ----- save -----
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const productId = product ? (product.documentId || product.id || formData.id) : `prod_${Date.now()}`;

      // Resolve images.
      let mainImageUrl = formData.b2cImageUrl;
      if (mainImageFile) {
        mainImageUrl = await uploadImageToStorage(mainImageFile, `products/${productId}`, 'b2c_main');
      }

      let gallery = [...existingGallery];
      for (let i = 0; i < galleryFiles.length; i++) {
        const u = await uploadImageToStorage(galleryFiles[i], `products/${productId}`, `b2c_gallery_${Date.now()}_${i}`);
        gallery.push(u);
      }
      for (const url of imagesToDelete) await deleteImageFromStorage(url);

      const price = parseFloat(formData.price) || 0;

      // Build the persisted doc. Single price → BOTH consumer-price fields.
      const data = {
        name: formData.name,            // plain string going forward
        sku: formData.sku,
        size: formData.size,
        color: formData.color,
        group: formData.group,
        tags: formData.tags,
        b2cPrice: price,
        basePrice: price,               // keep in sync for the `b2cPrice || basePrice` fallback
        isActive: formData.isActive,
        imageUrl: mainImageUrl || formData.imageUrl || '',
        b2cImageUrl: mainImageUrl || '',
        b2cImageGallery: gallery,
        availability: { b2c: formData.availability.b2c !== false },
        descriptions: {
          b2c: formData.descriptions.b2c || '',
          b2cMoreInfo: formData.descriptions.b2cMoreInfo || '',
        },
        weight: formData.weight,
        dimensions: formData.dimensions,
        shipping: formData.shipping,
        updatedAt: serverTimestamp(),
      };

      if (formData.launchDate) data.launchDate = new Date(formData.launchDate);

      if (!product) {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, 'products'), withShopId(data, shopId));
        toast.success('Produkt tillagd');
      } else {
        if (!productId || !String(productId).trim()) {
          toast.error('Fel: Produkt-ID saknas. Ladda om sidan.');
          setSaving(false);
          return;
        }
        const docRef = doc(db, 'products', productId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          await updateDoc(docRef, data);
        } else {
          await setDoc(docRef, withShopId({ ...data, createdAt: serverTimestamp() }, shopId));
        }
        toast.success('Produkt uppdaterad');
      }

      // Group content (separate collection), if edited.
      if (formData.group && groupContent && Object.keys(groupContent).length > 0) {
        try {
          await saveProductGroupContent(formData.group, groupContent, userUid, shopId);
        } catch (err) {
          console.error('Error saving group content:', err);
        }
      }

      onSaved?.();
    } catch (err) {
      console.error('Error saving product:', err);
      toast.error('Misslyckades med att spara produkten');
      setSaving(false);
    }
  };

  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
  const inputCls =
    'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg mb-8">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {product ? 'Redigera produkt' : 'Lägg till ny produkt'}
        </h2>
        <button onClick={onCancel} type="button" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          Stäng
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Basics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Produktnamn</label>
            <input name="name" value={formData.name} onChange={handleInput} placeholder="t.ex. Gravad Lax" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>SKU (Artikelnummer)</label>
            <input name="sku" value={formData.sku} onChange={handleInput} placeholder="t.ex. LAX-500" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Storlek</label>
            <input name="size" value={formData.size} onChange={handleInput} placeholder="t.ex. Ca. 5-5.5 hg/frp" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Färg</label>
            <select name="color" value={formData.color} onChange={handleInput} className={inputCls}>
              <option value="">Välj färg…</option>
              {COLORS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <label className={labelCls}>Produktgrupp</label>
            <input
              value={groupInput}
              onChange={onGroupChange}
              onFocus={() => {
                if (availableGroups.length && !groupInput.trim()) {
                  setFilteredGroups(availableGroups);
                  setShowGroupSuggestions(true);
                }
              }}
              onBlur={() => setTimeout(() => setShowGroupSuggestions(false), 200)}
              placeholder="t.ex. Laxfiskar"
              className={inputCls}
            />
            {showGroupSuggestions && filteredGroups.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-lg">
                {filteredGroups.map((g) => (
                  <li key={g}>
                    <button
                      type="button"
                      onMouseDown={() => pickGroup(g)}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      {g}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Storlekar/varianter av SAMMA produkt (visas som en kortgrupp).</p>
          </div>

          {/* Tags — cross-cutting filtering labels (top-menu filters on the
              storefront). Distinct from Produktgrupp. */}
          <div className="relative sm:col-span-2">
            <label className={labelCls}>Taggar</label>
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-2">
              {formData.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-200">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-blue-600 dark:text-blue-300 hover:text-blue-900" aria-label={`Ta bort ${tag}`}>×</button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => { setTagInput(e.target.value); setShowTagSuggestions(true); }}
                onFocus={() => setShowTagSuggestions(true)}
                onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
                  else if (e.key === 'Backspace' && !tagInput && formData.tags.length) {
                    removeTag(formData.tags[formData.tags.length - 1]);
                  }
                }}
                placeholder={formData.tags.length ? '' : 't.ex. Lax, Erbjudande, featured'}
                className="flex-1 min-w-[8rem] bg-transparent text-sm text-gray-900 dark:text-gray-100 focus:outline-none"
              />
            </div>
            {showTagSuggestions && tagSuggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-lg">
                {tagSuggestions.map((tg) => (
                  <li key={tg}>
                    <button
                      type="button"
                      onMouseDown={() => addTag(tg)}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      {tg}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Enter eller komma för att lägga till. Taggen <span className="font-mono">featured</span> visar produkten i utvalt-rutan.
            </p>
          </div>

          <div>
            <label className={labelCls}>Pris (SEK, inkl. moms)</label>
            <input
              type="number"
              name="price"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={handleInput}
              className={inputCls}
            />
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input id="isActive" type="checkbox" name="isActive" checked={formData.isActive} onChange={handleInput} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">Aktiv (synlig i butiken)</label>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input id="avB2c" type="checkbox" checked={formData.availability.b2c} onChange={(e) => setField('availability', { b2c: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="avB2c" className="text-sm text-gray-700 dark:text-gray-300">Tillgänglig i butiken</label>
          </div>
        </div>

        {/* Descriptions */}
        <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
          <div>
            <label className={labelCls}>Beskrivning</label>
            <textarea
              rows={3}
              value={formData.descriptions.b2c}
              onChange={(e) => setField('descriptions', { ...formData.descriptions, b2c: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Mer information</label>
            <ReactQuill
              theme="snow"
              value={formData.descriptions.b2cMoreInfo}
              onChange={(content) => setField('descriptions', { ...formData.descriptions, b2cMoreInfo: content })}
              className="bg-white dark:bg-gray-700 rounded-md"
            />
          </div>
          <div>
            <label className={labelCls}>Lanseringsdatum (valfritt)</label>
            <input type="datetime-local" name="launchDate" value={formData.launchDate} onChange={handleInput} className={inputCls} />
          </div>
        </div>

        {/* Images */}
        <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
          <div>
            <label className={labelCls}>Huvudbild (max 5MB)</label>
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
              <input type="file" accept="image/*" onChange={onMainImageChange} className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-300" />
              {mainImagePreview && (
                <img src={mainImagePreview} alt="Förhandsvisning" className="w-32 h-32 object-cover border border-gray-300 dark:border-gray-600 rounded-md shrink-0" />
              )}
            </div>
          </div>

          <div>
            <label className={labelCls}>Bildgalleri (flera bilder, max 5MB/bild)</label>
            <div className="space-y-4">
              <input type="file" accept="image/*" multiple onChange={onGalleryChange} className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-300" />

              {existingGallery.length > 0 && (
                <SortableImageGallery
                  images={existingGallery.map((url, index) => ({ id: `existing-${index}`, url }))}
                  onReorder={(reordered) => setExistingGallery(reordered.map((img) => img.url))}
                  onRemove={(id) => removeExistingGalleryImage(parseInt(id.split('-')[1], 10))}
                  label="Befintliga bilder:"
                  itemLabel="Befintlig"
                  className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4"
                />
              )}

              {galleryPreviews.length > 0 && (
                <SortableImageGallery
                  images={galleryPreviews.map((preview, index) => ({ id: `new-${index}`, url: preview, file: galleryFiles[index] }))}
                  onReorder={(reordered) => {
                    setGalleryPreviews(reordered.map((img) => img.url));
                    setGalleryFiles(reordered.map((img) => img.file));
                  }}
                  onRemove={(id) => removeNewGalleryImage(parseInt(id.split('-')[1], 10))}
                  label="Nya bilder att ladda upp:"
                  itemLabel="Ny"
                  className="grid grid-cols-2 md:grid-cols-4 gap-4"
                />
              )}
            </div>
          </div>
        </div>

        {/* Shipping (per-product cost table, unchanged data model) */}
        <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Frakt</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              ['sweden', 'Sverige'],
              ['nordic', 'Norden'],
              ['eu', 'EU'],
              ['worldwide', 'Världen'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className={labelCls}>{label} (SEK)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.shipping[key].cost}
                  onChange={(e) =>
                    setField('shipping', {
                      ...formData.shipping,
                      [key]: { ...formData.shipping[key], cost: parseFloat(e.target.value) || 0 },
                    })
                  }
                  className={inputCls}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Vikt påverkar frakten i kassan; viktbaserade nivåer beräknas automatiskt.</p>
        </div>

        {/* Weight (drives the shipping tiers) */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <label className={labelCls}>Vikt</label>
          <div className="flex items-center gap-2 max-w-xs">
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.weight.value}
              onChange={(e) => setField('weight', { ...formData.weight, value: parseFloat(e.target.value) || 0 })}
              className={inputCls}
            />
            <select
              value={formData.weight.unit}
              onChange={(e) => setField('weight', { ...formData.weight, unit: e.target.value })}
              className={inputCls + ' max-w-[6rem]'}
            >
              <option value="g">g</option>
              <option value="kg">kg</option>
            </select>
          </div>
        </div>

        {/* Group content — only when a group is set (existing behaviour). */}
        {formData.group && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <ProductGroupTab
              productGroup={formData.group}
              onContentChange={() => {}}
              onGroupContentUpdate={(content) => setGroupContent(content)}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 pt-6">
          <button type="button" onClick={onCancel} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50">
            Avbryt
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">
            {saving ? 'Sparar…' : product ? 'Spara ändringar' : 'Skapa produkt'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
