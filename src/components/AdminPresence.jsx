import React, { useState } from 'react';
import { useAdminPresence } from '../hooks/useAdminPresence';
import { 
  UserGroupIcon, 
  EyeIcon, 
  ClockIcon, 
  XMarkIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';

const AdminPresence = () => {
  const { adminPresence, loading, onlineCount, awayCount, totalAdmins } = useAdminPresence();
  const [isExpanded, setIsExpanded] = useState(false);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const getStatusIcon = (admin) => {
    if (admin.isOnline) {
      return <div className="w-3 h-3 bg-green-500 rounded-full"></div>;
    }
    if (admin.isAway) {
      return <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>;
    }
    return <div className="w-3 h-3 bg-gray-400 rounded-full"></div>;
  };

  const getDeviceIcon = (userAgent) => {
    if (!userAgent) return <ComputerDesktopIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />;
    
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    return isMobile ? 
      <DevicePhoneMobileIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" /> : 
      <ComputerDesktopIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Header - Always Visible */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <UserGroupIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Admin Aktivitet</h3>
              <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  {onlineCount} online
                </span>
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                  {awayCount} frånvarande
                </span>
                <span>{totalAdmins} totalt</span>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            {isExpanded ? (
              <XMarkIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            ) : (
              <EyeIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="p-4 space-y-3">
            {adminPresence.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                Inga andra admins hittades
              </p>
            ) : (
              adminPresence.map((admin) => (
                <div key={admin.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(admin)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {admin.email}
                        </span>
                        {getDeviceIcon(admin.browser)}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <ClockIcon className="h-3 w-3" />
                        <span>{admin.lastSeenFormatted}</span>
                        {admin.isOnline && (
                          <span className="text-green-600 dark:text-green-400 font-medium">• Aktiv nu</span>
                        )}
                        {admin.isAway && (
                          <span className="text-yellow-600 dark:text-yellow-400 font-medium">• Frånvarande</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      admin.isOnline ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                      admin.isAway ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>
                      {admin.isOnline ? 'Online' : admin.isAway ? 'Frånvarande' : 'Offline'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPresence; 