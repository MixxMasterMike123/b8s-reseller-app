import React, { useState } from 'react';
import { 
  CloudArrowDownIcon, 
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { useAuth } from '../../../contexts/AuthContext';
import { bulkImportB2BUsersToCRM } from '../utils/b2bIntegration';
import toast from 'react-hot-toast';

const B2BImportButton = () => {
  const { getAllUsers, isAdmin } = useAuth();
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);

  // Only show for admin users
  if (!isAdmin) return null;

  const handleBulkImport = async () => {
    if (!confirm('🚂🍽️ Importera alla B2B-kunder till CRM?\n\n⚠️ Admin-användare hoppas över automatiskt.')) {
      return;
    }

    setImporting(true);
    setImportResults(null);

    try {
      // Get all B2B users
      const b2bUsers = await getAllUsers();
      console.log('🚂 Total B2B users found:', b2bUsers.length);

      // Import them to CRM (function will filter out admins)
      const results = await bulkImportB2BUsersToCRM(b2bUsers);
      
      setImportResults(results);
      
      // Show success message
      toast.success(
        `🍽️ CRM Import klar!\n` +
        `✅ Skapade: ${results.imported}\n` +
        `🔄 Uppdaterade: ${results.updated}\n` +
        `🚫 Hoppade över admin: ${results.skipped}\n` +
        `❌ Fel: ${results.errors}`
      );
      
    } catch (error) {
      console.error('❌ Bulk import failed:', error);
      toast.error('Kunde inte importera B2B-kunder till CRM');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleBulkImport}
        disabled={importing}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
      >
        {importing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Importerar...</span>
          </>
        ) : (
          <>
            <CloudArrowDownIcon className="h-5 w-5" />
            <span>Import B2B → CRM</span>
          </>
        )}
      </button>

      {/* Results popup */}
      {importResults && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
              Import Resultat
            </h3>
            <button
              onClick={() => setImportResults(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Stäng</span>
              ✕
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Totalt B2B-användare:</span>
              <span className="font-medium">{importResults.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-600">✅ Nya CRM-kontakter:</span>
              <span className="font-medium text-green-600">{importResults.imported}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-600">🔄 Uppdaterade:</span>
              <span className="font-medium text-blue-600">{importResults.updated}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">🚫 Admin (hoppades över):</span>
              <span className="font-medium text-gray-600">{importResults.skipped}</span>
            </div>
            {importResults.errors > 0 && (
              <div className="flex justify-between">
                <span className="text-red-600">❌ Fel:</span>
                <span className="font-medium text-red-600">{importResults.errors}</span>
              </div>
            )}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              🍽️ B2B-kunder finns nu i The Dining Wagon™ CRM
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default B2BImportButton; 