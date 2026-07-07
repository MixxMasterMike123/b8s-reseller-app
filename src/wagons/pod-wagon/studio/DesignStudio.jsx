// DesignStudio.jsx — the Design Studio tab (POD add-on, Mode A / shop-owner studio).
//
// SLICE 2: the picking UI around the LIVE placement compositor:
//   • left rail  — artwork picker (validated originals; PASS/WARN selectable, FAIL
//                  greyed with an "underkänd" hint) + garment template picker
//                  (cards showing the SVG flat thumbnail in its colourways).
//   • main area  — CompositorCanvas: the garment flat with the artwork placed in
//                  the print area (drag/resize/snap, cm readout, live DPI verdict).
//                  Colourway chips + a front/back slot selector sit under it.
//
// PLACEMENT STATE lives here, ONE PER SLOT (placements[slot] = {xMm,yMm,wMm}), so
// switching front↔back preserves each side's placement. Placements reset when the
// artwork or template changes (the aspect ratio and print areas they were clamped
// against no longer apply).
//
// SLICE 3 adds:
//   • overrides — per-slot, per-colourway artwork override ({ [slot]: { [cwId]:
//     artworkId } }), the "byt motiv på mörka plagg" feature; resolveArtwork()
//     feeds the override-aware artwork to the canvas, the strip AND the renderer.
//   • mockups/heroKey — "Generera mockuper" rasterizes one image per colourway
//     (× designed slot) via renderMockup, uploads drafts to the shop's Storage
//     partition (best-effort; downloads still work offline), hero pick for slice 4.
//
// Artwork comes from the SHARED usePodLibrary load (passed down from PodAdminPage),
// so no extra Firestore reads. Templates + print profiles (DPI thresholds) load
// once via their cached loaders.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { CardSection } from '../../../components/admin/ui';
import StatusPill from '../../../components/admin/ui/StatusPill';
import { slotLabel } from '../../../config/podSlots';
import {
  loadPodMockupTemplates,
  getPodMockupTemplatesMeta,
  templateSlots,
} from '../../../config/podMockupTemplates';
import { loadPodProfiles, getProfileById } from '../../../config/podProfiles';
import { tierTone, tierLabel } from '../components/podTier';
import { isComposable } from './placementMath';
import { renderMockup } from './mockupRender';
import { uploadMockup } from './mockupUpload';
import TemplateBackground from './TemplateBackground';
import CompositorCanvas from './CompositorCanvas';
import ColorwayStrip from './ColorwayStrip';
import MockupPanel from './MockupPanel';

// A FAIL artwork can't be composed (it would print badly) — it's shown greyed and
// unselectable. PASS + WARN are selectable (WARN is advisory).
const isSelectableArtwork = (art) => (art?.validation?.tier || 'PASS') !== 'FAIL';

// Thumbnail of a template in its first colourway (for the picker cards): SVG flat
// or the colourway's garment photo, via the shared background layer.
const GarmentThumb = ({ template, colorway }) => (
  <TemplateBackground template={template} colorway={colorway} />
);

