import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import AppLayout from '../../components/layout/AppLayout';
import GoogleSheetsService from '../../utils/googleSheetsService';
import toast from 'react-hot-toast';
import { 
  LanguageIcon, 
  DocumentArrowDownIcon, 
  DocumentArrowUpIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  CogIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const AdminTranslations = () => {
  const { currentUser, userProfile } = useAuth();
  const { getAvailableLanguages, currentLanguage } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en-GB');
  const [translations, setTranslations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalStrings: 0,
    translatedStrings: 0,
    pendingStrings: 0,
    languages: []
  });

  // Google Sheets configuration
  const [sheetUrls, setSheetUrls] = useState({
    admin: 'https://docs.google.com/spreadsheets/d/1KUyrNujoFGQScQaiivK6ZH5H8ISSVK6onZnjXeiah3g/edit?gid=0#gid=0',
    b2b: '',
    b2c: '',
    content: 'https://docs.google.com/spreadsheets/d/1lrr7N6NEL3F0Xd4SFPviJaAkpxmxvTALFjpVIM5aoFQ/edit?gid=0#gid=0'
  });
  
  const [sheetsService] = useState(() => new GoogleSheetsService());

  // Check admin access
  if (!currentUser || userProfile?.role !== 'admin') {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900">Åtkomst nekad</h2>
          <p className="text-gray-600">Du har inte behörighet att komma åt denna sida.</p>
        </div>
      </AppLayout>
    );
  }

  const languages = getAvailableLanguages();

  const tabs = [
    { id: 'overview', name: 'Översikt', icon: GlobeAltIcon },
    { id: 'manage', name: 'Hantera översättningar', icon: DocumentTextIcon },
    { id: 'extract', name: 'Extrahera texter', icon: MagnifyingGlassIcon },
    { id: 'import-export', name: 'Import/Export', icon: DocumentArrowDownIcon },
    { id: 'settings', name: 'Inställningar', icon: CogIcon }
  ];

  // Load translations from Google Sheets
  const loadTranslationsFromSheet = async (sheetType = 'admin') => {
    const url = sheetUrls[sheetType];
    if (!url) {
      toast.error(`Ingen URL konfigurerad för ${sheetType} översättningar`);
      return;
    }

    setLoading(true);
    try {
      const data = await sheetsService.getSheetData(url);
      setTranslations(data);
      
      // Calculate stats
      const sheetStats = sheetsService.getSheetStats(data);
      setStats({
        totalStrings: sheetStats.total,
        translatedStrings: sheetStats.translated,
        pendingStrings: sheetStats.pending,
        languages: [
          { code: 'sv-SE', name: 'Svenska', progress: 100, strings: sheetStats.total },
          { 
            code: 'en-GB', 
            name: 'English (UK)', 
            progress: sheetStats.completionPercentage, 
            strings: sheetStats.translated 
          },
          { code: 'en-US', name: 'English (US)', progress: 0, strings: 0 }
        ]
      });
      
      toast.success(`Laddade ${data.length} översättningar från Google Sheets`);
    } catch (error) {
      console.error('Error loading translations:', error);
      toast.error(`Kunde inte ladda översättningar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    loadTranslationsFromSheet('admin');
  }, []);

  const handleExtractStrings = () => {
    toast.loading('Extraherar texter från koden...');
    
    // Simulate extraction process
    setTimeout(() => {
      toast.dismiss();
      toast.success('Hittade 23 nya texter att översätta!');
    }, 2000);
  };

  const handleExportToSheets = async () => {
    const toastId = toast.loading('Exporterar till Google Sheets...');
    
    try {
      // For now, we'll generate CSV for manual upload
      const filename = `translations_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
      sheetsService.downloadCSV(translations, filename);
      
      toast.success('CSV-fil nedladdad! Ladda upp till Google Sheets manuellt.', { id: toastId });
    } catch (error) {
      toast.error(`Export misslyckades: ${error.message}`, { id: toastId });
    }
  };

  const handleImportFromSheets = async () => {
    await loadTranslationsFromSheet('admin');
  };

  const handleLoadSheet = async (sheetType) => {
    await loadTranslationsFromSheet(sheetType);
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Totalt antal texter</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.totalStrings}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Översatta</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.translatedStrings}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Väntar på översättning</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.pendingStrings}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Language Progress */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Översättningsframsteg per språk</h3>
          <div className="space-y-4">
            {stats.languages.map((lang) => (
              <div key={lang.code}>
                <div className="flex justify-between text-sm font-medium text-gray-900 mb-1">
                  <span>{lang.name}</span>
                  <span>{lang.progress}% ({lang.strings}/{stats.totalStrings})</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      lang.progress === 100 ? 'bg-green-600' :
                      lang.progress > 50 ? 'bg-blue-600' :
                      lang.progress > 0 ? 'bg-yellow-600' : 'bg-gray-400'
                    }`}
                    style={{ width: `${lang.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Snabbåtgärder</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={handleExtractStrings}
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
              Extrahera nya texter
            </button>
            
            <button
              onClick={handleExportToSheets}
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              Exportera till Sheets
            </button>
            
            <button
              onClick={handleImportFromSheets}
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
              Importera från Sheets
            </button>
            
            <button
              onClick={() => setActiveTab('manage')}
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <PencilIcon className="h-5 w-5 mr-2" />
              Hantera översättningar
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderManageTranslations = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sök översättningar</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Sök efter nyckel eller text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Språk</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {languages.filter(lang => lang.code !== 'sv-SE').map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">Alla</option>
              <option value="translated">Översatta</option>
              <option value="pending">Väntar</option>
              <option value="needs-review">Behöver granskning</option>
            </select>
          </div>
        </div>
      </div>

      {/* Translations Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Översättningar</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nyckel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kontext</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Svenska</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {languages.find(l => l.code === selectedLanguage)?.name}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Åtgärder</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {translations.map((translation) => (
                <tr key={translation.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {translation.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {translation.context}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {translation.swedish}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    {selectedLanguage === 'en-GB' ? translation.englishUK : translation.englishUS || (
                      <span className="text-gray-400 italic">Ej översatt</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      translation.status === 'translated' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {translation.status === 'translated' ? 'Översatt' : 'Väntar'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderExtractStrings = () => (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Extrahera översättningsbara texter</h3>
        <p className="text-gray-600 mb-6">
          Skanna koden för att hitta alla texter som behöver översättas. Detta kommer att identifiera 
          svenska texter i komponenter, felmeddelanden, formulärvalidering och mer.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Automatisk extraktion</h4>
            <p className="text-sm text-gray-600 mb-4">
              Skanna hela kodbasen för svenska texter automatiskt.
            </p>
            <button
              onClick={handleExtractStrings}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Starta automatisk extraktion
            </button>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Manuell import</h4>
            <p className="text-sm text-gray-600 mb-4">
              Ladda upp en CSV-fil med översättningar.
            </p>
            <input
              type="file"
              accept=".csv"
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderImportExport = () => (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Google Sheets Integration</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Välj översättningstyp
            </label>
            <select 
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="admin">Admin Portal</option>
              <option value="b2b">B2B Portal</option>
              <option value="b2c">B2C Shop</option>
              <option value="content">Innehållsfält</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Importera från Google Sheets</h4>
              <p className="text-sm text-gray-600">
                Ladda översättningar från ditt Google Sheets-dokument
              </p>
              <button
                onClick={handleImportFromSheets}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? (
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                )}
                Importera från Sheets
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Exportera till CSV</h4>
              <p className="text-sm text-gray-600">
                Ladda ner CSV-fil för manuell uppladdning till Google Sheets
              </p>
              <button
                onClick={handleExportToSheets}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                Exportera till CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Konfigurerade Google Sheets</h3>
        
        <div className="space-y-4">
          {Object.entries(sheetUrls).map(([key, url]) => (
            <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-gray-900 capitalize">
                  {key === 'admin' ? 'Admin Portal' : 
                   key === 'b2b' ? 'B2B Portal' : 
                   key === 'b2c' ? 'B2C Shop' : 
                   'Innehållsfält'}
                </div>
                <div className="text-sm text-gray-500 truncate max-w-md">
                  {url || 'Inte konfigurerad'}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${url ? 'bg-green-500' : 'bg-gray-300'}`} />
                <button
                  onClick={() => handleLoadSheet(key)}
                  disabled={!url || loading}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                >
                  Testa
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Instruktioner</h3>
        
        <div className="space-y-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Steg 1: Konfigurera Google Sheets</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Gå till Inställningar-fliken</li>
              <li>Klistra in dina Google Sheets-URL:er</li>
              <li>Testa anslutningarna</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Steg 2: Importera översättningar</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Välj översättningstyp ovan</li>
              <li>Klicka "Importera från Sheets"</li>
              <li>Systemet läser automatiskt från Google Sheets</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Steg 3: Exportera för översättning</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Klicka "Exportera till CSV"</li>
              <li>Ladda upp CSV-filen till Google Sheets</li>
              <li>Översätt texterna i Google Sheets</li>
              <li>Importera tillbaka när översättningen är klar</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Google Sheets Konfiguration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Portal Översättningar
            </label>
            <input
              type="url"
              value={sheetUrls.admin}
              onChange={(e) => setSheetUrls(prev => ({ ...prev, admin: e.target.value }))}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleLoadSheet('admin')}
              className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              Testa anslutning
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              B2B Portal Översättningar
            </label>
            <input
              type="url"
              value={sheetUrls.b2b}
              onChange={(e) => setSheetUrls(prev => ({ ...prev, b2b: e.target.value }))}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleLoadSheet('b2b')}
              className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              Testa anslutning
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              B2C Shop Översättningar
            </label>
            <input
              type="url"
              value={sheetUrls.b2c}
              onChange={(e) => setSheetUrls(prev => ({ ...prev, b2c: e.target.value }))}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleLoadSheet('b2c')}
              className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              Testa anslutning
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Innehållsfält Översättningar
            </label>
            <input
              type="url"
              value={sheetUrls.content}
              onChange={(e) => setSheetUrls(prev => ({ ...prev, content: e.target.value }))}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleLoadSheet('content')}
              className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              Testa anslutning
            </button>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">API-inställningar</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google Sheets API-nyckel
            </label>
            <input
              type="password"
              placeholder="Din Google Sheets API-nyckel"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Behövs för att komma åt Google Sheets API. Konfigurera i .env-fil.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Språkinställningar</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Standardspråk
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="sv-SE">Svenska (Sverige)</option>
              <option value="en-GB">English (UK)</option>
              <option value="en-US">English (US)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Aktiverade språk
            </label>
            <div className="space-y-2">
              {languages.map(lang => (
                <label key={lang.code} className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked={lang.code === 'sv-SE'}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{lang.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t">
        <button
          onClick={() => toast.success('Inställningar sparade!')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Spara inställningar
        </button>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <LanguageIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Översättningshantering</h1>
              <p className="text-gray-600">Hantera språk och översättningar för hela systemet</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'manage' && renderManageTranslations()}
        {activeTab === 'extract' && renderExtractStrings()}
        {activeTab === 'import-export' && renderImportExport()}
        {activeTab === 'settings' && renderSettings()}
      </div>
    </AppLayout>
  );
};

export default AdminTranslations;
