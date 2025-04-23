import React, { useState, useRef, useEffect } from 'react';

const OrderStatusMenu = ({ currentStatus, onStatusChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Status options
  const statusOptions = [
    { value: 'pending', label: 'Väntar på bekräftelse' },
    { value: 'confirmed', label: 'Bekräftad' },
    { value: 'processing', label: 'Under behandling' },
    { value: 'shipped', label: 'Skickad' },
    { value: 'delivered', label: 'Levererad' },
    { value: 'cancelled', label: 'Avbruten' }
  ];

  // Get current status label
  const getCurrentStatusLabel = () => {
    const status = statusOptions.find(option => option.value === currentStatus);
    return status ? status.label : 'Okänd status';
  };

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle status change
  const handleStatusSelect = (statusValue) => {
    onStatusChange(statusValue);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white rounded-md shadow-sm border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        {getCurrentStatusLabel()}
        <svg
          className="w-5 h-5 ml-2 -mr-1 inline-block"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  option.value === currentStatus
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => handleStatusSelect(option.value)}
              >
                {option.value === currentStatus && (
                  <svg className="h-5 w-5 inline-block mr-2 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderStatusMenu; 