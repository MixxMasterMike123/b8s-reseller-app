import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { httpsCallable, getFunctions } from 'firebase/functions';

/**
 * LandingPage — the public front door on the admin domain (route "/").
 *
 * A login GATEWAY with a light pitch: it sets context for an onboarded shop
 * owner and points them straight at the login CTA (/login). Platform-branded
 * (meteorpr), not any single shop. No signup flow here — onboarding is operator-
 * provisioned. Deliberately self-contained (inline tokens + keyframes) so it
 * doesn't depend on the admin shell or pull the app's chrome.
 *
 * Aesthetic: refined-minimal "infrastructure for commerce" — deep slate canvas,
 * a single sky-blue accent (the project's --color-primary ramp), Familjen
 * Grotesk display (already loaded in index.html), a quiet meteor-streak motif,
 * one orchestrated staggered reveal on load.
 */

const SELLING_POINTS = [
  {
    k: '01',
    title: 'Igång på minuter',
    body: 'Inget krångel, inga plugins, ingen installation. Du loggar in och börjar sälja.',
  },
  {
    k: '02',
    title: 'Allt på ett ställe',
    body: 'Produkter, ordrar, kunder, leverans och upphämtning — i en enda enkel adminvy.',
  },
  {
    k: '03',
    title: 'Din butik, ditt varumärke',
    body: 'Kunderna ser dig — aldrig plattformen. Egen butik, egna produkter, egen identitet.',
  },
  {
    k: '04',
    title: 'Tryggt och avskilt',
    body: 'Varje butik är helt isolerad. Din data, dina filer och dina kunder är bara dina.',
  },
];

const LandingPage = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const rise = (delay) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(14px)',
    transition: `opacity .7s cubic-bezier(.22,1,.36,1) ${delay}ms, transform .7s cubic-bezier(.22,1,.36,1) ${delay}ms`,
  });

  // A field of meteors at RANDOMIZED placements/lengths/timing. Computed once
  // per mount (varies each visit) and reused so re-renders don't reshuffle.
  const meteors = useMemo(() => {
    const n = 7;
    return Array.from({ length: n }, (_, i) => {
      const r = (min, max) => min + Math.random() * (max - min);
      return {
        id: i,
        left: r(-5, 100),       // vw — can start slightly off the left edge
        top: r(-12, 55),        // vh — mostly upper half, some above the fold
        len: r(60, 150),        // px streak length
        dur: r(5, 11),          // s fall duration (slower = calmer)
        delay: r(0, 12),        // s stagger so they don't fall in sync
        angle: r(28, 40),       // deg — varied diagonal
        opacity: r(0.14, 0.4),  // softer
        thin: 1,                // px streak width (always thin)
      };
    });
  }, []);

  return (
    <div style={styles.root}>
      <style>{KEYFRAMES}</style>

      {/* Atmosphere: dot grid + radial glow + a randomized field of meteors */}
      <div style={styles.dotGrid} aria-hidden="true" />
      <div style={styles.glow} aria-hidden="true" />
      <div style={styles.meteorField} aria-hidden="true">
        {meteors.map((m) => (
          <span
            key={m.id}
            style={{
              position: 'absolute',
              left: `${m.left}vw`,
              top: `${m.top}vh`,
              width: m.thin,
              height: m.len,
              transformOrigin: 'top right',
              background: 'linear-gradient(180deg, rgba(125,211,252,0.8), rgba(56,189,248,0.15) 55%, transparent)',
              borderRadius: 999,
              opacity: 0,
              animation: `mprMeteor ${m.dur}s linear ${m.delay}s infinite`,
              // per-meteor rotation + peak opacity fed to the shared keyframe
              '--mpr-rot': `rotate(${m.angle}deg)`,
              '--mpr-peak': m.opacity,
            }}
          />
        ))}
      </div>
      <div style={styles.vignette} aria-hidden="true" />

      {/* Top bar */}
      <header style={styles.header}>
        <div style={styles.brandRow} aria-label="ChopShop">
          <Mark />
          <span style={styles.wordmark}>Chop<span style={styles.wordmarkAccent}>Shop</span></span>
        </div>
        <Link to="/login" style={styles.navLogin}>Logga in</Link>
      </header>

      {/* Hero */}
      <main style={styles.main}>
        <div style={styles.heroWrap}>
          <div style={{ ...styles.eyebrow, ...rise(60) }}>
            <span style={styles.eyebrowDot} />
            Webbutik för småföretag
          </div>

          <h1 style={{ ...styles.h1, ...rise(140) }}>
            Den enklaste<br />
            <span style={styles.h1Accent}>webbutiken</span> som finns.
          </h1>

          <p style={{ ...styles.lede, ...rise(220) }}>
            ChopShop är webbutiken utan krångel. Din butik, ditt varumärke,
            allt du behöver — och inget du inte behöver. Logga in och sälj.
          </p>

          <div style={{ ...styles.ctaRow, ...rise(300) }}>
            <Link to="/login" style={styles.ctaPrimary} className="mpr-cta">
              Logga in till din butik
              <Arrow />
            </Link>
            <a href="#kontakt" style={styles.ctaSecondary} className="mpr-secondary">
              Kontakta sälj
            </a>
            <Link to="/forgot-password" style={styles.ctaGhost} className="mpr-ghost">
              Glömt lösenord?
            </Link>
          </div>

          <div style={{ ...styles.reassure, ...rise(360) }}>
            Endast för inbjudna butiker. Ny butik?{' '}
            <a href="#kontakt" style={styles.reassureLink} className="mpr-ghost">Hör av dig så fixar vi det.</a>
          </div>
        </div>

        {/* Selling points */}
        <section style={styles.grid} aria-label="Det här får du">
          {SELLING_POINTS.map((p, i) => (
            <div
              key={p.k}
              className="mpr-card"
              style={{ ...styles.card, ...rise(440 + i * 90) }}
            >
              <span style={styles.cardKey}>{p.k}</span>
              <h3 style={styles.cardTitle}>{p.title}</h3>
              <p style={styles.cardBody}>{p.body}</p>
              <span style={styles.cardRule} aria-hidden="true" />
            </div>
          ))}
        </section>

        {/* Contact sales */}
        <ContactSection />
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerRow}>
          <span style={styles.footerBrand}>Chop<span style={styles.wordmarkAccent}>Shop</span></span>
          <span style={styles.footerMeta}>© {YEAR} ChopShop · Webbutik för småföretag</span>
        </div>
      </footer>
    </div>
  );
};

