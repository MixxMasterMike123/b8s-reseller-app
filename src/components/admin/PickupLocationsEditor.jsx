// PickupLocationsEditor — shop-admin UI to manage Click & Collect pickup points
// (Slice 2). Edits an array of { id, name, address, hours }; the parent
// (AdminSettings) persists it as storeForm.pickupLocations via the shopConfig
// seam (shops/{shopId}.storeIdentity). Empty list = pickup not offered at
// checkout. Self-contained list editor; value/onChange controlled by the parent.
import React from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

// Stable-ish id without Date.now()/Math.random reliance issues — index+name is
// only used as a React key fallback; the real id is generated on add.
const makeId = (existing) => {
  let n = existing.length + 1;
  let id = `loc-${n}`;
  const taken = new Set(existing.map((l) => l.id));
  while (taken.has(id)) {
    n += 1;
    id = `loc-${n}`;
  }
  return id;
};

const PickupLocationsEditor = ({ value, onChange }) => {
  const locations = Array.isArray(value) ? value : [];

  const update = (idx, patch) => {
    onChange(locations.map((loc, i) => (i === idx ? { ...loc, ...patch } : loc)));
  };
  const add = () => {
    onChange([...locations, { id: makeId(locations), name: '', address: '', hours: '' }]);
  };
  const remove = (idx) => {
    onChange(locations.filter((_, i) => i !== idx));
  };

  const inputCls =
    'w-full rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface px-3 py-1.5 text-[13px] text-admin-text placeholder:text-admin-text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)]';

  return (
    <div className="md:col-span-2">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-[13px] font-medium text-admin-text">
          Upphämtningsplatser (Click &amp; Collect)
        </label>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 text-[13px] font-medium text-admin-text hover:opacity-70"
        >
          <PlusIcon className="h-4 w-4" />
          Lägg till plats
        </button>
      </div>

      {locations.length === 0 ? (
        <p className="text-[13px] text-admin-text-muted">
          Inga upphämtningsplatser. Lägg till en för att erbjuda upphämtning i kassan (annars visas bara hemleverans).
        </p>
      ) : (
        <div className="space-y-3">
          {locations.map((loc, idx) => (
            <div
              key={loc.id || idx}
              className="rounded-[var(--radius-admin-el)] border border-admin-border p-3 bg-admin-surface-2"
            >
              <div className="flex items-start gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                  <input
                    value={loc.name ?? ''}
                    onChange={(e) => update(idx, { name: e.target.value })}
                    placeholder="Namn (t.ex. Butiken i Centrum)"
                    className={inputCls}
                  />
                  <input
                    value={loc.hours ?? ''}
                    onChange={(e) => update(idx, { hours: e.target.value })}
                    placeholder="Öppettider (t.ex. Mån–Fre 10–18)"
                    className={inputCls}
                  />
                  <input
                    value={loc.address ?? ''}
                    onChange={(e) => update(idx, { address: e.target.value })}
                    placeholder="Adress (gata, postnr, ort)"
                    className={inputCls + ' sm:col-span-2'}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  title="Ta bort plats"
                  className="shrink-0 p-2 text-admin-critical-dot hover:bg-admin-critical-bg rounded-[var(--radius-admin-el)]"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-1 text-[12px] text-admin-text-muted">
        Kunden väljer hemleverans eller en upphämtningsplats i kassan. Upphämtning har ingen fraktkostnad.
      </p>
    </div>
  );
};

export default PickupLocationsEditor;
