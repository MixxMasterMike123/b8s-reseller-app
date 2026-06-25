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
// Product model v2 (2026-06-15, docs/PRODUCT_MODEL_V2.md):
//  • `group` → `category` (the browse taxonomy / URL driver). The old
//    productGroups side-collection + defaultProductId are gone.
//  • VARIANTS are embedded on the product: `variants: [{ sku, label, price,
//    image? }]`, gated by `hasVariants` (off by default). No more per-variant
//    product docs / shared group string. size/color top-level fields removed
//    (a variant's `label` carries the choice).
//
// Tenancy: create stamps shopId via withShopId(...) and the parent passes
// shopId from useShopId().
import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, addDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { uploadImageToStorage } from '../../utils/imageUpload';
import { db, storage } from '../../firebase/config';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import SortableImageGallery from './SortableImageGallery';
import { withShopId } from '../../config/withShopId';
import { useShopFeatures } from '../../contexts/ShopFeaturesContext';
import { CardSection, RightRail, Button } from './ui';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Read a field that may be a legacy per-locale object or a plain string.
const plainText = (field) => {
  if (typeof field === 'string') return field;
  if (field && typeof field === 'object') {
    return field['sv-SE'] || Object.values(field).find((v) => typeof v === 'string') || '';
  }
  return '';
};

const emptyForm = () => ({
  id: '',
  name: '',
  sku: '',
  category: '',          // was `group`: the browse taxonomy / URL driver
  tags: [],
  price: 0,
  // Wholesale price (B2B add-on). Distinct from the consumer price: the B2B
  // portal charges this (ex moms), the storefront never reads it. Persisted to
  // a NEW `b2bPrice` field — NOT basePrice (basePrice mirrors b2cPrice as the
  // consumer fallback). 0 = no wholesale price set. Only shown/saved when the
  // shop has the `b2b` add-on enabled.
  b2bPrice: 0,
  // Variants (sizes/colours of THIS product), optional + off by default.
  // Each: { sku, label, price, image? }. Empty when hasVariants is false.
  hasVariants: false,
  variants: [],
  isActive: true,
  imageUrl: '',
  b2cImageUrl: '',
  b2cImageGallery: [],
  launchDate: '',
  // b2c: live storefront query filter. b2b: wholesale-catalog filter (B2B
  // add-on). Both default-ON: a product without the key is available.
  availability: { b2c: true, b2b: true },
  descriptions: { b2c: '', b2cMoreInfo: '' },
  // Right-of-withdrawal (POD). A "personalized" / made-to-order product (buyer
  // supplies own image/text/measurements) is a specialtillverkad vara → consumer
  // ångerrätt (14-day withdrawal) does NOT apply, IF disclosed + consented at
  // checkout. Default false = a normal standard-options product WITH withdrawal.
  isPersonalized: false,
  // Optional per-product size guide (rich text). Shown on the product page and
  // referenced by the no-withdrawal notice for size-dependent products.
  sizeGuide: '',
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
  // Per-product delivery modes (Delivery & Pickup v2). Both default ON, so a
  // product without this field behaves exactly as before: shippable AND
  // pickup-eligible. At least one must stay on (a product no one can receive
  // makes no sense) — enforced at save time.
  delivery: { shipping: true, pickup: true },
});

