// ArtworkLibrary — the seller's print-artwork library: upload + validate + list +
// delete. Shop-scoped (listArtwork queries where shopId). Admin-Neutral design.
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { TrashIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { CardSection, Button } from '../../../components/admin/ui';
import StatusPill from '../../../components/admin/ui/StatusPill';
import { listArtwork, deleteArtwork } from '../../../utils/podArtwork';
import { loadPodProfiles, getProfileById } from '../../../config/podProfiles';
import { tierTone, tierLabel } from './podTier';
import ArtworkUploadModal from './ArtworkUploadModal';

const formatBytes = (b) => (b ? `${(b / 1024 / 1024).toFixed(1)} MB` : '');

const ArtworkLibrary = ({ shopId }) => {
  const [items, setItems] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [list, profs] = await Promise.all([listArtwork(shopId), loadPodProfiles()]);
      setItems(list);
      setProfiles(profs);
    } catch (e) {
      console.error('ArtworkLibrary load failed:', e);
      toast.error('Kunde inte ladda originalen.');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => { refresh(); }, [refresh]);

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
          {items.map((art) => (
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
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-medium text-admin-text">{art.label || art.fileName}</span>
                  <StatusPill tone={tierTone(art.validation?.tier)}>{tierLabel(art.validation?.tier)}</StatusPill>
                </div>
                <div className="truncate text-[12px] text-admin-text-faint">
                  {purposeLabel(art.purpose)}
                  {art.sourceWidthPx ? ` · ${art.sourceWidthPx}×${art.sourceHeightPx} px` : ''}
                  {art.validation?.effectiveDpi != null ? ` · ${art.validation.effectiveDpi} DPI` : ''}
                  {art.ext ? ` · ${art.ext.toUpperCase()}` : ''}
                  {art.fileSizeBytes ? ` · ${formatBytes(art.fileSizeBytes)}` : ''}
                </div>
              </div>
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
          ))}
        </ul>
      )}

      {uploadOpen && (
        <ArtworkUploadModal
          shopId={shopId}
          onClose={() => setUploadOpen(false)}
          onCreated={refresh}
        />
      )}
    </CardSection>
  );
};

export default ArtworkLibrary;
