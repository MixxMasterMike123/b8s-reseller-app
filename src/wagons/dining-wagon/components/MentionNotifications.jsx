import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMentionNotifications } from '../hooks/useMentionNotifications';
import { 
  BellIcon, 
  CheckIcon, 
  TrashIcon,
  ChatBubbleLeftRightIcon 
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolid } from '@heroicons/react/24/solid';

const MentionNotifications = () => {
  const { mentions, unreadCount, markAsRead, deleteMention, markAllAsRead } = useMentionNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const handleMentionClick = async (mention) => {
    // Mark as read immediately
    await markAsRead(mention.id);
    setIsOpen(false);
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const mentionDate = date.toDate ? date.toDate() : new Date(date);
    const diffMs = now - mentionDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'nu';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return mentionDate.toLocaleDateString('sv-SE');
  };

  return (
    <div className="relative z-10">
      {/* Notification Bell */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        title={unreadCount > 0 ? `${unreadCount} nya omnämnanden` : 'Omnämnanden'}
      >
        {unreadCount > 0 ? (
          <BellSolid className="h-6 w-6 text-orange-600" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        
        {/* Red notification badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[20px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu - Normal dropdown below the bell */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-[10000] max-h-80 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Omnämnanden ({mentions.length})
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {unreadCount} nya
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markAllAsRead();
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Markera alla som lästa
              </button>
            )}
          </div>

          {/* Mentions List */}
          <div className="max-h-96 overflow-y-auto">
            {mentions.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500">
                <BellIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Inga omnämnanden</p>
              </div>
            ) : (
              mentions.map((mention) => (
                <div
                  key={mention.id}
                  className={`border-b border-gray-100 last:border-b-0 ${
                    !mention.isRead ? 'bg-blue-50' : 'bg-white'
                  }`}
                >
                  <Link
                    to={`/admin/dining/contacts/${mention.contactId}?highlight=${mention.activityId}`}
                    onClick={() => handleMentionClick(mention)}
                    className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <ChatBubbleLeftRightIcon className="h-4 w-4 text-orange-600" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {mention.contactName}
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(mention.createdAt)}
                            </span>
                            {!mention.isRead && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-600 mt-1">
                          Omnämnd av {mention.mentionedByName}
                        </p>
                        
                        <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                          {mention.mentionText}
                        </p>
                      </div>
                    </div>
                  </Link>
                  
                  {/* Action buttons */}
                  <div className="px-4 pb-2 flex justify-end space-x-2">
                    {!mention.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(mention.id);
                        }}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-white hover:bg-blue-50 border border-blue-300 rounded transition-colors"
                        title="Markera som läst"
                      >
                        <CheckIcon className="h-3 w-3 mr-1" />
                        Läst
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMention(mention.id);
                      }}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 bg-white hover:bg-red-50 border border-red-300 rounded transition-colors"
                      title="Ta bort"
                    >
                      <TrashIcon className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {mentions.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                Klicka på ett omnämnande för att gå till aktiviteten
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9998]" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default MentionNotifications; 