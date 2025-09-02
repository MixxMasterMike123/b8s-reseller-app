import React, { useState } from 'react';
import { InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

const LabelPrintInstructions = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm flex items-center gap-1"
        title="Hjälp med etikettutskrift"
      >
        <InformationCircleIcon className="h-4 w-4" />
        Hjälp
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                🏷️ Etikettutskrift för BT-M110
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                  📋 Så här fungerar det:
                </h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Klicka på "📄 Ladda ner etikett"</li>
                  <li>HTML-filen laddas ner och öppnas i Preview app</li>
                  <li>Tryck Cmd+P i Preview för att skriva ut</li>
                  <li>Välj din BT-M110 skrivare och tryck "Skriv ut"</li>
                </ol>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">
                  ✅ Anslutningsalternativ:
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>USB-kabel</strong> - Mest tillförlitligt</li>
                  <li><strong>Bluetooth</strong> - Trådlöst (para först i Windows/Mac)</li>
                  <li><strong>WiFi</strong> - Om skrivaren stöder det</li>
                </ul>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">
                  💡 Tips:
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Etiketter är optimerade för 40x60mm</li>
                  <li>Kan också sparas som PDF för senare utskrift</li>
                  <li>Fungerar med alla BT-M110 kompatibla skrivare</li>
                </ul>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-gray-300 mb-2">
                  🛒 Köp etiketter:
                </h4>
                <p className="text-xs">
                  <a 
                    href="https://www.clasohlson.com/se/Etikettskrivare-Bluetooth-BT-M110,-tradlos/p/44-5658"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    Clas Ohlson BT-M110 + 40x60mm etiketter →
                  </a>
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Förstått!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LabelPrintInstructions;
