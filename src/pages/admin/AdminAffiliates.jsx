import React, { useState, useEffect, useMemo } from 'react';
import { db, functions } from '../../firebase/config';
import { collection, getDocs, doc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { APP_URLS } from '../../config/urls';
import { useShopId } from '../../contexts/ShopContext';
import {
  Page,
  MetricsBar,
  DataTable,
  StatusPill,
  Button,
} from '../../components/admin/ui';
import {
  PencilIcon,
  BanknotesIcon,
  LinkIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

// Status → StatusPill tone (preserves prior color meaning: yellow→warning,
// green→success, gray→neutral, orange→attention, red→danger) + Swedish label.
const STATUS_TONE = {
  pending: 'warning',
  approved: 'success',
  active: 'success',
  inactive: 'neutral',
  suspended: 'attention',
  denied: 'danger',
};
const STATUS_LABEL = {
  pending: 'Väntar',
  approved: 'Godkänd',
  active: 'Aktiv',
  inactive: 'Inte Aktiv',
  suspended: 'Suspenderad',
  denied: 'Nekad',
};

const AdminAffiliates = () => {
  const shopId = useShopId();
  const [applications, setApplications] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const stats = useMemo(() => {
    if (affiliates.length === 0) {
      return { totalClicks: 0, totalConversions: 0 };
    }
    const totalClicks = affiliates.reduce((acc, aff) => acc + (aff.stats?.clicks || 0), 0);
    const totalConversions = affiliates.reduce((acc, aff) => acc + (aff.stats?.conversions || 0), 0);
    return { totalClicks, totalConversions };
  }, [affiliates]);

  useEffect(() => {
    fetchData();
  }, [shopId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch pending applications
      const appQuery = query(collection(db, 'affiliateApplications'), where('shopId', '==', shopId), where("status", "==", "pending"));
      const appSnapshot = await getDocs(appQuery);
      const apps = appSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setApplications(apps);

      // Fetch all affiliates (including inactive)
      const affiliateQuery = query(collection(db, 'affiliates'), where('shopId', '==', shopId), orderBy('createdAt', 'desc'));
      const affiliateSnapshot = await getDocs(affiliateQuery);
      const affiliateList = affiliateSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAffiliates(affiliateList);

    } catch (error) {
      console.error("Error fetching affiliate data: ", error);
      toast.error('Kunde inte hämta affiliate-data.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (appId) => {
    const toastId = toast.loading('Godkänner affiliate...');
    try {
      const approveAffiliate = httpsCallable(functions, 'approveAffiliate');
      const result = await approveAffiliate({ applicationId: appId });

      if (result.data.success) {
        toast.success(`Affiliate godkänd! Kod: ${result.data.affiliateCode}`, { id: toastId, duration: 5000 });
        fetchData(); // Refresh both lists
      } else {
        throw new Error(result.data.error || 'Okänt fel vid godkännande.');
      }
    } catch (error) {
      console.error("Error approving affiliate: ", error);
      toast.error(`Kunde inte godkänna affiliate: ${error.message}`, { id: toastId });
    }
  };

  const handleDeny = async (appId) => {
    if (!window.confirm('Är du säker på att du vill neka och radera denna ansökan?')) {
      return;
    }
    const toastId = toast.loading('Nekar ansökan...');
    try {
      await deleteDoc(doc(db, 'affiliateApplications', appId));
      toast.success('Ansökan har nekats och raderats.', { id: toastId });
      fetchData(); // Refresh both lists
    } catch (error) {
      console.error("Error denying affiliate: ", error);
      toast.error('Kunde inte neka ansökan.', { id: toastId });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(amount || 0);
  };

  // Thin metrics strip — pending applications · total clicks · total conversions.
  const metrics = [
    { key: 'pending', label: 'Väntande Ansökningar', value: applications.length },
    { key: 'clicks', label: 'Totalt antal klick', value: stats.totalClicks.toLocaleString('sv-SE') },
    { key: 'conversions', label: 'Totala Konverteringar', value: stats.totalConversions.toLocaleString('sv-SE') },
  ];

  // ── Pending applications list ──────────────────────────────────────────────
  const applicationColumns = [
    {
      key: 'name',
      header: 'Namn',
      render: (app) => (
        <span className="font-medium text-admin-text group-hover:underline">{app.name}</span>
      ),
    },
    {
      key: 'email',
      header: 'E-post',
      render: (app) => <span className="text-admin-text-muted">{app.email}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: () => <StatusPill tone="warning">{STATUS_LABEL.pending}</StatusPill>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      className: 'w-28',
      render: (app) => (
        <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
          <Button
            variant="secondary"
            onClick={() => navigate(`/admin/affiliates/application/${app.id}`)}
          >
            Granska
          </Button>
        </div>
      ),
    },
  ];

  // ── All affiliates list ────────────────────────────────────────────────────
  const affiliateColumns = [
    {
      key: 'affiliate',
      header: 'Affiliate',
      render: (affiliate) => (
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-admin-surface-2 text-[11px] font-medium text-admin-text-muted">
            {affiliate.name
              ? affiliate.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
              : 'AF'}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium text-admin-text group-hover:underline">{affiliate.name}</div>
            {affiliate.email && (
              <div className="truncate text-[12px] text-admin-text-faint">{affiliate.email}</div>
            )}
            {affiliate.website && (
              <div
                className="flex items-center gap-1 text-[12px] text-admin-text-muted"
                onClick={(e) => e.stopPropagation()}
              >
                <LinkIcon className="h-3 w-3 shrink-0" />
                <a
                  href={affiliate.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate max-w-[200px] hover:underline"
                >
                  {affiliate.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'code',
      header: 'Kod',
      render: (affiliate) => (
        <span className="rounded-[var(--radius-admin-el)] bg-admin-surface-2 px-2 py-0.5 font-mono text-[12px] text-admin-text">
          {affiliate.affiliateCode}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (affiliate) => (
        <div className="flex flex-col gap-1">
          <StatusPill tone={STATUS_TONE[affiliate.status] || 'neutral'}>
            {STATUS_LABEL[affiliate.status] || affiliate.status}
          </StatusPill>
          <span className="text-[12px] text-admin-text-faint">{affiliate.commissionRate}% provision</span>
          {affiliate.checkoutDiscount > 0 && (
            <span className="text-[12px] text-admin-text-faint">{affiliate.checkoutDiscount}% rabatt</span>
          )}
        </div>
      ),
    },
    {
      key: 'clicks',
      header: 'Besök',
      align: 'right',
      render: (affiliate) => (
        <span className="tabular-nums text-admin-text-muted">
          {(affiliate.stats?.clicks || 0).toLocaleString('sv-SE')}
        </span>
      ),
    },
    {
      key: 'conversions',
      header: 'Konv.',
      align: 'right',
      render: (affiliate) => (
        <span className="tabular-nums text-admin-text-muted">
          {(affiliate.stats?.conversions || 0).toLocaleString('sv-SE')}
        </span>
      ),
    },
    {
      key: 'rate',
      header: 'Konv.grad',
      align: 'right',
      render: (affiliate) => (
        <span className="tabular-nums text-admin-text-muted">
          {affiliate.stats?.clicks
            ? ((affiliate.stats.conversions / affiliate.stats.clicks) * 100).toFixed(1)
            : 0}
          %
        </span>
      ),
    },
    {
      key: 'earnings',
      header: 'Intjäning',
      align: 'right',
      render: (affiliate) => (
        <div className="flex flex-col items-end">
          <span className="font-medium tabular-nums text-admin-text">
            {formatCurrency(affiliate.stats?.totalEarnings)}
          </span>
          {affiliate.stats?.balance > 0 && (
            <span className="text-[12px] tabular-nums text-admin-caution-text">
              {formatCurrency(affiliate.stats?.balance)} obetalt
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      className: 'w-32',
      render: (affiliate) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => navigate(`/admin/affiliates/manage/${affiliate.id}`)}
            title="Hantera affiliate"
            aria-label="Hantera affiliate"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-admin-el)] text-admin-text-faint hover:bg-admin-surface-2 hover:text-admin-text"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          {affiliate.stats?.balance > 0 && (
            <button
              type="button"
              onClick={() => navigate(`/admin/affiliates/payout/${affiliate.id}`)}
              title="Betala ut"
              aria-label="Betala ut"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-admin-el)] text-admin-text-faint hover:bg-admin-surface-2 hover:text-admin-success-text"
            >
              <BanknotesIcon className="h-4 w-4" />
            </button>
          )}
          <a
            href={`${APP_URLS.B2C_SHOP}/${((affiliate.preferredLang || 'sv-SE').split('-')[1] || 'se').toLowerCase()}?ref=${affiliate.affiliateCode}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Testa länk"
            aria-label="Testa länk"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-admin-el)] text-admin-text-faint hover:bg-admin-surface-2 hover:text-admin-text"
          >
            <EyeIcon className="h-4 w-4" />
          </a>
        </div>
      ),
    },
  ];

  const headerActions = (
    <>
      <Button variant="secondary" as={Link} to="/admin/affiliates/analytics">
        Detaljerad Analytics
      </Button>
      <Button variant="primary" as={Link} to="/admin/affiliates/create">
        Lägg till Affiliate
      </Button>
    </>
  );

  return (
    <AppLayout>
      <Page
        title="Affiliate-hantering"
        subtitle="Hantera nya ansökningar och se statistik för dina aktiva affiliates."
        actions={headerActions}
      >
        <div className="space-y-5">
          <MetricsBar metrics={metrics} />

          {/* Pending applications */}
          <div className="space-y-2">
            <h2 className="text-[13px] font-medium text-admin-text-muted">Inkomna Ansökningar</h2>
            <DataTable
              columns={applicationColumns}
              rows={applications}
              rowKey={(a) => a.id}
              loading={loading}
              onRowClick={(a) => navigate(`/admin/affiliates/application/${a.id}`)}
              empty="Inga nya ansökningar."
            />
          </div>

          {/* All affiliates */}
          <div className="space-y-2">
            <h2 className="text-[13px] font-medium text-admin-text-muted">
              Alla Affiliates ({affiliates.length})
            </h2>
            <DataTable
              columns={affiliateColumns}
              rows={affiliates}
              rowKey={(a) => a.id}
              loading={loading}
              onRowClick={(a) => navigate(`/admin/affiliates/manage/${a.id}`)}
              empty="Inga aktiva affiliates hittades."
            />
          </div>
        </div>
      </Page>
    </AppLayout>
  );
};

export default AdminAffiliates;
