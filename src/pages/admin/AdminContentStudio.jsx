import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db, storage, functions } from '../../firebase/config';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import AppLayout from '../../components/layout/AppLayout';
import { useShopId } from '../../contexts/ShopContext';
import { useAuth } from '../../contexts/AuthContext';
import { useShopFeatures } from '../../contexts/ShopFeaturesContext';
import { withShopId } from '../../config/withShopId';
import {
  Page,
  Card,
  CardSection,
  Button,
  StatusPill,
  Field,
  Input,
  Textarea,
  Select,
} from '../../components/admin/ui';
import {
  FilmIcon,
  MusicalNoteIcon,
  PhotoIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  DocumentDuplicateIcon,
  PlayIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

/**
 * AdminContentStudio — the "Innehållsstudio" add-on (AI social-media studio).
 *
 * Three sections top-to-bottom:
 *   1. Material  — upload raw clips/images/audio to Storage
 *                  (content-studio/{shopId}/uploads), click-to-select with a
 *                  numbered order badge (order = video cut order).
 *   2. Skapa inlägg — generateSocialCopy callable → per-channel copy
 *                  (TikTok/Reels/Shorts) + renderSocialVideo callable →
 *                  auto-assembled vertical video. Save everything as a draft.
 *   3. Planner   — live list of socialPosts drafts (onSnapshot), inline
 *                  schedule editing, per-channel copy buttons, delete.
 *
 * IMPORTANT: unlike the legacy default-ON add-ons, contentStudio is EXPLICIT
 * OPT-IN — the page gates on features.contentStudio === true (platform users
 * always pass). No AddonGate on the route; deep links get a friendly
 * "not activated" card instead.
 */

const MAX_FILE_MB = 80;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const MAX_VIDEO_ASSETS = 12;
const MAX_IMAGE_PATHS = 3;

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif']);
const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm', 'm4v', 'avi', 'mkv']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac']);

const TONES = [
  { value: 'hype', label: '🔥 Hype & Energi', hint: 'Maxad liveshow-energi rakt in i flödet.' },
  { value: 'nostalgi', label: '🕰 Nostalgi & Modern', hint: 'Då-och-nu-känsla som möter dagens scen.' },
  { value: 'karlek', label: '❤️ Kärlek & Community', hint: 'Värme och tacksamhet till fansen.' },
];

const CHANNELS = [
  { key: 'tiktok', label: 'TikTok' },
  { key: 'reels', label: 'Reels' },
  { key: 'shorts', label: 'Shorts' },
];

// Filename sanitizer per the storage contract: keep [a-zA-Z0-9._-] only.
const sanitizeFileName = (name) => String(name || 'fil').replace(/[^a-zA-Z0-9._-]/g, '_');

const extOf = (name) => {
  const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
};

const typeOf = (name) => {
  const ext = extOf(name);
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (AUDIO_EXTS.has(ext)) return 'audio';
  if (VIDEO_EXTS.has(ext)) return 'video';
  return 'video'; // unknown extensions came in via video/* accept — treat as clip
};

// Firestore Timestamp | Date | null → value for <input type="datetime-local">.
const tsToLocalInput = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : ts instanceof Date ? ts : null;
  if (!d || isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// datetime-local string → Firestore Timestamp | null.
const localInputToTs = (s) => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
};

const fmtDateTime = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : ts instanceof Date ? ts : null;
  if (!d) return '';
  return d.toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });
};

// One ready-to-paste text per channel: hook + caption + hashtags.
const channelText = (copy, channelKey) => {
  const c = copy?.[channelKey];
  if (!c) return '';
  const tags = Array.isArray(c.hashtags) ? c.hashtags.join(' ') : '';
  return [c.hook, c.caption, tags].filter(Boolean).join('\n\n');
};

const copyToClipboard = async (text, okMessage = 'Kopierat!') => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(okMessage);
  } catch (e) {
    toast.error('Kunde inte kopiera till urklipp.');
  }
};

