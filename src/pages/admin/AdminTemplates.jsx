// AdminTemplates — the "Mallar" editor. A shop owner PICKS a base template and
// then FINE-TUNES it: grid layout, product-card style, hero style, and accent.
// The base template is stored as `templateId`; the tuning lives under `theme`
// (theme.layout.{gridStyle,cardStyle,heroStyle} + theme.colors.accent) which
// StoreSettingsContext already reads as the inline override layer OVER the
// chosen template. So this page never touches component code — it only writes
// token overrides, exactly like the template contract.
//
// Admin Neutral / Shopify design system (Page / RightRail / CardSection /
// Button), matching AdminStorefront. Reads/writes via the shopConfig seam.

import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import toast from 'react-hot-toast';
import { STORE } from '../../config/store';
import { useShopId } from '../../contexts/ShopContext';
import { loadShopConfig, saveShopConfig } from '../../config/shopConfig';
import { evaluateAccentContrast, hexToRgb } from '../../utils/colorContrast';
import { TEMPLATES, getTemplate } from '../../config/templates';
import { resolveTheme, nordGridLayout } from '../../config/nordTokens';
import { Page, Card, CardSection, RightRail, Button } from '../../components/admin/ui';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

// The token-override keys this page owns. We load the full config but save a
// merge of just these (via saveShopConfig's merge write) so we never clobber
// identity/content fields owned by AdminStorefront/Settings.
//   templateId — the base template (top-level key, as AdminStorefront stores it)
//   theme      — the override layer: { layout:{gridStyle,cardStyle,heroStyle},
//                colors:{accent} }. Deep-merged by Firestore on save.
const OWNED_KEYS = ['templateId', 'theme'];

// ── Option catalogs (labels are Swedish shop-owner copy) ─────────────────────
const GRID_OPTIONS = [
  { id: 'grid-3', name: 'Tre kolumner', desc: 'Rymligt, redaktionellt.' },
  { id: 'grid-4', name: 'Fyra kolumner', desc: 'Standard, tätare.' },
  { id: 'grid-5', name: 'Fem kolumner', desc: 'Tätt, många plagg per rad.' },
  { id: 'mosaic', name: 'Mosaik', desc: 'Ett hjälte-plagg dominerar.' },
  { id: 'offset', name: 'Förskjutet', desc: 'Tegelförband, staplad rytm.' },
  { id: 'runway', name: 'Runway', desc: 'En horisontell rad, lookbook.' },
];
const CARD_OPTIONS = [
  { id: 'elevated', name: 'Upphöjt', desc: 'Vit modul, mjuk skugga.' },
  { id: 'flat', name: 'Platt', desc: 'Tunn ram, ingen skugga.' },
  { id: 'bordered', name: 'Ramat', desc: 'Kraftig ram, blockigt.' },
  { id: 'overlay', name: 'Överlägg', desc: 'Text över bilden, magasin.' },
];
const HERO_OPTIONS = [
  { id: 'bento', name: 'Bento', desc: 'Stor bildruta + stödrutor.' },
  { id: 'editorial', name: 'Redaktionell', desc: 'Blockig rubrik, märke bakom.' },
];

// Resolve the EFFECTIVE value of a layout token for the current form: an
// explicit override wins, else the base template's value, else NORD default.
function effectiveLayout(form, key) {
  const override = form?.theme?.layout?.[key];
  if (override) return override;
  const tpl = getTemplate(form.templateId);
  return tpl.tokens?.layout?.[key];
}

