import React, { useState, useRef, useEffect } from 'react';

const getStatusStyles = (status) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'; // Waiting for confirmation
    case 'confirmed':
      return 'bg-blue-100 text-blue-800 border-blue-200'; // Confirmed
    case 'processing':
      return 'bg-purple-100 text-purple-800 border-purple-200'; // Processing
    case 'shipped':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200'; // Shipped
    case 'delivered':
      return 'bg-green-100 text-green-800 border-green-200'; // Delivered
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200'; // Cancelled
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'; // Unknown status
  }
};

const OrderStatusMenu = ({ currentStatus, onStatusChange, disabled, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Status options with shorter labels
  const statusOptions = [
    { value: 'pending', label: 'Väntar' },
    { value: 'confirmed', label: 'Bekräftad' },
    { value: 'processing', label: 'Behandlas' },
    { value: 'shipped', label: 'Skickad' },
    { value: 'delivered', label: 'Levererad' },
    { value: 'cancelled', label: 'Avbruten' }
  ];

  // Get current status label
  const getCurrentStatusLabel = () => {
    const status = statusOptions.find(option => option.value === currentStatus);
    return status ? status.label : 'Okänd';
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
    <div className={`relative inline-block ${className}`} ref={menuRef}>
      <button
        type="button"
        disabled={disabled}
        className={`inline-flex w-32 justify-center items-center px-4 py-2 text-sm font-medium rounded-md ${
          getStatusStyles(currentStatus)
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-80'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="mr-1">{getCurrentStatusLabel()}</span>
        <svg
          className="w-4 h-4"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-1 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                className={`flex items-center w-full px-3 py-1.5 text-xs ${
                  option.value === currentStatus
                    ? getStatusStyles(option.value)
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => handleStatusSelect(option.value)}
              >
                {option.value === currentStatus && (
                  <svg className="h-3 w-3 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
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