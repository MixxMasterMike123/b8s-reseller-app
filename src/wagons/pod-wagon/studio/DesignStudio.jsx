// DesignStudio.jsx — the Design Studio tab (POD add-on, Mode A / shop-owner studio).
//
// SLICE 1 SHELL. This wires the picking UI around a stubbed compositor:
//   • left rail  — artwork picker (validated originals; PASS/WARN selectable, FAIL
//                  greyed with an "underkänd" hint) + garment template picker
//                  (cards showing the SVG flat thumbnail in its colourways).
//   • main area  — the selected garment flat in the selected colourway at full
//                  size, with the print area drawn as a dashed overlay and a
//                  "Kompositor kommer i nästa steg" placeholder (CompositorCanvas
//                  stub). Colourway chips + a front/back slot selector sit under it.
//
// The real canvas compositor (slice 2) drops into CompositorCanvas.jsx — this file
// only feeds it {template, colorway, slot, artwork, onResult}.
//
// Artwork comes from the SHARED usePodLibrary load (passed down from PodAdminPage),
// so no extra Firestore reads. Templates load once via loadPodMockupTemplates().
import React, { useEffect, useMemo, useState } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { CardSection } from '../../../components/admin/ui';
import StatusPill from '../../../components/admin/ui/StatusPill';
import { slotLabel } from '../../../config/podSlots';
import {
  loadPodMockupTemplates,
  getPodMockupTemplatesMeta,
  templateSlots,
} from '../../../config/podMockupTemplates';
import { tierTone, tierLabel } from '../components/podTier';
import { GARMENT_FLATS } from './garments';
import CompositorCanvas from './CompositorCanvas';

// A FAIL artwork can't be composed (it would print badly) — it's shown greyed and
// unselectable. PASS + WARN are selectable (WARN is advisory).
const isSelectableArtwork = (art) => (art?.validation?.tier || 'PASS') !== 'FAIL';

// Small SVG thumbnail of a garment flat in a given colour (for the template cards).
const GarmentThumb = ({ garment, hex }) => {
  const Flat = GARMENT_FLATS[garment];
  if (!Flat) return <div className="h-full w-full bg-admin-surface-2" />;
  return <Flat color={hex} className="block h-full w-full" />;
};

const DesignStudio = ({ artwork = [], loading = false }) => {
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [meta, setMeta] = useState({ version: 0, provisional: true });

  const [selectedArtworkId, setSelectedArtworkId] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [colorwayId, setColorwayId] = useState(null);
  const [slot, setSlot] = useState('front');

  useEffect(() => {
    let alive = true;
    (async () => {
      setTemplatesLoading(true);
      const t = await loadPodMockupTemplates();
      if (!alive) return;
      setTemplates(t);
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

  // Keep the colourway + slot valid whenever the template changes.
  useEffect(() => {
    if (!selectedTemplate) return;
    const cwIds = (selectedTemplate.colorways || []).map((c) => c.id);
    if (!cwIds.includes(colorwayId)) setColorwayId(cwIds[0] || null);
    const slots = templateSlots(selectedTemplate);
    if (!slots.includes(slot)) setSlot(slots[0] || 'front');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId]);

  const selectedColorway = useMemo(
    () => (selectedTemplate?.colorways || []).find((c) => c.id === colorwayId) || selectedTemplate?.colorways?.[0] || null,
    [selectedTemplate, colorwayId]
  );

  const selectedArtwork = useMemo(
    () => artwork.find((a) => a.id === selectedArtworkId) || null,
    [artwork, selectedArtworkId]
  );

  const slots = templateSlots(selectedTemplate);

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
                const thumbHex = t.colorways?.[0]?.hex || '#ffffff';
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
                        <GarmentThumb garment={t.garment} hex={thumbHex} />
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
          artwork={selectedArtwork}
          onResult={() => { /* slice 2 wires the generated mockup here */ }}
        />

        {/* Colourway chips */}
        {selectedTemplate && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-admin-text-muted">Färg:</span>
            {(selectedTemplate.colorways || []).map((cw) => {
              const active = cw.id === colorwayId;
              return (
                <button
                  key={cw.id}
                  type="button"
                  onClick={() => setColorwayId(cw.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] ${
                    active
                      ? 'border-admin-info-dot bg-admin-info-bg/60 font-medium text-admin-text'
                      : 'border-admin-border text-admin-text-muted hover:bg-admin-surface-2'
                  }`}
                >
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full border border-admin-border"
                    style={{ backgroundColor: cw.hex }}
                  />
                  {cw.label}
                </button>
              );
            })}
          </div>
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
      </CardSection>
    </div>
  );
};

export default DesignStudio;