const toneMeta = (value) => TONES.find((t) => t.value === value) || { label: value };

const AdminContentStudio = () => {
  const shopId = useShopId();
  const { currentUser, isPlatform } = useAuth();
  const { features, loading: featuresLoading } = useShopFeatures();

  // EXPLICIT opt-in gate (NOT the default-ON isFeatureEnabled helper).
  const featureOn = features?.contentStudio === true || isPlatform;

  // ── Section 1: Material ──
  const [assets, setAssets] = useState([]); // [{ path, name, type, url|null }]
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadNote, setUploadNote] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [selected, setSelected] = useState([]); // ordered asset paths — order = cut order
  const fileInputRef = useRef(null);

  // ── Section 2: Skapa inlägg ──
  const [description, setDescription] = useState('');
  const [tone, setTone] = useState('hype');
  const [includeTags, setIncludeTags] = useState(false);
  const [artistTags, setArtistTags] = useState('');
  const [targetSec, setTargetSec] = useState(15);
  const [bpm, setBpm] = useState(135);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [copy, setCopy] = useState(null); // { tiktok:{hook,caption,hashtags}, reels, shorts }
  const [activeChannel, setActiveChannel] = useState('tiktok');
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState('');
  const [video, setVideo] = useState(null); // { path, url, durationSec, renderedAt: Date }
  const [scheduleInput, setScheduleInput] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);

  // ── Section 3: Planner ──
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);

  const artistTagsKey = `contentstudio-artist-tags-${shopId}`;

  // Load the last-used artist tags per shop from localStorage.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(artistTagsKey);
      if (saved != null) setArtistTags(saved);
    } catch (e) { /* localStorage unavailable — ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistTagsKey]);

  const persistArtistTags = (value) => {
    setArtistTags(value);
    try {
      localStorage.setItem(artistTagsKey, value);
    } catch (e) { /* ignore */ }
  };

  // ── Library: list uploads from Storage ──
  const loadAssets = useCallback(async () => {
    if (!featureOn || !shopId) return;
    setAssetsLoading(true);
    try {
      const listing = await listAll(ref(storage, `content-studio/${shopId}/uploads`));
      const items = listing.items.map((itemRef) => ({
        path: itemRef.fullPath,
        name: itemRef.name,
        type: typeOf(itemRef.name),
        url: null,
      }));
      // Names start with a millisecond timestamp → name-desc = newest first.
      items.sort((a, b) => b.name.localeCompare(a.name));
      setAssets(items);
      // Image thumbnails (best effort — a failed URL just keeps the icon).
      items
        .filter((a) => a.type === 'image')
        .forEach((a) => {
          getDownloadURL(ref(storage, a.path))
            .then((url) => {
              setAssets((prev) => prev.map((x) => (x.path === a.path ? { ...x, url } : x)));
            })
            .catch(() => {});
        });
    } catch (error) {
      console.error('Error listing content-studio uploads:', error);
      toast.error('Kunde inte hämta materialbiblioteket.');
    } finally {
      setAssetsLoading(false);
    }
  }, [featureOn, shopId]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // ── Planner: live drafts ──
  useEffect(() => {
    if (!featureOn || !shopId) return undefined;
    setPostsLoading(true);
    const q = query(
      collection(db, 'socialPosts'),
      where('shopId', '==', shopId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setPostsLoading(false);
      },
      (error) => {
        console.error('Error listening to socialPosts:', error);
        toast.error('Kunde inte hämta sparade utkast.');
        setPostsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [featureOn, shopId]);

  // ── Upload ──
  const handleFilesChosen = async (e) => {
    const files = Array.from(e.target.files || []);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (files.length === 0) return;
    setUploadError('');

    const tooBig = files.filter((f) => f.size > MAX_FILE_BYTES);
    if (tooBig.length > 0) {
      setUploadError(
        `${tooBig
          .map((f) => `"${f.name}" är för stor (${(f.size / 1024 / 1024).toFixed(1)} MB)`)
          .join(', ')}. Max ${MAX_FILE_MB} MB per fil.`
      );
      return;
    }

    setUploading(true);
    let failed = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadNote(`Laddar upp ${i + 1} av ${files.length}: ${file.name}…`);
      try {
        // Contract path: content-studio/{shopId}/uploads/{Date.now()}_{safeName}
        const path = `content-studio/${shopId}/uploads/${Date.now()}_${sanitizeFileName(file.name)}`;
        const snap = await uploadBytes(ref(storage, path), file);
        const type = typeOf(file.name);
        let url = null;
        if (type === 'image') {
          try {
            url = await getDownloadURL(snap.ref);
          } catch (err) { /* icon fallback */ }
        }
        setAssets((prev) => [{ path, name: snap.ref.name, type, url }, ...prev]);
      } catch (error) {
        console.error('Upload failed:', error);
        failed++;
      }
    }
    setUploading(false);
    setUploadNote('');
    if (failed > 0) {
      setUploadError(`${failed} av ${files.length} filer kunde inte laddas upp. Försök igen.`);
    } else {
      toast.success(files.length === 1 ? 'Filen uppladdad.' : `${files.length} filer uppladdade.`);
    }
  };

  const handleDeleteAsset = async (asset) => {
    if (!window.confirm(`Radera "${asset.name}" från biblioteket?`)) return;
    const toastId = toast.loading('Raderar…');
    try {
      await deleteObject(ref(storage, asset.path));
      setAssets((prev) => prev.filter((a) => a.path !== asset.path));
      setSelected((prev) => prev.filter((p) => p !== asset.path));
      toast.success('Filen raderad.', { id: toastId });
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast.error('Kunde inte radera filen.', { id: toastId });
    }
  };

  // Click-to-select: toggles membership; selection order = video cut order.
  const toggleSelect = (path) => {
    setSelected((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]));
  };

  const selectedAssets = useMemo(
    () => selected.map((p) => assets.find((a) => a.path === p)).filter(Boolean),
    [selected, assets]
  );
  const selectedVisual = useMemo(
    () => selectedAssets.filter((a) => a.type === 'image' || a.type === 'video'),
    [selectedAssets]
  );
  const selectedAudio = useMemo(
    () => selectedAssets.filter((a) => a.type === 'audio'),
    [selectedAssets]
  );

  // ── Generate copy ──
  const handleGenerate = async () => {
    if (!description.trim()) {
      setGenerateError('Skriv en beskrivning av materialet först.');
      return;
    }
    setGenerateError('');
    setGenerating(true);
    try {
      const tags = includeTags
        ? artistTags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];
      const imagePaths = selectedAssets
        .filter((a) => a.type === 'image')
        .slice(0, MAX_IMAGE_PATHS)
        .map((a) => a.path);
      const payload = {
        shopId,
        description: description.trim(),
        tone,
        includeTags,
        ...(tags.length > 0 ? { artistTags: tags } : {}),
        ...(imagePaths.length > 0 ? { imagePaths } : {}),
      };
      const res = await httpsCallable(functions, 'generateSocialCopy')(payload);
      setCopy(res.data?.copy || null);
      setActiveChannel('tiktok');
      toast.success('Innehåll genererat!');
    } catch (error) {
      console.error('generateSocialCopy failed:', error);
      // HttpsError messages from the backend are already Swedish.
      setGenerateError(error?.message || 'Kunde inte generera innehåll. Försök igen.');
    } finally {
      setGenerating(false);
    }
  };

  // ── Render video ──
  const handleRenderVideo = async () => {
    if (selectedVisual.length === 0) {
      setRenderError('Välj minst en bild- eller videofil i biblioteket ovan.');
      return;
    }
    if (selectedVisual.length > MAX_VIDEO_ASSETS) {
      setRenderError(`Välj högst ${MAX_VIDEO_ASSETS} bild-/videofiler för videon.`);
      return;
    }
    setRenderError('');
    setRendering(true);
    try {
      const payload = {
        shopId,
        assetPaths: selectedVisual.map((a) => a.path),
        targetSec: Number(targetSec) === 30 ? 30 : 15,
        bpm: Number(bpm) || 135,
        ...(selectedAudio.length > 0 ? { audioPath: selectedAudio[0].path } : {}),
      };
      // Rendering takes minutes — the default 70s callable timeout would abort.
      const res = await httpsCallable(functions, 'renderSocialVideo', { timeout: 540000 })(payload);
      const { path, url, durationSec } = res.data || {};
      if (!url) throw new Error('Videon kunde inte skapas. Försök igen.');
      setVideo({ path, url, durationSec, renderedAt: new Date() });
      toast.success('Video klar!');
    } catch (error) {
      console.error('renderSocialVideo failed:', error);
      setRenderError(error?.message || 'Kunde inte skapa videon. Försök igen.');
    } finally {
      setRendering(false);
    }
  };

  // ── Save draft ──
  const handleSaveDraft = async () => {
    if (!copy) {
      toast.error('Generera innehåll först.');
      return;
    }
    setSavingDraft(true);
    const toastId = toast.loading('Sparar utkast…');
    try {
      await addDoc(
        collection(db, 'socialPosts'),
        withShopId(
          {
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: currentUser?.uid || null,
            description: description.trim(),
            tone,
            includeTags,
            channels: CHANNELS.map((c) => c.key),
            copy,
            assets: selectedAssets.map((a) => ({ path: a.path, name: a.name, type: a.type })),
            video: video
              ? {
                  path: video.path,
                  url: video.url,
                  durationSec: video.durationSec ?? null,
                  renderedAt: Timestamp.fromDate(video.renderedAt),
                }
              : null,
            status: 'draft',
            scheduledAt: localInputToTs(scheduleInput),
          },
          shopId
        )
      );
      toast.success('Utkast sparat.', { id: toastId });
      setScheduleInput('');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Kunde inte spara utkastet.', { id: toastId });
    } finally {
      setSavingDraft(false);
    }
  };

  // ── Planner actions ──
  const handleDeletePost = async (post) => {
    if (!window.confirm('Radera detta utkast?')) return;
    const toastId = toast.loading('Raderar…');
    try {
      await deleteDoc(doc(db, 'socialPosts', post.id));
      toast.success('Utkast raderat.', { id: toastId });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Kunde inte radera utkastet.', { id: toastId });
    }
  };

  const handleSaveSchedule = async (post, inputValue) => {
    try {
      await updateDoc(doc(db, 'socialPosts', post.id), {
        scheduledAt: localInputToTs(inputValue),
        updatedAt: serverTimestamp(),
      });
      toast.success('Schemaläggning sparad.');
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error('Kunde inte spara schemaläggningen.');
    }
  };

  // While the feature flags are still loading, show nothing rather than
  // flashing the "not activated" card at admins of enabled shops.
  if (featuresLoading && !isPlatform) {
    return (
      <AppLayout>
        <Page title="Innehållsstudio" subtitle="AI-studio för sociala medier.">
          <Card padded>
            <p className="py-8 text-center text-[13px] text-admin-text-muted">Laddar…</p>
          </Card>
        </Page>
      </AppLayout>
    );
  }

  // ── Not-activated card (deep-link case) ──
  if (!featureOn) {
    return (
      <AppLayout>
        <Page title="Innehållsstudio" subtitle="AI-studio för sociala medier.">
          <Card padded>
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <SparklesIcon className="h-8 w-8 text-admin-text-faint" aria-hidden="true" />
              <p className="text-[14px] font-semibold text-admin-text">
                Tillägget är inte aktiverat för din butik.
              </p>
              <p className="max-w-md text-[13px] text-admin-text-muted">
                Innehållsstudion är ett tillägg som aktiveras per butik. Kontakta plattformen om
                du vill börja skapa AI-genererade inlägg och videor för sociala medier.
              </p>
            </div>
          </Card>
        </Page>
      </AppLayout>
    );
  }

  const activeCopy = copy?.[activeChannel];

  return (
    <AppLayout>
      <Page
        title="Innehållsstudio"
        subtitle="Ladda upp råmaterial, låt AI skriva färdiga inlägg för TikTok, Reels och Shorts och klipp ihop en vertikal video – i takt med musiken."
      >
        <div className="space-y-5">
          {/* ── 1. Material ── */}
          <CardSection
            title="Material"
            actions={
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,image/*,audio/*"
                  multiple
                  className="hidden"
                  onChange={handleFilesChosen}
                />
                <Button
                  variant="primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Laddar upp…' : 'Ladda upp filer'}
                </Button>
              </>
            }
          >
            <p className="mb-3 text-[13px] text-admin-text-muted">
              Video, bilder och ljud (max {MAX_FILE_MB} MB per fil). Klicka på en fil för att välja
              den till ditt inlägg – <strong>ordningen du klickar i blir klippordningen i videon</strong>.
            </p>

            {uploading && uploadNote && (
              <div className="mb-3 rounded-md bg-sky-50 border-l-4 border-sky-400 p-3 text-[13px] text-sky-700">
                {uploadNote}
              </div>
            )}
            {uploadError && (
              <div className="mb-3 rounded-md bg-red-50 border-l-4 border-red-400 p-3 text-[13px] text-red-700">
                {uploadError}
              </div>
            )}

            {assetsLoading ? (
              <div className="py-8 text-center text-[13px] text-admin-text-muted">
                Hämtar bibliotek…
              </div>
            ) : assets.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-admin-text-muted">
                Inget material ännu. Ladda upp dina första klipp, bilder eller låtar.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {assets.map((asset) => {
                  const orderIdx = selected.indexOf(asset.path);
                  const isSelected = orderIdx !== -1;
                  const TypeIcon =
                    asset.type === 'image' ? PhotoIcon : asset.type === 'audio' ? MusicalNoteIcon : FilmIcon;
                  return (
                    <div
                      key={asset.path}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleSelect(asset.path)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleSelect(asset.path);
                        }
                      }}
                      className={`group relative cursor-pointer overflow-hidden rounded-[var(--radius-admin-el)] border transition-colors ${
                        isSelected
                          ? 'border-[var(--color-admin-primary)] ring-2 ring-[var(--color-admin-primary)]'
                          : 'border-admin-border hover:border-admin-text-faint'
                      }`}
                      title={asset.name}
                    >
                      <div className="flex h-24 items-center justify-center bg-admin-surface-2">
                        {asset.type === 'image' && asset.url ? (
                          <img src={asset.url} alt={asset.name} className="h-full w-full object-cover" />
                        ) : (
                          <TypeIcon className="h-8 w-8 text-admin-text-faint" aria-hidden="true" />
                        )}
                      </div>
                      {isSelected && (
                        <span className="absolute left-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-[var(--color-admin-primary)] text-[12px] font-semibold text-white shadow">
                          {orderIdx + 1}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAsset(asset);
                        }}
                        title="Radera fil"
                        aria-label={`Radera ${asset.name}`}
                        className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-admin-surface/90 text-admin-text-faint opacity-0 shadow transition-opacity hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                      <div className="flex items-center gap-1 border-t border-admin-border bg-admin-surface px-2 py-1">
                        <TypeIcon className="h-3.5 w-3.5 shrink-0 text-admin-text-faint" aria-hidden="true" />
                        <span className="truncate text-[11px] text-admin-text-muted">{asset.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {selected.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-admin-text-muted">
                <span>
                  {selected.length} {selected.length === 1 ? 'fil vald' : 'filer valda'}
                  {selectedAudio.length > 0 && ' (ljudfilen används som musik i videon)'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="text-[13px] font-medium text-admin-text underline-offset-2 hover:underline"
                >
                  Rensa val
                </button>
              </div>
            )}
          </CardSection>

          {/* ── 2. Skapa inlägg ── */}
          <CardSection title="Skapa inlägg">
            <div className="space-y-4">
              <Field
                label="Beskrivning"
                htmlFor="cs-description"
                help="Ju mer känsla och detaljer, desto bättre inlägg."
              >
                <Textarea
                  id="cs-description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Beskriv materialet/känslan – t.ex. 'Livespelning på Vi älskar 90-talet, publiken sjöng med i Dum Da Dum'"
                />
              </Field>

              {/* Tonfall */}
              <div>
                <span className="mb-1 block text-[13px] font-medium text-admin-text">Tonfall</span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {TONES.map((t) => (
                    <label
                      key={t.value}
                      className={`flex cursor-pointer items-start gap-2 rounded-[var(--radius-admin-el)] border p-3 transition-colors ${
                        tone === t.value
                          ? 'border-[var(--color-admin-primary)] bg-admin-surface-2'
                          : 'border-admin-border hover:bg-admin-surface-2'
                      }`}
                    >
                      <input
                        type="radio"
                        name="cs-tone"
                        value={t.value}
                        checked={tone === t.value}
                        onChange={() => setTone(t.value)}
                        className="mt-0.5 h-4 w-4"
                      />
                      <span>
                        <span className="block text-[13px] font-medium text-admin-text">{t.label}</span>
                        <span className="block text-[12px] text-admin-text-muted">{t.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Egna hashtags */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeTags}
                    onChange={(e) => setIncludeTags(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-[13px] text-admin-text">Egna hashtags</span>
                </label>
                {includeTags && (
                  <Field help="Kommaseparerade, t.ex. #MelodieMC, #DumDaDum. Sparas till nästa gång.">
                    <Input
                      value={artistTags}
                      onChange={(e) => persistArtistTags(e.target.value)}
                      placeholder="#MinArtist, #MinLåt"
                    />
                  </Field>
                )}
              </div>

              {/* Video settings */}
              <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
                <Field label="Längd" htmlFor="cs-length">
                  <Select
                    id="cs-length"
                    value={String(targetSec)}
                    onChange={(e) => setTargetSec(Number(e.target.value))}
                  >
                    <option value="15">15 sekunder</option>
                    <option value="30">30 sekunder</option>
                  </Select>
                </Field>
                <Field label="BPM" htmlFor="cs-bpm" help="Klipprytm – cuts i takt med musiken.">
                  <Input
                    id="cs-bpm"
                    type="number"
                    min="40"
                    max="300"
                    value={bpm}
                    onChange={(e) => setBpm(e.target.value)}
                  />
                </Field>
              </div>

              {generateError && (
                <div className="rounded-md bg-red-50 border-l-4 border-red-400 p-3 text-[13px] text-red-700">
                  {generateError}
                </div>
              )}

              <div>
                <Button variant="primary" onClick={handleGenerate} disabled={generating}>
                  {generating ? 'Genererar…' : '✨ Generera innehåll'}
                </Button>
              </div>

              {/* Results */}
              {copy && (
                <div className="space-y-4 border-t border-admin-border pt-4">
                  {/* Channel tabs */}
                  <div className="flex gap-1 rounded-[var(--radius-admin-el)] bg-admin-surface-2 p-1 sm:max-w-xs">
                    {CHANNELS.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setActiveChannel(c.key)}
                        className={`flex-1 rounded-[var(--radius-admin-el)] px-3 py-1.5 text-[13px] transition-colors ${
                          activeChannel === c.key
                            ? 'bg-admin-surface font-semibold text-admin-text shadow-sm'
                            : 'font-medium text-admin-text-muted hover:text-admin-text'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_260px]">
                    {/* Copy for the active channel */}
                    <div className="space-y-3">
                      {activeCopy ? (
                        <>
                          <p className="text-[14px] font-semibold text-admin-text">{activeCopy.hook}</p>
                          <p className="whitespace-pre-wrap text-[13px] text-admin-text">
                            {activeCopy.caption}
                          </p>
                          {Array.isArray(activeCopy.hashtags) && activeCopy.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {activeCopy.hashtags.map((tag, i) => (
                                <span
                                  key={`${tag}-${i}`}
                                  className="rounded-full bg-admin-surface-2 px-2 py-0.5 text-[12px] text-admin-text-muted"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <Button
                            variant="secondary"
                            onClick={() =>
                              copyToClipboard(
                                channelText(copy, activeChannel),
                                `${CHANNELS.find((c) => c.key === activeChannel)?.label}-texten kopierad!`
                              )
                            }
                          >
                            <DocumentDuplicateIcon className="mr-1 h-4 w-4" aria-hidden="true" />
                            Kopiera
                          </Button>
                        </>
                      ) : (
                        <p className="text-[13px] text-admin-text-muted">
                          Inget innehåll för denna kanal.
                        </p>
                      )}
                    </div>

                    {/* Phone-frame preview (neutral, 9:16) */}
                    <div className="mx-auto w-full max-w-[220px]">
                      <div className="relative aspect-[9/16] overflow-hidden rounded-[20px] border border-admin-border bg-gradient-to-b from-gray-200 via-gray-300 to-gray-400 shadow-[var(--shadow-admin)]">
                        <div className="absolute inset-x-0 top-0 flex justify-center pt-2">
                          <span className="h-1 w-10 rounded-full bg-black/20" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                          <p className="text-center text-[13px] font-semibold leading-snug text-gray-800">
                            {activeCopy?.hook || ''}
                          </p>
                        </div>
                        {activeCopy?.caption && (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent p-3 pt-8">
                            <p className="line-clamp-3 text-[11px] leading-snug text-white">
                              {activeCopy.caption}
                            </p>
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-center text-[11px] text-admin-text-faint">
                        Förhandsvisning ({CHANNELS.find((c) => c.key === activeChannel)?.label})
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Video */}
              <div className="space-y-3 border-t border-admin-border pt-4">
                {renderError && (
                  <div className="rounded-md bg-red-50 border-l-4 border-red-400 p-3 text-[13px] text-red-700">
                    {renderError}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="secondary"
                    onClick={handleRenderVideo}
                    disabled={rendering || selectedVisual.length === 0}
                    title={
                      selectedVisual.length === 0
                        ? 'Välj minst en bild- eller videofil i biblioteket'
                        : undefined
                    }
                  >
                    {rendering ? 'Klipper…' : '🎬 Skapa video'}
                  </Button>
                  {rendering && (
                    <span className="text-[13px] text-admin-text-muted">
                      Klipper ihop video – tar en stund…
                    </span>
                  )}
                  {!rendering && selectedVisual.length === 0 && (
                    <span className="text-[13px] text-admin-text-faint">
                      Välj minst en bild eller video under Material.
                    </span>
                  )}
                </div>

                {video && (
                  <div className="space-y-2">
                    <div className="rounded-md bg-emerald-50 border-l-4 border-emerald-400 p-3 text-[13px] text-emerald-700">
                      Videon är klar{video.durationSec ? ` (${video.durationSec} s)` : ''}.
                    </div>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video
                      controls
                      src={video.url}
                      className="max-h-[480px] rounded-[var(--radius-admin-el)] border border-admin-border bg-black [aspect-ratio:9/16]"
                    />
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="inline-flex items-center gap-1 text-[13px] font-medium text-admin-text underline-offset-2 hover:underline"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                      Ladda ner
                    </a>
                  </div>
                )}
              </div>

              {/* Save as draft */}
              <div className="flex flex-wrap items-end gap-3 border-t border-admin-border pt-4">
                <Field
                  label="Schemalägg (valfritt)"
                  htmlFor="cs-schedule"
                  className="w-full sm:w-60"
                >
                  <Input
                    id="cs-schedule"
                    type="datetime-local"
                    value={scheduleInput}
                    onChange={(e) => setScheduleInput(e.target.value)}
                  />
                </Field>
                <Button
                  variant="primary"
                  onClick={handleSaveDraft}
                  disabled={savingDraft || !copy}
                  title={!copy ? 'Generera innehåll först' : undefined}
                >
                  {savingDraft ? 'Sparar…' : 'Spara som utkast'}
                </Button>
              </div>
            </div>
          </CardSection>

          {/* ── 3. Planner ── */}
          <CardSection title="Planner">
            {postsLoading ? (
              <div className="py-8 text-center text-[13px] text-admin-text-muted">
                Hämtar utkast…
              </div>
            ) : posts.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-admin-text-muted">
                Inga sparade utkast ännu. Generera ett inlägg ovan och spara det som utkast.
              </div>
            ) : (
              <div className="divide-y divide-admin-border">
                {posts.map((post) => (
                  <PlannerRow
                    key={post.id}
                    post={post}
                    onDelete={() => handleDeletePost(post)}
                    onSaveSchedule={(value) => handleSaveSchedule(post, value)}
                  />
                ))}
              </div>
            )}
            <div className="mt-3 border-t border-admin-border pt-3 text-[13px] text-admin-text-muted">
              Totalt sparade: {posts.length}
            </div>
          </CardSection>
        </div>
      </Page>
    </AppLayout>
  );
};

/**
 * PlannerRow — one saved draft. Owns its inline datetime-local edit state so a
 * live onSnapshot refresh doesn't stomp on unrelated rows being edited.
 */
const PlannerRow = ({ post, onDelete, onSaveSchedule }) => {
  const savedValue = tsToLocalInput(post.scheduledAt);
  const [scheduleValue, setScheduleValue] = useState(savedValue);

  // Re-sync when the doc changes remotely (e.g. saved from another tab).
  useEffect(() => {
    setScheduleValue(savedValue);
  }, [savedValue]);

  const dirty = scheduleValue !== savedValue;
  const tone = toneMeta(post.tone);
  const desc = post.description || '(ingen beskrivning)';

  return (
    <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-admin-text" title={desc}>
            {desc.length > 90 ? `${desc.slice(0, 90)}…` : desc}
          </p>
          <p className="mt-0.5 text-[12px] text-admin-text-muted">
            Skapad {fmtDateTime(post.createdAt) || '–'}
            {post.scheduledAt && ` · Schemalagd ${fmtDateTime(post.scheduledAt)}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusPill tone="neutral">{tone.label}</StatusPill>
          {post.video?.url && (
            <a
              href={post.video.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Öppna video"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-admin-el)] text-admin-text-faint hover:bg-admin-surface-2 hover:text-admin-text"
            >
              <PlayIcon className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
          <button
            type="button"
            onClick={onDelete}
            title="Radera utkast"
            aria-label="Radera utkast"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-admin-el)] text-admin-text-faint hover:bg-admin-surface-2 hover:text-red-600"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Per-channel copy buttons */}
        {CHANNELS.map((c) =>
          post.copy?.[c.key] ? (
            <button
              key={c.key}
              type="button"
              onClick={() => copyToClipboard(channelText(post.copy, c.key), `${c.label}-texten kopierad!`)}
              className="inline-flex items-center gap-1 rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface px-2 py-1 text-[12px] font-medium text-admin-text hover:bg-admin-surface-2"
            >
              <DocumentDuplicateIcon className="h-3.5 w-3.5 text-admin-text-faint" aria-hidden="true" />
              {c.label}
            </button>
          ) : null
        )}

        {/* Inline schedule edit */}
        <div className="ml-auto flex items-center gap-2">
          <div className="w-52">
            <Input
              type="datetime-local"
              value={scheduleValue}
              onChange={(e) => setScheduleValue(e.target.value)}
              aria-label="Schemalagd tid"
            />
          </div>
          {dirty && (
            <Button variant="secondary" onClick={() => onSaveSchedule(scheduleValue)}>
              Spara
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminContentStudio;