const AdminTemplates = () => {
  const shopId = useShopId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // form holds ONLY the owned keys: { templateId, theme:{layout,colors} }.
  const [form, setForm] = useState({ templateId: 'nord', theme: {} });
  // Local draft for the accent text field so it stays freely editable while
  // typing (the committed form.theme.colors.accent only takes VALID hex). null
  // = mirror the committed value; a string = an in-progress edit. Set to '' or a
  // partial like '#E0' without corrupting the saved accent.
  const [accentDraft, setAccentDraft] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const saved = await loadShopConfig(shopId);
        if (cancelled) return;
        setForm({
          templateId: saved.templateId || STORE.templateId || 'nord',
          theme: saved.theme && typeof saved.theme === 'object' ? saved.theme : {},
        });
      } catch (e) {
        console.error('Error loading template config:', e);
        toast.error('Kunde inte ladda mallinställningar.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [shopId]);

  // Set a layout override (gridStyle/cardStyle/heroStyle) immutably.
  const setLayout = (key, value) =>
    setForm((f) => ({
      ...f,
      theme: { ...f.theme, layout: { ...(f.theme?.layout || {}), [key]: value } },
    }));

  // Set the accent override (theme.colors.accent). Only a well-formed hex is
  // committed — a malformed value (e.g. 'teal', '#ff', 'rgb(...)') would apply
  // as an invalid CSS custom property and silently break the accent across the
  // storefront, AND dodge the AA contrast warning (evaluateAccentContrast
  // returns valid:false for non-hex). Empty clears the override so the
  // template's own accent takes over. Normalizes #rgb → #rrggbb and adds a
  // leading '#'. Returns true if committed (valid or cleared), false if the
  // input was non-empty but not a valid hex (so the UI can flag it).
  const setAccent = (value) => {
    const raw = (value || '').trim();
    if (raw === '') {
      setForm((f) => {
        const colors = { ...(f.theme?.colors || {}) };
        delete colors.accent;
        return { ...f, theme: { ...f.theme, colors } };
      });
      return true;
    }
    const rgb = hexToRgb(raw); // accepts #rgb / #rrggbb / rgb / rrggbb, null otherwise
    if (!rgb) return false;
    const hex = '#' + [rgb.r, rgb.g, rgb.b].map((n) => n.toString(16).padStart(2, '0')).join('');
    setForm((f) => ({
      ...f,
      theme: { ...f.theme, colors: { ...(f.theme?.colors || {}), accent: hex } },
    }));
    return true;
  };

  // Picking a base template resets nothing — overrides intentionally persist so
  // an owner can keep their grid while swapping the base look. (They can clear
  // an override by re-picking the base's value.)
  const setBase = (templateId) => setForm((f) => ({ ...f, templateId }));

  const handleSave = async () => {
    try {
      setSaving(true);
      const patch = OWNED_KEYS.reduce((acc, k) => {
        if (form[k] !== undefined) acc[k] = form[k];
        return acc;
      }, {});
      // replaceTheme: this editor CLEARS theme keys (accent, layout overrides);
      // a plain merge-save would let cleared keys resurrect on reload.
      await saveShopConfig(patch, shopId, { replaceTheme: true });
      toast.success('Mall sparad.');
    } catch (e) {
      console.error('Error saving template config:', e);
      toast.error('Kunde inte spara.');
    } finally {
      setSaving(false);
    }
  };

  // ── Live preview: resolve the SAME tokens the storefront would, from the
  // current (unsaved) form, and render a small storefront mock with them. ────
  const preview = useMemo(() => {
    const tpl = getTemplate(form.templateId);
    const merged = {};
    for (const group of ['colors', 'fonts', 'shape', 'motion', 'layout']) {
      const t = tpl.tokens?.[group];
      const i = form.theme?.[group];
      if (t || i) merged[group] = { ...(t || {}), ...(i || {}) };
    }
    const resolved = resolveTheme(merged);
    return { resolved, fonts: tpl.fonts };
  }, [form.templateId, form.theme]);

  const accentHex = form.theme?.colors?.accent || '';
  const effectiveAccent = accentHex || preview.resolved.vars['--color-accent'];
  const contrast = accentHex ? evaluateAccentContrast(accentHex) : null;
  // What the text field shows: the in-progress draft if editing, else the
  // committed hex. Invalid = a non-empty draft that isn't a parseable hex.
  const accentFieldValue = accentDraft !== null ? accentDraft : accentHex;
  const accentInvalid = accentDraft !== null && accentDraft.trim() !== '' && !hexToRgb(accentDraft.trim());

  // Admin Neutral tokens (mirror AdminStorefront).
  const labelCls = 'block text-[13px] font-medium text-admin-text mb-1';
  const helpCls = 'mt-1 text-[12px] text-admin-text-muted';

  if (loading) {
    return (
      <AppLayout>
        <Page title="Mallar">
          <Card className="px-6 py-12 text-center">
            <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-solid border-admin-text-muted border-r-transparent" />
            <p className="mt-3 text-[13px] text-admin-text-muted">Laddar…</p>
          </Card>
        </Page>
      </AppLayout>
    );
  }

  const headerActions = (
    <>
      <Button as="a" href="/" target="_blank" rel="noopener noreferrer" variant="secondary">
        Förhandsgranska butik
        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
      </Button>
      <Button variant="primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Sparar…' : 'Spara'}
      </Button>
    </>
  );

  // Reusable option-chip grid (grid / card / hero pickers).
  const OptionGrid = ({ options, value, onPick }) => (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onPick(opt.id)}
            aria-pressed={selected}
            className={
              'text-left rounded-admin border px-3 py-2.5 transition-all ' +
              (selected
                ? 'border-admin-primary ring-2 ring-admin-primary bg-admin-surface'
                : 'border-admin-border hover:border-admin-text-faint bg-admin-surface')
            }
          >
            <div className="text-[13px] font-semibold text-admin-text">{opt.name}</div>
            <div className="text-[12px] text-admin-text-muted">{opt.desc}</div>
          </button>
        );
      })}
    </div>
  );

  const gridStyle = effectiveLayout(form, 'gridStyle') || preview.resolved.gridStyle;
  const cardStyle = effectiveLayout(form, 'cardStyle') || preview.resolved.cardStyle;
  const heroStyle = effectiveLayout(form, 'heroStyle') || preview.resolved.heroStyle;

  return (
    <AppLayout>
      <Page
        title="Mallar"
        subtitle="Välj mall och finjustera rutnät, kort och hero. Ändringarna läggs ovanpå mallen."
        actions={headerActions}
      >
        <RightRail
          main={
            <>
              {/* Base template */}
              <CardSection title="Mall">
                <p className="text-[13px] text-admin-text-muted mb-4">
                  Grundutseendet. Dina finjusteringar nedan läggs ovanpå.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {TEMPLATES.map((tpl) => {
                    const selected = (form.templateId || 'nord') === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setBase(tpl.id)}
                        aria-pressed={selected}
                        className={
                          'group text-left rounded-admin overflow-hidden border transition-all ' +
                          (selected
                            ? 'border-admin-primary ring-2 ring-admin-primary'
                            : 'border-admin-border hover:border-admin-text-faint')
                        }
                      >
                        <div className="relative aspect-[16/10] bg-admin-surface-2 overflow-hidden">
                          <img
                            src={tpl.thumb}
                            alt={`Förhandsvisning av mallen ${tpl.name}`}
                            className="w-full h-full object-cover object-top"
                            loading="lazy"
                          />
                          {selected && (
                            <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-admin-primary px-2 py-0.5 text-[11px] font-semibold text-white">
                              Vald
                            </span>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="text-[13px] font-semibold text-admin-text">{tpl.name}</div>
                          <div className="text-[12px] text-admin-text-muted">{tpl.tagline}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardSection>

              {/* Grid */}
              <CardSection title="Rutnät">
                <p className="text-[13px] text-admin-text-muted mb-3">
                  Rutnätet är det som gör att mallar inte ser likadana ut. Välj hur produkterna ligger.
                </p>
                <OptionGrid options={GRID_OPTIONS} value={gridStyle} onPick={(v) => setLayout('gridStyle', v)} />
              </CardSection>

              {/* Card */}
              <CardSection title="Produktkort">
                <OptionGrid options={CARD_OPTIONS} value={cardStyle} onPick={(v) => setLayout('cardStyle', v)} />
              </CardSection>

              {/* Hero */}
              <CardSection title="Hero (startsidans topp)">
                <OptionGrid options={HERO_OPTIONS} value={heroStyle} onPick={(v) => setLayout('heroStyle', v)} />
              </CardSection>

              {/* Accent */}
              <CardSection title="Accentfärg">
                <p className="text-[13px] text-admin-text-muted mb-3">
                  Valfritt. Lämna tom för att använda mallens egen färg.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    // type=color needs a valid #rrggbb; effectiveAccent always is
                    // one (committed hex, else the resolved template accent).
                    value={effectiveAccent}
                    onChange={(e) => { setAccent(e.target.value); setAccentDraft(null); }}
                    className="h-9 w-12 rounded-admin border border-admin-border bg-admin-surface p-0.5 cursor-pointer"
                    aria-label="Accentfärg"
                  />
                  <input
                    type="text"
                    // Draft-backed so typing stays fluid; only VALID hex commits
                    // to the form (setAccent). On blur, snap the draft back to the
                    // committed value so a half-typed/invalid entry doesn't linger.
                    value={accentFieldValue}
                    placeholder={preview.resolved.vars['--color-accent']}
                    onChange={(e) => { const v = e.target.value; setAccentDraft(v); setAccent(v); }}
                    onBlur={() => setAccentDraft(null)}
                    aria-invalid={accentInvalid}
                    className={
                      'w-32 rounded-[var(--radius-admin-el)] border bg-admin-surface px-3 py-1.5 text-[13px] text-admin-text focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-admin-primary)] ' +
                      (accentInvalid ? 'border-red-500' : 'border-admin-border')
                    }
                  />
                  {accentHex && (
                    <button
                      type="button"
                      onClick={() => { setAccent(''); setAccentDraft(null); }}
                      className="text-[12px] text-admin-text-muted underline hover:text-admin-text"
                    >
                      Återställ
                    </button>
                  )}
                </div>
                {accentInvalid && (
                  <p className="mt-2 text-[12px] text-red-600">
                    Ogiltig färg. Använd en hex-kod, t.ex. #E01F26.
                  </p>
                )}
                {!accentInvalid && contrast && contrast.valid && !contrast.passAA && (
                  <p className="mt-2 text-[12px] text-red-600">
                    Låg kontrast mot vit text ({contrast.ratio?.toFixed?.(2)}:1). Välj en mörkare ton för läsbara knappar.
                  </p>
                )}
              </CardSection>
            </>
          }
          rail={
            <CardSection title="Förhandsvisning">
              <TemplatePreview
                vars={preview.resolved.vars}
                fonts={preview.fonts}
                gridStyle={gridStyle}
                cardStyle={cardStyle}
                heroStyle={heroStyle}
              />
              <p className={helpCls}>Live: visar mall plus dina finjusteringar. Spara för att publicera.</p>
            </CardSection>
          }
        />
      </Page>
    </AppLayout>
  );
};

// ── Live storefront mock ─────────────────────────────────────────────────────
// Renders a miniature storefront (nav + hero + product grid) using the resolved
// CSS vars applied to a scoped wrapper (NOT <html> — this is a preview, it must
// not reskin the admin). Uses the same gridStyle/cardStyle semantics as the
// real storefront so what the owner sees matches what ships.
function TemplatePreview({ vars, fonts, gridStyle, cardStyle, heroStyle }) {
  const grid = nordGridLayout(gridStyle);
  const styleVars = { ...vars };
  const editorial = heroStyle === 'editorial';
  const overlay = cardStyle === 'overlay';

  // Load the template's webfonts for the preview (dev-only <link>, deduped by
  // href). Uses the same css2 form as ensureTemplateFonts.
  useEffect(() => {
    if (!Array.isArray(fonts) || !fonts.length) return;
    const href =
      'https://fonts.googleapis.com/css2?' +
      fonts.map((f) => `family=${f}`).join('&') + '&display=swap';
    if (document.querySelector(`link[data-tpl-preview="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-tpl-preview', href);
    document.head.appendChild(link);
  }, [fonts]);

  const products = [
    { n: 'Sirenhoodie', c: 'Huvtröja', pr: '999 kr' },
    { n: 'Utgång Tee', c: 'T-shirt', pr: '449 kr' },
    { n: 'Skiftbyxa', c: 'Byxor', pr: '1399 kr' },
    { n: 'Vaktkeps', c: 'Keps', pr: '649 kr' },
    { n: 'Nattjacka', c: 'Jacka', pr: '1899 kr' },
    { n: 'Betong Beanie', c: 'Mössa', pr: '399 kr' },
  ];
  const imgFields = ['#3a1518', '#1a2230', '#2b2320', '#241a2c', '#142622', '#301a1a'];

  return (
    <div
      className="rounded-admin border border-admin-border overflow-hidden"
      style={{ ...styleVars, background: 'var(--color-canvas)', fontFamily: 'var(--font-body)' }}
    >
      {/* nav */}
      <div
        className="flex items-center gap-2 px-3"
        style={{ height: 40, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-line)' }}
      >
        <span
          className="grid place-items-center"
          style={{ width: 20, height: 20, borderRadius: 5, background: 'var(--color-accent)', color: 'var(--color-accent-ink)', fontFamily: 'var(--font-display)', fontSize: 10 }}
        >M</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--color-ink)', textTransform: editorial ? 'uppercase' : 'none' }}>Din Butik</span>
        <span className="ml-auto" style={{ background: 'var(--color-ink)', color: 'var(--color-canvas)', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 999 }}>Varukorg</span>
      </div>

      {/* hero */}
      {editorial ? (
        <div style={{ position: 'relative', margin: 10, borderRadius: 'var(--radius-tile)', overflow: 'hidden', background: 'var(--color-surface)', border: '1px solid var(--color-line)', padding: 16, minHeight: 96 }}>
          <div style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-display)', fontSize: 90, lineHeight: 0.72, color: 'color-mix(in srgb, var(--color-accent) 9%, transparent)' }}>M</div>
          <div style={{ position: 'relative' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, lineHeight: 1, textTransform: 'uppercase', color: 'var(--color-ink)' }}>En rubrik</div>
            <div style={{ display: 'inline-block', marginTop: 10, background: 'var(--color-accent)', color: 'var(--color-accent-ink)', fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 'var(--radius-el)' }}>Handla nu</div>
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative', margin: 10, borderRadius: 'var(--radius-tile)', overflow: 'hidden', minHeight: 96, background: 'var(--color-ink)', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(400px 200px at 82% -10%, color-mix(in srgb, var(--color-accent) 60%, #1A1C1E), #1A1C1E)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,.55))' }} />
          <div style={{ position: 'relative', padding: 14, color: '#fff' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, lineHeight: 1 }}>Välkommen</div>
            <div style={{ display: 'inline-block', marginTop: 8, background: '#fff', color: '#1A1C1E', fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 999 }}>Handla nu</div>
          </div>
        </div>
      )}

      {/* product grid */}
      <div style={{ padding: '2px 10px 12px' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--color-ink)', textTransform: editorial ? 'uppercase' : 'none', margin: '6px 2px 8px' }}>Produkter</div>
        <div className={grid.container}>
          {products.map((p, i) => (
            <div key={i} className={grid.cellClass(i)}>
              <PreviewCard p={p} img={imgFields[i % imgFields.length]} overlay={overlay} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewCard({ p, img, overlay }) {
  const imgBox = (
    <div style={{ position: 'relative', aspectRatio: '3 / 4', overflow: 'hidden', background: `radial-gradient(120% 90% at 40% 20%, ${img}, #0d0a0c 75%)` }}>
      {overlay && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.78), rgba(0,0,0,.15) 55%, transparent)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 10, color: '#fff' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, lineHeight: 1.1 }}>{p.n}</div>
            <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 12 }}>{p.pr}</span>
              <span style={{ background: 'var(--color-accent)', color: 'var(--color-accent-ink)', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999 }}>Köp</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
  if (overlay) {
    return <div style={{ borderRadius: 'var(--radius-tile)', overflow: 'hidden', height: '100%' }}>{imgBox}</div>;
  }
  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-tile)', overflow: 'hidden', border: '1px solid var(--color-line)', height: '100%' }}>
      {imgBox}
      <div style={{ padding: 8 }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-ink-faint)' }}>{p.c}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--color-ink)', margin: '1px 0 5px' }}>{p.n}</div>
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--color-ink)' }}>{p.pr}</span>
          <span style={{ background: 'var(--color-accent)', color: 'var(--color-accent-ink)', fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 999 }}>Köp</span>
        </div>
      </div>
    </div>
  );
}

export default AdminTemplates;
