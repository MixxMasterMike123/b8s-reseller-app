// ProductMapping — maps a validated artwork → product SKU + placement. Products are
// a SEPARATE entity; this never edits products. Orphan visibility (don't prevent
// renames — surface breakage): a mapping whose SKU no longer matches any current
// product, or whose artworkId no longer resolves, is flagged so the seller fixes it
// before an order silently arrives with no file.
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { CardSection, Button, Field, Input, Select } from '../../../components/admin/ui';
import StatusPill from '../../../components/admin/ui/StatusPill';
import { listMappings, setMapping, deleteMapping, listShopProductSkus } from '../../../utils/podMappings';
import { listArtwork } from '../../../utils/podArtwork';
import { loadPodProfiles, getProfileById } from '../../../config/podProfiles';
import { tierTone, tierLabel } from './podTier';

const ProductMapping = ({ shopId }) => {
  const [mappings, setMappings] = useState([]);
  const [artwork, setArtwork] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [productSkus, setProductSkus] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // add-row form state
  const [sku, setSku] = useState('');
  const [artworkId, setArtworkId] = useState('');
  const [placement, setPlacement] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [maps, arts, profs, prods] = await Promise.all([
        listMappings(shopId),
        listArtwork(shopId),
        loadPodProfiles(),
        listShopProductSkus(shopId),
      ]);
      setMappings(maps);
      setArtwork(arts);
      setProfiles(profs);
      setProductSkus(prods.skus);
    } catch (e) {
      console.error('ProductMapping load failed:', e);
      toast.error('Kunde inte ladda kopplingar.');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => { refresh(); }, [refresh]);

  const artworkById = (id) => artwork.find((a) => a.id === id) || null;
  const purposeLabel = (id) => getProfileById(profiles, id)?.label || id;

  const handleAdd = async () => {
    if (saving) return;
    const cleanSku = sku.trim();
    if (!cleanSku) { toast.error('Ange en SKU.'); return; }
    if (!artworkId) { toast.error('Välj ett original.'); return; }
    setSaving(true);
    try {
      const art = artworkById(artworkId);
      await setMapping({ shopId, sku: cleanSku, artworkId, profileId: art?.purpose || null, placement });
      toast.success('Koppling sparad');
      setSku(''); setArtworkId(''); setPlacement('');
      refresh();
    } catch (e) {
      toast.error(e?.message || 'Kunde inte spara kopplingen.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m) => {
    if (!window.confirm(`Ta bort kopplingen för SKU "${m.sku}"?`)) return;
    try {
      await deleteMapping(m.id);
      toast.success('Koppling borttagen');
      refresh();
    } catch (e) {
      toast.error('Kunde inte ta bort kopplingen.');
    }
  };

  // artwork eligible to attach: not FAIL (a seller can still pick, but we surface tier)
  const selectableArtwork = artwork;

  return (
    <CardSection title="Produktkoppling">
      <p className="mb-3 text-[13px] text-admin-text-muted">
        Koppla ett original till en produkt-SKU (eller variant-SKU) och ange placering.
        När en order kommer in hämtar tryckeriet rätt original via SKU:n. Produkterna
        själva ändras inte.
      </p>

      {/* Add-row form */}
      <div className="mb-4 grid gap-3 rounded-[var(--radius-admin)] border border-admin-border-soft bg-admin-surface-2 p-3 sm:grid-cols-4">
        <Field label="Produkt-SKU" htmlFor="map-sku">
          <Input id="map-sku" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="t.ex. TSHIRT-RED-M" />
        </Field>
        <Field label="Original" htmlFor="map-art">
          <Select id="map-art" value={artworkId} onChange={(e) => setArtworkId(e.target.value)}>
            <option value="">Välj original…</option>
            {selectableArtwork.map((a) => (
              <option key={a.id} value={a.id}>
                {(a.label || a.fileName)} {a.validation?.tier ? `· ${tierLabel(a.validation.tier)}` : ''}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Placering" htmlFor="map-place">
          <Input id="map-place" value={placement} onChange={(e) => setPlacement(e.target.value)} placeholder="t.ex. Centrerat på bröstet, 25 cm" />
        </Field>
        <div className="flex items-end">
          <Button variant="primary" onClick={handleAdd} disabled={saving} className="w-full">
            {saving ? 'Sparar…' : 'Lägg till'}
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-[13px] text-admin-text-muted">Laddar…</p>
      ) : mappings.length === 0 ? (
        <p className="text-[13px] text-admin-text-muted">Inga kopplingar ännu.</p>
      ) : (
        <ul className="divide-y divide-admin-border-soft">
          {mappings.map((m) => {
            const art = artworkById(m.artworkId);
            const skuOrphan = m.sku && !productSkus.has(m.sku);
            const artOrphan = m.artworkId && !art;
            return (
              <li key={m.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-mono text-[13px] font-medium text-admin-text">{m.sku}</span>
                    {art && <StatusPill tone={tierTone(art.validation?.tier)}>{tierLabel(art.validation?.tier)}</StatusPill>}
                    {skuOrphan && (
                      <span className="inline-flex items-center gap-1 text-[12px] text-admin-caution-text">
                        <ExclamationTriangleIcon className="h-3.5 w-3.5" /> Ingen produkt med denna SKU – omdöpt eller borttagen?
                      </span>
                    )}
                    {artOrphan && (
                      <span className="inline-flex items-center gap-1 text-[12px] text-admin-critical-text">
                        <ExclamationTriangleIcon className="h-3.5 w-3.5" /> Originalet saknas
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[12px] text-admin-text-faint">
                    {art ? (art.label || art.fileName) : '—'}
                    {m.profileId ? ` · ${purposeLabel(m.profileId)}` : ''}
                    {m.placement ? ` · ${m.placement}` : ''}
                  </div>
                </div>
                {art?.previewUrl && (
                  <img src={art.previewUrl} alt="" className="h-10 w-10 shrink-0 rounded-[6px] border border-admin-border object-cover" />
                )}
                <button
                  onClick={() => handleDelete(m)}
                  title="Ta bort koppling"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-admin-el)] text-admin-text-faint hover:bg-admin-surface-2 hover:text-admin-critical-dot"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </CardSection>
  );
};

export default ProductMapping;
