import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import AppLayout from '../../components/layout/AppLayout';

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
  const [activeTab, setActiveTab] = useState('customers');

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
      
      // 🎯 CUSTOMER TAB FILTERING - ONLY B2B APPLICATIONS (HIDE MANUAL PROSPECTS)
      let matchesCustomerFilter = true;
      
      // EXCLUDE manual prospects completely - they belong in Dining Wagon only
      const isManualProspect = user.createdByAdmin === true;
      if (isManualProspect) {
        matchesCustomerFilter = false;
      } else {
        // Only show genuine B2B applications from registration form
        if (activeCustomerTab === 'active') {
          // TAB 1: Active B2B customers from registration form
          matchesCustomerFilter = user.active === true && user.createdByAdmin !== true;
        } else if (activeCustomerTab === 'applicants') {
          // TAB 2: B2B applications awaiting activation (from registration form)
          matchesCustomerFilter = (user.active === false || user.active === undefined) && user.createdByAdmin !== true;
        } else if (activeCustomerTab === 'all') {
          // TAB 3: All genuine B2B applications (active + pending, exclude manual prospects)
          matchesCustomerFilter = user.createdByAdmin !== true;
        }
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

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md">
        {/* Header */}
        <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-700 sm:px-6 flex justify-between items-center">
          <h1 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
            {/* 🆕 ENHANCE: Dynamic header based on active tab */}
            {activeTab === 'customers' ? 'B2B Kundhantering' : 'Admin Användare'}
          </h1>
          <div className="flex gap-3">
            <Link
              to="/admin/users/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {/* 🆕 ENHANCE: Dynamic button text based on active tab */}
              {activeTab === 'customers' ? 'Skapa Ny Kund' : 'Skapa Ny Admin'}
            </Link>
            <Link
              to="/admin"
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Back to Admin Dashboard
            </Link>
          </div>
        </div>

        {/* 🆕 ADD: Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="px-4 sm:px-6 -mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('customers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'customers'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              B2B Kunder ({users.filter(u => u.role !== 'admin' && u.createdByAdmin !== true).length})
            </button>
            <button
              onClick={() => setActiveTab('admins')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'admins'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Admin Användare ({users.filter(u => u.role === 'admin').length})
            </button>
          </nav>
        </div>

        {/* Customer Sub-tabs (only shown when on customers tab) */}
        {activeTab === 'customers' && (
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveCustomerTab('active')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeCustomerTab === 'active'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Aktiva B2B Kunder ({users.filter(u => u.role !== 'admin' && u.active === true && u.createdByAdmin !== true).length})
              </button>
              <button
                onClick={() => setActiveCustomerTab('applicants')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeCustomerTab === 'applicants'
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                B2B Ansökningar ({users.filter(u => u.role !== 'admin' && (u.active === false || u.active === undefined) && u.createdByAdmin !== true).length})
              </button>
              <button
                onClick={() => setActiveCustomerTab('all')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeCustomerTab === 'all'
                    ? 'border-gray-500 text-gray-600 dark:text-gray-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Alla B2B ({users.filter(u => u.role !== 'admin' && u.createdByAdmin !== true).length})
              </button>
            </nav>
          </div>
        )}

        {/* Search */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <input
              type="text"
              placeholder={
                activeTab === 'customers' 
                  ? "Sök efter namn, e-post eller företag..." 
                  : "Sök efter namn, e-post eller admin..."
              }
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 shadow-sm focus:border-primary-500 focus:ring-primary-500 pl-10 py-2"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Kundlista */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Företag & Kontakt
                    </th>
                    <th scope="col" className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Roll & Status
                    </th>
                    <th scope="col" className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Åtgärder
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      {/* Column 1: Company & Contact */}
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 h-12 w-12 mr-4">
                            <div className="h-12 w-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-700 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                {(user.companyName || user.contactPerson || 'U').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                              {user.companyName || 'Ej angivet'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                              {user.email}
                            </div>
                            {user.contactPerson && (
                              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                                Kontakt: {user.contactPerson}
                              </div>
                            )}
                            {user.phone && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Tel: {user.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Role & Status */}
                      <td className="px-4 md:px-6 py-4">
                        <div className="space-y-3">
                          {/* Role Section */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                user.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300'
                              }`}>
                                {user.role === 'admin' ? 'Admin' : 'Kund'}
                              </span>
                              <select
                                value={user.role}
                                onChange={(e) => handleRoleChange(user.id, user.role, e.target.value)}
                                disabled={roleUpdateLoading}
                                className="text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded py-1 px-2 min-h-[28px] focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="user">Kund</option>
                                <option value="admin">Admin</option>
                              </select>
                            </div>
                          </div>

                          {/* Margin Section */}
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Marginal:</div>
                            {editingMarginals[user.id] !== undefined ? (
                              <div className="flex items-center gap-2">
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
                                  className="w-16 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                                  disabled={marginalUpdateLoading}
                                />
                                <span className="text-xs text-gray-400 dark:text-gray-500">%</span>
                                <button
                                  onClick={() => handleMarginalChange(user.id, editingMarginals[user.id])}
                                  disabled={marginalUpdateLoading}
                                  className="min-h-[24px] px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900 rounded transition-colors"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => cancelEditingMarginal(user.id)}
                                  disabled={marginalUpdateLoading}
                                  className="min-h-[24px] px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {user.marginal || 35}%
                                </span>
                                <button
                                  onClick={() => startEditingMarginal(user.id, user.marginal || 35)}
                                  className="min-h-[24px] px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors"
                                >
                                  Ändra
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Status Section */}
                          <div className="space-y-2">
                            <div>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                user.active ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' : 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300'
                              }`}>
                                {user.active ? 'Aktiv' : 'Väntar aktivering'}
                              </span>
                            </div>
                            
                            {/* Creation Date */}
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {user.createdByAdmin ? 'Skapad av admin:' : 'Ansökte:'} {user.createdAt ? new Date(user.createdAt).toLocaleDateString('sv-SE') : 'Okänt datum'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 3: Actions */}
                      <td className="px-4 md:px-6 py-4 text-right">
                        <div className="flex flex-col md:flex-row items-end md:items-center justify-end gap-2">
                          <Link
                            to={`/admin/users/${user.id}/edit`}
                            className="min-h-[32px] inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900 border border-blue-300 dark:border-blue-600 rounded transition-colors"
                          >
                            Redigera
                          </Link>
                          {/* Show customer marketing materials link only for customers (not admins) */}
                          {user.role !== 'admin' && (
                            <Link
                              to={`/admin/customers/${user.id}/marketing`}
                              className="min-h-[32px] inline-flex items-center px-3 py-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900 border border-purple-300 dark:border-purple-600 rounded transition-colors"
                              title="Hantera kundspecifikt marknadsföringsmaterial"
                            >
                              Material
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              {/* 🆕 ENHANCE: Dynamic empty state message based on active tab */}
              <p className="text-gray-500 dark:text-gray-400">
                {activeTab === 'customers' 
                  ? 'Inga kunder hittades som matchar dina kriterier.' 
                  : 'Inga admin användare hittades som matchar dina kriterier.'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminUsers; 