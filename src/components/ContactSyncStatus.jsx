/**
 * 🤝 Contact Sync Status Component
 * Shows the sync health between B2B and CRM contacts
 */

import React, { useState, useEffect } from 'react';
import { 
  ArrowPathIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { getSyncStatistics, bulkSyncAllContacts } from '../utils/contactSync';
import toast from 'react-hot-toast';

const ContactSyncStatus = ({ className = '' }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Load sync statistics
  const loadStats = async () => {
    try {
      setLoading(true);
      const syncStats = await getSyncStatistics();
      setStats(syncStats);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading sync statistics:', error);
      toast.error('Kunde inte ladda synkroniseringsstatus');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadStats();
  }, []);

  // Bulk sync all contacts
  const handleBulkSync = async (direction) => {
    if (!confirm(`🤝 Synkronisera alla kontakter ${direction === 'b2b-to-crm' ? 'B2B → CRM' : 'CRM → B2B'}?`)) {
      return;
    }

    try {
      setSyncing(true);
      const results = await bulkSyncAllContacts(direction);
      
      toast.success(
        `✅ Synkronisering klar!\n` +
        `Lyckades: ${results.success}\n` +
        `Misslyckades: ${results.failed}\n` +
        `Hoppade över: ${results.skipped}`
      );
      
      // Reload stats after sync
      await loadStats();
      
    } catch (error) {
      console.error('Bulk sync failed:', error);
      toast.error('Synkronisering misslyckades');
    } finally {
      setSyncing(false);
    }
  };

  // Get sync health status
  const getSyncHealth = () => {
    if (!stats) return { status: 'unknown', message: 'Laddar...', color: 'gray' };
    
    const { totalB2BUsers, totalCRMContacts, syncedContacts, syncRate } = stats;
    
    if (syncRate >= 95) {
      return { 
        status: 'excellent', 
        message: 'Utmärkt synkronisering', 
        color: 'green',
        icon: CheckCircleIcon 
      };
    } else if (syncRate >= 80) {
      return { 
        status: 'good', 
        message: 'Bra synkronisering', 
        color: 'blue',
        icon: InformationCircleIcon 
      };
    } else if (syncRate >= 60) {
      return { 
        status: 'warning', 
        message: 'Vissa kontakter behöver synkas', 
        color: 'yellow',
        icon: ExclamationTriangleIcon 
      };
    } else {
      return { 
        status: 'poor', 
        message: 'Många kontakter är inte synkade', 
        color: 'red',
        icon: XCircleIcon 
      };
    }
  };

  const health = getSyncHealth();
  const StatusIcon = health.icon || InformationCircleIcon;

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <StatusIcon className={`h-5 w-5 text-${health.color}-500`} />
          <h3 className="text-lg font-medium text-gray-900">Kontaktsynkronisering</h3>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title="Uppdatera statistik"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status Summary */}
      <div className="mb-4">
        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${health.color}-100 text-${health.color}-800`}>
          {health.message}
        </div>
        {lastUpdated && (
          <p className="text-xs text-gray-500 mt-1">
            Senast uppdaterad: {lastUpdated.toLocaleTimeString('sv-SE')}
          </p>
        )}
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.totalB2BUsers}</div>
            <div className="text-xs text-gray-500">B2B Kunder</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.totalCRMContacts}</div>
            <div className="text-xs text-gray-500">CRM Kontakter</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.syncedContacts}</div>
            <div className="text-xs text-gray-500">Synkade</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.syncRate.toFixed(1)}%</div>
            <div className="text-xs text-gray-500">Synkningsgrad</div>
          </div>
        </div>
      )}

      {/* Sync Actions */}
      <div className="space-y-2">
        <button
          onClick={() => handleBulkSync('b2b-to-crm')}
          disabled={syncing}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-md transition-colors"
        >
          {syncing ? 'Synkroniserar...' : '🔄 Synka B2B → CRM'}
        </button>
        <button
          onClick={() => handleBulkSync('crm-to-b2b')}
          disabled={syncing}
          className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-md transition-colors"
        >
          {syncing ? 'Synkroniserar...' : '🔄 Synka CRM → B2B'}
        </button>
      </div>

      {/* Detailed Issues (if any) */}
      {stats && (stats.unsyncedB2BUsers > 0 || stats.orphanedCRMContacts > 0) && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">Synkroniseringsproblem</h4>
          <ul className="text-xs text-yellow-700 space-y-1">
            {stats.unsyncedB2BUsers > 0 && (
              <li>• {stats.unsyncedB2BUsers} B2B-kunder saknas i CRM</li>
            )}
            {stats.orphanedCRMContacts > 0 && (
              <li>• {stats.orphanedCRMContacts} CRM-kontakter saknar B2B-länk</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ContactSyncStatus; 