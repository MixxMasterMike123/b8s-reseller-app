// PodProductPicker — the shared "which product does this original belong to?" control.
//
// Used by ProductMapping (add-row) and ArtworkUploadModal (post-upload prompt).
// Products are READ-ONLY here (POD owns mappings, products stay untouched — locked
// architecture). The value is always a SKU string.
//
// Default mode = pick from the shop's products. Each product with variants renders
// an <optgroup>: the first option is the PARENT SKU ("alla varianter"), then one
// indented option per COLORWAY (variant rail group). A mapping on the parent covers
// ALL variants; a per-colorway mapping wins over the parent for that colorway (use
// case: a different logo colour on dark garments). Selecting a variant yields that
// colorway's SKU. The value contract stays a SKU string. Manual entry is the escape
// hatch for size-level or arbitrary SKUs.
//
// Products lacking a SKU are listed disabled "(saknar SKU)" so the seller sees them.
import React from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { Select, Input } from '../../../components/admin/ui';

/**
 * @param {Array}  products  [{ sku, name, image, hasSku, variants:[{sku,label,image}] }] — from listShopProductSkus().products
 * @param {string} value     current SKU
 * @param {func}   onChange  (sku:string) => void
 * @param {boolean} manual   manual-entry mode on?
 * @param {func}   onToggleManual (next:boolean) => void
 * @param {string} idPrefix  unique id prefix (avoid duplicate DOM ids across surfaces)
 */
const PodProductPicker = ({
  products = [],
  value,
  onChange,
  manual,
  onToggleManual,
  idPrefix = 'pod-pick',
}) => {
  // Resolve the current value to a product (parent match) or a variant (colorway
  // match) so the preview thumbnail can show the variant image when one's chosen.
  let selected = null;
  let selectedVariant = null;
  if (!manual) {
    for (const p of products) {
      if (p.hasSku && p.sku === value) { selected = p; break; }
      const v = (p.variants || []).find((x) => x.sku === value);
      if (v) { selected = p; selectedVariant = v; break; }
    }
  }
  // Variant thumbnail wins; else the product image.
  const previewImage = selectedVariant?.image || selected?.image || null;

  return (
    <div>
      {manual ? (
        <>
          <Input
            id={`${idPrefix}-sku`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="t.ex. north-01-svart"
          />
          <p className="mt-1 text-[12px] text-admin-text-faint">
            En koppling på huvud-SKU:n täcker alla varianter (storlek/färg). Ange en
            variant-SKU bara om en färgställning ska ha ett eget original.
          </p>
        </>
      ) : (
        <>
        <div className="flex items-center gap-2">
          {previewImage ? (
            <img
              src={previewImage}
              alt=""
              className="h-9 w-9 shrink-0 rounded-[6px] border border-admin-border object-cover"
            />
          ) : (
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[6px] border border-admin-border bg-admin-surface-2 text-admin-text-faint">
              <PhotoIcon className="h-4 w-4" />
            </div>
          )}
          <Select
            id={`${idPrefix}-product`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1"
          >
            <option value="">Välj produkt…</option>
            {products.map((p) => {
              const variants = (p.variants || []).filter((v) => v.sku);
              const name = p.name || '(namnlös produkt)';
              // No SKU → single disabled option (can't map, but seller sees it).
              if (!p.hasSku) {
                return (
                  <option key={p.id || p.name} value="" disabled>
                    {name} (saknar SKU)
                  </option>
                );
              }
              // No variants → flat option (parent SKU), unchanged behaviour.
              if (variants.length === 0) {
                return (
                  <option key={p.id || p.sku} value={p.sku}>
                    {name} · {p.sku}
                  </option>
                );
              }
              // Variants → optgroup: parent ("alla varianter") + indented colorways.
              return (
                <optgroup key={p.id || p.sku} label={name}>
                  <option value={p.sku}>{name} — alla varianter · {p.sku}</option>
                  {variants.map((v) => (
                    <option key={v.sku} value={v.sku}>
                      &nbsp;&nbsp;↳ {v.label} · {v.sku}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </Select>
        </div>
        <p className="mt-1 text-[12px] text-admin-text-faint">
          Koppla huvud-SKU:n för att täcka alla varianter. Välj en variant om t.ex.
          logotypen ska ha en annan färg på mörka plagg — variantens koppling vinner
          över huvud-SKU:ns.
        </p>
        </>
      )}

      <button
        type="button"
        onClick={() => onToggleManual(!manual)}
        className="mt-1.5 text-[12px] text-admin-text-muted underline hover:text-admin-text"
      >
        {manual ? 'Välj bland produkter i stället' : 'Ange SKU manuellt'}
      </button>
    </div>
  );
};

export default PodProductPicker;