/* Contact-sales section + form. Submits through the `submitLead` callable,
   which writes a platform-level `leads` doc and notifies sales by email.
   `website` is a honeypot: visually hidden, humans leave it empty. */
const ContactSection = () => {
  const [form, setForm] = useState({ name: '', company: '', email: '', message: '', website: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;
    if (!form.name.trim() || !form.email.trim()) {
      setError('Fyll i namn och e-post.');
      return;
    }
    setError('');
    setSending(true);
    try {
      const functions = getFunctions(undefined, 'us-central1');
      const submitLead = httpsCallable(functions, 'submitLead');
      await submitLead(form);
      setSent(true);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ChopShop] sales lead submit failed:', err);
      setError('Något gick fel — försök igen om en stund, eller mejla oss direkt.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="kontakt" style={cStyles.wrap} aria-label="Kontakta sälj">
      <div style={cStyles.inner}>
        <div style={cStyles.copy}>
          <h2 style={cStyles.h2}>Vill du ha en egen butik?</h2>
          <p style={cStyles.sub}>
            Berätta lite om dig så hör vi av oss. Vi sätter upp din butik —
            du behöver bara börja sälja.
          </p>
          <ul style={cStyles.points}>
            <li style={cStyles.point}><Dot /> Inga startavgifter att räkna på</li>
            <li style={cStyles.point}><Dot /> Igång inom någon dag</li>
            <li style={cStyles.point}><Dot /> Hjälp hela vägen</li>
          </ul>
        </div>

        {sent ? (
          <div style={cStyles.success} role="status">
            <div style={cStyles.successIcon}>✓</div>
            <h3 style={cStyles.successTitle}>Tack — vi hör av oss!</h3>
            <p style={cStyles.successBody}>
              Vi återkommer till {form.email} så snart vi kan.
            </p>
          </div>
        ) : (
          <form style={cStyles.form} onSubmit={onSubmit} noValidate>
            <div style={cStyles.field2}>
              <Input label="Namn" value={form.name} onChange={set('name')} autoComplete="name" />
              <Input label="Företag" value={form.company} onChange={set('company')} autoComplete="organization" />
            </div>
            <Input label="E-post" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
            <Field label="Meddelande">
              <textarea
                rows={3}
                value={form.message}
                onChange={set('message')}
                placeholder="Vad säljer du? Vad vill du veta?"
                style={cStyles.textarea}
                className="mpr-input"
              />
            </Field>
            {/* Honeypot — hidden from humans (off-screen + untabbable); bots
                that fill it get rejected server-side. */}
            <input
              type="text"
              name="website"
              value={form.website}
              onChange={set('website')}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
            />
            {error && <div style={cStyles.error}>{error}</div>}
            <button type="submit" style={cStyles.submit} className="mpr-cta" disabled={sending}>
              {sending ? 'Skickar…' : <>Skicka <Arrow /></>}
            </button>
            <p style={cStyles.formNote}>Vi använder bara dina uppgifter för att kontakta dig.</p>
          </form>
        )}
      </div>
    </section>
  );
};

const Field = ({ label, children }) => (
  <label style={cStyles.label}>
    <span style={cStyles.labelText}>{label}</span>
    {children}
  </label>
);

const Input = ({ label, type = 'text', ...rest }) => (
  <Field label={label}>
    <input type={type} style={cStyles.input} className="mpr-input" {...rest} />
  </Field>
);

const Dot = () => (
  <span style={{ width: 6, height: 6, borderRadius: 999, background: '#38bdf8', flex: '0 0 auto', boxShadow: '0 0 0 3px rgba(56,189,248,0.18)' }} />
);

/* Brand mark — a minimal meteor: a filled disc with a tapering streak. */
const Mark = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="mprStreak" x1="2" y1="24" x2="20" y2="6" gradientUnits="userSpaceOnUse">
        <stop stopColor="#38bdf8" stopOpacity="0" />
        <stop offset="1" stopColor="#38bdf8" />
      </linearGradient>
    </defs>
    <path d="M3 23 L17 9" stroke="url(#mprStreak)" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="18.5" cy="7.5" r="4.4" fill="#0ea5e9" />
    <circle cx="18.5" cy="7.5" r="4.4" fill="#0ea5e9" opacity="0.45" style={{ filter: 'blur(3px)' }} />
  </svg>
);

const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ marginLeft: 2 }}>
    <path d="M3 8h9M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const YEAR = 2026;

