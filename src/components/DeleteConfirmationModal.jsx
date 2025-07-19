import React, { useState } from 'react';
import { XMarkIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';

const DeleteConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  customerName, 
  customerEmail,
  confirmationText = "TA BORT",
  loading = false 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (inputValue.trim() !== confirmationText) {
      setError(`Du måste skriva exakt "${confirmationText}" för att bekräfta`);
      return;
    }
    setError('');
    onConfirm();
  };

  const handleClose = () => {
    setInputValue('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose}></div>

        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          {/* Header */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    {title}
                  </h3>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="rounded-md bg-gray-50 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 py-5 sm:p-6">
            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-4">
                Är du absolut säker på att du vill ta bort B2C-kunden <strong>"{customerName}"</strong>?
              </p>
              
              {customerEmail && (
                <p className="text-sm text-gray-600 mb-4">
                  E-post: <span className="font-mono text-gray-800">{customerEmail}</span>
                </p>
              )}

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-red-800 mb-2">
                      DETTA KOMMER ATT:
                    </h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      <li>• Ta bort kundkontot <strong>PERMANENT</strong> från systemet</li>
                      <li>• Ta bort Firebase Auth-kontot (om det finns)</li>
                      <li>• Bevara ordrar för redovisning (markerade som "Kund borttagen")</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      DENNA ÅTGÄRD KAN INTE ÅNGRAS!
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmation-input" className="block text-sm font-medium text-gray-700">
                  Skriv <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-800">"{confirmationText}"</span> för att bekräfta:
                </label>
                <input
                  id="confirmation-input"
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    if (error) setError('');
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleConfirm();
                    }
                  }}
                  className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm ${
                    error ? 'border-red-300' : ''
                  }`}
                  placeholder={`Skriv "${confirmationText}" här...`}
                  autoFocus
                />
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || inputValue.trim() !== confirmationText}
              className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Tar bort...
                </>
              ) : (
                <>
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Ta bort permanent
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto"
            >
              Avbryt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal; 