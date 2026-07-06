// PodProductPicker — the shared "which product does this original belong to?" control.
//
// Used by ProductMapping (add-row) and ArtworkUploadModal (post-upload prompt).
// Products are READ-ONLY here (POD owns mappings, products stay untouched — locked
// architecture). The value is always a SKU string.
//
// Default mode = pick from the shop's products by their PARENT SKU. A mapping on the
// parent SKU covers ALL variants (the print projection resolves variant order-lines
// to the parent SKU; a more specific variant mapping wins over the parent). So the
// picker lists whole products, and variant-specific SKUs are the manual escape hatch.
//
// Products lacking a SKU are listed disabled "(saknar SKU)" so the seller sees them.
import React from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { Select, Input } from '../../../components/admin/ui';

/**
 * @param {Array}  products  [{ sku, name, image, hasSku }] — from listShopProductSkus().products
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
  const selected = !manual ? products.find((p) => p.hasSku && p.sku === value) : null;

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
        <div className="flex items-center gap-2">
          {selected?.image ? (
            <img
              src={selected.image}
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
            {products.map((p) => (
              <option key={p.id || p.sku || p.name} value={p.hasSku ? p.sku : ''} disabled={!p.hasSku}>
                {p.name || '(namnlös produkt)'}
                {p.hasSku ? ` · ${p.sku}` : ' (saknar SKU)'}
              </option>
            ))}
          </Select>
        </div>
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
