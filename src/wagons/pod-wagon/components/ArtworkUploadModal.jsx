// ArtworkUploadModal — the seller's artwork upload + validation flow.
//
// Flow: pick print purpose (profile) → pick file → measure (dims + alpha) →
// validateArtwork (ADVISORY — WARN/FAIL never blocks; printer decides) → show the
// verdict + plain-Swedish reasons BEFORE committing → on confirm, upload the
// ORIGINAL untouched + a separate web preview + write the podArtwork doc.
//
// Design: Admin-Neutral, mirrors the dark-overlay modal pattern (ProvisionShopModal)
// but with admin tokens. The original is never compressed (uploadPodOriginal).
import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Field, Input, Select, Button } from '../../../components/admin/ui';
import StatusPill from '../../../components/admin/ui/StatusPill';
import { loadPodProfiles, getProfileById, getPodProfilesMeta } from '../../../config/podProfiles';
import { readImageDimensions, generatePodPreview, uploadPodOriginal, extOf } from '../../../utils/podUpload';
import { validateArtwork } from '../../../utils/podValidation';
import { createArtwork } from '../../../utils/podArtwork';
import { auth } from '../../../firebase/config';
import { tierTone, tierLabel } from './podTier';

const ArtworkUploadModal = ({ shopId, onClose, onCreated }) => {
  const [profiles, setProfiles] = useState([]);
  const [profileId, setProfileId] = useState('');
  const [label, setLabel] = useState('');
  const [file, setFile] = useState(null);
  const [measuring, setMeasuring] = useState(false);
  const [measured, setMeasured] = useState(null); // { widthPx, heightPx, hasAlphaChannel, transparentPixelRatio, previewObjUrl }
  const [verdict, setVerdict] = useState(null);    // { tier, effectiveDpi, reasons }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPodProfiles().then((p) => {
      setProfiles(p);
      if (p.length && !profileId) setProfileId(p[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profile = getProfileById(profiles, profileId);

  // Re-measure + re-validate whenever the file or profile changes.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!file || !profile) { setMeasured(null); setVerdict(null); return; }
      setMeasuring(true);
      try {
        const dims = await readImageDimensions(file);
        // Local preview for the modal (object URL) + alpha read happen together via
        // a lightweight measure: we reuse generatePodPreview's alpha logic only at
        // SAVE time (it uploads); for the pre-commit check we read dims + a cheap
        // alpha probe by drawing to an offscreen canvas here.
        const probe = await probeAlpha(file);
        if (cancelled) return;
        const m = {
          widthPx: dims.width,
          heightPx: dims.height,
          hasAlphaChannel: probe.hasAlphaChannel,
          transparentPixelRatio: probe.transparentPixelRatio,
          previewObjUrl: probe.previewObjUrl,
        };
        setMeasured(m);
        setVerdict(validateArtwork({
          widthPx: m.widthPx, heightPx: m.heightPx,
          ext: extOf(file.name), mimeType: file.type,
          colorModeKnown: dims.width != null ? 'rgb' : undefined, // browser raster decodes to RGB
          hasAlphaChannel: m.hasAlphaChannel,
          transparentPixelRatio: m.transparentPixelRatio,
          fileSizeBytes: file.size,
        }, profile));
      } finally {
        if (!cancelled) setMeasuring(false);
      }
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, profileId, profiles]);

  const onPick = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f && !label) setLabel(f.name.replace(/\.[a-z0-9]+$/i, ''));
  };

  const handleSave = async () => {
    if (!file || !profile || saving) return;
    setSaving(true);
    try {
      const original = await uploadPodOriginal(file, shopId, profile);
      const preview = await generatePodPreview(file, shopId);
      const meta = getPodProfilesMeta();
      const docData = {
        label: label.trim() || file.name,
        purpose: profile.id,
        originalUrl: original.originalUrl,
        originalStoragePath: original.originalStoragePath,
        previewUrl: preview.previewUrl,
        previewStoragePath: preview.previewStoragePath,
        fileName: original.fileName,
        fileSizeBytes: original.fileSizeBytes,
        mimeType: original.mimeType,
        ext: original.ext,
        sourceWidthPx: measured?.widthPx ?? null,
        sourceHeightPx: measured?.heightPx ?? null,
        validation: {
          tier: verdict?.tier || 'WARN',
          effectiveDpi: verdict?.effectiveDpi ?? null,
          reasons: verdict?.reasons || [],
          checkedAt: new Date().toISOString(),
          profileId: profile.id,
          profileVersion: meta.version || 0,
        },
        createdBy: auth.currentUser?.uid || null,
      };
      await createArtwork(docData, shopId);
      toast.success('Original uppladdat');
      onCreated?.();
      onClose?.();
    } catch (err) {
      console.error('POD upload failed:', err);
      toast.error(err?.message || 'Uppladdningen misslyckades.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-[var(--radius-admin)] border border-admin-border bg-admin-surface p-5 text-admin-text"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Ladda upp original</h2>
          <button onClick={onClose} className="text-admin-text-faint hover:text-admin-text">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {profiles.length === 0 ? (
          <p className="text-[13px] text-admin-text-muted">
            Inga tryckprofiler hittades. Be plattformen att köra seed-pod-profiles innan du laddar upp.
          </p>
        ) : (
          <div className="space-y-4">
            <Field label="Tryckändamål (profil)" htmlFor="pod-profile">
              <Select id="pod-profile" value={profileId} onChange={(e) => setProfileId(e.target.value)}>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </Select>
            </Field>

            <Field label="Namn (intern etikett)" htmlFor="pod-label">
              <Input id="pod-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="t.ex. Logotyp – framsida" />
            </Field>

            <Field label="Fil" htmlFor="pod-file" help={profile ? `Tillåtna: ${(profile.accepted_formats || []).map((f) => f.ext.toUpperCase()).join(', ')} · max ${profile.max_file_mb} MB` : ''}>
              <input id="pod-file" type="file" onChange={onPick} className="block w-full text-[13px] text-admin-text-muted file:mr-3 file:rounded-[var(--radius-admin-el)] file:border-0 file:bg-admin-surface-2 file:px-3 file:py-1.5 file:text-[13px] file:text-admin-text" />
            </Field>

            {/* Verdict */}
            {file && (
              <div className="rounded-[var(--radius-admin)] border border-admin-border-soft bg-admin-surface-2 p-3">
                {measuring ? (
                  <p className="text-[13px] text-admin-text-muted">Analyserar filen…</p>
                ) : verdict ? (
                  <>
                    <div className="mb-2 flex items-center gap-2">
                      <StatusPill tone={tierTone(verdict.tier)}>{tierLabel(verdict.tier)}</StatusPill>
                      {verdict.effectiveDpi != null && (
                        <span className="text-[12px] text-admin-text-muted">Effektiv upplösning: {verdict.effectiveDpi} DPI</span>
                      )}
                      {measured?.widthPx && (
                        <span className="text-[12px] text-admin-text-faint">{measured.widthPx}×{measured.heightPx} px</span>
                      )}
                    </div>
                    {verdict.reasons.length > 0 ? (
                      <ul className="space-y-1">
                        {verdict.reasons.map((r, i) => (
                          <li key={i} className="text-[12px] text-admin-text-muted">
                            <span className={r.severity === 'FAIL' ? 'text-admin-critical-text' : r.severity === 'WARN' ? 'text-admin-caution-text' : ''}>•</span>{' '}
                            {r.message}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[12px] text-admin-text-muted">Uppfyller tryckspecen.</p>
                    )}
                    {verdict.tier === 'FAIL' && (
                      <p className="mt-2 text-[12px] text-admin-text-faint">
                        Du kan ändå spara — valideringen är vägledande, tryckeriet avgör.
                      </p>
                    )}
                  </>
                ) : null}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={onClose}>Avbryt</Button>
              <Button variant="primary" onClick={handleSave} disabled={!file || saving}>
                {saving ? 'Laddar upp…' : 'Spara original'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// probeAlpha — pre-commit alpha + preview probe (does NOT upload). Mirrors the
// alpha logic in generatePodPreview but only for the modal's instant feedback.
const probeAlpha = (file) =>
  new Promise((resolve) => {
    const ext = extOf(file.name);
    const raster = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp']);
    if (!raster.has(ext)) {
      resolve({ hasAlphaChannel: undefined, transparentPixelRatio: undefined, previewObjUrl: null });
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const w = img.naturalWidth || 1;
        const h = img.naturalHeight || 1;
        const scale = Math.min(1, 800 / Math.max(w, h));
        const cw = Math.max(1, Math.round(w * scale));
        const ch = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, cw, ch);
        const canHaveAlpha = ext === 'png' || ext === 'webp' || ext === 'gif';
        let hasAlphaChannel; let transparentPixelRatio;
        if (!canHaveAlpha) { hasAlphaChannel = false; transparentPixelRatio = 0; }
        else {
          try {
            const data = ctx.getImageData(0, 0, cw, ch).data;
            let t = 0; const total = cw * ch;
            for (let i = 3; i < data.length; i += 4) if (data[i] < 250) t++;
            transparentPixelRatio = total > 0 ? t / total : 0;
            hasAlphaChannel = true;
          } catch { hasAlphaChannel = undefined; transparentPixelRatio = undefined; }
        }
        resolve({ hasAlphaChannel, transparentPixelRatio, previewObjUrl: url });
      } catch {
        resolve({ hasAlphaChannel: undefined, transparentPixelRatio: undefined, previewObjUrl: null });
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ hasAlphaChannel: undefined, transparentPixelRatio: undefined, previewObjUrl: null }); };
    img.src = url;
  });

export default ArtworkUploadModal;