// Build the form state from an existing product doc (read-compatible).
const formFromProduct = (p) => ({
  ...emptyForm(),
  id: p.id || '',
  name: plainText(p.name),
  sku: p.sku || '',
  // category: prefer the new field, fall back to the old `group` (so any
  // pre-existing test product still shows its taxonomy when edited).
  category: p.category || p.group || '',
  tags: Array.isArray(p.tags) ? p.tags : [],
  // Single price sourced from the consumer price (b2cPrice || basePrice).
  price: p.b2cPrice || p.basePrice || 0,
  // Wholesale price (B2B add-on). Read straight from b2bPrice; 0 if unset.
  b2bPrice: p.b2bPrice || 0,
  hasVariants: !!p.hasVariants && Array.isArray(p.variants) && p.variants.length > 0,
  variants: Array.isArray(p.variants)
    ? p.variants.map((v) => ({ sku: v.sku || '', label: v.label || '', price: v.price || 0, image: v.image || '' }))
    : [],
  isActive: p.isActive ?? true,
  imageUrl: p.imageUrl || '',
  b2cImageUrl: p.b2cImageUrl || '',
  b2cImageGallery: Array.isArray(p.b2cImageGallery) ? p.b2cImageGallery : [],
  launchDate: p.launchDate
    ? new Date(p.launchDate.toDate ? p.launchDate.toDate() : p.launchDate).toISOString().slice(0, 16)
    : '',
  availability: { b2c: p.availability?.b2c !== false, b2b: p.availability?.b2b !== false },
  // Right-of-withdrawal: default false (a normal product retains 14-day withdrawal).
  isPersonalized: p.isPersonalized === true,
  sizeGuide: p.sizeGuide || '',
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
  // Default-ON read: a product without `delivery` (every product before this
  // feature) is treated as both shippable and pickup-eligible. Only an explicit
  // `false` turns a mode off.
  delivery: {
    shipping: p.delivery?.shipping !== false,
    pickup: p.delivery?.pickup !== false,
  },
});

/**
 * @param {object|null} product   the product being edited, or null to create
 * @param {string} shopId         the active shop (tenancy)
 * @param {string[]} availableCategories  existing category names (autocomplete)
 * @param {string[]} availableTags    existing tag names across the shop (autocomplete)
 * @param {() => void} onSaved     called after a successful save (parent reloads + closes)
 * @param {() => void} onCancel    close without saving
 */
