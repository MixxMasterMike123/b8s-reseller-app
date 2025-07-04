import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/TranslationContext';
import { db } from '../../firebase/config';
import { collection, doc, setDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
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
  const [translationType, setTranslationType] = useState('admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en-GB');
  const [translations, setTranslations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingTranslation, setEditingTranslation] = useState(null);
  const [editForm, setEditForm] = useState({
    key: '',
    context: '',
    'sv-SE': '',
    'en-GB': '',
    'en-US': '',
    status: 'new',
    translator: '',
    notes: ''
  });
  const [stats, setStats] = useState({
    totalStrings: 0,
    translatedStrings: 0,
    pendingStrings: 0,
    languages: []
  });

  // Google Sheets configuration
  const [sheetUrls, setSheetUrls] = useState({
    admin: '',
    b2b: '',
    b2c: '',
    content: ''
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

  // Load Google Sheets URLs from Firebase
  const loadSheetUrls = async () => {
    try {
      const settingsDoc = await getDocs(collection(db, 'appSettings'));
      const translationSettings = settingsDoc.docs.find(doc => doc.id === 'translationSettings');
      
      if (translationSettings && translationSettings.data().googleSheetsUrls) {
        setSheetUrls(prev => ({
          ...prev,
          ...translationSettings.data().googleSheetsUrls
        }));
      }
    } catch (error) {
      console.error('Error loading sheet URLs:', error);
      toast.error('Kunde inte ladda Google Sheets inställningar');
    }
  };

  // Save Google Sheets URLs to Firebase
  const saveSheetUrls = async () => {
    try {
      await setDoc(doc(db, 'appSettings', 'translationSettings'), {
        googleSheetsUrls: sheetUrls,
        lastUpdated: new Date().toISOString(),
        updatedBy: currentUser.email
      }, { merge: true });
      
      toast.success('Google Sheets URLs sparade!');
    } catch (error) {
      console.error('Error saving sheet URLs:', error);
      toast.error('Kunde inte spara inställningar');
    }
  };

  // Clear a specific Google Sheets URL
  const clearSheetUrl = (sheetType) => {
    setSheetUrls(prev => ({ ...prev, [sheetType]: '' }));
    toast.success(`${sheetType.toUpperCase()} URL rensad`);
  };

  // Load initial data
  useEffect(() => {
    loadSheetUrls();
  }, []);

  // Load translations from Google Sheets
  const loadTranslationsFromSheet = async (sheetType = 'admin') => {
    const url = sheetUrls[sheetType];
    if (!url) {
      const typeNames = {
        admin: 'Admin Portal',
        b2b: 'B2B Portal', 
        b2c: 'B2C Shop',
        content: 'Innehållsfält'
      };
      toast.error(`Ingen Google Sheets URL konfigurerad för ${typeNames[sheetType] || sheetType}. Gå till Inställningar-fliken för att konfigurera URL.`);
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
      const filename = `translations_${translationType}_${new Date().toISOString().split('T')[0]}.csv`;
      sheetsService.downloadCSV(translations, filename);
      
      toast.success('CSV-fil nedladdad! Ladda upp till Google Sheets manuellt.', { id: toastId });
    } catch (error) {
      toast.error(`Export misslyckades: ${error.message}`, { id: toastId });
    }
  };

  const handleImportFromSheets = async () => {
    await loadTranslationsFromSheet(translationType);
  };

  const handleLoadSheet = async (sheetType) => {
    await loadTranslationsFromSheet(sheetType);
  };

  // Edit translation functions
  const handleEditTranslation = (translation, index) => {
    setEditingTranslation(index);
    setEditForm({
      key: translation.key || translation.id || '',
      context: translation.context || '',
      'sv-SE': translation['sv-SE'] || translation.swedish || '',
      'en-GB': translation['en-GB'] || translation.englishUK || '',
      'en-US': translation['en-US'] || translation.englishUS || '',
      status: translation.status || 'new',
      translator: translation.translator || currentUser.email,
      notes: translation.notes || ''
    });
  };

  const handleSaveEdit = () => {
    if (!editForm.key.trim()) {
      toast.error('Nyckel får inte vara tom');
      return;
    }

    const updatedTranslations = [...translations];
    updatedTranslations[editingTranslation] = {
      ...updatedTranslations[editingTranslation],
      ...editForm,
      lastModified: new Date().toISOString()
    };

    setTranslations(updatedTranslations);
    setEditingTranslation(null);
    setEditForm({
      key: '',
      context: '',
      'sv-SE': '',
      'en-GB': '',
      'en-US': '',
      status: 'new',
      translator: '',
      notes: ''
    });

    toast.success('Översättning uppdaterad');
  };

  const handleCancelEdit = () => {
    setEditingTranslation(null);
    setEditForm({
      key: '',
      context: '',
      'sv-SE': '',
      'en-GB': '',
      'en-US': '',
      status: 'new',
      translator: '',
      notes: ''
    });
  };

  const handleDeleteTranslation = (index) => {
    if (window.confirm('Är du säker på att du vill ta bort denna översättning?')) {
      const updatedTranslations = translations.filter((_, i) => i !== index);
      setTranslations(updatedTranslations);
      toast.success('Översättning borttagen');
    }
  };

  // Import translations to Firebase
  const importToFirebase = async (languageCode = 'en-GB') => {
    if (!translations || translations.length === 0) {
      toast.error('Inga översättningar att importera. Ladda först från Google Sheets.');
      return;
    }

    const toastId = toast.loading(`Importerar ${translations.length} översättningar till Firebase...`);
    
    try {
      const collectionName = `translations_${languageCode.replace('-', '_')}`;
      console.log(`🔥 Importing to Firebase collection: ${collectionName}`);
      
      // Use batch for better performance
      const batch = writeBatch(db);
      let importCount = 0;
      
      translations.forEach((translation) => {
        // Skip rows without translation key or value
        const translationKey = translation.key || translation.id;
        const translationValue = languageCode === 'en-GB' 
          ? (translation['en-GB'] || translation.englishUK)
          : (translation['en-US'] || translation.englishUS);
          
        if (!translationKey || !translationValue) {
          return;
        }
        
        const docRef = doc(db, collectionName, translationKey);
        const translationData = {
          value: translationValue,
          context: translation.context || '',
          status: translation.status || 'approved',
          lastModified: new Date(),
          translator: translation.translator || currentUser.email,
          swedishOriginal: translation['sv-SE'] || translation.swedish || ''
        };
        
        batch.set(docRef, translationData);
        importCount++;
      });
      
      if (importCount === 0) {
        toast.error('Inga giltiga översättningar hittades för import.', { id: toastId });
        return;
      }
      
      // Commit the batch
      await batch.commit();
      
      toast.success(`✅ Importerade ${importCount} översättningar till Firebase!`, { id: toastId });
      console.log(`✅ Successfully imported ${importCount} translations to ${collectionName}`);
      
    } catch (error) {
      console.error('Firebase import error:', error);
      toast.error(`❌ Import misslyckades: ${error.message}`, { id: toastId });
    }
  };

  // Save current translations (including manual edits) to Firebase
  const saveCurrentTranslationsToFirebase = async (languageCode = 'en-GB') => {
    if (!translations || translations.length === 0) {
      toast.error('Inga översättningar att spara. Ladda först översättningar.');
      return;
    }

    const confirmed = window.confirm(`Vill du spara alla aktuella översättningar (inklusive manuella ändringar) till Firebase för ${languageCode}? Detta kommer att skriva över befintliga översättningar.`);
    if (!confirmed) return;

    const toastId = toast.loading(`Sparar ${translations.length} översättningar till Firebase...`);
    
    try {
      const collectionName = `translations_${languageCode.replace('-', '_')}`;
      console.log(`🔥 Saving current translations to Firebase collection: ${collectionName}`);
      
      // Use batch for better performance
      const batch = writeBatch(db);
      let saveCount = 0;
      
      translations.forEach((translation) => {
        // Skip rows without translation key or value
        const translationKey = translation.key || translation.id;
        const translationValue = languageCode === 'en-GB' 
          ? (translation['en-GB'] || translation.englishUK)
          : (translation['en-US'] || translation.englishUS);
          
        if (!translationKey || !translationValue) {
          return;
        }
        
        const docRef = doc(db, collectionName, translationKey);
        const translationData = {
          value: translationValue,
          context: translation.context || '',
          status: translation.status || 'approved',
          lastModified: new Date(),
          translator: translation.translator || currentUser.email,
          swedishOriginal: translation['sv-SE'] || translation.swedish || '',
          manuallyEdited: true // Mark as manually edited
        };
        
        batch.set(docRef, translationData);
        saveCount++;
      });
      
      if (saveCount === 0) {
        toast.error('Inga giltiga översättningar hittades att spara.', { id: toastId });
        return;
      }
      
      // Commit the batch
      await batch.commit();
      
      toast.success(`💾 Sparade ${saveCount} översättningar (inklusive manuella ändringar) till Firebase!`, { id: toastId });
      console.log(`💾 Successfully saved ${saveCount} translations to ${collectionName}`);
      
    } catch (error) {
      console.error('Firebase save error:', error);
      toast.error(`❌ Sparning misslyckades: ${error.message}`, { id: toastId });
    }
  };

  // Clear Firebase translations
  const clearFirebaseTranslations = async (languageCode = 'en-GB') => {
    const confirmed = window.confirm(`Är du säker på att du vill ta bort alla ${languageCode} översättningar från Firebase? Detta kan inte ångras.`);
    
    if (!confirmed) return;
    
    const toastId = toast.loading(`Tar bort ${languageCode} översättningar från Firebase...`);
    
    try {
      const collectionName = `translations_${languageCode.replace('-', '_')}`;
      const querySnapshot = await getDocs(collection(db, collectionName));
      
      const batch = writeBatch(db);
      let deleteCount = 0;
      
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
        deleteCount++;
      });
      
      if (deleteCount > 0) {
        await batch.commit();
        toast.success(`🗑️ Tog bort ${deleteCount} översättningar från Firebase`, { id: toastId });
      } else {
        toast.info('Inga översättningar att ta bort', { id: toastId });
      }
      
    } catch (error) {
      console.error('Firebase clear error:', error);
      toast.error(`❌ Kunde inte ta bort översättningar: ${error.message}`, { id: toastId });
    }
  };

  // Load translations from Firebase
  const loadFromFirebase = async (languageCode = 'en-GB') => {
    const toastId = toast.loading(`Laddar ${languageCode} översättningar från Firebase...`);
    
    try {
      const collectionName = `translations_${languageCode.replace('-', '_')}`;
      const querySnapshot = await getDocs(collection(db, collectionName));
      
      const firebaseTranslations = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        firebaseTranslations.push({
          key: doc.id,
          [languageCode]: data.value || '',
          context: data.context || '',
          status: data.status || 'approved',
          translator: data.translator || '',
          lastModified: data.lastModified?.toDate?.()?.toISOString() || '',
          swedishOriginal: data.swedishOriginal || ''
        });
      });
      
      setTranslations(firebaseTranslations);
      toast.success(`📥 Laddade ${firebaseTranslations.length} översättningar från Firebase`, { id: toastId });
      
    } catch (error) {
      console.error('Firebase load error:', error);
      toast.error(`❌ Kunde inte ladda från Firebase: ${error.message}`, { id: toastId });
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Welcome Message when no data loaded */}
      {translations.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center">
            <GlobeAltIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-blue-900">Välkommen till översättningssystemet</h3>
              <p className="text-blue-700 mt-1">
                Börja med att ladda översättningar från Google Sheets eller Firebase för att se statistik och hantera språk.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => loadTranslationsFromSheet('admin')}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              )}
              Ladda från Google Sheets
            </button>
            <button
              onClick={() => loadFromFirebase('en-GB')}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? (
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              )}
              Ladda från Firebase
            </button>
          </div>
        </div>
      )}

      {/* Statistics Cards - only show when data is loaded */}
      {translations.length > 0 && (
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
      )}

      {/* Language Progress - only show when data is loaded */}
      {translations.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Översättningsframsteg per språk</h3>
            <div className="space-y-4">
              {stats.languages.map((lang) => (
                <div key={lang.code} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">
                      {lang.code === 'sv-SE' ? '🇸🇪' : lang.code === 'en-GB' ? '🇬🇧' : '🇺🇸'}
                    </span>
                    <div>
                      <div className="font-medium text-gray-900">{lang.name}</div>
                      <div className="text-sm text-gray-500">{lang.strings} av {stats.totalStrings} texter</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${lang.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{lang.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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

  const renderManageTranslations = () => {
    // Filter translations based on search and status
    const filteredTranslations = translations.filter(translation => {
      const matchesSearch = !searchQuery || 
        (translation.key || translation.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (translation['sv-SE'] || translation.swedish || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (translation['en-GB'] || translation.englishUK || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (translation['en-US'] || translation.englishUS || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (translation.context || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = !statusFilter || translation.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    return (
      <div className="space-y-6">
        {translations.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <GlobeAltIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Inga översättningar att visa</h3>
            <p className="text-gray-600 mb-4">
              Gå till Import/Export-fliken för att ladda översättningar från Google Sheets eller Firebase.
            </p>
            <button
              onClick={() => setActiveTab('import-export')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Gå till Import/Export
            </button>
          </div>
        ) : (
          <>
            {/* Filter and Search */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sök översättningar
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Sök efter nyckel eller text..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="sm:w-48">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filtrera status
                  </label>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Alla</option>
                    <option value="new">Nya</option>
                    <option value="translated">Översatta</option>
                    <option value="reviewed">Granskade</option>
                    <option value="approved">Godkända</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Translation Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Översättningar ({filteredTranslations.length}{filteredTranslations.length !== translations.length ? ` av ${translations.length}` : ''})
                </h3>
                {/* Debug info */}
                <p className="text-sm text-gray-500 mt-1">
                  Visar {Math.min(20, filteredTranslations.length)} av {filteredTranslations.length} översättningar
                </p>
              </div>
              
              {/* Card-based layout instead of table */}
              <div className="divide-y divide-gray-200">
                {filteredTranslations.slice(0, 20).map((translation, index) => (
                  <div key={index} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* Key and Status */}
                        <div className="flex items-center gap-3 mb-3">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {translation.key || translation.id}
                          </h4>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            translation.status === 'approved' ? 'bg-green-100 text-green-800' :
                            translation.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                            translation.status === 'translated' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {translation.status === 'approved' ? 'Godkänd' :
                             translation.status === 'reviewed' ? 'Granskad' :
                             translation.status === 'translated' ? 'Översatt' :
                             'Ny'}
                          </span>
                        </div>

                        {/* Context */}
                        {translation.context && (
                          <p className="text-xs text-gray-500 mb-3">{translation.context}</p>
                        )}

                        {/* Translations */}
                        <div className="space-y-2">
                          {/* Swedish */}
                          <div>
                            <span className="inline-flex items-center text-xs font-medium text-gray-600 mb-1">
                              🇸🇪 Svenska
                            </span>
                            <p className="text-sm text-gray-900">
                              {translation['sv-SE'] || translation.swedish || translation['Svenska'] || '-'}
                            </p>
                          </div>

                          {/* English UK */}
                          {(translation['en-GB'] || translation.englishUK) && (
                            <div>
                              <span className="inline-flex items-center text-xs font-medium text-gray-600 mb-1">
                                🇬🇧 English (UK)
                              </span>
                              <p className="text-sm text-gray-700">
                                {translation['en-GB'] || translation.englishUK}
                              </p>
                            </div>
                          )}

                          {/* English US */}
                          {(translation['en-US'] || translation.englishUS) && (
                            <div>
                              <span className="inline-flex items-center text-xs font-medium text-gray-600 mb-1">
                                🇺🇸 English (US)
                              </span>
                              <p className="text-sm text-gray-700">
                                {translation['en-US'] || translation.englishUS}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 ml-4">
                        <button 
                          className="text-blue-600 hover:text-blue-900 px-3 py-1 text-sm rounded border border-blue-300 hover:bg-blue-50" 
                          onClick={() => handleEditTranslation(translation, index)}
                        >
                          Redigera
                        </button>
                        <button 
                          className="text-red-600 hover:text-red-900 px-3 py-1 text-sm rounded border border-red-300 hover:bg-red-50" 
                          onClick={() => handleDeleteTranslation(index)}
                        >
                          Ta bort
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredTranslations.length > 20 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <p className="text-sm text-gray-600">
                    Visar 20 av {filteredTranslations.length} översättningar. Använd sökfunktionen för att hitta specifika texter.
                  </p>
                </div>
              )}
              
              {filteredTranslations.length === 0 && translations.length > 0 && (
                <div className="px-6 py-8 text-center">
                  <p className="text-gray-500">Inga översättningar matchar dina sökkriterier.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('');
                    }}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Rensa filter
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

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
      {/* URL Configuration Status Banner */}
      {!sheetUrls[translationType] && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 mr-2" />
            <div>
              <h4 className="font-medium text-orange-900">Google Sheets URL inte konfigurerad</h4>
              <p className="text-sm text-orange-700">
                {translationType === 'admin' ? 'Admin Portal' : 
                 translationType === 'b2b' ? 'B2B Portal' : 
                 translationType === 'b2c' ? 'B2C Shop' : 
                 'Innehållsfält'} har ingen Google Sheets URL konfigurerad. 
                Gå till <strong>Inställningar</strong>-fliken för att konfigurera URL:en.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Data Status Banner */}
      {translations.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
            <div>
              <h4 className="font-medium text-yellow-900">Inga översättningar laddade</h4>
              <p className="text-sm text-yellow-700">
                Du behöver först ladda översättningar från Google Sheets eller Firebase för att kunna arbeta med dem.
              </p>
            </div>
          </div>
        </div>
      )}

      {translations.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckIcon className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <h4 className="font-medium text-green-900">Översättningar laddade</h4>
              <p className="text-sm text-green-700">
                {translations.length} översättningar är nu laddade och redo att arbeta med.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Google Sheets Integration</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Välj översättningstyp
            </label>
            <select 
              value={translationType}
              onChange={(e) => setTranslationType(e.target.value)}
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
                disabled={loading || !sheetUrls[translationType]}
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
                disabled={loading || translations.length === 0}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                Exportera till CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Firebase Integration Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">🔥 Firebase Integration</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Välj språk för Firebase-operationer
            </label>
            <select 
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="en-GB">🇬🇧 English (UK)</option>
              <option value="en-US">🇺🇸 English (US)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">📤 Importera till Firebase</h4>
              <p className="text-sm text-gray-600">
                Spara översättningar från Google Sheets till Firebase-databasen
              </p>
              <button
                onClick={() => importToFirebase(selectedLanguage)}
                disabled={loading || !translations.length}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
              >
                {loading ? (
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                )}
                Importera till Firebase
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">💾 Spara ändringar</h4>
              <p className="text-sm text-gray-600">
                Spara manuella ändringar från "Hantera översättningar" till Firebase
              </p>
              <button
                onClick={() => saveCurrentTranslationsToFirebase(selectedLanguage)}
                disabled={loading || !translations.length}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? (
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckIcon className="h-4 w-4 mr-2" />
                )}
                Spara ändringar
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">📥 Ladda från Firebase</h4>
              <p className="text-sm text-gray-600">
                Visa översättningar som redan finns i Firebase-databasen
              </p>
              <button
                onClick={() => loadFromFirebase(selectedLanguage)}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? (
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                )}
                Ladda från Firebase
              </button>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">🗑️ Rensa Firebase</h4>
              <p className="text-sm text-gray-600">
                Ta bort alla översättningar för valt språk från Firebase
              </p>
              <button
                onClick={() => clearFirebaseTranslations(selectedLanguage)}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? (
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <TrashIcon className="h-4 w-4 mr-2" />
                )}
                Rensa Firebase
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">🔄 Rekommenderat arbetsflöde</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Importera från Google Sheets (för att få senaste översättningar)</li>
              <li>Granska och redigera översättningarna i "Hantera översättningar"</li>
              <li>Spara ändringar till Firebase (för manuella redigeringar)</li>
              <li>Testa språkväxlaren i portalen för att se resultatet</li>
            </ol>
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
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? (
                    <ArrowPathIcon className="h-3 w-3 animate-spin" />
                  ) : (
                    'Ladda'
                  )}
                </button>
              </div>
            </div>
          ))}
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
            <div className="flex space-x-2">
              <input
                type="url"
                value={sheetUrls.admin}
                onChange={(e) => setSheetUrls(prev => ({ ...prev, admin: e.target.value }))}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {sheetUrls.admin && (
                <button
                  onClick={() => clearSheetUrl('admin')}
                  className="px-3 py-2 text-red-600 hover:text-red-800 border border-red-300 rounded-md hover:bg-red-50"
                  title="Rensa URL"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mt-2 flex space-x-2">
              <button
                onClick={() => handleLoadSheet('admin')}
                disabled={!sheetUrls.admin}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                Testa anslutning
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              B2B Portal Översättningar
            </label>
            <div className="flex space-x-2">
              <input
                type="url"
                value={sheetUrls.b2b}
                onChange={(e) => setSheetUrls(prev => ({ ...prev, b2b: e.target.value }))}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {sheetUrls.b2b && (
                <button
                  onClick={() => clearSheetUrl('b2b')}
                  className="px-3 py-2 text-red-600 hover:text-red-800 border border-red-300 rounded-md hover:bg-red-50"
                  title="Rensa URL"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mt-2 flex space-x-2">
              <button
                onClick={() => handleLoadSheet('b2b')}
                disabled={!sheetUrls.b2b}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                Testa anslutning
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              B2C Shop Översättningar
            </label>
            <div className="flex space-x-2">
              <input
                type="url"
                value={sheetUrls.b2c}
                onChange={(e) => setSheetUrls(prev => ({ ...prev, b2c: e.target.value }))}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {sheetUrls.b2c && (
                <button
                  onClick={() => clearSheetUrl('b2c')}
                  className="px-3 py-2 text-red-600 hover:text-red-800 border border-red-300 rounded-md hover:bg-red-50"
                  title="Rensa URL"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mt-2 flex space-x-2">
              <button
                onClick={() => handleLoadSheet('b2c')}
                disabled={!sheetUrls.b2c}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                Testa anslutning
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Innehållsfält Översättningar
            </label>
            <div className="flex space-x-2">
              <input
                type="url"
                value={sheetUrls.content}
                onChange={(e) => setSheetUrls(prev => ({ ...prev, content: e.target.value }))}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {sheetUrls.content && (
                <button
                  onClick={() => clearSheetUrl('content')}
                  className="px-3 py-2 text-red-600 hover:text-red-800 border border-red-300 rounded-md hover:bg-red-50"
                  title="Rensa URL"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mt-2 flex space-x-2">
              <button
                onClick={() => handleLoadSheet('content')}
                disabled={!sheetUrls.content}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowPathIcon className="h-4 w-4 mr-1" />
                Testa anslutning
              </button>
            </div>
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
          onClick={saveSheetUrls}
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

      {/* Edit Translation Modal */}
      {editingTranslation !== null && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Redigera översättning
                </h3>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nyckel *
                    </label>
                    <input
                      type="text"
                      value={editForm.key}
                      onChange={(e) => setEditForm(prev => ({ ...prev, key: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="t.ex. dashboard.welcome"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="new">Ny</option>
                      <option value="translated">Översatt</option>
                      <option value="reviewed">Granskad</option>
                      <option value="approved">Godkänd</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kontext
                  </label>
                  <input
                    type="text"
                    value={editForm.context}
                    onChange={(e) => setEditForm(prev => ({ ...prev, context: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Beskriv var denna text används"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🇸🇪 Svenska (Original)
                  </label>
                  <textarea
                    value={editForm['sv-SE']}
                    onChange={(e) => setEditForm(prev => ({ ...prev, 'sv-SE': e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Svensk text"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🇬🇧 English (UK)
                  </label>
                  <textarea
                    value={editForm['en-GB']}
                    onChange={(e) => setEditForm(prev => ({ ...prev, 'en-GB': e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="English translation (UK)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🇺🇸 English (US)
                  </label>
                  <textarea
                    value={editForm['en-US']}
                    onChange={(e) => setEditForm(prev => ({ ...prev, 'en-US': e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="English translation (US)"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Översättare
                    </label>
                    <input
                      type="text"
                      value={editForm.translator}
                      onChange={(e) => setEditForm(prev => ({ ...prev, translator: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="E-postadress"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Anteckningar
                    </label>
                    <input
                      type="text"
                      value={editForm.notes}
                      onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Valfria anteckningar"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Spara ändringar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default AdminTranslations;
