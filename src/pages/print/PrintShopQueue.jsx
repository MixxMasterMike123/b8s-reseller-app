// PrintShopQueue — the printer's POD order list. Calls the getPrintQueue CALLABLE
// (NO direct order access); each row links to the production detail. CSV export
// pulls production rows from getPrintQueueExport. Dark print-portal surface.
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase/config';
import PrintShopLayout from '../../components/print/PrintShopLayout';
import { exportPrintQueueToCSV } from '../../utils/podExport';

const fmtDate = (iso) => { try { return iso ? new Date(iso).toLocaleDateString('sv-SE') : ''; } catch { return iso || ''; } };

// Swedish status labels + chip tones for the queue (dark surface). Statuses the
// printer drives (printed/shipped) are highlighted so the queue reads at a glance.
const STATUS_LABEL = {
  pending: 'Väntar',
  confirmed: 'Bekräftad',
  processing: 'Behandlas',
  printed: 'Tryckt',
  shipped: 'Skickad',
  delivered: 'Levererad',
  ready_for_pickup: 'Redo att hämtas',
  cancelled: 'Avbruten',
  refunded: 'Återbetald',
  completed: 'Slutförd',
};
const STATUS_CHIP = {
  printed: 'bg-purple-500/15 text-purple-300',
  shipped: 'bg-emerald-500/15 text-emerald-300',
  delivered: 'bg-emerald-500/15 text-emerald-300',
  completed: 'bg-emerald-500/15 text-emerald-300',
  cancelled: 'bg-red-500/15 text-red-300',
  refunded: 'bg-red-500/15 text-red-300',
};

const PrintShopQueue = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await httpsCallable(functions, 'getPrintQueue')({ sinceDays: 90 });
      setJobs(res.data?.jobs || []);
    } catch (e) {
      console.error('getPrintQueue failed:', e);
      setError(e?.message || 'Kunde inte ladda print-kön.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await httpsCallable(functions, 'getPrintQueueExport')({ sinceDays: 90 });
      const result = exportPrintQueueToCSV(res.data?.rows || []);
      if (!result.success) toast.error(result.message);
      else toast.success(result.message);
    } catch (e) {
      toast.error(e?.message || 'Export misslyckades.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <PrintShopLayout>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Print-kö</h1>
            <p className="text-sm text-gray-400">POD-ordrar för dina tilldelade butiker (senaste 90 dagar).</p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || jobs.length === 0}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200 hover:bg-white/10 disabled:opacity-50"
          >
            {exporting ? 'Exporterar…' : 'Exportera CSV'}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400">Laddar…</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-gray-400">Inga POD-ordrar i kön.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-2.5">Order</th>
                  <th className="px-4 py-2.5">Datum</th>
                  <th className="px-4 py-2.5">Butik</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Rader</th>
                  <th className="px-4 py-2.5">Leverans</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {jobs.map((j) => (
                  <tr key={j.orderId} className="hover:bg-white/5">
                    <td className="px-4 py-2.5 font-medium text-white">{j.orderNumber}</td>
                    <td className="px-4 py-2.5 text-gray-300">{fmtDate(j.orderDate)}</td>
                    <td className="px-4 py-2.5 text-gray-300">{j.shopName}</td>
                    <td className="px-4 py-2.5">
                      {j.status ? (
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_CHIP[j.status] || 'bg-white/10 text-gray-300'}`}>
                          {STATUS_LABEL[j.status] || j.status}
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-300">{j.podLineCount}</td>
                    <td className="px-4 py-2.5 text-gray-400">{[j.shipToCity, j.shipToCountry].filter(Boolean).join(', ')}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link to={`/orders/${j.orderId}`} className="text-indigo-300 hover:text-indigo-200">Öppna →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PrintShopLayout>
  );
};

export default PrintShopQueue;