const FONT_DISPLAY = "'Familjen Grotesk', 'Figtree', system-ui, sans-serif";
const FONT_BODY = "'Figtree', system-ui, sans-serif";

const styles = {
  root: {
    position: 'relative',
    minHeight: '100vh',
    overflow: 'hidden',
    background: 'radial-gradient(120% 120% at 50% -10%, #0b1220 0%, #070a12 55%, #05070d 100%)',
    color: '#e6edf6',
    fontFamily: FONT_BODY,
    display: 'flex',
    flexDirection: 'column',
    WebkitFontSmoothing: 'antialiased',
  },
  dotGrid: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    backgroundImage: 'radial-gradient(rgba(125,211,252,0.10) 1px, transparent 1px)',
    backgroundSize: '26px 26px',
    maskImage: 'radial-gradient(120% 80% at 50% 0%, #000 30%, transparent 75%)',
    WebkitMaskImage: 'radial-gradient(120% 80% at 50% 0%, #000 30%, transparent 75%)',
    opacity: 0.7,
  },
  glow: {
    position: 'absolute', top: '-22%', left: '50%', transform: 'translateX(-50%)',
    width: 'min(900px, 95vw)', height: 540, pointerEvents: 'none',
    background: 'radial-gradient(closest-side, rgba(14,165,233,0.20), rgba(14,165,233,0.06) 55%, transparent 75%)',
    filter: 'blur(8px)',
  },
  meteorField: {
    position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
    // fade the whole field toward the lower half so meteors read as falling
    // "from the sky" and don't clutter the content/cards area.
    maskImage: 'linear-gradient(180deg, #000 0%, #000 45%, transparent 78%)',
    WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 45%, transparent 78%)',
  },
  vignette: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background: 'radial-gradient(120% 100% at 50% 50%, transparent 60%, rgba(0,0,0,0.45) 100%)',
  },

  header: {
    position: 'relative', zIndex: 2,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '22px clamp(20px, 6vw, 56px)',
  },
  brandRow: { display: 'flex', alignItems: 'center', gap: 10 },
  wordmark: { fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 19, letterSpacing: '-0.02em', color: '#f3f8ff' },
  wordmarkAccent: { color: '#38bdf8' },
  navLogin: {
    fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, color: '#aebfd4',
    textDecoration: 'none', padding: '8px 14px', borderRadius: 9,
    border: '1px solid rgba(125,211,252,0.16)', transition: 'all .2s ease',
  },

  main: {
    position: 'relative', zIndex: 2, flex: 1,
    width: '100%', maxWidth: 1080, margin: '0 auto',
    padding: '0 clamp(20px, 6vw, 56px)',
  },
  heroWrap: { paddingTop: 'clamp(56px, 11vh, 120px)', maxWidth: 760 },
  eyebrow: {
    display: 'inline-flex', alignItems: 'center', gap: 9,
    fontSize: 13, fontWeight: 500, letterSpacing: '0.01em', color: '#8fa6c0',
    padding: '6px 13px 6px 11px', borderRadius: 999,
    border: '1px solid rgba(125,211,252,0.15)', background: 'rgba(125,211,252,0.04)',
  },
  eyebrowDot: {
    width: 7, height: 7, borderRadius: 999, background: '#38bdf8',
    boxShadow: '0 0 0 4px rgba(56,189,248,0.18)',
  },
  h1: {
    fontFamily: FONT_DISPLAY, fontWeight: 600,
    fontSize: 'clamp(40px, 6.6vw, 76px)', lineHeight: 1.02,
    letterSpacing: '-0.035em', margin: '26px 0 0', color: '#f5f9ff',
  },
  h1Accent: {
    background: 'linear-gradient(100deg, #7dd3fc, #0ea5e9)',
    WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
  },
  lede: {
    fontSize: 'clamp(16px, 2vw, 19px)', lineHeight: 1.55, color: '#a7b8cf',
    margin: '22px 0 0', maxWidth: 540,
  },
  ctaRow: { display: 'flex', alignItems: 'center', gap: 16, margin: '34px 0 0', flexWrap: 'wrap' },
  ctaPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, color: '#04121f',
    textDecoration: 'none', padding: '13px 22px', borderRadius: 11,
    background: 'linear-gradient(180deg, #7dd3fc, #0ea5e9)',
    boxShadow: '0 10px 30px -8px rgba(14,165,233,0.55), inset 0 1px 0 rgba(255,255,255,0.4)',
    transition: 'transform .18s ease, box-shadow .18s ease',
  },
  ctaSecondary: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, color: '#cfe2f5',
    textDecoration: 'none', padding: '12px 20px', borderRadius: 11,
    border: '1px solid rgba(125,211,252,0.22)', background: 'rgba(125,211,252,0.05)',
    transition: 'background .2s ease, border-color .2s ease',
  },
  ctaGhost: {
    fontFamily: FONT_BODY, fontSize: 14.5, fontWeight: 500, color: '#9fb2cb',
    textDecoration: 'none', padding: '13px 6px', transition: 'color .2s ease',
  },
  reassure: { fontSize: 13, color: '#6f829b', margin: '20px 0 0' },
  reassureLink: { color: '#8fbfe6', textDecoration: 'none', fontWeight: 500 },

  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(228px, 1fr))',
    gap: 14, margin: 'clamp(56px, 9vh, 96px) 0 64px',
  },
  card: {
    position: 'relative', padding: '22px 20px 24px', borderRadius: 14,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012))',
    border: '1px solid rgba(125,211,252,0.10)',
    transition: 'transform .25s cubic-bezier(.22,1,.36,1), border-color .25s ease, background .25s ease',
    overflow: 'hidden',
  },
  cardKey: {
    fontFamily: FONT_DISPLAY, fontSize: 12, fontWeight: 600, letterSpacing: '0.12em',
    color: '#3f6f93',
  },
  cardTitle: {
    fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em',
    color: '#eaf2fb', margin: '12px 0 7px',
  },
  cardBody: { fontSize: 13.5, lineHeight: 1.5, color: '#90a3bd', margin: 0 },
  cardRule: {
    position: 'absolute', left: 0, bottom: 0, height: 2, width: '100%',
    background: 'linear-gradient(90deg, #0ea5e9, transparent)',
    transform: 'scaleX(0)', transformOrigin: 'left', transition: 'transform .35s ease',
  },

  footer: { position: 'relative', zIndex: 2, padding: '24px clamp(20px, 6vw, 56px) 30px', borderTop: '1px solid rgba(125,211,252,0.08)' },
  footerRow: {
    maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
  },
  footerBrand: { fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, color: '#cdd9e8' },
  footerMeta: { fontSize: 12.5, color: '#5f7290' },
};

