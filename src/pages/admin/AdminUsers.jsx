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
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleUpdateLoading, setRoleUpdateLoading] = useState(false);
  const [marginalUpdateLoading, setMarginalUpdateLoading] = useState(false);
  const [editingMarginals, setEditingMarginals] = useState({});

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
    // Filter users based on search term and status filter
    const filtered = users.filter(user => {
      const matchesSearch = 
        user.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'active' && user.active) || 
        (statusFilter === 'inactive' && !user.active);
      
      return matchesSearch && matchesStatus;
    });
    
    setFilteredUsers(filtered);
  }, [searchTerm, statusFilter, users]);



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
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
          <h1 className="text-lg leading-6 font-medium text-gray-900">
            Kundhantering
          </h1>
          <div className="flex gap-3">
            <Link
              to="/admin/users/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Skapa Ny Kund
            </Link>
            <Link
              to="/admin"
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Admin Dashboard
            </Link>
          </div>
        </div>

        {/* Filter and search */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Sök efter namn, e-post eller företag..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 pl-10 py-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <div className="flex-shrink-0">
              <select
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Alla Kunder</option>
                <option value="active">Aktiva Kunder</option>
                <option value="inactive">Inaktiva Kunder</option>
              </select>
            </div>
          </div>
        </div>

        {/* Kundlista */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Företag & Kontakt
                    </th>
                    <th scope="col" className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Roll & Status
                    </th>
                    <th scope="col" className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Åtgärder
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      {/* Column 1: Company & Contact */}
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 h-12 w-12 mr-4">
                            <div className="h-12 w-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-800">
                                {(user.companyName || user.contactPerson || 'U').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 mb-1">
                              {user.companyName || 'Ej angivet'}
                            </div>
                            <div className="text-xs text-gray-500 mb-1">
                              {user.email}
                            </div>
                            {user.contactPerson && (
                              <div className="text-xs text-gray-600 mb-1">
                                Kontakt: {user.contactPerson}
                              </div>
                            )}
                            {user.phone && (
                              <div className="text-xs text-gray-500">
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
                                user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {user.role === 'admin' ? 'Admin' : 'Kund'}
                              </span>
                              <select
                                value={user.role}
                                onChange={(e) => handleRoleChange(user.id, user.role, e.target.value)}
                                disabled={roleUpdateLoading}
                                className="text-xs border border-gray-300 rounded py-1 px-2 min-h-[28px] focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="user">Kund</option>
                                <option value="admin">Admin</option>
                              </select>
                            </div>
                          </div>

                          {/* Margin Section */}
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Marginal:</div>
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
                                  className="w-16 text-xs border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                                  disabled={marginalUpdateLoading}
                                />
                                <span className="text-xs text-gray-400">%</span>
                                <button
                                  onClick={() => handleMarginalChange(user.id, editingMarginals[user.id])}
                                  disabled={marginalUpdateLoading}
                                  className="min-h-[24px] px-2 py-1 text-xs font-medium text-green-600 hover:text-green-900 hover:bg-green-50 rounded transition-colors"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => cancelEditingMarginal(user.id)}
                                  disabled={marginalUpdateLoading}
                                  className="min-h-[24px] px-2 py-1 text-xs font-medium text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {user.marginal || 35}%
                                </span>
                                <button
                                  onClick={() => startEditingMarginal(user.id, user.marginal || 35)}
                                  className="min-h-[24px] px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                                >
                                  Ändra
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Status Section */}
                          <div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.active ? 'Aktiv' : 'Inaktiv'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Column 3: Actions */}
                      <td className="px-4 md:px-6 py-4 text-right">
                        <Link
                          to={`/admin/users/${user.id}/edit`}
                          className="min-h-[32px] inline-flex items-center px-4 py-2 text-xs font-medium text-blue-600 hover:text-blue-900 hover:bg-blue-50 border border-blue-300 rounded transition-colors"
                        >
                          Redigera
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Inga kunder hittades som matchar dina kriterier.</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminUsers; 