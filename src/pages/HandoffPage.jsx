import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

/**
 * HandoffPage — the PUBLIC "📱 Skicka till mobilen" landing page.
 *
 * Opened on a phone (via a QR code) by a possibly non-technical artist. It is
 * deliberately dependency-light and self-contained: NO AppLayout, NO auth
 * contexts (ShopContext/AuthContext), NO admin shell. Auth is the token in the
 * URL fragment — the getHandoffPackage callable requires no Firebase auth.
 *
 * Route: /handoff/:postId  (token in window.location.hash, e.g. #<uuid>)
 * Backend: getHandoffPackage({ postId, token }) →
 *   { copy: { tiktok:{hook,caption,hashtags[]}, reels:{…}, shorts:{…} }|null,
 *     video: { url, durationSec }|null }
 * Swedish error messages arrive via err.message.
 */

const CHANNELS = [
  { key: 'tiktok', label: 'TikTok' },
  { key: 'reels', label: 'Instagram Reels' },
  { key: 'shorts', label: 'YouTube Shorts' },
];

// One paste-ready block per channel: hook + caption + hashtags.
const channelText = (c) => {
  if (!c) return '';
  const tags = Array.isArray(c.hashtags) ? c.hashtags.join(' ') : '';
  return [c.hook, c.caption, tags].filter(Boolean).join('\n\n');
};

// Centered card shell — used for loading, error and the missing-token state.
const CenterCard = ({ children }) => (
  <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
    <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
      {children}
    </div>
  </div>
);

const ChannelCard = ({ label, copy }) => {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(channelText(copy));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      /* Clipboard blocked — leave the text visible for manual copy. */
    }
  };

  if (!copy) return null;
  const tags = Array.isArray(copy.hashtags) ? copy.hashtags.join(' ') : '';

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{label}</h2>
      {copy.hook && <p className="mb-1 text-base font-bold text-gray-900">{copy.hook}</p>}
      {copy.caption && (
        <p className="mb-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
          {copy.caption}
        </p>
      )}
      {tags && <p className="mb-3 break-words text-sm text-blue-600">{tags}</p>}
      <button
        type="button"
        onClick={onCopy}
        className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition-colors active:bg-gray-700"
      >
        {copied ? 'Kopierat ✓' : `Kopiera ${label}-texten`}
      </button>
    </section>
  );
};

const HandoffPage = () => {
  const { postId } = useParams();
  // Token lives in the URL fragment (never the query) — read it directly.
  const token = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';

  const [status, setStatus] = useState('loading'); // 'loading' | 'error' | 'ready'
  const [errorMsg, setErrorMsg] = useState('');
  const [copy, setCopy] = useState(null);
  const [video, setVideo] = useState(null);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!token) {
      setErrorMsg('Länken är ofullständig. Öppna QR-koden igen från datorn.');
      setStatus('error');
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await httpsCallable(functions, 'getHandoffPackage')({ postId, token });
        if (!active) return;
        setCopy(res.data?.copy || null);
        setVideo(res.data?.video || null);
        setStatus('ready');
      } catch (err) {
        if (!active) return;
        // Backend HttpsError messages are already Swedish.
        setErrorMsg(err?.message || 'Något gick fel. Försök igen.');
        setStatus('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [postId, token]);

  const onShare = useCallback(async () => {
    if (!video?.url || !navigator.share) return;
    try {
      await navigator.share({ url: video.url, title: 'Video' });
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch (e) {
      // The user cancelling the share sheet throws AbortError — ignore it
      // (and any other share failure) silently.
    }
  }, [video]);

  if (status === 'loading') {
    return (
      <CenterCard>
        <div
          className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"
          aria-hidden="true"
        />
        <p className="text-sm text-gray-600">Hämtar ditt inlägg…</p>
      </CenterCard>
    );
  }

  if (status === 'error') {
    return (
      <CenterCard>
        <p className="mb-1 text-base font-semibold text-gray-900">Kunde inte öppna inlägget</p>
        <p className="text-sm text-gray-600">{errorMsg}</p>
      </CenterCard>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-md space-y-4 p-4">
        <header className="pt-2 text-center">
          <h1 className="text-lg font-bold text-gray-900">Ditt inlägg är klart</h1>
          <p className="text-sm text-gray-500">Spara videon och kopiera texterna.</p>
        </header>

        {/* Video section */}
        {video?.url && (
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mx-auto mb-3 overflow-hidden rounded-xl bg-black" style={{ aspectRatio: '9 / 16' }}>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                controls
                playsInline
                src={video.url}
                className="h-full w-full object-contain"
              />
            </div>
            <a
              href={video.url}
              download
              className="block w-full rounded-xl bg-gray-900 px-4 py-3 text-center text-base font-semibold text-white transition-colors active:bg-gray-700"
            >
              ⬇️ Spara video
            </a>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button
                type="button"
                onClick={onShare}
                className="mt-2 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-base font-semibold text-gray-900 transition-colors active:bg-gray-100"
              >
                {shared ? 'Öppnad ✓' : 'Dela / öppna i app'}
              </button>
            )}
            <p className="mt-2 text-center text-xs text-gray-500">
              Tips: håll fingret på videon och välj Spara, eller använd delningsknappen.
            </p>
          </section>
        )}

        {/* Text sections — stacked, not tabbed (scrolling beats tapping on mobile). */}
        {CHANNELS.map((ch) => (
          <ChannelCard key={ch.key} label={ch.label} copy={copy?.[ch.key]} />
        ))}

        {!video?.url && !copy && (
          <section className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-gray-600">Det finns inget innehåll att visa ännu.</p>
          </section>
        )}

        <footer className="pb-6 pt-2 text-center text-xs text-gray-400">
          Skapad med Innehållsstudio
        </footer>
      </div>
    </div>
  );
};

export default HandoffPage;
