import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import AppLayout from '../../components/layout/AppLayout';
import {
  CloudArrowUpIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

function AdminGoogleShopping() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [syncStatus, setSyncStatus] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);

  useEffect(() => {
    if (isAdmin) {
      loadStats();
      loadSyncStatus();
    }
  }, [isAdmin]);

  const loadStats = async () => {
    try {
      const getStats = httpsCallable(functions, 'getGoogleMerchantStats');
      const result = await getStats();
      
      if (result.data.success) {
        setStats(result.data.stats);
      } else {
        console.error('Failed to load Google Shopping stats:', result.data.error);
        toast.error('Kunde inte ladda Google Shopping-statistik');
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Fel vid laddning av statistik');
    }
  };

  const loadSyncStatus = async () => {
    try {
      const getStatus = httpsCallable(functions, 'getProductSyncStatus');
      const result = await getStatus({ limit: 20, offset: 0 });
      
      if (result.data.success) {
        setSyncStatus(result.data.products || []);
      } else {
        console.error('Failed to load sync status:', result.data.error);
      }
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      const testFunc = httpsCallable(functions, 'testGoogleMerchantConnection');
      const result = await testFunc();
      
      if (result.data.success) {
        toast.success('✅ Anslutning till Google Merchant Center fungerar!');
        console.log('Connection successful:', result.data);
      } else {
        toast.error(`❌ Anslutningstest misslyckades: ${result.data.error}`);
        console.error('Connection failed:', result.data);
      }
    } catch (error) {
      toast.error('Fel vid test av anslutning');
      console.error('Test error:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncAllProducts = async () => {
    if (!confirm('Vill du synkronisera alla B2C-produkter till Google Shopping? Detta kan ta några minuter.')) {
      return;
    }

    setLoading(true);
    try {
      const syncFunc = httpsCallable(functions, 'syncAllProductsToGoogle');
      const result = await syncFunc();
      
      if (result.data.success) {
        toast.success(`✅ Synkronisering klar! ${result.data.stats.synced} produkter synkroniserade.`);
        loadStats();
        loadSyncStatus();
      } else {
        toast.error(`❌ Synkronisering misslyckades: ${result.data.error}`);
      }
    } catch (error) {
      toast.error('Fel vid synkronisering');
      console.error('Sync error:', error);
    } finally {
      setLoading(false);
    }
  };

  const forceSyncSelected = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Välj produkter att synkronisera');
      return;
    }

    setLoading(true);
    try {
      const forceSync = httpsCallable(functions, 'forceSyncProducts');
      const result = await forceSync({ productIds: selectedProducts });
      
      if (result.data.success) {
        const { success, failures } = result.data.summary;
        toast.success(`✅ Framtvingad synkronisering klar! ${success} lyckades, ${failures} misslyckades.`);
        setSelectedProducts([]);
        loadSyncStatus();
      } else {
        toast.error(`❌ Framtvingad synkronisering misslyckades: ${result.data.error}`);
      }
    } catch (error) {
      toast.error('Fel vid framtvingad synkronisering');
      console.error('Force sync error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'synced':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'needs_sync':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'needs_removal':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'inactive':
        return <XCircleIcon className="h-5 w-5 text-gray-400" />;
      default:
        return <Cog6ToothIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'synced':
        return 'Synkroniserad';
      case 'needs_sync':
        return 'Behöver synkas';
      case 'needs_removal':
        return 'Behöver tas bort';
      case 'inactive':
        return 'Inaktiv';
      case 'not_b2c':
        return 'Inte B2C';
      default:
        return 'Okänd status';
    }
  };

  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">Åtkomst nekad</h1>
          <p className="mt-2 text-gray-600">Du har inte behörighet att komma åt denna sida.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Google Shopping</h1>
              <p className="mt-1 text-gray-600">Hantera synkronisering med Google Merchant Center</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={testConnection}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <Cog6ToothIcon className="h-4 w-4 mr-2" />
                Testa anslutning
              </button>
              <button
                onClick={syncAllProducts}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                {loading ? 'Synkroniserar...' : 'Synka alla produkter'}
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Statistik</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <ChartBarIcon className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-600">Totalt i Firestore</p>
                    <p className="text-2xl font-bold text-blue-900">{stats.firestore?.total || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-600">B2C tillgängliga</p>
                    <p className="text-2xl font-bold text-green-900">{stats.firestore?.b2cAvailable || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center">
                  <CloudArrowUpIcon className="h-8 w-8 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-600">I Google Shopping</p>
                    <p className="text-2xl font-bold text-purple-900">{stats.google?.total || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center">
                  <ArrowPathIcon className="h-8 w-8 text-yellow-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-600">Synk %</p>
                    <p className="text-2xl font-bold text-yellow-900">{stats.sync?.syncPercentage || 0}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Product Sync Status */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Produktsynkronisering</h2>
              {selectedProducts.length > 0 && (
                <button
                  onClick={forceSyncSelected}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Framtvinga synk ({selectedProducts.length})
                </button>
              )}
            </div>
          </div>
          
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedProducts.length === syncStatus.length && syncStatus.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts(syncStatus.map(p => p.id));
                        } else {
                          setSelectedProducts([]);
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produkt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    B2C
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Google Shopping
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {syncStatus.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => toggleProductSelection(product.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{product.sku || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(product.status)}
                        <span className="ml-2 text-sm text-gray-900">{getStatusText(product.status)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        product.b2cAvailable 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.b2cAvailable ? 'Ja' : 'Nej'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        product.isInGoogle 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.isInGoogle ? 'Synkad' : 'Inte synkad'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Automatisk synkronisering
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>Produkter synkroniseras automatiskt till Google Shopping när:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>En ny produkt skapas (om den är B2C-tillgänglig)</li>
                  <li>En befintlig produkt uppdateras</li>
                  <li>En produkt tas bort eller inaktiveras</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default AdminGoogleShopping;