const DesignStudio = ({ artwork = [], loading = false, shopId = null }) => {
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [meta, setMeta] = useState({ version: 0, provisional: true });
  const [profiles, setProfiles] = useState([]);

  const [selectedArtworkId, setSelectedArtworkId] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [colorwayId, setColorwayId] = useState(null);
  const [slot, setSlot] = useState('front');
  // One placement per slot for the CURRENT artwork+template pair:
  // { front: {xMm,yMm,wMm}, back: … }. Missing slot → compositor uses its default.
  const [placements, setPlacements] = useState({});
  // Per-slot, per-colourway artwork override: { [slot]: { [colorwayId]: artworkId } }.
  const [overrides, setOverrides] = useState({});
  // Generated mockups: array of { key, colorwayId, colorwayLabel, slot, objectUrl,
  // url?, storagePath?, type } + the hero pick (slice 4 reads both).
  const [mockups, setMockups] = useState([]);
  const [heroKey, setHeroKey] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [mockupError, setMockupError] = useState(null);
  // Object URLs owned by the current mockup set — revoked on replace/unmount.
  const objectUrlsRef = useRef([]);
  const replaceObjectUrls = (urls) => {
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrlsRef.current = urls;
  };
  useEffect(() => () => replaceObjectUrls([]), []);

  const resetDesignState = () => {
    setPlacements({});
    setOverrides({});
    setMockups([]);
    setHeroKey(null);
    setMockupError(null);
    replaceObjectUrls([]);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setTemplatesLoading(true);
      const [t, p] = await Promise.all([loadPodMockupTemplates(), loadPodProfiles()]);
      if (!alive) return;
      setTemplates(t);
      setProfiles(p);
      setMeta(getPodMockupTemplatesMeta());
      // Default-select the first template + its first colourway so the canvas
      // isn't empty on open.
      if (t.length && !selectedTemplateId) {
        setSelectedTemplateId(t[0].id);
        setColorwayId(t[0].colorways?.[0]?.id || null);
      }
      setTemplatesLoading(false);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  // Keep the colourway + slot valid whenever the template changes. Design state
  // (placements/overrides/mockups) resets too — it was built against the OLD
  // template's print areas and colourways.
  useEffect(() => {
    if (!selectedTemplate) return;
    const cwIds = (selectedTemplate.colorways || []).map((c) => c.id);
    if (!cwIds.includes(colorwayId)) setColorwayId(cwIds[0] || null);
    const slots = templateSlots(selectedTemplate);
    if (!slots.includes(slot)) setSlot(slots[0] || 'front');
    resetDesignState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId]);

  // New artwork = new aspect ratio: every stored placement's derived height (and
  // clamping) is stale, and overrides/mockups referenced the old base motif.
  useEffect(() => {
    resetDesignState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedArtworkId]);

  const selectedColorway = useMemo(
    () => (selectedTemplate?.colorways || []).find((c) => c.id === colorwayId) || selectedTemplate?.colorways?.[0] || null,
    [selectedTemplate, colorwayId]
  );

  const selectedArtwork = useMemo(
    () => artwork.find((a) => a.id === selectedArtworkId) || null,
    [artwork, selectedArtworkId]
  );

  const slots = templateSlots(selectedTemplate);

  // The template's print profile (settings/podProfiles) — DPI thresholds for the
  // compositor's live verdict.
  const profile = useMemo(
    () => getProfileById(profiles, selectedTemplate?.profileId),
    [profiles, selectedTemplate]
  );

  // Which artwork a colourway prints in a slot: its override, else the product's
  // base artwork. Single resolver feeding the canvas, the strip AND the renderer,
  // mirroring the podMappings colorway-override model.
  const resolveArtwork = (forSlot, cwId) => {
    const overrideId = overrides[forSlot]?.[cwId];
    if (overrideId) {
      const found = artwork.find((a) => a.id === overrideId);
      if (found) return found;
    }
    return selectedArtwork;
  };

  const setOverride = (forSlot, cwId, artworkId) => {
    setOverrides((prev) => {
      const slotMap = { ...(prev[forSlot] || {}) };
      if (artworkId) slotMap[cwId] = artworkId;
      else delete slotMap[cwId];
      return { ...prev, [forSlot]: slotMap };
    });
    setMockups([]); // stale — the motif map changed
    setHeroKey(null);
  };

  // Override choices: selectable (non-FAIL) artwork that can actually be
  // COMPOSED (raster with known dims — a PASS-tier PDF can't preview/mockup, and
  // offering it would silently drop that colourway from the generated set).
  const overrideOptions = useMemo(
    () => artwork.filter((a) => isSelectableArtwork(a) && isComposable(a) && a.id !== selectedArtworkId),
    [artwork, selectedArtworkId]
  );

  // Slots that end up on mockups: 'front' always (the canvas shows its default
  // immediately), other slots only once the seller actually placed something.
  const designedSlots = (t) =>
    templateSlots(t).filter((s) => s === 'front' || Boolean(placements[s]));

  const generateMockups = async () => {
    if (!selectedTemplate || generating) return;
    setGenerating(true);
    setMockupError(null);
    const next = [];
    const urls = [];
    let uploadFailures = 0;
    let renderSkips = 0;
    try {
      for (const cw of selectedTemplate.colorways || []) {
        for (const s of designedSlots(selectedTemplate)) {
          const art = resolveArtwork(s, cw.id);
          if (!art || !isComposable(art)) continue;
          // Per-item try/catch: one un-renderable colourway (e.g. a photo
          // template missing that colourway's photo) skips, not aborts —
          // the other colourways' mockups still generate.
          let blob, type;
          try {
            ({ blob, type } = await renderMockup({
              template: selectedTemplate, colorway: cw, slot: s,
              artwork: art, placement: placements[s] || null,
            }));
          } catch (e) {
            renderSkips += 1;
            console.warn('DesignStudio: mockup render skipped', cw.id, s, e?.message);
            continue;
          }
          const objectUrl = URL.createObjectURL(blob);
          urls.push(objectUrl);
          let uploaded = null;
          if (shopId) {
            try {
              uploaded = await uploadMockup({
                blob, type, shopId,
                templateId: selectedTemplate.id, slot: s, colorwayId: cw.id,
              });
            } catch (e) {
              uploadFailures += 1;
              console.warn('DesignStudio: mockup upload failed', cw.id, s, e?.message);
            }
          }
          next.push({
            key: `${cw.id}:${s}`, colorwayId: cw.id, colorwayLabel: cw.label,
            slot: s, objectUrl, type,
            url: uploaded?.url || null, storagePath: uploaded?.storagePath || null,
          });
        }
      }
      replaceObjectUrls(urls);
      setMockups(next);
      setHeroKey((prev) => (prev && next.some((m) => m.key === prev) ? prev : next[0]?.key || null));
      if (next.length === 0) {
        setMockupError(renderSkips > 0
          ? 'Inga mockuper kunde genereras — plaggfoton saknas för mallens färger.'
          : 'Inget att generera — välj ett original som kan förhandsgranskas.');
      } else if (renderSkips > 0 || uploadFailures > 0) {
        const parts = [];
        if (renderSkips > 0) parts.push(`${renderSkips} färg${renderSkips > 1 ? 'er' : ''} hoppades över (foto saknas)`);
        if (uploadFailures > 0) parts.push(`${uploadFailures} kunde inte sparas till lagringen — nedladdning fungerar ändå`);
        setMockupError(`Mockuperna genererades, men ${parts.join('; ')}.`);
      }
    } catch (e) {
      console.warn('DesignStudio: mockup generation failed', e);
      urls.forEach((u) => URL.revokeObjectURL(u));
      setMockupError(e?.message || 'Mockup-genereringen misslyckades.');
    } finally {
      setGenerating(false);
    }
  };

  const canvasArtwork = resolveArtwork(slot, colorwayId);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px,1fr]">
      {/* ── LEFT RAIL ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {/* Artwork picker */}
        <CardSection title="Original" bodyClassName="p-0">
          {loading ? (
            <p className="px-4 py-4 text-[13px] text-admin-text-muted">Laddar…</p>
          ) : artwork.length === 0 ? (
            <p className="px-4 py-4 text-[13px] text-admin-text-muted">
              Inga original ännu. Ladda upp ett original under fliken Original först.
            </p>
          ) : (
            <ul className="max-h-[340px] overflow-y-auto">
              {artwork.map((art) => {
                const selectable = isSelectableArtwork(art);
                const active = art.id === selectedArtworkId;
                return (
                  <li key={art.id}>
                    <button
                      type="button"
                      disabled={!selectable}
                      onClick={() => selectable && setSelectedArtworkId(art.id)}
                      title={!selectable ? 'Underkänt original kan inte användas i studion' : undefined}
                      className={`flex w-full items-center gap-3 border-b border-admin-border-soft px-4 py-2.5 text-left ${
                        active ? 'bg-admin-info-bg/60' : 'hover:bg-admin-surface-2'
                      } ${selectable ? '' : 'cursor-not-allowed opacity-45'}`}
                    >
                      {art.previewUrl ? (
                        <img src={art.previewUrl} alt="" className="h-11 w-11 shrink-0 rounded-[6px] border border-admin-border object-cover" />
                      ) : (
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[6px] border border-admin-border bg-admin-surface-2 text-admin-text-faint">
                          <PhotoIcon className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-admin-text">
                          {art.label || art.fileName}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <StatusPill tone={tierTone(art.validation?.tier)}>
                            {tierLabel(art.validation?.tier)}
                          </StatusPill>
                          {!selectable && (
                            <span className="text-[11px] text-admin-text-faint">kan inte användas</span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardSection>

        {/* Template picker */}
        <CardSection title="Plagg" bodyClassName="p-0">
          {templatesLoading ? (
            <p className="px-4 py-4 text-[13px] text-admin-text-muted">Laddar mallar…</p>
          ) : templates.length === 0 ? (
            <p className="px-4 py-4 text-[13px] text-admin-text-muted">
              Inga plaggmallar ännu. Plattformen behöver seeda mockup-mallarna.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-4">
              {templates.map((t) => {
                const active = t.id === selectedTemplateId;
                const thumbColorway = t.colorways?.[0] || null;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={`rounded-[var(--radius-admin)] border p-2 text-left transition ${
                      active
                        ? 'border-admin-info-dot ring-1 ring-admin-info-dot/40'
                        : 'border-admin-border hover:bg-admin-surface-2'
                    }`}
                  >
                    <div className="grid aspect-square place-items-center overflow-hidden rounded-[6px] bg-admin-surface-2">
                      <div className="h-[88%] w-[88%]">
                        <GarmentThumb template={t} colorway={thumbColorway} />
                      </div>
                    </div>
                    <div className="mt-1.5 truncate text-[12px] font-medium text-admin-text">{t.label}</div>
                  </button>
                );
              })}
            </div>
          )}
        </CardSection>
      </div>

      {/* ── MAIN AREA ─────────────────────────────────────────────────────── */}
      <CardSection
        title="Förhandsgranskning"
        bodyClassName="p-4"
      >
        {meta.provisional && (
          <p className="mb-3 text-[12px] text-admin-text-faint">
            Generiska plaggmallar (preliminära) — ersätts när tryckeriets riktiga plagg finns.
          </p>
        )}

        <CompositorCanvas
          template={selectedTemplate}
          colorway={selectedColorway}
          slot={slot}
          artwork={canvasArtwork}
          profile={profile}
          placement={placements[slot] || null}
          onPlacementChange={(p) => setPlacements((prev) => ({ ...prev, [slot]: p }))}
        />

        {/* Colourway strip: composited per-colour previews + artwork override. */}
        {selectedTemplate && (
          <ColorwayStrip
            template={selectedTemplate}
            slot={slot}
            activeColorwayId={colorwayId}
            onSelect={setColorwayId}
            placement={placements[slot] || null}
            resolveArtwork={(cwId) => resolveArtwork(slot, cwId)}
            overrides={overrides[slot] || {}}
            onOverrideChange={selectedArtwork ? (cwId, artId) => setOverride(slot, cwId, artId) : null}
            artworkOptions={overrideOptions}
            baseArtworkLabel={selectedArtwork?.label || selectedArtwork?.fileName || 'Standardmotiv'}
          />
        )}

        {/* Slot selector — only when the template defines more than one slot. */}
        {slots.length > 1 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-admin-text-muted">Placering:</span>
            {slots.map((s) => {
              const active = s === slot;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlot(s)}
                  className={`rounded-[var(--radius-admin-el)] px-2.5 py-1 text-[12px] ${
                    active
                      ? 'bg-black/[0.08] font-medium text-admin-text'
                      : 'text-admin-text-muted hover:bg-black/[0.06]'
                  }`}
                >
                  {slotLabel(s)}
                </button>
              );
            })}
          </div>
        )}

        {/* Generated mockups: per-colourway rasterized previews + hero pick. */}
        <MockupPanel
          mockups={mockups}
          heroKey={heroKey}
          onPickHero={setHeroKey}
          onGenerate={generateMockups}
          generating={generating}
          error={mockupError}
          canGenerate={Boolean(selectedTemplate && isComposable(selectedArtwork))}
        />
      </CardSection>
    </div>
  );
};

export default DesignStudio;
