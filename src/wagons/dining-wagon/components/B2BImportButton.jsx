import React, { useState } from 'react';
import { 
  CloudArrowUpIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

const B2BImportButton = ({ className = '' }) => {
  const { getAllUsers } = useAuth();
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const handleImport = async () => {
    try {
      setImporting(true);
      setImportResult(null);
      
      // Show deprecation notice
      toast.error('🚫 B2B Import is deprecated - CRM now uses unified users collection directly');
      
      // Get all users to show current state
      const users = await getAllUsers();
      const customerUsers = users.filter(user => user.role !== 'admin');
      
      toast.success(`✅ CRM has access to ${customerUsers.length} customers from unified database`);
      
      setImportResult({
        imported: 0,
        updated: 0,
        errors: 0,
        skipped: users.length,
        total: users.length,
        message: 'Import not needed - using unified users collection'
      });
      
    } catch (error) {
      console.error('Error checking users:', error);
      toast.error('Error checking user database');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">B2B → CRM Import</h3>
        <CloudArrowUpIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
      </div>
      
      <div className="space-y-4">
        <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 dark:text-yellow-300 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Deprecated Feature</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                B2B import is no longer needed. CRM now reads directly from the unified users collection.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleImport}
          disabled={importing}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 dark:bg-gray-500 hover:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-gray-500 dark:focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {importing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Checking Database...
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Check Current State
            </>
          )}
        </button>

        {importResult && (
          <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircleIcon className="h-5 w-5 text-green-400 dark:text-green-300 mt-0.5 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-green-800 dark:text-green-200">Unified Database Status</h4>
                <div className="text-sm text-green-700 dark:text-green-300 mt-2 space-y-1">
                  <p>Total users: {importResult.total}</p>
                  <p>Available to CRM: {importResult.total - importResult.errors}</p>
                  <p className="font-medium">{importResult.message}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default B2BImportButton; 