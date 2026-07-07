// PlatformModels — the operator console's 3D-MODEL LIBRARY (slice 2 of the model
// library). Lists/creates/edits/deletes pod3dModels docs: platform-owned garment
// photos + displacement maps that feed the studio's 3D-vy (replaces the hardcoded
// DEV_3D_GARMENTS). Platform-only. PLATFORM DARK design (not admin-*).
//
// Reads Firestore DIRECTLY (getDocs) — never the cached loader — so platform edits
// are never stale; every successful write calls clearPod3dModelsCache() so an open
// studio tab reloads fresh. (docs/PLATFORM_ARCHITECTURE.md)
import React, { useCallback, useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import PlatformLayout from '../../components/platform/PlatformLayout';
import ModelCardGrid from '../../components/platform/ModelCardGrid';
import ModelEditor from '../../components/platform/ModelEditor';
import { clearPod3dModelsCache } from '../../config/pod3dModels';
import { deleteModelAssets } from '../../utils/pod3dUpload';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';

const PlatformModels = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null); // model being edited
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'pod3dModels'));
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
      list.sort((a, b) => String(a.label || '').localeCompare(String(b.label || ''), 'sv'));
      setModels(list);
    } catch (e) {
      console.error('Error loading pod3dModels:', e);
      toast.error('Kunde inte ladda modeller');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (model) => {
    const next = model.active === false;
    try {
      setBusyId(model.id);
      await updateDoc(doc(db, 'pod3dModels', model.id), { active: next, updatedAt: serverTimestamp() });
      clearPod3dModelsCache();
      setModels((prev) => prev.map((m) => (m.id === model.id ? { ...m, active: next } : m)));
      toast.success(next ? 'Modell aktiverad' : 'Modell inaktiverad');
    } catch (e) {
      console.error('Error toggling model:', e);
      toast.error('Kunde inte ändra status');
    } finally {
      setBusyId(null);
    }
  };

  const removeModel = async (model) => {
    if (!window.confirm(`Vill du ta bort "${model.label || model.id}"? Alla uppladdade filer raderas.`)) return;
    try {
      setBusyId(model.id);
      await deleteModelAssets(model.id); // best-effort storage sweep (never throws)
      await deleteDoc(doc(db, 'pod3dModels', model.id));
      clearPod3dModelsCache();
      setModels((prev) => prev.filter((m) => m.id !== model.id));
      toast.success('Modell borttagen');
    } catch (e) {
      console.error('Error deleting model:', e);
      toast.error('Kunde inte ta bort modellen');
    } finally {
      setBusyId(null);
    }
  };

  const createModel = async (label) => {
    const created = await addDoc(collection(db, 'pod3dModels'), {
      label: label.trim(),
      scope: 'platform',
      active: true,
      views: { front: { w: null, h: null, printArea: { x: 0, y: 0, w: 0, h: 0 }, colorways: {} } },
      printAreaMm: { front: { w: 300, h: 400 } },
      displacementScale: 30,
      displacementBlur: 6,
      blend: 'multiply',
      alpha: 0.8,
      perColorway: {},
      output: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    clearPod3dModelsCache();
    const newModel = {
      id: created.id,
      label: label.trim(),
      scope: 'platform',
      active: true,
      views: { front: { w: null, h: null, printArea: { x: 0, y: 0, w: 0, h: 0 }, colorways: {} } },
      printAreaMm: { front: { w: 300, h: 400 } },
      displacementScale: 30,
      displacementBlur: 6,
      blend: 'multiply',
      alpha: 0.8,
      perColorway: {},
      output: null,
    };
    setModels((prev) => [...prev, newModel].sort((a, b) =>
      String(a.label || '').localeCompare(String(b.label || ''), 'sv')));
    setShowCreate(false);
    setEditing(newModel); // open editor directly
  };

  return (
    <PlatformLayout>
      <div className="px-6 lg:px-10 py-8 max-w-6xl">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">3D-modeller</h1>
            <p className="text-gray-400 mt-1">
              Plaggfoton med displacement-kartor för 3D-vyn i designstudion. Delas av alla butiker.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Ny modell
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-500">Laddar…</div>
        ) : (
          <ModelCardGrid
            models={models}
            busyId={busyId}
            onEdit={(m) => setEditing(m)}
            onToggleActive={toggleActive}
            onDelete={removeModel}
          />
        )}
      </div>

      {showCreate && (
        <CreateModelModal onClose={() => setShowCreate(false)} onCreate={createModel} />
      )}

      {editing && (
        <ModelEditor
          model={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load(); // re-read so the card reflects the saved edits
          }}
        />
      )}
    </PlatformLayout>
  );
};

// Small create-modal: label only → addDoc with defaults → open editor.
const CreateModelModal = ({ onClose, onCreate }) => {
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!label.trim()) return setError('Ange ett namn på modellen.');
    try {
      setSaving(true);
      await onCreate(label);
    } catch (err) {
      console.error('Create model failed:', err);
      setError('Kunde inte skapa modellen (behörighet?). Försök igen.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-gray-900 border border-white/10 p-6 text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Ny modell</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Namn</label>
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="t.ex. T-shirt på modell"
              className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-indigo-400 focus:outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-gray-200">
              Avbryt
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? 'Skapar…' : 'Skapa modell'}
            </button>
          </div>
        </form>
        <p className="mt-4 text-xs text-gray-600">
          Ladda upp plaggfoto, displacement-karta och kalibrera tryckytan i nästa steg.
        </p>
      </div>
    </div>
  );
};

export default PlatformModels;