const cStyles = {
  wrap: { margin: 'clamp(40px, 7vh, 80px) 0 72px', scrollMarginTop: 80 },
  inner: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 'clamp(24px, 4vw, 56px)', alignItems: 'center',
    padding: 'clamp(26px, 4vw, 44px)', borderRadius: 20,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.012))',
    border: '1px solid rgba(125,211,252,0.12)',
    boxShadow: '0 30px 80px -40px rgba(2,8,20,0.9)',
  },
  copy: {},
  h2: {
    fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 'clamp(26px, 3.4vw, 36px)',
    letterSpacing: '-0.025em', lineHeight: 1.08, color: '#f3f8ff', margin: 0,
  },
  sub: { fontSize: 15.5, lineHeight: 1.55, color: '#a7b8cf', margin: '14px 0 0', maxWidth: 380 },
  points: { listStyle: 'none', padding: 0, margin: '22px 0 0', display: 'grid', gap: 11 },
  point: { display: 'flex', alignItems: 'center', gap: 11, fontSize: 14, color: '#c2d2e6' },

  form: { display: 'grid', gap: 14 },
  field2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  label: { display: 'grid', gap: 7 },
  labelText: { fontSize: 12.5, fontWeight: 600, letterSpacing: '0.01em', color: '#8ea3bd' },
  input: {
    fontFamily: FONT_BODY, fontSize: 14.5, color: '#eef4fb',
    background: 'rgba(6,11,20,0.7)', border: '1px solid rgba(125,211,252,0.16)',
    borderRadius: 10, padding: '11px 13px', outline: 'none', width: '100%',
    transition: 'border-color .18s ease, box-shadow .18s ease',
  },
  textarea: {
    fontFamily: FONT_BODY, fontSize: 14.5, color: '#eef4fb', resize: 'vertical',
    background: 'rgba(6,11,20,0.7)', border: '1px solid rgba(125,211,252,0.16)',
    borderRadius: 10, padding: '11px 13px', outline: 'none', width: '100%',
    transition: 'border-color .18s ease, box-shadow .18s ease',
  },
  error: { fontSize: 13, color: '#fca5a5', margin: '-2px 0 0' },
  submit: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600, color: '#04121f',
    cursor: 'pointer', padding: '13px 22px', borderRadius: 11, border: 'none',
    background: 'linear-gradient(180deg, #7dd3fc, #0ea5e9)',
    boxShadow: '0 10px 30px -8px rgba(14,165,233,0.55), inset 0 1px 0 rgba(255,255,255,0.4)',
    transition: 'transform .18s ease, box-shadow .18s ease', justifySelf: 'start',
  },
  formNote: { fontSize: 12, color: '#647890', margin: 0 },

  success: {
    display: 'grid', justifyItems: 'start', gap: 8,
    padding: '28px 24px', borderRadius: 14,
    background: 'linear-gradient(180deg, rgba(56,189,248,0.08), rgba(56,189,248,0.02))',
    border: '1px solid rgba(56,189,248,0.25)',
  },
  successIcon: {
    width: 38, height: 38, borderRadius: 999, display: 'grid', placeItems: 'center',
    background: 'linear-gradient(180deg, #7dd3fc, #0ea5e9)', color: '#04121f',
    fontWeight: 800, fontSize: 18,
  },
  successTitle: { fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 19, color: '#eaf2fb', margin: '6px 0 0' },
  successBody: { fontSize: 14, color: '#9fb2cb', margin: 0 },
};

