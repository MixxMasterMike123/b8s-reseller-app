import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import AppLayout from '../../components/layout/AppLayout';
import { useShopId } from '../../contexts/ShopContext';
import {
  Page,
  MetricsBar,
  DataTable,
  StatusPill,
  Button,
} from '../../components/admin/ui';

// Status filter options.
const FILTERS = [
  { key: 'all', label: 'Alla' },
  { key: 'approved', label: 'Publicerade' },
  { key: 'pending', label: 'Väntande' },
  { key: 'rejected', label: 'Avpublicerade' },
];

const statusTone = (s) =>
  s === 'approved' ? 'success' : s === 'pending' ? 'warning' : 'neutral';
const statusLabel = (s) =>
  s === 'approved' ? 'Publicerad' : s === 'pending' ? 'Väntande' : 'Avpublicerad';

const Stars = ({ rating }) => {
  const r = Math.round(Number(rating) || 0);
  return (
    <span className="text-[13px] leading-none" aria-label={`${r} av 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= r ? 'text-amber-500' : 'text-admin-text-faint'}>★</span>
      ))}
    </span>
  );
};

const fmtDate = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : ts instanceof Date ? ts : null;
  if (!d) return '';
  return d.toLocaleDateString('sv-SE');
};

const productName = (p) => {
  if (!p) return '';
  return typeof p.name === 'string' ? p.name : p.name?.['sv-SE'] || p.sku || 'Produkt';
};

const AdminReviews = () => {
  const shopId = useShopId();
  const [reviews, setReviews] = useState([]);
  const [productsById, setProductsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const rQuery = query(
        collection(db, 'productReviews'),
        where('shopId', '==', shopId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(rQuery);
      setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // Resolve product names once (same pattern as AdminDiscountCodes).
      const pQuery = query(collection(db, 'products'), where('shopId', '==', shopId));
      const pSnap = await getDocs(pQuery);
      const map = {};
      pSnap.docs.forEach((d) => {
        map[d.id] = { id: d.id, ...d.data() };
      });
      setProductsById(map);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Kunde inte hämta omdömen.');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const approved = reviews.filter((r) => r.status === 'approved');
    const pending = reviews.filter((r) => r.status === 'pending').length;
    const avg = approved.length
      ? (approved.reduce((s, r) => s + (Number(r.rating) || 0), 0) / approved.length).toFixed(1)
      : '—';
    return { total: reviews.length, avg, pending };
  }, [reviews]);

  const metrics = [
    { key: 'total', label: 'Antal omdömen', value: stats.total },
    { key: 'avg', label: 'Snittbetyg', value: stats.avg },
    { key: 'pending', label: 'Väntande', value: stats.pending },
  ];

  const filtered = useMemo(
    () => (filter === 'all' ? reviews : reviews.filter((r) => r.status === filter)),
    [reviews, filter]
  );

  const moderate = async (review, action) => {
    setBusyId(review.id);
    const toastId = toast.loading(action === 'approve' ? 'Godkänner…' : 'Avpublicerar…');
    try {
      const functions = getFunctions(undefined, 'us-central1');
      const moderateReview = httpsCallable(functions, 'moderateReview');
      const res = await moderateReview({ reviewId: review.id, action });
      const nextStatus = res?.data?.status || (action === 'approve' ? 'approved' : 'rejected');
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, status: nextStatus } : r))
      );
      toast.success(action === 'approve' ? 'Omdöme publicerat.' : 'Omdöme avpublicerat.', {
        id: toastId,
      });
    } catch (error) {
      console.error('moderateReview failed:', error);
      toast.error('Kunde inte ändra status.', { id: toastId });
    } finally {
      setBusyId(null);
    }
  };

  const columns = [
    {
      key: 'product',
      header: 'Produkt',
      render: (r) => (
        <span className="text-admin-text">{productName(productsById[r.productId]) || r.productId}</span>
      ),
    },
    {
      key: 'rating',
      header: 'Betyg',
      render: (r) => <Stars rating={r.rating} />,
    },
    {
      key: 'name',
      header: 'Namn',
      render: (r) => <span className="text-admin-text-muted">{r.displayName || 'Anonym'}</span>,
    },
    {
      key: 'text',
      header: 'Omdöme',
      render: (r) => (
        <span className="text-[13px] text-admin-text-muted line-clamp-2 max-w-md block">
          {r.text || <span className="text-admin-text-faint">—</span>}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusPill tone={statusTone(r.status)}>{statusLabel(r.status)}</StatusPill>,
    },
    {
      key: 'date',
      header: 'Datum',
      render: (r) => <span className="text-[12px] text-admin-text-muted">{fmtDate(r.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      className: 'w-44',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          {r.status !== 'approved' && (
            <Button
              variant="secondary"
              onClick={() => moderate(r, 'approve')}
              disabled={busyId === r.id}
            >
              Godkänn
            </Button>
          )}
          {r.status !== 'rejected' && (
            <Button
              variant="secondary"
              onClick={() => moderate(r, 'reject')}
              disabled={busyId === r.id}
            >
              Avpublicera
            </Button>
          )}
        </div>
      ),
    },
  ];

  const filterActions = (
    <div className="flex items-center gap-1.5">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={() => setFilter(f.key)}
          className={`rounded-[var(--radius-admin-el)] px-3 py-1.5 text-[13px] ${
            filter === f.key
              ? 'bg-admin-text text-admin-surface font-semibold'
              : 'text-admin-text-muted hover:bg-admin-surface-2'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );

  return (
    <AppLayout>
      <Page
        title="Recensioner"
        subtitle="Produktomdömen från verifierade köp. Godkända omdömen visas på produktsidan."
        actions={filterActions}
      >
        <div className="space-y-5">
          <MetricsBar metrics={metrics} />

          {/* Legal note: moderation must be even-handed — negative reviews may
              not be selectively hidden (Omnibus / consumer rules). */}
          <div className="rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface-2 px-4 py-3 text-[13px] text-admin-text-muted">
            Enligt lag måste moderering vara enhetlig — negativa omdömen får inte döljas selektivt.
            Avpublicera endast vid regelbrott (olämpligt innehåll).
          </div>

          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(r) => r.id}
            loading={loading}
            empty="Inga omdömen ännu."
          />
        </div>
      </Page>
    </AppLayout>
  );
};

export default AdminReviews;
