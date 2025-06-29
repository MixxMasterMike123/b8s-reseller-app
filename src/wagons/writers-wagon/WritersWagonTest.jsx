// WritersWagonTest.jsx - Test component for The Writer's Wagon™
import React, { useState } from 'react';
import WritersWagonPanel from './components/WritersWagonPanel.jsx';
import { SparklesIcon, BeakerIcon } from '@heroicons/react/24/outline';

const WritersWagonTest = () => {
  const [showPanel, setShowPanel] = useState(false);
  const [testResults, setTestResults] = useState([]);

  // Sample B8Shield product data for testing
  const testProduct = {
    name: 'B8Shield Original - Transparent',
    size: 'Medium (15-25cm)',
    basePrice: 149,
    manufacturingCost: 45,
    description: 'Transparent skyddshylsa för fiskebeten som förhindrar skador och förluster under fiske. Perfekt för dyrbara beten och professionell användning.'
  };

  const handleContentGenerated = (content) => {
    const result = {
      timestamp: new Date().toLocaleString('sv-SE'),
      contentType: content.contentType,
      model: content.model,
      cost: content.metadata?.estimatedCost || 0,
      tokenCount: content.metadata?.tokenCount || 0,
      preview: content.content.substring(0, 200) + '...'
    };
    
    setTestResults(prev => [result, ...prev]);
    console.log('🎯 Writer\'s Wagon Test: Content generated', content);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <SparklesIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">The Writer's Wagon™</h1>
              <p className="text-gray-600">AI-Powered Content Generation Test Interface</p>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">🚀 Test Environment Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-800">API Key:</span><br />
                <span className="text-blue-600">
                  {import.meta.env.VITE_CLAUDE_API_KEY ? 
                    '✅ Konfigurerad' : 
                    '❌ Saknas - lägg till i .env.local'
                  }
                </span>
              </div>
              <div>
                <span className="font-medium text-blue-800">React Integration:</span><br />
                <span className="text-green-600">✅ Redo</span>
              </div>
              <div>
                <span className="font-medium text-blue-800">Test Product:</span><br />
                <span className="text-green-600">✅ {testProduct.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* API Key Setup Instructions */}
        {!import.meta.env.VITE_CLAUDE_API_KEY && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-yellow-900 mb-3">🔑 API Key Setup Required</h3>
            <p className="text-yellow-800 mb-3">
              För att testa The Writer's Wagon™, lägg till din Claude API-nyckel:
            </p>
            <div className="bg-yellow-100 rounded p-3 font-mono text-sm">
              <p className="mb-2">1. Skapa eller uppdatera <code>.env.local</code> filen:</p>
              <pre className="text-yellow-900">VITE_CLAUDE_API_KEY=your-claude-api-key-here</pre>
              <p className="mt-2">2. Starta om utvecklingsservern: <code>npm run dev</code></p>
            </div>
          </div>
        )}

        {/* Test Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Test Product Display */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <BeakerIcon className="h-5 w-5 mr-2 text-gray-600" />
              Testprodukt
            </h3>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Namn:</span> {testProduct.name}</div>
              <div><span className="font-medium">Storlek:</span> {testProduct.size}</div>
              <div><span className="font-medium">Pris:</span> {testProduct.basePrice} SEK</div>
              <div><span className="font-medium">Kostnad:</span> {testProduct.manufacturingCost} SEK</div>
              <div><span className="font-medium">Beskrivning:</span></div>
              <p className="text-gray-600 italic">{testProduct.description}</p>
            </div>
          </div>

          {/* Test Actions */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Test Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => setShowPanel(true)}
                disabled={!import.meta.env.VITE_CLAUDE_API_KEY}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  !import.meta.env.VITE_CLAUDE_API_KEY
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <SparklesIcon className="h-5 w-5" />
                <span>Öppna The Writer's Wagon™</span>
              </button>
              
              {testResults.length > 0 && (
                <button
                  onClick={clearResults}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Rensa testresultat
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Testresultat ({testResults.length})
            </h3>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {result.contentType} - {result.timestamp}
                    </span>
                    <div className="text-sm text-gray-600">
                      {result.tokenCount} tokens • {(result.cost * 100).toFixed(2)} öre
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Modell: {result.model}
                  </div>
                  <div className="bg-gray-50 rounded p-3 text-sm">
                    <div className="font-medium text-gray-700 mb-1">Förhandsvisning:</div>
                    <p className="text-gray-600">{result.preview}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-8">
          <p>The Writer's Wagon™ • AI-Powered Content Generation för B8Shield</p>
          <p>Byggd med Claude 3.5 Sonnet och React</p>
        </div>
      </div>

      {/* Writers Wagon Panel */}
      {showPanel && (
        <WritersWagonPanel
          productData={testProduct}
          onContentGenerated={handleContentGenerated}
          onClose={() => setShowPanel(false)}
        />
      )}
    </div>
  );
};

export default WritersWagonTest; 