const KEYFRAMES = `
  /* Meteors fall along their own rotated axis (translateY in the rotated frame
     reads as a diagonal down-right streak). Each <span> sets its own --mpr-peak
     and rotation inline; this keyframe just drives the travel + fade so all 16
     share one declaration. */
  @keyframes mprMeteor {
    0%   { opacity: 0; transform: var(--mpr-rot, rotate(35deg)) translateY(-60px); }
    8%   { opacity: var(--mpr-peak, 0.5); }
    70%  { opacity: var(--mpr-peak, 0.5); }
    100% { opacity: 0; transform: var(--mpr-rot, rotate(35deg)) translateY(380px); }
  }
  .mpr-cta:hover { transform: translateY(-2px); box-shadow: 0 16px 38px -8px rgba(14,165,233,0.65), inset 0 1px 0 rgba(255,255,255,0.5); }
  .mpr-ghost:hover { color: #d7e6f7; }
  .mpr-card:hover { transform: translateY(-3px); border-color: rgba(125,211,252,0.28); background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)); }
  .mpr-card:hover span:last-child { transform: scaleX(1); }
  .mpr-secondary:hover { background: rgba(125,211,252,0.10); border-color: rgba(125,211,252,0.38); }
  .mpr-input:focus { border-color: rgba(56,189,248,0.6); box-shadow: 0 0 0 3px rgba(56,189,248,0.14); }
  .mpr-input::placeholder { color: #5f7290; }
  .mpr-cta:focus-visible, .mpr-ghost:focus-visible, .mpr-secondary:focus-visible { outline: 2px solid #38bdf8; outline-offset: 3px; border-radius: 11px; }
  @media (prefers-reduced-motion: reduce) {
    [style*="mprMeteor"] { animation: none !important; opacity: 0.35 !important; }
  }
`;

export default LandingPage;
