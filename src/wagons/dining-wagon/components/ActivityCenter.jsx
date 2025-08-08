import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '../../../components/layout/AppLayout';
import {
  ArrowLeftIcon,
  ChartBarIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  PlusIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import {
  PhoneIcon as PhoneSolid,
  EnvelopeIcon as EnvelopeSolid,
  DevicePhoneMobileIcon as DevicePhoneMobileSolid,
  CalendarDaysIcon as CalendarDaysSolid,
  DocumentTextIcon as DocumentTextSolid
} from '@heroicons/react/24/solid';
import { useDiningActivities } from '../hooks/useDiningActivities';
import { useDiningContacts } from '../hooks/useDiningContacts';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { toJsDate } from '../utils/dateUtils';
import { parseSwedishWeekdays, analyzeTextForTags } from '../utils/smartTagging';
import { createMentionNotifications } from '../utils/mentionUtils';

const ActivityCenter = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedContactId = searchParams.get('contact') || '';

  const { currentUser, userData, isAdmin, getAllUsers } = useAuth();
  const { activities, addActivity, updateActivity, deleteActivity, loading } = useDiningActivities();
  const { contacts } = useDiningContacts();

  // Reuse the same activity type mapping used in ContactDetail (Heroicons, Swedish labels)
  const activityTypeOptions = [
    { value: 'call', label: 'Telefonsamtal', icon: PhoneSolid, color: 'text-blue-600 dark:text-blue-400' },
    { value: 'email', label: 'E-post', icon: EnvelopeSolid, color: 'text-green-600 dark:text-green-400' },
    { value: 'text', label: 'SMS/Text', icon: DevicePhoneMobileSolid, color: 'text-purple-600' },
    { value: 'meeting', label: 'Möte', icon: CalendarDaysSolid, color: 'text-orange-600 dark:text-orange-400' },
    { value: 'note', label: 'Anteckning', icon: DocumentTextSolid, color: 'text-gray-600 dark:text-gray-400' }
  ];

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [contactFilter, setContactFilter] = useState(preselectedContactId || 'all');
  const [responsibleFilter, setResponsibleFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [newActivity, setNewActivity] = useState({
    contactId: preselectedContactId || '',
    type: 'call',
    subject: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editBuffer, setEditBuffer] = useState({ subject: '', description: '' });
  const [tagInput, setTagInput] = useState('');
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);

  React.useEffect(() => {
    const loadAdmins = async () => {
      try {
        if (!isAdmin || !getAllUsers) return;
        const all = await getAllUsers();
        const admins = (all || []).filter(u => u.role === 'admin').map(u => ({
          userId: u.id,
          fullName: u.contactPerson || u.companyName || u.email
        }));
        setAdminUsers(admins);
      } catch (e) {
        console.warn('Failed loading admin users', e);
      }
    };
    loadAdmins();
  }, [isAdmin, getAllUsers]);

  // Auto-suggest tags from subject/description without needing to focus the tag field
  React.useEffect(() => {
    const suggestions = new Set([
      ...analyzeTextForTags(`${newActivity.subject} ${newActivity.description}`),
      ...parseSwedishWeekdays(`${newActivity.subject} ${newActivity.description}`)
    ]);
    setSuggestedTags(Array.from(suggestions).filter(t => !selectedTags.includes(t)));
  }, [newActivity.subject, newActivity.description, selectedTags]);

  const distinctResponsibles = useMemo(() => {
    const names = new Set();
    (activities || []).forEach(a => {
      const name = a.createdByName || a.createdBy || 'Okänd';
      names.add(String(name));
    });
    return Array.from(names);
  }, [activities]);

  const filteredActivities = useMemo(() => {
    let list = Array.isArray(activities) ? activities.slice() : [];

    // Contact filter
    if (contactFilter !== 'all' && contactFilter) {
      list = list.filter(a => a.contactId === contactFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      list = list.filter(a => (a.type || 'other') === typeFilter);
    }

    // Responsible filter
    if (responsibleFilter !== 'all') {
      list = list.filter(a => (a.createdByName || a.createdBy || '') === responsibleFilter);
    }

    // Date range filter
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
    if (fromDate || toDate) {
      list = list.filter(a => {
        const d = toJsDate(a.createdAt);
        if (!d) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });
    }

    // Text query (subject/description/tags)
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(a => {
        const subject = String(a.subject || '').toLowerCase();
        const description = String(a.description || '').toLowerCase();
        const tags = (a.tags || []).join(' ').toLowerCase();
        const contactName = String(a.contactName || '').toLowerCase();
        return (
          subject.includes(q) || description.includes(q) || tags.includes(q) || contactName.includes(q)
        );
      });
    }

    // Sort by createdAt desc
    list.sort((a, b) => {
      const da = toJsDate(a.createdAt) || new Date(0);
      const db = toJsDate(b.createdAt) || new Date(0);
      return db - da;
    });

    return list;
  }, [activities, contactFilter, typeFilter, responsibleFilter, dateFrom, dateTo, query]);

  const getTypeMeta = (type) => activityTypeOptions.find(t => t.value === type) || null;

  const handleSaveNew = async (e) => {
    e?.preventDefault?.();
    if (!newActivity.contactId || !newActivity.subject.trim()) {
      toast.error('Fyll i kontakt och sammanfattning');
      return;
    }
    setSaving(true);
    try {
      const contact = contacts.find(c => c.id === newActivity.contactId);
      const autoTags = new Set([
        ...analyzeTextForTags(`${newActivity.subject} ${newActivity.description}`),
        ...parseSwedishWeekdays(`${newActivity.subject} ${newActivity.description}`),
        ...selectedTags
      ]);
      const payload = {
        contactId: newActivity.contactId,
        contactName: contact?.companyName || 'Okänd gäst',
        type: newActivity.type,
        subject: newActivity.subject.trim(),
        description: newActivity.description.trim(),
        tags: Array.from(autoTags),
        createdAt: new Date(),
        createdBy: currentUser?.uid || 'unknown',
        createdByName: userData?.contactPerson || currentUser?.displayName || currentUser?.email || 'Okänd användare'
      };
      const activityId = await addActivity(payload);

      // Mentions
      const combinedText = `${payload.subject} ${payload.description}`.trim();
      if (isAdmin && adminUsers.length > 0) {
        await createMentionNotifications({
          activityId,
          text: combinedText,
          adminUsers,
          contactId: payload.contactId,
          contactName: payload.contactName,
          mentionedByUid: currentUser?.uid || 'unknown',
          mentionedByName: payload.createdByName
        });
      }

      setNewActivity({ contactId: preselectedContactId || '', type: 'call', subject: '', description: '' });
      setSelectedTags([]);
      setTagInput('');
      setShowAdd(false);
      toast.success('Aktivitet registrerad');
    } catch (err) {
      console.error(err);
      toast.error('Kunde inte spara aktiviteten');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setEditBuffer({ subject: a.subject || '', description: a.description || '' });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditBuffer({ subject: '', description: '' });
  };
  const saveEdit = async (id) => {
    if (!editBuffer.subject.trim()) {
      toast.error('Sammanfattning saknas');
      return;
    }
    try {
      await updateActivity(id, { subject: editBuffer.subject.trim(), description: editBuffer.description.trim() });
      toast.success('Aktivitet uppdaterad');
      cancelEdit();
    } catch (e) {
      console.error(e);
      toast.error('Kunde inte uppdatera aktiviteten');
    }
  };

  const dismissActivity = async (id) => {
    try {
      const ref = doc(db, 'activities', id);
      await updateDoc(ref, {
        dismissed: true,
        dismissedAt: new Date(),
        dismissedBy: currentUser?.uid || 'unknown',
        dismissedByName: userData?.contactPerson || currentUser?.displayName || currentUser?.email || 'Okänd användare'
      });
      toast.success('Aktivitet löst');
    } catch (e) {
      console.error(e);
      toast.error('Kunde inte markera som löst');
    }
  };

  const removeActivity = async (id) => {
    if (!window.confirm('Ta bort aktivitet?')) return;
    try {
      await deleteActivity(id);
      toast.success('Aktivitet borttagen');
    } catch (e) {
      console.error(e);
      toast.error('Kunde inte ta bort aktiviteten');
    }
  };

  const openContact = (a) => {
    navigate(`/admin/dining/contacts/${a.contactId}?highlight=${a.id}`);
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                to="/admin/dining"
                className="mr-4 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </Link>
              <div className="flex items-center">
                <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-xl mr-4">
                  <ChartBarIcon className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">Aktivitetscenter</h1>
                  <p className="text-gray-600 dark:text-gray-400">All historik på ett ställe</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAdd(s => !s)}
              className="inline-flex items-center px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" /> Ny aktivitet
            </button>
          </div>
        </div>

        {/* Quick Add */}
        {showAdd && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6 border border-gray-100 dark:border-gray-700">
            <form onSubmit={handleSaveNew} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kontakt</label>
                <select
                  value={newActivity.contactId}
                  onChange={(e) => setNewActivity(v => ({ ...v, contactId: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Välj kontakt…</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-12">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Taggar</label>
                <div className="flex flex-wrap gap-1 mb-1">
                  {selectedTags.map(tag => (
                    <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">#{tag}</span>
                  ))}
                </div>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTagInput(val);
                    const suggestions = new Set([
                      ...analyzeTextForTags(`${newActivity.subject} ${newActivity.description} ${val}`),
                      ...parseSwedishWeekdays(`${newActivity.subject} ${newActivity.description} ${val}`)
                    ]);
                    setSuggestedTags(Array.from(suggestions).filter(t => !selectedTags.includes(t)));
                  }}
                  placeholder="Lägg till taggar, t.ex. akut, ringabak…"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                {suggestedTags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {suggestedTags.slice(0, 6).map(t => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => {
                          setSelectedTags(prev => [...prev, t]);
                          setSuggestedTags(s => s.filter(x => x !== t));
                        }}
                        className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800"
                        title="Lägg till tagg"
                      >
                        + #{t}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSelectedTags(prev => Array.from(new Set([...prev, ...suggestedTags])))}
                      className="ml-2 px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800"
                    >
                      Lägg till alla
                    </button>
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Typ</label>
                <select
                  value={newActivity.type}
                  onChange={(e) => setNewActivity(v => ({ ...v, type: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {activityTypeOptions.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sammanfattning</label>
                <input
                  type="text"
                  value={newActivity.subject}
                  onChange={(e) => setNewActivity(v => ({ ...v, subject: e.target.value }))}
                  placeholder="T.ex. Ringde om leverans"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="md:col-span-12">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Beskrivning (valfritt)</label>
                <textarea
                  rows={2}
                  value={newActivity.description}
                  onChange={(e) => setNewActivity(v => ({ ...v, description: e.target.value }))}
                  placeholder="Detaljer…"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-60"
                >
                  {saving ? 'Sparar…' : 'Spara'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6 border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Sök i aktiviteter…"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <button
                onClick={() => setFiltersOpen(o => !o)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <FunnelIcon className="h-5 w-5 mr-1" /> Filter
              </button>
            </div>
          </div>

          {filtersOpen && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Kontakt</label>
                <select
                  value={contactFilter}
                  onChange={(e) => setContactFilter(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">Alla</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Typ</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">Alla</option>
                  {activityTypeOptions.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Ansvarig</label>
                <select
                  value={responsibleFilter}
                  onChange={(e) => setResponsibleFilter(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">Alla</option>
                  {distinctResponsibles.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Från</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Till</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          )}
        </div>

        {/* Activity list */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Laddar aktiviteter…</div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-12 text-center text-gray-500">Inga aktiviteter matchar dina filter</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredActivities.map((a) => {
                const meta = getTypeMeta(a.type);
                const Icon = meta?.icon;
                const created = toJsDate(a.createdAt);
                const dismissed = a.dismissed === true;
                return (
                  <li key={a.id} className={`p-4 ${dismissed ? 'bg-gray-50 dark:bg-gray-700' : ''}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`mt-0.5 ${meta?.color || 'text-gray-600'}`}>{Icon ? <Icon className="h-5 w-5" /> : <ClockIcon className="h-5 w-5" />}</div>
                        <div className="min-w-0">
                          {editingId === a.id ? (
                            <div className="space-y-2">
                              <input
                                value={editBuffer.subject}
                                onChange={(e) => setEditBuffer(v => ({ ...v, subject: e.target.value }))}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              />
                              <textarea
                                value={editBuffer.description}
                                onChange={(e) => setEditBuffer(v => ({ ...v, description: e.target.value }))}
                                rows={2}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                              />
                              <div className="flex gap-2">
                                <button onClick={() => saveEdit(a.id)} className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded">Spara</button>
                                <button onClick={cancelEdit} className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">Avbryt</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{a.subject || '(utan rubrik)'}</h3>
                                {dismissed && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:text-gray-400">
                                    <CheckIcon className="h-3 w-3 mr-1" /> Löst
                                  </span>
                                )}
                              </div>
                              {a.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 break-words">{a.description}</p>
                              )}
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="inline-flex items-center"><UserIcon className="h-3 w-3 mr-1" />{a.createdByName || a.createdBy || 'Okänd'}</span>
                                {a.contactName && (
                                  <button onClick={() => openContact(a)} className="underline hover:text-gray-700">{a.contactName}</button>
                                )}
                                {created && <span>{created.toLocaleString('sv-SE')}</span>}
                                {(Array.isArray(a.tags) ? a.tags : []).filter(t => !String(t).startsWith('@')).map((t) => (
                                  <span key={t} className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">#{t}</span>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {editingId === a.id ? null : (
                          <>
                            {!dismissed && (
                              <button onClick={() => setEditingId(a.id) || startEdit(a)} title="Redigera" className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded">
                                <PencilIcon className="h-4 w-4" />
                              </button>
                            )}
                            {!dismissed && (
                              <button onClick={() => dismissActivity(a.id)} title="Markera som löst" className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                                <CheckIcon className="h-4 w-4" />
                              </button>
                            )}
                            <button onClick={() => removeActivity(a.id)} title="Ta bort" className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded">
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ActivityCenter;