// ArtworkLibrary — the seller's print-artwork library: upload + validate + list +
// delete. Shop-scoped. Admin-Neutral design.
//
// UNMAPPED VISIBILITY: an unmapped artwork means orders never reach the print queue
// — this state MUST be loud. Each row shows either an amber "Inte kopplad till
// produkt" chip + a "Koppla…" action (jumps to Produktkoppling prefilled), or the
// SKU(s) it's mapped to as small chips. The mapping data comes from the shared
// usePodLibrary load (ONE listMappings call, not N).
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { TrashIcon, PhotoIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { CardSection, Button } from '../../../components/admin/ui';
import StatusPill from '../../../components/admin/ui/StatusPill';
import { deleteArtwork } from '../../../utils/podArtwork';
import { getProfileById } from '../../../config/podProfiles';
import { tierTone, tierLabel } from './podTier';
import ArtworkUploadModal from './ArtworkUploadModal';

const formatBytes = (b) => (b ? `${(b / 1024 / 1024).toFixed(1)} MB` : '');

// Data comes from the shared usePodLibrary load (lifted to PodAdminPage) so the
// mapped/unmapped chips + the page banner all agree from a single fetch.
const ArtworkLibrary = ({
  shopId,
  artwork = [],
  profiles = [],
  products = [],
  mappings = [],
  loading = false,
  onChanged,
  onMapArtwork,
}) => {
  const [uploadOpen, setUploadOpen] = useState(false);
  const items = artwork;

  const refresh = () => onChanged?.();

  // Map artworkId → the SKUs that reference it (built once from the shared mappings).
  const skusByArtwork = React.useMemo(() => {
    const m = new Map();
    mappings.forEach((mp) => {
      if (!mp.artworkId || !mp.sku) return;
      const arr = m.get(mp.artworkId) || [];
      arr.push(mp.sku);
      m.set(mp.artworkId, arr);
    });
    return m;
  }, [mappings]);

  const handleDelete = async (art) => {
    if (!window.confirm(`Ta bort "${art.label || art.fileName}"?`)) return;
    try {
      await deleteArtwork(art, shopId);
      toast.success('Original borttaget');
      refresh();
    } catch (e) {
      // Soft guard: mapped artwork can't be deleted until the mapping is removed.
      toast.error(e?.message || 'Kunde inte ta bort originalet.');
    }
  };

  const purposeLabel = (id) => getProfileById(profiles, id)?.label || id;

  return (
    <CardSection
      title="Original"
      actions={<Button variant="primary" onClick={() => setUploadOpen(true)}>Ladda upp original</Button>}
    >
      {loading ? (
        <p className="text-[13px] text-admin-text-muted">Laddar…</p>
      ) : items.length === 0 ? (
        <p className="text-[13px] text-admin-text-muted">
          Inga original ännu. Ladda upp en tryckfärdig fil för att börja.
        </p>
      ) : (
        <ul className="divide-y divide-admin-border-soft">
          {items.map((art) => {
            const mappedSkus = skusByArtwork.get(art.id) || [];
            const isMapped = mappedSkus.length > 0;
            return (
            <li key={art.id} className="flex items-center gap-3 py-2.5">
              {/* thumbnail (preview is null for PDF/SVG/TIFF → placeholder) */}
              {art.previewUrl ? (
                <img src={art.previewUrl} alt="" className="h-12 w-12 shrink-0 rounded-[6px] border border-admin-border object-cover" />
              ) : (
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[6px] border border-admin-border bg-admin-surface-2 text-admin-text-faint">
                  <PhotoIcon className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[13px] font-medium text-admin-text">{art.label || art.fileName}</span>
                  <StatusPill tone={tierTone(art.validation?.tier)}>{tierLabel(art.validation?.tier)}</StatusPill>
                  {isMapped ? (
                    mappedSkus.map((s) => (
                      <span key={s} className="inline-flex items-center rounded-full border border-admin-border-soft bg-admin-surface-2 px-2 py-0.5 font-mono text-[11px] text-admin-text-muted">
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-admin-caution-dot/30 bg-admin-caution-bg px-2 py-0.5 text-[11px] font-medium text-admin-caution-text">
                      <ExclamationTriangleIcon className="h-3 w-3" /> Inte kopplad till produkt
                    </span>
                  )}
                </div>
                <div className="truncate text-[12px] text-admin-text-faint">
                  {purposeLabel(art.purpose)}
                  {art.sourceWidthPx ? ` · ${art.sourceWidthPx}×${art.sourceHeightPx} px` : ''}
                  {art.validation?.effectiveDpi != null ? ` · ${art.validation.effectiveDpi} DPI` : ''}
                  {art.ext ? ` · ${art.ext.toUpperCase()}` : ''}
                  {art.fileSizeBytes ? ` · ${formatBytes(art.fileSizeBytes)}` : ''}
                </div>
              </div>
              {!isMapped && onMapArtwork && (
                <button
                  onClick={() => onMapArtwork(art.id)}
                  className="shrink-0 rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface px-2.5 py-1 text-[12px] font-medium text-admin-text hover:bg-admin-surface-2"
                >
                  Koppla…
                </button>
              )}
              <a
                href={art.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-[12px] text-admin-text-muted underline hover:text-admin-text"
              >
                Original
              </a>
              <button
                onClick={() => handleDelete(art)}
                title="Ta bort"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-admin-el)] text-admin-text-faint hover:bg-admin-surface-2 hover:text-admin-critical-dot"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </li>
            );
          })}
        </ul>
      )}

      {uploadOpen && (
        <ArtworkUploadModal
          shopId={shopId}
          products={products}
          onClose={() => setUploadOpen(false)}
          onCreated={refresh}
        />
      )}
    </CardSection>
  );
};

export default ArtworkLibrary;
