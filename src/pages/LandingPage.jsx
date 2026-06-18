import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

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

  return (
    <div style={styles.root}>
      <style>{KEYFRAMES}</style>

      {/* Atmosphere: dot grid + radial glow + a single drifting meteor streak */}
      <div style={styles.dotGrid} aria-hidden="true" />
      <div style={styles.glow} aria-hidden="true" />
      <div style={styles.meteor} aria-hidden="true" />
      <div style={styles.vignette} aria-hidden="true" />

      {/* Top bar */}
      <header style={styles.header}>
        <div style={styles.brandRow} aria-label="meteorpr">
          <Mark />
          <span style={styles.wordmark}>meteor<span style={styles.wordmarkAccent}>pr</span></span>
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
            meteorpr är webbutiken utan krångel. Din butik, ditt varumärke,
            allt du behöver — och inget du inte behöver. Logga in och sälj.
          </p>

          <div style={{ ...styles.ctaRow, ...rise(300) }}>
            <Link to="/login" style={styles.ctaPrimary} className="mpr-cta">
              Logga in till din butik
              <Arrow />
            </Link>
            <Link to="/forgot-password" style={styles.ctaGhost} className="mpr-ghost">
              Glömt lösenord?
            </Link>
          </div>

          <div style={{ ...styles.reassure, ...rise(360) }}>
            Endast för inbjudna butiker. Ny butik? Din leverantör sätter upp dig.
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
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerRow}>
          <span style={styles.footerBrand}>meteor<span style={styles.wordmarkAccent}>pr</span></span>
          <span style={styles.footerMeta}>© {YEAR} meteorpr · Webbutik för småföretag</span>
        </div>
      </footer>
    </div>
  );
};

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
  meteor: {
    position: 'absolute', top: '8%', right: '12%', width: 2, height: 150,
    pointerEvents: 'none', transformOrigin: 'top right',
    transform: 'rotate(35deg)',
    background: 'linear-gradient(180deg, rgba(125,211,252,0.65), transparent)',
    animation: 'mprMeteor 7s ease-in-out infinite',
    opacity: 0.5,
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
  ctaGhost: {
    fontFamily: FONT_BODY, fontSize: 14.5, fontWeight: 500, color: '#9fb2cb',
    textDecoration: 'none', padding: '13px 6px', transition: 'color .2s ease',
  },
  reassure: { fontSize: 13, color: '#6f829b', margin: '20px 0 0' },

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

const KEYFRAMES = `
  @keyframes mprMeteor {
    0%   { opacity: 0; transform: rotate(35deg) translateY(-40px); }
    12%  { opacity: 0.5; }
    40%  { opacity: 0; transform: rotate(35deg) translateY(120px); }
    100% { opacity: 0; transform: rotate(35deg) translateY(120px); }
  }
  .mpr-cta:hover { transform: translateY(-2px); box-shadow: 0 16px 38px -8px rgba(14,165,233,0.65), inset 0 1px 0 rgba(255,255,255,0.5); }
  .mpr-ghost:hover { color: #d7e6f7; }
  .mpr-card:hover { transform: translateY(-3px); border-color: rgba(125,211,252,0.28); background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)); }
  .mpr-card:hover span:last-child { transform: scaleX(1); }
  a.mpr-cta:focus-visible, a.mpr-ghost:focus-visible { outline: 2px solid #38bdf8; outline-offset: 3px; border-radius: 11px; }
  @media (prefers-reduced-motion: reduce) {
    [style*="mprMeteor"] { animation: none !important; }
  }
`;

export default LandingPage;
