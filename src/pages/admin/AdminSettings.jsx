// AdminSettings.jsx - Admin Settings with per-user wagon management
import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../components/layout/AppLayout';
import toast from 'react-hot-toast';
import wagonRegistry from '../../wagons/WagonRegistry.js';

// Icons
import { 
  CogIcon, 
  CpuChipIcon,
  UserGroupIcon,
  CheckIcon,
  XMarkIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const AdminSettings = () => {
  const { currentUser, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [availableWagons, setAvailableWagons] = useState([]);
  const [userWagonSettings, setUserWagonSettings] = useState({});
  const [appSettings, setAppSettings] = useState({});
  const [activeTab, setActiveTab] = useState('wagons');

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          loadUsers(),
          loadWagons(), // Now async
          loadUserWagonSettings(),
          loadAppSettings()
        ]);
      } catch (error) {
        console.error('Error loading settings data:', error);
        toast.error('Fel vid laddning av inställningar');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Load admin users only
  const loadUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(user => user.role === 'admin'); // Only show admin users
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      throw error;
    }
  };

  // Load available wagons from registry (including disabled ones)
  const loadWagons = async () => {
    try {
      await wagonRegistry.ensureWagonsDiscovered();
      const wagonsMap = wagonRegistry.getAllWagons(); // Get ALL wagons for admin management
      const wagonsArray = Array.from(wagonsMap.values()); // Convert Map to Array
      setAvailableWagons(wagonsArray);
    } catch (error) {
      console.error('Error loading wagons:', error);
      throw error;
    }
  };

  // Load user wagon settings from Firestore
  const loadUserWagonSettings = async () => {
    try {
      const settingsSnapshot = await getDocs(collection(db, 'userWagonSettings'));
      const settings = {};
      
      settingsSnapshot.docs.forEach(doc => {
        settings[doc.id] = doc.data();
      });
      
      setUserWagonSettings(settings);
    } catch (error) {
      console.error('Error loading user wagon settings:', error);
      throw error;
    }
  };

  // Load app settings
  const loadAppSettings = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'app'));
      if (settingsDoc.exists()) {
        setAppSettings(settingsDoc.data());
      }
    } catch (error) {
      console.error('Error loading app settings:', error);
      throw error;
    }
  };

  // Toggle wagon for user
  const toggleWagonForUser = useCallback(async (userId, wagonId, enabled) => {
    try {
      setSaving(true);
      
      const userWagonDocRef = doc(db, 'userWagonSettings', userId);
      const currentSettings = userWagonSettings[userId] || { wagons: {} };
      
      const updatedSettings = {
        ...currentSettings,
        wagons: {
          ...currentSettings.wagons,
          [wagonId]: {
            enabled,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.uid
          }
        },
        lastUpdated: new Date().toISOString()
      };
      
      await setDoc(userWagonDocRef, updatedSettings, { merge: true });
      
      // Update local state
      setUserWagonSettings(prev => ({
        ...prev,
        [userId]: updatedSettings
      }));
      
      const user = users.find(u => u.id === userId);
      const wagon = availableWagons.find(w => w.manifest.id === wagonId);
      
      toast.success(
        `${wagon?.manifest.name || wagonId} ${enabled ? 'aktiverad' : 'inaktiverad'} för ${user?.companyName || user?.email}`
      );
      
    } catch (error) {
      console.error('Error updating wagon setting:', error);
      toast.error('Fel vid uppdatering av wagon-inställning');
    } finally {
      setSaving(false);
    }
  }, [currentUser.uid, users, availableWagons, userWagonSettings]);

  // Check if wagon is enabled for user
  const isWagonEnabledForUser = (userId, wagonId) => {
    const user = users.find(u => u.id === userId);
    
    // Admins get access to all wagons by default
    if (user?.role === 'admin') {
      const userSettings = userWagonSettings[userId];
      if (!userSettings || !userSettings.wagons) return true; // Default enabled for admins
      
      const wagonSetting = userSettings.wagons[wagonId];
      return wagonSetting ? wagonSetting.enabled : true; // Default enabled for admins
    }
    
    // Non-admin users need explicit permission
    const userSettings = userWagonSettings[userId];
    if (!userSettings || !userSettings.wagons) return false; // Default disabled for non-admins
    
    const wagonSetting = userSettings.wagons[wagonId];
    return wagonSetting?.enabled === true; // Only enabled if explicitly set to true
  };

  // Get wagon status info
  const getWagonStatusInfo = (wagon) => {
    const manifest = wagon.manifest;
    const enabledForUsers = users.filter(user => 
      isWagonEnabledForUser(user.id, manifest.id)
    ).length;
    
    let status = 'available';
    let statusText = 'Tillgänglig';
    
    if (!manifest.enabled) {
      status = 'disabled-manifest';
      statusText = 'Inaktiverad i manifest';
    } else if (enabledForUsers === 0) {
      status = 'disabled-users';
      statusText = 'Endast admins (säker standard)';
    } else if (enabledForUsers < users.length) {
      status = 'partially-enabled';
      statusText = 'Delvis aktiverad';
    }
    
    return {
      manifestEnabled: manifest.enabled,
      enabledForUsers,
      totalUsers: users.length,
      status,
      statusText
    };
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 dark:border-blue-400"></div>
          <span className="ml-3 text-lg text-gray-600 dark:text-gray-400">Laddar inställningar...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center space-x-3">
              <CogIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Systeminställningar</h1>
                <p className="text-gray-600 dark:text-gray-400">Hantera wagon-system och applikationsinställningar</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('wagons')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'wagons'
                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <CpuChipIcon className="h-5 w-5 inline mr-2" />
                Wagon Management
              </button>
              <button
                onClick={() => setActiveTab('app')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'app'
                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <CogIcon className="h-5 w-5 inline mr-2" />
                Applikationsinställningar
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'wagons' && (
              <div className="space-y-6">
                {/* Wagon Overview */}
                                        <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-start space-x-3">
                    <InformationCircleIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">
                        Wagon Management System (Autodetect)
                      </h3>
                      <p className="text-blue-800 dark:text-blue-200 mt-1">
                        Aktivera eller inaktivera specifika wagons för admin-användare. 
                        <strong>Endast admins visas:</strong> Wagons är strikt för admin-användare endast. 
                        Systemet hittar automatiskt alla wagons (även inaktiverade). 
                        Wagons som är inaktiverade i manifestet visas men kan inte aktiveras för användare.
                      </p>
                      <div className="mt-3 text-sm text-blue-700 dark:text-blue-300">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <strong>Totalt antal wagons:</strong> {availableWagons.length}
                          </div>
                          <div>
                            <strong>Aktiva wagons:</strong> {availableWagons.filter(w => w.manifest.enabled).length}
                          </div>
                          <div>
                            <strong>Aktiva användare:</strong> {users.filter(u => u.active || u.isActive).length}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wagons List */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Tillgängliga Wagons</h3>
                  
                  {availableWagons.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <CpuChipIcon className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                      <p>Inga wagons hittades. Kontrollera att wagons är korrekt konfigurerade.</p>
                    </div>
                  ) : (
                    availableWagons.map((wagon) => {
                      const statusInfo = getWagonStatusInfo(wagon);
                      const manifest = wagon.manifest;
                      
                      return (
                        <div key={manifest.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                          {/* Wagon Header */}
                          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`w-4 h-4 rounded-full flex-shrink-0 ${
                                  statusInfo.status === 'available' ? 'bg-green-500' :
                                  statusInfo.status === 'partially-enabled' ? 'bg-yellow-500' :
                                  statusInfo.status === 'disabled-manifest' ? 'bg-red-500' :
                                  'bg-gray-400'
                                }`} />
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                      {manifest.name}
                                    </h4>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">v{manifest.version}</span>
                                    {!statusInfo.manifestEnabled && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300">
                                        Manifest Inaktiverad
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-gray-600 dark:text-gray-400">{manifest.description}</p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Status: <span className="font-medium">{statusInfo.statusText}</span>
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                                  Aktiv för {statusInfo.enabledForUsers}/{statusInfo.totalUsers} användare
                                </div>
                                <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                                  statusInfo.status === 'available' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' :
                                  statusInfo.status === 'partially-enabled' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300' :
                                  statusInfo.status === 'disabled-manifest' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300' :
                                  'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                }`}>
                                  {statusInfo.statusText}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* User Settings */}
                          <div className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {users.map((user) => (
                                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900 dark:text-gray-100">
                                      {user.companyName || user.email}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      {user.contactPerson || user.email}
                                    </div>
                                    {(!user.active && !user.isActive) && (
                                      <div className="text-xs text-red-600 dark:text-red-400">Inaktiv användare</div>
                                    )}
                                  </div>
                                  <div className="ml-3">
                                    <button
                                      onClick={() => toggleWagonForUser(
                                        user.id, 
                                        manifest.id, 
                                        !isWagonEnabledForUser(user.id, manifest.id)
                                      )}
                                      disabled={!statusInfo.manifestEnabled || saving}
                                      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                        isWagonEnabledForUser(user.id, manifest.id) && statusInfo.manifestEnabled
                                          ? 'bg-blue-600'
                                          : 'bg-gray-200'
                                      } ${
                                        !statusInfo.manifestEnabled ? 'opacity-50 cursor-not-allowed' : ''
                                      }`}
                                    >
                                      <span
                                        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                                          isWagonEnabledForUser(user.id, manifest.id) && statusInfo.manifestEnabled
                                            ? 'translate-x-6'
                                            : 'translate-x-1'
                                        }`}
                                      />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {activeTab === 'app' && (
              <div className="space-y-6">
                <div className="bg-yellow-50 dark:bg-yellow-900 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
                  <div className="flex items-start space-x-3">
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                      <h3 className="text-lg font-medium text-yellow-900 dark:text-yellow-100">
                        Applikationsinställningar
                      </h3>
                      <p className="text-yellow-800 dark:text-yellow-200 mt-1">
                        Grundläggande systeminställningar kommer att implementeras här i framtiden.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* App Settings Preview */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Aktuella appinställningar</h4>
                  <div className="space-y-2 text-sm">
                    {Object.entries(appSettings).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">{key}:</span>
                        <span className="font-mono text-gray-900 dark:text-gray-100">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminSettings; 