// PlatformLeads — landing-page sales leads (prospective merchants). PLATFORM-
// level collection (no shopId): docs are created ONLY by the submitLead Cloud
// Function; here the operator reads them and tracks follow-up via an inline
// status select (the only client-writable field — firestore.rules enforces a
// status-only update). (docs/PLATFORM_ARCHITECTURE.md)
import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import PlatformLayout from '../../components/platform/PlatformLayout';
import toast from 'react-hot-toast';
import { InboxIcon } from '@heroicons/react/24/outline';

// Follow-up pipeline. Values are stored verbatim in leads/{id}.status and are
// the ONLY values firestore.rules accepts on update — keep the two in sync.
const STATUSES = [
  { value: 'new', label: 'Ny' },
  { value: 'contacted', label: 'Kontaktad' },
  { value: 'won', label: 'Vunnen' },
  { value: 'lost', label: 'Förlorad' },
];

const PlatformLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);
      // Single orderBy on one collection — no composite index needed.
      const snap = await getDocs(query(collection(db, 'leads'), orderBy('createdAt', 'desc')));
      setLeads(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Error loading leads:', e);
      toast.error('Kunde inte ladda leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const setStatus = async (lead, status) => {
    try {
      setSavingId(lead.id);
      // Status-only write: firestore.rules rejects any other field change.
      await updateDoc(doc(db, 'leads', lead.id), { status });
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status } : l)));
      toast.success('Status uppdaterad');
    } catch (e) {
      console.error('Error updating lead status:', e);
      toast.error('Kunde inte ändra status');
    } finally {
      setSavingId(null);
    }
  };

  const formatDate = (ts) =>
    ts?.toDate ? ts.toDate().toLocaleDateString('sv-SE') : '–';

  return (
    <PlatformLayout>
      <div className="px-6 lg:px-10 py-8 max-w-[1600px]">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Leads</h1>
            <p className="text-gray-400 mt-1">Förfrågningar från landningssidan.</p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-500">Laddar…</div>
        ) : leads.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <InboxIcon className="h-10 w-10 mx-auto mb-3 text-gray-700" />
            Inga leads ännu
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-gray-900">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Namn</th>
                  <th className="px-4 py-3">Företag</th>
                  <th className="px-4 py-3">E-post</th>
                  <th className="px-4 py-3">Meddelande</th>
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-white">{lead.name || '–'}</td>
                    <td className="px-4 py-3 text-gray-300">{lead.company || '–'}</td>
                    <td className="px-4 py-3">
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`} className="text-indigo-300 hover:text-indigo-200">
                          {lead.email}
                        </a>
                      ) : (
                        <span className="text-gray-500">–</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      <div className="max-w-md truncate" title={lead.message || ''}>
                        {lead.message || '–'}
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-300 whitespace-nowrap">
                      {formatDate(lead.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status || 'new'}
                        onChange={(e) => setStatus(lead, e.target.value)}
                        disabled={savingId === lead.id}
                        className="rounded-lg border border-white/10 bg-gray-950 px-2 py-1 text-xs text-gray-100 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                      >
                        {STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PlatformLayout>
  );
};

export default PlatformLeads;