const ProductForm = ({ product, shopId, availableCategories = [], availableTags = [], onSaved, onCancel }) => {
  const [formData, setFormData] = useState(() => (product ? formFromProduct(product) : emptyForm()));
  const [saving, setSaving] = useState(false);

  // B2B Wholesale add-on: gates the wholesale-price field. Default-ON for shops
  // without a `features` map, but nothing else in this form depends on it, so a
  // non-B2B shop simply never sees the extra field.
  const { isEnabled } = useShopFeatures();
  const b2bEnabled = isEnabled('b2b');

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

  // Category autocomplete (the browse taxonomy / URL driver; was `group`).
  const [categoryInput, setCategoryInput] = useState(product?.category || product?.group || '');
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState([]);

  // Tags: a chip input with autocomplete. tags = light filter labels (e.g.
  // `featured`), distinct from `category` (the browse taxonomy) and from
  // `variants` (sizes/colours of THIS product).
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

  // ----- category autocomplete -----
  const onCategoryChange = (e) => {
    const v = e.target.value;
    setCategoryInput(v);
    setField('category', v);
    if (v.trim()) {
      const f = availableCategories.filter((g) => g.toLowerCase().includes(v.toLowerCase()));
      setFilteredCategories(f);
      setShowCategorySuggestions(f.length > 0);
    } else {
      setFilteredCategories([]);
      setShowCategorySuggestions(false);
    }
  };
  const pickCategory = (g) => {
    setCategoryInput(g);
    setField('category', g);
    setShowCategorySuggestions(false);
  };

  // ----- variants -----
  const addVariant = () => setField('variants', [...formData.variants, { sku: '', label: '', price: formData.price || 0, image: '' }]);
  const updateVariant = (idx, patch) => setField('variants', formData.variants.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  const removeVariant = (idx) => setField('variants', formData.variants.filter((_, i) => i !== idx));
  const toggleHasVariants = (on) => {
    if (on) {
      setField('hasVariants', true);
      if (formData.variants.length === 0) addVariant();
    } else {
      setFormData((prev) => ({ ...prev, hasVariants: false }));
    }
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

    // Per-product delivery modes: at least one must be on, otherwise the product
    // can't be received by any method (and checkout would have no valid option).
    if (!formData.delivery?.shipping && !formData.delivery?.pickup) {
      toast.error('Välj minst ett leveranssätt (hemleverans eller upphämtning).');
      return;
    }

    setSaving(true);
    try {
      const productId = product ? (product.documentId || product.id || formData.id) : `prod_${Date.now()}`;

      // Resolve images.
      let mainImageUrl = formData.b2cImageUrl;
      if (mainImageFile) {
        mainImageUrl = await uploadImageToStorage(mainImageFile, `products/${shopId}/${productId}`, 'b2c_main');
      }

      let gallery = [...existingGallery];
      for (let i = 0; i < galleryFiles.length; i++) {
        const u = await uploadImageToStorage(galleryFiles[i], `products/${shopId}/${productId}`, `b2c_gallery_${Date.now()}_${i}`);
        gallery.push(u);
      }
      for (const url of imagesToDelete) await deleteImageFromStorage(url);

      const price = parseFloat(formData.price) || 0;
      const b2bPrice = parseFloat(formData.b2bPrice) || 0;

      // Variants: only persisted when enabled; keep rows that have a SKU, with a
      // numeric price (falling back to the product price).
      const cleanVariants = formData.hasVariants
        ? formData.variants
            .filter((v) => (v.sku || '').trim())
            .map((v) => ({
              sku: v.sku.trim(),
              label: (v.label || '').trim(),
              price: parseFloat(v.price) || price,
              image: v.image || '',
            }))
        : [];
      const hasVariants = cleanVariants.length > 0;

      // Build the persisted doc. Single price → BOTH consumer-price fields.
      const data = {
        name: formData.name,            // plain string going forward
        sku: formData.sku,
        category: formData.category,    // browse taxonomy / URL driver (was `group`)
        tags: formData.tags,
        hasVariants,
        variants: cleanVariants,
        b2cPrice: price,
        basePrice: price,               // keep in sync for the `b2cPrice || basePrice` fallback
        // Wholesale price — only written for B2B shops (a non-B2B shop's
        // products never gain the field). NOT folded into base/b2cPrice.
        ...(b2bEnabled ? { b2bPrice } : {}),
        isActive: formData.isActive,
        imageUrl: mainImageUrl || formData.imageUrl || '',
        b2cImageUrl: mainImageUrl || '',
        b2cImageGallery: gallery,
        availability: {
          b2c: formData.availability.b2c !== false,
          // Only carry the b2b availability flag for B2B shops, so a non-B2B
          // shop's products never gain a stray key.
          ...(b2bEnabled ? { b2b: formData.availability.b2b !== false } : {}),
        },
        descriptions: {
          b2c: formData.descriptions.b2c || '',
          b2cMoreInfo: formData.descriptions.b2cMoreInfo || '',
        },
        // Right-of-withdrawal (POD): always written so toggling OFF persists
        // (a product can move from personalized → standard). Size guide is
        // free text; empty string when unset.
        isPersonalized: formData.isPersonalized === true,
        sizeGuide: formData.sizeGuide || '',
        weight: formData.weight,
        dimensions: formData.dimensions,
        shipping: formData.shipping,
        // Per-product delivery modes (validated above: at least one is true).
        delivery: { shipping: !!formData.delivery?.shipping, pickup: !!formData.delivery?.pickup },
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

      onSaved?.();
    } catch (err) {
      console.error('Error saving product:', err);
      toast.error('Misslyckades med att spara produkten');
      setSaving(false);
    }
  };

  const labelCls = 'block text-[13px] font-medium text-admin-text mb-1';
  const inputCls =
    'w-full rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface px-3 py-1.5 text-[13px] text-admin-text placeholder:text-admin-text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)]';

  const checkboxCls = 'h-4 w-4 rounded-[4px] border-admin-border text-[var(--color-admin-primary)] focus:ring-[var(--color-admin-primary)]';
  const helpCls = 'mt-1 text-[12px] text-admin-text-muted';

  return (
    <form onSubmit={handleSubmit}>
      <RightRail
        main={
          <>
            {/* Title + SKU + Description — Shopify groups title/description at the very top */}
            <CardSection bodyClassName="space-y-4">
              <div>
                <label className={labelCls}>Titel</label>
                <input name="name" value={formData.name} onChange={handleInput} placeholder="t.ex. Gravad Lax" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>SKU (Artikelnummer)</label>
                <input name="sku" value={formData.sku} onChange={handleInput} placeholder="t.ex. LAX-500" className={inputCls} />
              </div>
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
                  className="rounded-[var(--radius-admin-el)] bg-admin-surface"
                />
              </div>
              <div>
                <label className={labelCls}>Storleksguide (valfritt)</label>
                <textarea
                  rows={4}
                  value={formData.sizeGuide}
                  onChange={(e) => setField('sizeGuide', e.target.value)}
                  placeholder="t.ex. mått per storlek (S/M/L), mätinstruktioner…"
                  className={inputCls}
                />
                <p className={helpCls}>Visas på produktsidan. Viktigt för storleksberoende produkter — hjälper kunden välja rätt och styrker att specialtillverkning godkändes på rätt grunder.</p>
              </div>
            </CardSection>

            {/* Media */}
            <CardSection title="Media" bodyClassName="space-y-4">
              <div>
                <label className={labelCls}>Huvudbild (max 5MB)</label>
                <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-center">
                  <input type="file" accept="image/*" onChange={onMainImageChange} className="block w-full text-[13px] text-admin-text-muted file:mr-4 file:rounded-[var(--radius-admin-el)] file:border-0 file:bg-admin-surface-2 file:px-4 file:py-2 file:text-[13px] file:font-medium file:text-admin-text" />
                  {mainImagePreview && (
                    <img src={mainImagePreview} alt="Förhandsvisning" className="h-32 w-32 shrink-0 rounded-[var(--radius-admin-el)] border border-admin-border object-cover" />
                  )}
                </div>
              </div>
              <div>
                <label className={labelCls}>Bildgalleri (flera bilder, max 5MB/bild)</label>
                <div className="space-y-4">
                  <input type="file" accept="image/*" multiple onChange={onGalleryChange} className="block w-full text-[13px] text-admin-text-muted file:mr-4 file:rounded-[var(--radius-admin-el)] file:border-0 file:bg-admin-surface-2 file:px-4 file:py-2 file:text-[13px] file:font-medium file:text-admin-text" />
                  {existingGallery.length > 0 && (
                    <SortableImageGallery
                      images={existingGallery.map((url, index) => ({ id: `existing-${index}`, url }))}
                      onReorder={(reordered) => setExistingGallery(reordered.map((img) => img.url))}
                      onRemove={(id) => removeExistingGalleryImage(parseInt(id.split('-')[1], 10))}
                      label="Befintliga bilder:"
                      itemLabel="Befintlig"
                      className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4"
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
                      className="grid grid-cols-2 gap-4 md:grid-cols-4"
                    />
                  )}
                </div>
              </div>
            </CardSection>

            {/* Category — Shopify places this in the main column under Media.
                Same autocomplete + state as before (moved out of the rail). */}
            <CardSection title="Kategori" bodyClassName="space-y-2">
              <div className="relative">
                <input
                  value={categoryInput}
                  onChange={onCategoryChange}
                  onFocus={() => {
                    if (availableCategories.length && !categoryInput.trim()) {
                      setFilteredCategories(availableCategories);
                      setShowCategorySuggestions(true);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                  placeholder="Välj en produktkategori"
                  className={inputCls}
                />
                {showCategorySuggestions && filteredCategories.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface shadow-[var(--shadow-admin)]">
                    {filteredCategories.map((g) => (
                      <li key={g}>
                        <button type="button" onMouseDown={() => pickCategory(g)} className="block w-full px-3 py-2 text-left text-[13px] text-admin-text hover:bg-admin-surface-2">
                          {g}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className={helpCls}>Driver toppmenyn + /kategori-sidor.</p>
              </div>
            </CardSection>

            {/* Price */}
            <CardSection title="Pris" bodyClassName="space-y-3">
              <div className="max-w-xs">
                <label className={labelCls}>Pris (SEK, inkl. moms)</label>
                <input type="number" name="price" min="0" step="0.01" value={formData.price} onChange={handleInput} className={inputCls} />
              </div>
              {/* Wholesale price — only when the shop has the B2B add-on. The
                  consumer storefront never reads this; the B2B portal charges it. */}
              {b2bEnabled && (
                <div className="max-w-xs">
                  <label className={labelCls}>Grossistpris (SEK, ex. moms)</label>
                  <input type="number" name="b2bPrice" min="0" step="0.01" value={formData.b2bPrice} onChange={handleInput} className={inputCls} />
                  <p className={helpCls}>Priset B2B-återförsäljare betalar. Visas inte i konsumentbutiken.</p>
                </div>
              )}
              <div>
                <label className={labelCls}>Lanseringsdatum (valfritt)</label>
                <input type="datetime-local" name="launchDate" value={formData.launchDate} onChange={handleInput} className={inputCls + ' max-w-xs'} />
              </div>
            </CardSection>

            {/* Inventory — POD: stock is not tracked. Mirrors Shopify's
                "Inventory not tracked" card visually; no field is persisted. */}
            <CardSection title="Lager" bodyClassName="space-y-1">
              <p className="text-[13px] text-admin-text-muted">Lager spåras inte</p>
              <p className={helpCls}>Försäljningen är obegränsad (print-on-demand) — inget lagersaldo dras.</p>
            </CardSection>

            {/* Shipping + Weight — Shopify orders Shipping before Variants */}
            <CardSection title="Frakt" bodyClassName="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
              <div className="max-w-xs">
                <label className={labelCls}>Vikt</label>
                <div className="flex items-center gap-2">
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
              <p className={helpCls}>Vikt påverkar frakten i kassan; viktbaserade nivåer beräknas automatiskt.</p>

              {/* Per-product delivery modes (Delivery & Pickup v2). Controls
                  whether this product can be shipped and/or picked up. The
                  storefront + checkout offer only the enabled methods, and the
                  server rejects a charge using a disabled method. Both default
                  on; at least one must stay on. */}
              <div className="border-t border-admin-border-soft pt-4">
                <label className={labelCls}>Leveranssätt</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[13px] text-admin-text">
                    <input
                      type="checkbox"
                      checked={formData.delivery.shipping}
                      onChange={(e) => setField('delivery', { ...formData.delivery, shipping: e.target.checked })}
                      className={checkboxCls}
                    />
                    Kan skickas (hemleverans)
                  </label>
                  <label className="flex items-center gap-2 text-[13px] text-admin-text">
                    <input
                      type="checkbox"
                      checked={formData.delivery.pickup}
                      onChange={(e) => setField('delivery', { ...formData.delivery, pickup: e.target.checked })}
                      className={checkboxCls}
                    />
                    Kan hämtas (upphämtning / Click &amp; Collect)
                  </label>
                </div>
                <p className={helpCls}>Minst ett alternativ måste vara valt. Styr vilka leveranssätt kunden kan välja i kassan.</p>
              </div>
            </CardSection>

            {/* Variants */}
            <CardSection
              title="Varianter"
              actions={
                <label className="flex items-center gap-2 text-[13px] text-admin-text-muted">
                  <input type="checkbox" checked={formData.hasVariants} onChange={(e) => toggleHasVariants(e.target.checked)} className={checkboxCls} />
                  Storlek/färg
                </label>
              }
              bodyClassName="space-y-3"
            >
              {formData.hasVariants ? (
                <>
                  {formData.variants.map((v, idx) => (
                    <div key={idx} className="grid grid-cols-12 items-end gap-3 rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface-2 p-3">
                      <div className="col-span-12 sm:col-span-4">
                        <label className={labelCls}>Variant (etikett)</label>
                        <input value={v.label} onChange={(e) => updateVariant(idx, { label: e.target.value })} placeholder="t.ex. Small / Röd" className={inputCls} />
                      </div>
                      <div className="col-span-6 sm:col-span-3">
                        <label className={labelCls}>SKU</label>
                        <input value={v.sku} onChange={(e) => updateVariant(idx, { sku: e.target.value })} placeholder="t.ex. LAX-S" className={inputCls} />
                      </div>
                      <div className="col-span-6 sm:col-span-3">
                        <label className={labelCls}>Pris (SEK)</label>
                        <input type="number" min="0" step="0.01" value={v.price} onChange={(e) => updateVariant(idx, { price: parseFloat(e.target.value) || 0 })} className={inputCls} />
                      </div>
                      <div className="col-span-12 flex sm:col-span-2">
                        <Button type="button" variant="plain" onClick={() => removeVariant(idx)} className="w-full text-admin-critical-dot">
                          Ta bort
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="plain" onClick={addVariant}>+ Lägg till variant</Button>
                  <p className={helpCls}>
                    Varje variant behöver minst ett SKU. Pris per variant (tomt = produktens pris). Den första bilden/galleriet delas av alla varianter.
                  </p>
                </>
              ) : (
                <p className="text-[13px] text-admin-text-muted">Den här produkten har inga varianter. Slå på för att lägga till storlek/färg.</p>
              )}
            </CardSection>

            {/* Save bar */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Avbryt</Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Sparar…' : product ? 'Spara ändringar' : 'Skapa produkt'}
              </Button>
            </div>
          </>
        }
        rail={
          <>
            {/* Status */}
            <CardSection title="Status" bodyClassName="space-y-3">
              <label className="flex items-center gap-2 text-[13px] text-admin-text">
                <input id="isActive" type="checkbox" name="isActive" checked={formData.isActive} onChange={handleInput} className={checkboxCls} />
                Aktiv (synlig i butiken)
              </label>
            </CardSection>

            {/* Publishing — per-channel availability gates. MERGE into the
                availability object (never replace it) so the b2c toggle can't
                clobber the sibling b2b key, and vice versa. */}
            <CardSection title="Publicering" bodyClassName="space-y-3">
              <label className="flex items-center gap-2 text-[13px] text-admin-text">
                <input id="avB2c" type="checkbox" checked={formData.availability.b2c} onChange={(e) => setField('availability', { ...formData.availability, b2c: e.target.checked })} className={checkboxCls} />
                Tillgänglig i webbshoppen
              </label>
              <p className={helpCls}>Avmarkera för att dölja produkten i webbshoppen utan att inaktivera den.</p>
              {/* B2B-availability gate — only for shops with the B2B add-on. Lets
                  an admin offer a product wholesale-only or hide it from B2B
                  while keeping it in the consumer shop (independent of b2c). */}
              {b2bEnabled && (
                <>
                  <label className="flex items-center gap-2 text-[13px] text-admin-text">
                    <input id="avB2b" type="checkbox" checked={formData.availability.b2b} onChange={(e) => setField('availability', { ...formData.availability, b2b: e.target.checked })} className={checkboxCls} />
                    Tillgänglig i grossistportalen
                  </label>
                  <p className={helpCls}>Avmarkera för att dölja produkten för B2B-kunder.</p>
                </>
              )}
            </CardSection>

            {/* Right of withdrawal / made-to-order (POD consumer law). */}
            <CardSection title="Ångerrätt" bodyClassName="space-y-3">
              <label className="flex items-center gap-2 text-[13px] text-admin-text">
                <input
                  id="isPersonalized"
                  type="checkbox"
                  checked={formData.isPersonalized}
                  onChange={(e) => setField('isPersonalized', e.target.checked)}
                  className={checkboxCls}
                />
                Specialtillverkad / personlig produkt (ingen ångerrätt)
              </label>
              <p className={helpCls}>
                Markera om produkten tillverkas efter kundens egen design, text, bild eller mått.
                Då gäller ingen 14-dagars ångerrätt — kunden måste godkänna detta i kassan innan köp.
                Lämna omarkerad för en standardprodukt med full ångerrätt.
              </p>
            </CardSection>

            {/* Organization — tags (category lives in the main column, Shopify-style) */}
            <CardSection title="Organisation" bodyClassName="space-y-4">
              <div className="relative">
                <label className={labelCls}>Taggar</label>
                <div className="flex flex-wrap items-center gap-1.5 rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface px-2 py-1.5">
                  {formData.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-[var(--radius-admin-el)] bg-admin-info-bg px-2 py-0.5 text-[12px] font-medium text-admin-info-text">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="text-admin-info-text hover:opacity-70" aria-label={`Ta bort ${tag}`}>×</button>
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
                    placeholder={formData.tags.length ? '' : 't.ex. Lax, featured'}
                    className="min-w-[6rem] flex-1 bg-transparent text-[13px] text-admin-text placeholder:text-admin-text-faint focus:outline-none"
                  />
                </div>
                {showTagSuggestions && tagSuggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface shadow-[var(--shadow-admin)]">
                    {tagSuggestions.map((tg) => (
                      <li key={tg}>
                        <button type="button" onMouseDown={() => addTag(tg)} className="block w-full px-3 py-2 text-left text-[13px] text-admin-text hover:bg-admin-surface-2">
                          {tg}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className={helpCls}>
                  Enter eller komma för att lägga till. Taggen <span className="font-mono">featured</span> visar produkten i utvalt-rutan.
                </p>
              </div>
            </CardSection>
          </>
        }
      />
    </form>
  );
};

export default ProductForm;
