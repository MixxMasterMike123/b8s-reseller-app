// WritersWagonPanel.jsx - React component for The Writer's Wagon™ integration
import React, { useState, useEffect } from 'react';
import { writersWagonAPI } from '../api/WritersWagonAPI.js';
import { getAllModels, getModelCost } from '../api/WritersWagonConfig.js';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { 
  SparklesIcon, 
  CogIcon, 
  DocumentTextIcon,
  MegaphoneIcon,
  EyeIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  ChartBarIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

const WritersWagonPanel = ({ productData, onContentGenerated, onClose }) => {
  const { currentUser } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [selectedContentType, setSelectedContentType] = useState('dual-content');
  const [previewMode, setPreviewMode] = useState(false);
  const [usageStats, setUsageStats] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 🚂 WAGON CONNECTION STATE
  const [wagonConnected, setWagonConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking'); // checking, disconnected, connecting, connected
  const [setupStep, setSetupStep] = useState(1); // 1: API Key, 2: Test, 3: Complete

  // Content type options
  const contentTypes = [
    {
      key: 'dual-content',
      name: 'Dubbelt innehåll (B2B + B2C)',
      icon: DocumentTextIcon,
      description: 'Genererar både teknisk B2B och marknadsförande B2C innehåll',
      color: 'text-blue-500'
    },
    {
      key: 'b2b-technical', 
      name: 'B2B Teknisk beskrivning',
      icon: CogIcon,
      description: 'Teknisk produktinformation för återförsäljare',
      color: 'text-gray-600'
    },
    {
      key: 'b2c-marketing',
      name: 'B2C Marknadsföring',
      icon: MegaphoneIcon, 
      description: 'Engagerande marknadsföringstext för konsumenter',
      color: 'text-orange-500'
    },
    {
      key: 'title-optimization',
      name: 'Titel optimering',
      icon: SparklesIcon,
      description: 'SEO-optimerade produkttitlar',
      color: 'text-green-500'
    }
  ];

  useEffect(() => {
    // Load initial usage stats
    setUsageStats(writersWagonAPI.getUsageStats());
  }, []);

  // 🚂 WAGON CONNECTION: Check if wagon is properly connected
  useEffect(() => {
    checkWagonConnection();
  }, []);

  const checkWagonConnection = async () => {
    setConnectionStatus('checking');
    
    try {
      // Check if user has configured their wagon
      const testResponse = await fetch('https://us-central1-b8shield-reseller-app.cloudfunctions.net/setupWritersWagon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'test',
          wagonId: 'writers-wagon',
          userId: currentUser?.uid || 'anonymous'
        })
      });

      const result = await testResponse.json();
      
      if (result.success && result.configured) {
        setWagonConnected(true);
        setConnectionStatus('connected');
      } else {
        setWagonConnected(false);
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      setWagonConnected(false);
      setConnectionStatus('disconnected');
    }
  };

  // 🚂 WAGON CONNECTION: Auto-connect wagon
  const connectWagon = async () => {
    setConnectionStatus('connecting');
    setSetupStep(1);

    try {
      // Step 1: API Key Setup
      const apiKey = prompt(
        'Ange din Claude API-nyckel:\n\n' +
        'Nyckeln lagras säkert och krypterat i databasen.\n' +
        'Du kan få en nyckel på: https://console.anthropic.com/\n\n' +
        'API-nyckel:'
      );
      
      if (!apiKey || !apiKey.startsWith('sk-ant-')) {
        alert('❌ Ogiltig API-nyckel. Nyckeln måste börja med "sk-ant-"');
        setConnectionStatus('disconnected');
        return;
      }

      setSetupStep(2);

      // Step 2: Configure wagon with user's API key
      const setupResponse = await fetch('https://us-central1-b8shield-reseller-app.cloudfunctions.net/setupWritersWagon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'setup',
          apiKey: apiKey,
          wagonId: 'writers-wagon',
          userId: currentUser?.uid || 'anonymous'
        })
      });

      const result = await setupResponse.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Setup failed');
      }

      setSetupStep(3);

      // Step 3: Test connection
      const connectionTestResponse = await fetch('https://us-central1-b8shield-reseller-app.cloudfunctions.net/setupWritersWagon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'test',
          wagonId: 'writers-wagon',
          userId: currentUser?.uid || 'anonymous'
        })
      });

      const testResult = await connectionTestResponse.json();
      
      if (testResult.success && testResult.configured) {
        setWagonConnected(true);
        setConnectionStatus('connected');
        alert('🎉 The Writer\'s Wagon™ är nu ansluten och redo att användas!');
      } else {
        throw new Error('Configuration verification failed');
      }

    } catch (error) {
      console.error('Wagon connection failed:', error);
      setConnectionStatus('disconnected');
      alert(`❌ Anslutning misslyckades: ${error.message}`);
    }
  };



  const handleGenerate = async () => {
    if (!productData) {
      setGenerationError('Ingen produktdata tillgänglig');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedContent(null);

    try {
      let result;
      const options = { userId: currentUser?.uid || 'anonymous' };
      
      switch (selectedContentType) {
        case 'b2b-technical':
          result = await writersWagonAPI.generateB2BContent(productData, options);
          break;
        case 'b2c-marketing':
          result = await writersWagonAPI.generateB2CContent(productData, options);
          break;
        case 'dual-content':
          result = await writersWagonAPI.generateDualContent(productData, options);
          break;
        case 'title-optimization':
          result = await writersWagonAPI.optimizeTitle(
            productData.name, 
            `Produkt: ${productData.description || ''} | Storlek: ${productData.size || ''}`,
            options
          );
          break;
        default:
          throw new Error(`Okänt innehållstyp: ${selectedContentType}`);
      }

      setGeneratedContent(result);
      setUsageStats(writersWagonAPI.getUsageStats());
      
      console.log('✅ Writer\'s Wagon: Content generated successfully', result);

    } catch (error) {
      console.error('❌ Writer\'s Wagon: Generation failed:', error);
      setGenerationError(`Generering misslyckades: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyContent = () => {
    if (generatedContent && onContentGenerated) {
      onContentGenerated(generatedContent);
      onClose();
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Visual feedback could be added here
      console.log('✅ Innehåll kopierat till urklipp');
    });
  };

  const formatCost = (cost) => {
    if (cost < 0.001) return '< 0.1 öre';
    return `${(cost * 100).toFixed(1)} öre`;
  };

  // 🚂 WAGON CONNECTION UI
  if (!wagonConnected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <SparklesIcon className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">The Writer's Wagon™</h1>
                  <p className="text-sm text-gray-600">AI-Powered Content Generation</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-red-600 font-medium">Ej ansluten</span>
              </div>
            </div>
          </div>

          {/* Connection Setup */}
          <div className="p-6">
            <div className="text-center">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Vagnen behöver anslutas</h2>
              <p className="text-gray-600 mb-6">
                The Writer's Wagon™ kräver en engångskonfiguration för att fungera med Claude AI.
                Detta sker automatiskt och tar bara några sekunder.
              </p>

              {connectionStatus === 'connecting' && (
                <div className="mb-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <div className="text-left">
                                                 <div className="font-medium text-blue-900">
                           Steg {setupStep} av 3: {
                             setupStep === 1 ? 'Konfigurera API-nyckel' :
                             setupStep === 2 ? 'Sparar konfiguration säkert' :
                             'Testar anslutning'
                           }
                         </div>
                         <div className="text-sm text-blue-700">
                           {setupStep === 1 ? 'Väntar på API-nyckel...' :
                            setupStep === 2 ? 'Krypterar och sparar API-nyckel...' :
                            'Testar AI-anslutning...'}
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={connectWagon}
                disabled={connectionStatus === 'connecting'}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {connectionStatus === 'connecting' ? 'Ansluter...' : '🚂 Anslut Vagn'}
              </button>

              <div className="mt-6 text-xs text-gray-500">
                <p>Denna process konfigurerar säkra backend-funktioner för AI-anrop.</p>
                <p>Din API-nyckel lagras säkert och exponeras aldrig i webbläsaren.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <SparklesIcon className="h-6 w-6" />
              <h2 className="text-xl font-semibold">The Writer's Wagon™</h2>
              <span className="bg-blue-500 bg-opacity-50 px-2 py-1 rounded text-sm">
                AI-Powered Content Generation
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-blue-100 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Product Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Produkt: {productData?.name || 'Okänd'}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              <div>Storlek: {productData?.size || 'Ej angivet'}</div>
              <div>Pris: {productData?.basePrice ? `${productData.basePrice} SEK` : 'Ej angivet'}</div>
            </div>
            {productData?.description && (
              <p className="mt-2 text-sm text-gray-700">
                Beskrivning: {productData.description}
              </p>
            )}
          </div>

          {/* Content Type Selection */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Välj innehållstyp</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {contentTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.key}
                    onClick={() => setSelectedContentType(type.key)}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      selectedContentType === type.key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Icon className={`h-5 w-5 mt-0.5 ${type.color}`} />
                      <div>
                        <h5 className="font-medium text-gray-900">{type.name}</h5>
                        <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="mb-6">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <CogIcon className="h-4 w-4" />
              <span className="text-sm">Avancerade inställningar</span>
            </button>
            
            {showAdvanced && (
              <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      AI-Modell
                    </label>
                    <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                      {getAllModels().map((model) => (
                        <option key={model.key} value={model.key}>
                          {model.name} - {model.cost} kostnad
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kreativitetsgrad
                    </label>
                    <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                      <option value="0.1">Mycket faktabaserat</option>
                      <option value="0.3">Balanserat (standard)</option>
                      <option value="0.5">Kreativt</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="mb-6">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                isGenerating
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isGenerating ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  <span>Genererar innehåll...</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5" />
                  <span>Generera innehåll</span>
                </>
              )}
            </button>
          </div>

          {/* Error Display */}
          {generationError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                <span className="text-red-700 font-medium">Fel uppstod</span>
              </div>
              <p className="text-red-600 text-sm mt-1">{generationError}</p>
            </div>
          )}

          {/* Generated Content Display */}
          {generatedContent && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Genererat innehåll</h4>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPreviewMode(!previewMode)}
                    className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    <EyeIcon className="h-4 w-4" />
                    <span>{previewMode ? 'Rå text' : 'Förhandsvisning'}</span>
                  </button>
                  <button
                    onClick={() => copyToClipboard(generatedContent.content)}
                    className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                    <span>Kopiera</span>
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
                {previewMode ? (
                  <div className="prose prose-sm" dangerouslySetInnerHTML={{
                    __html: generatedContent.content.replace(/\n/g, '<br>')
                  }} />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                    {generatedContent.content}
                  </pre>
                )}
              </div>

              {/* Metadata */}
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                <div>
                  <span className="font-medium">Modell:</span><br />
                  {generatedContent.model || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Tokens:</span><br />
                  {generatedContent.metadata?.tokenCount || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Kostnad:</span><br />
                  {formatCost(generatedContent.metadata?.estimatedCost || 0)}
                </div>
                <div>
                  <span className="font-medium">Genererad:</span><br />
                  {new Date(generatedContent.generatedAt).toLocaleTimeString('sv-SE')}
                </div>
              </div>
            </div>
          )}

          {/* Usage Stats */}
          {usageStats && (
            <div className="mb-6 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <ChartBarIcon className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Användningsstatistik</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs text-blue-700">
                <div>
                  <span className="font-medium">Förfrågningar:</span><br />
                  {usageStats.totalRequests}
                </div>
                <div>
                  <span className="font-medium">Total kostnad:</span><br />
                  {formatCost(usageStats.estimatedCost)}
                </div>
                <div>
                  <span className="font-medium">Snittskostnad:</span><br />
                  {formatCost(usageStats.averageCostPerRequest)}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Avbryt
            </button>
            {generatedContent && (
              <button
                onClick={handleApplyContent}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                <CheckIcon className="h-4 w-4" />
                <span>Använd innehåll</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WritersWagonPanel; 