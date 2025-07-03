import React, { useState } from 'react';
import { useAdminPresence } from '../hooks/useAdminPresence';
import { 
  UserGroupIcon, 
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

const AdminPresenceIndicator = () => {
  const { adminPresence, loading, onlineCount, totalAdmins } = useAdminPresence();
  const [isOpen, setIsOpen] = useState(false);

  if (loading || onlineCount === 0) {
    return null; // Don't show if loading or no admins online
  }

  const otherAdmins = adminPresence.filter(admin => admin.isOnline || admin.isAway);

  return (
    <div className="relative w-full">
      {/* Indicator Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors w-full"
      >
        <div className="relative">
          <UserGroupIcon className="h-5 w-5" />
          {onlineCount > 0 && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">{onlineCount}</span>
            </div>
          )}
        </div>
        <span className="flex-1 text-left">
          {onlineCount} admin{onlineCount !== 1 ? 's' : ''} online
        </span>
        {isOpen ? (
          <ChevronUpIcon className="h-4 w-4" />
        ) : (
          <ChevronDownIcon className="h-4 w-4" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute left-0 right-0 mt-1 mx-2 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-3">
              <div className="text-sm font-medium text-gray-900 mb-3">
                Aktiva Admins ({onlineCount}/{totalAdmins})
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {otherAdmins.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-2">
                    Inga andra admins online
                  </p>
                ) : (
                  otherAdmins.map((admin) => (
                    <div key={admin.id} className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        admin.isOnline ? 'bg-green-500' : 'bg-yellow-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {admin.email}
                        </div>
                        <div className="text-xs text-gray-500">
                          {admin.lastSeenFormatted}
                        </div>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                        admin.isOnline ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {admin.isOnline ? 'Online' : 'Frånvarande'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminPresenceIndicator;
