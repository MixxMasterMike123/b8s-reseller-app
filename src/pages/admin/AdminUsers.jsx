import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import AppLayout from '../../components/layout/AppLayout';
import {
  Page,
  DataTable,
  StatusPill,
  Button,
  InlineSearch,
} from '../../components/admin/ui';

// NOTE: the `users` collection is GLOBAL (not shopId-scoped) by design — admin
// accounts span the platform. Do NOT add shop scoping here.
const AdminUsers = () => {
  const { getAllUsers, updateUserRole, updateUserMarginal } = useAuth();

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCustomerTab, setActiveCustomerTab] = useState('active'); // Simplified tab system
  const [roleUpdateLoading, setRoleUpdateLoading] = useState(false);
  const [marginalUpdateLoading, setMarginalUpdateLoading] = useState(false);
  const [editingMarginals, setEditingMarginals] = useState({});

  // 🆕 ADD: Tab state for separating B2B customers from Admin users
  // B2B reseller function retired (2026-06-15) — this page now manages ADMIN
  // users only. The B2B-customer ("Kunder") tab is hidden (the 372 legacy
  // reseller records stay untouched in `users`; see memory b2b-removal). Default
  // to the admins tab; the customers tab button is no longer rendered.
  const [activeTab, setActiveTab] = useState('admins');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const usersList = await getAllUsers();
        setUsers(usersList);
        setFilteredUsers(usersList);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Kunde inte hämta användare');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [getAllUsers]);

  useEffect(() => {
    // 🎯 SIMPLIFIED TAB FILTERING
    const filtered = users.filter(user => {
      const matchesSearch =
        user.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase());

      // 🆕 Tab-based filtering (customers vs admins)
      const matchesTab =
        activeTab === 'customers' ? user.role !== 'admin' : user.role === 'admin';

      // Skip admin tab filtering - only apply to customer tab
      if (activeTab === 'admins') {
        return matchesSearch && matchesTab;
      }

      // 🎯 SIMPLE CUSTOMER TAB FILTERING - SHOW ACTIVE CUSTOMERS
      let matchesCustomerFilter = true;

      if (activeCustomerTab === 'active') {
        // TAB 1: Active customers (any role, just active=true)
        matchesCustomerFilter = user.active === true;
      } else if (activeCustomerTab === 'applicants') {
        // TAB 2: B2B Applications - inactive customers with role='reseller'
        matchesCustomerFilter = user.role === 'reseller' && (user.active === false || user.active === undefined);
      } else if (activeCustomerTab === 'all') {
        // TAB 3: All customers
        matchesCustomerFilter = true;
      }

      return matchesSearch && matchesTab && matchesCustomerFilter;
    });

    setFilteredUsers(filtered);
  }, [searchTerm, activeCustomerTab, users, activeTab]);



  const handleRoleChange = async (userId, currentRole, newRole) => {
    if (currentRole === newRole) return;

    if (window.confirm(`Är du säker på att du vill ändra denna kunds roll till ${newRole === 'admin' ? 'Admin' : 'Kund'}?`)) {
      try {
        setRoleUpdateLoading(true);
        await updateUserRole(userId, newRole);

        // Update the local state after successful role change
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.id === userId ? { ...user, role: newRole } : user
          )
        );

        toast.success(`Kundroll uppdaterad till ${newRole === 'admin' ? 'Admin' : 'Kund'} framgångsrikt`);
      } catch (error) {
        console.error('Error updating user role:', error);
        toast.error('Kunde inte uppdatera kundroll');
      } finally {
        setRoleUpdateLoading(false);
      }
    }
  };

  const handleMarginalChange = async (userId, newMarginal) => {
    const marginalNum = parseFloat(newMarginal);
    if (isNaN(marginalNum) || marginalNum < 0 || marginalNum > 100) {
      toast.error('Marginal måste vara mellan 0 och 100%');
      return;
    }

    try {
      setMarginalUpdateLoading(true);
      await updateUserMarginal(userId, marginalNum);

      // Update the local state after successful margin change
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? { ...user, marginal: marginalNum } : user
        )
      );

      // Clear editing state
      setEditingMarginals(prev => {
        const newState = { ...prev };
        delete newState[userId];
        return newState;
      });

    } catch (error) {
      console.error('Error updating user marginal:', error);
      toast.error('Kunde inte uppdatera marginal');
    } finally {
      setMarginalUpdateLoading(false);
    }
  };

  const startEditingMarginal = (userId, currentMarginal) => {
    setEditingMarginals(prev => ({
      ...prev,
      [userId]: currentMarginal || 35
    }));
  };

  const cancelEditingMarginal = (userId) => {
    setEditingMarginals(prev => {
      const newState = { ...prev };
      delete newState[userId];
      return newState;
    });
  };

  // ── Table column definitions (Admin Neutral / Shopify IndexTable). ──
  const columns = [
    {
      key: 'user',
      header: 'Företag & Kontakt',
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-admin-border bg-admin-surface-2 text-[12px] font-medium text-admin-text-muted">
            {(user.companyName || user.contactPerson || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium text-admin-text">
              {user.companyName || 'Ej angivet'}
            </div>
            <div className="truncate text-[12px] text-admin-text-faint">{user.email}</div>
            {user.contactPerson && (
              <div className="truncate text-[12px] text-admin-text-faint">Kontakt: {user.contactPerson}</div>
            )}
            {user.phone && (
              <div className="truncate text-[12px] text-admin-text-faint">Tel: {user.phone}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Roll',
      render: (user) => (
        // Role pill + inline role toggle (stop row click so it doesn't navigate).
        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
          {user.role === 'admin' ? (
            <StatusPill tone="info">Admin</StatusPill>
          ) : (
            <StatusPill tone="neutral">Kund</StatusPill>
          )}
          <select
            value={user.role}
            onChange={(e) => handleRoleChange(user.id, user.role, e.target.value)}
            disabled={roleUpdateLoading}
            className="rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface px-2 py-1 text-[12px] text-admin-text focus:border-admin-text focus:outline-none disabled:opacity-50"
          >
            <option value="user">Kund</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      ),
    },
    {
      key: 'marginal',
      header: 'Marginal',
      align: 'right',
      render: (user) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-end gap-2">
          {editingMarginals[user.id] !== undefined ? (
            <>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={editingMarginals[user.id]}
                onChange={(e) => setEditingMarginals(prev => ({
                  ...prev,
                  [user.id]: e.target.value
                }))}
                className="w-16 rounded-[var(--radius-admin-el)] border border-admin-border bg-admin-surface px-2 py-1 text-[12px] tabular-nums text-admin-text focus:border-admin-text focus:outline-none"
                disabled={marginalUpdateLoading}
              />
              <span className="text-[12px] text-admin-text-faint">%</span>
              <button
                type="button"
                onClick={() => handleMarginalChange(user.id, editingMarginals[user.id])}
                disabled={marginalUpdateLoading}
                aria-label="Spara marginal"
                title="Spara marginal"
                className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-admin-el)] text-admin-text-faint hover:bg-admin-surface-2 hover:text-admin-text disabled:opacity-50"
              >
                ✓
              </button>
              <button
                type="button"
                onClick={() => cancelEditingMarginal(user.id)}
                disabled={marginalUpdateLoading}
                aria-label="Avbryt"
                title="Avbryt"
                className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-admin-el)] text-admin-text-faint hover:bg-admin-surface-2 hover:text-admin-critical-dot disabled:opacity-50"
              >
                ✕
              </button>
            </>
          ) : (
            <>
              <span className="tabular-nums font-medium text-admin-text">{user.marginal || 35}%</span>
              <Button
                variant="plain"
                size="sm"
                onClick={() => startEditingMarginal(user.id, user.marginal || 35)}
              >
                Ändra
              </Button>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user) => (
        <div className="space-y-1">
          {user.active ? (
            <StatusPill tone="success">Aktiv</StatusPill>
          ) : (
            <StatusPill tone="warning">Väntar aktivering</StatusPill>
          )}
          <div className="text-[12px] text-admin-text-faint">
            {user.createdByAdmin ? 'Skapad av admin:' : 'Ansökte:'}{' '}
            {user.createdAt ? new Date(user.createdAt).toLocaleDateString('sv-SE') : 'Okänt datum'}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      className: 'w-40',
      render: (user) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-end gap-2">
          <Button as={Link} to={`/admin/users/${user.id}/edit`} variant="secondary" size="sm">
            Redigera
          </Button>
          {/* Show customer marketing materials link only for customers (not admins) */}
          {user.role !== 'admin' && (
            <Button
              as={Link}
              to={`/admin/customers/${user.id}/marketing`}
              variant="plain"
              size="sm"
              title="Hantera kundspecifikt marknadsföringsmaterial"
            >
              Material
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <Page
        title={activeTab === 'customers' ? 'B2B Kundhantering' : 'Admin Användare'}
        back={{ to: '/admin', label: 'Admin Dashboard' }}
        actions={
          <Button as={Link} to="/admin/users/create" variant="primary">
            {activeTab === 'customers' ? 'Skapa Ny Kund' : 'Skapa Ny Admin'}
          </Button>
        }
      >
        <DataTable
          columns={columns}
          rows={filteredUsers}
          rowKey={(u) => u.id}
          loading={loading}
          empty={
            activeTab === 'customers'
              ? 'Inga kunder hittades som matchar dina kriterier.'
              : 'Inga admin användare hittades som matchar dina kriterier.'
          }
          toolbar={
            <InlineSearch
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={
                activeTab === 'customers'
                  ? 'Sök efter namn, e-post eller företag…'
                  : 'Sök efter namn, e-post eller admin…'
              }
            />
          }
        />
      </Page>
    </AppLayout>
  );
};

export default AdminUsers;
