// AdminB2BCustomers — the shop-admin surface for the B2B Wholesale add-on.
// Lists THIS shop's b2bCustomers (where shopId == useShopId()) and lets an admin
// ACTIVATE / DEACTIVATE each one (the "awaiting activation" gate the firestore
// rules enforce: a self-registrant is created active:false, only a same-shop
// admin can flip it). Built on the Admin-Neutral ui primitives so it matches the
// rest of the admin (mirrors AdminB2CCustomers). Gated on features.b2b via the
// AddonGate wrapping its route + the AppLayout menu item.
import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import toast from 'react-hot-toast';
import AppLayout from '../../components/layout/AppLayout';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useShopId } from '../../contexts/ShopContext';
import {
  Page,
  MetricsBar,
  DataTable,
  ViewTabs,
  InlineSearch,
  StatusPill,
  Button,
} from '../../components/admin/ui';

const AdminB2BCustomers = () => {
  const shopId = useShopId();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [savingId, setSavingId] = useState(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'b2bCustomers'),
        where('shopId', '==', shopId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setCustomers(list);
    } catch (error) {
      console.error('Error fetching B2B customers:', error);
      toast.error('Kunde inte ladda B2B-kunder');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Activate / deactivate a B2B customer (the admin-only gate). The firestore
  // rule allows this only via the isAdminOfShop branch (same shop / platform).
  const toggleActive = async (customer) => {
    const next = !(customer.active === true);
    try {
      setSavingId(customer.id);
      await updateDoc(doc(db, 'b2bCustomers', customer.id), {
        active: next,
        updatedAt: serverTimestamp(),
      });
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, active: next } : c))
      );
      toast.success(next ? 'Kund aktiverad' : 'Kund inaktiverad');
    } catch (error) {
      console.error('Error toggling B2B customer active:', error);
      toast.error('Kunde inte ändra status');
    } finally {
      setSavingId(null);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(date, 'dd MMM yyyy', { locale: sv });
    } catch {
      return '—';
    }
  };

  // Filtered view: search (company/contact/email) + status tab.
  const filtered = customers.filter((c) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      c.companyName?.toLowerCase().includes(term) ||
      c.contactPerson?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.orgNumber?.toLowerCase().includes(term);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && c.active === true) ||
      (statusFilter === 'pending' && c.active !== true);
    return matchesSearch && matchesStatus;
  });

  const pendingCount = customers.filter((c) => c.active !== true).length;
  const activeCount = customers.filter((c) => c.active === true).length;

  const metrics = [
    { key: 'total', label: 'Totalt', value: customers.length },
    { key: 'active', label: 'Aktiva', value: activeCount },
    { key: 'pending', label: 'Väntar på godkännande', value: pendingCount },
  ];

  const statusTabOptions = [
    { value: 'all', label: 'Alla' },
    { value: 'pending', label: `Väntar (${pendingCount})` },
    { value: 'active', label: 'Aktiva' },
  ];

  const columns = [
    {
      key: 'company',
      header: 'Företag',
      render: (c) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-admin-text">
            {c.companyName || '(namnlöst företag)'}
          </div>
          {(c.orgNumber || c.vatNumber) && (
            <div className="truncate text-[12px] text-admin-text-faint">
              {[c.orgNumber && `Org ${c.orgNumber}`, c.vatNumber && `VAT ${c.vatNumber}`]
                .filter(Boolean)
                .join(' · ')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Kontakt',
      render: (c) => (
        <div className="min-w-0">
          <div className="truncate text-admin-text">{c.contactPerson || c.email}</div>
          <div className="truncate text-[12px] text-admin-text-faint">{c.email}</div>
          {(c.phone || c.address || c.city) && (
            <div className="truncate text-[12px] text-admin-text-faint">
              {[c.phone, [c.address, c.postalCode, c.city].filter(Boolean).join(' ')]
                .filter(Boolean)
                .join(' · ')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) =>
        c.active === true ? (
          <StatusPill tone="success">Aktiv</StatusPill>
        ) : (
          <StatusPill tone="warning">Väntar</StatusPill>
        ),
    },
    {
      key: 'registered',
      header: 'Registrerad',
      render: (c) => (
        <span className="whitespace-nowrap text-admin-text-muted">{formatDate(c.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      className: 'w-36',
      render: (c) => (
        <Button
          variant={c.active === true ? 'secondary' : 'primary'}
          size="sm"
          disabled={savingId === c.id}
          onClick={(e) => {
            e.stopPropagation();
            toggleActive(c);
          }}
        >
          {c.active === true ? 'Inaktivera' : 'Aktivera'}
        </Button>
      ),
    },
  ];

  const tableToolbar = (
    <>
      <ViewTabs
        ariaLabel="Filtrera på status"
        options={statusTabOptions}
        value={statusFilter}
        onChange={setStatusFilter}
      />
      <InlineSearch
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Sök företag, kontakt eller e-post…"
      />
    </>
  );

  return (
    <AppLayout>
      <Page
        title="B2B-kunder"
        subtitle="Hantera grossistkunder och aktivera nya ansökningar"
        back={{ to: '/admin', label: 'Admin' }}
      >
        <div className="space-y-3">
          <MetricsBar metrics={metrics} />

          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(c) => c.id}
            loading={loading}
            empty={
              searchTerm || statusFilter !== 'all'
                ? 'Inga B2B-kunder matchar de valda filtren.'
                : 'B2B-kunder visas här när de registrerar sig via grossistportalen.'
            }
            toolbar={tableToolbar}
          />
        </div>
      </Page>
    </AppLayout>
  );
};

export default AdminB2BCustomers;
