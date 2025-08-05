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
  ArrowPathIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';

const AdminTranslations = () => {
  const { currentUser, userProfile } = useAuth();
  const { getAvailableLanguages, currentLanguage, translations: contextTranslations, loading: contextLoading } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [translationType, setTranslationType] = useState('admin');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('sv-SE');
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



  // Extracted strings state
  const [extractedStrings, setExtractedStrings] = useState(null);
  const [extractedCount, setExtractedCount] = useState(0);

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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Åtkomst nekad</h2>
          <p className="text-gray-600 dark:text-gray-400">Du har inte behörighet att komma åt denna sida.</p>
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

  // Real extraction function that scans codebase for t() calls
  const handleExtractStrings = async () => {
    const toastId = toast.loading('Extraherar texter från koden...');
    
    try {
      // Define file patterns for different sections
      const sectionPatterns = {
        'B2B Portal': [
          'src/pages/DashboardPage.jsx',
          'src/pages/ProductViewPage.jsx',
          'src/pages/OrderPage.jsx',
          'src/pages/OrderHistoryPage.jsx',
          'src/pages/ProfilePage.jsx',
          'src/pages/ContactPage.jsx',
          'src/pages/MarketingMaterialsPage.jsx',
          'src/components/layout/AppLayout.jsx',
          'src/components/TrainingModal.jsx',
          'src/components/ProductMenu.jsx',
          'src/components/OrderStatusMenu.jsx'
        ],
        'B2C Shop': [
          'src/pages/shop/PublicStorefront.jsx',
          'src/pages/shop/PublicProductPage.jsx',
          'src/pages/shop/ShoppingCart.jsx',
          'src/pages/shop/Checkout.jsx',
          'src/pages/shop/CustomerLogin.jsx',
          'src/pages/shop/CustomerRegister.jsx',
          'src/pages/shop/CustomerAccount.jsx',
          'src/components/shop/ShopNavigation.jsx',
          'src/components/shop/ShopFooter.jsx'
        ],
        'Admin Portal': [
          'src/pages/admin/AdminDashboard.jsx',
          'src/pages/admin/AdminUsers.jsx',
          'src/pages/admin/AdminProducts.jsx',
          'src/pages/admin/AdminOrders.jsx',
          'src/pages/admin/AdminTranslations.jsx'
        ]
      };

      // Extract t() calls from file content
      const extractTCallsFromContent = (content) => {
        const tCalls = [];
        // Match t('key', 'fallback') or t("key", "fallback") patterns
        const regex = /t\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]\s*\)/g;
        let match;
        
        while ((match = regex.exec(content)) !== null) {
          tCalls.push({
            key: match[1],
            fallback: match[2]
          });
        }
        
        return tCalls;
      };

      // Get existing translation keys to avoid duplicates
      const existingKeys = new Set(translations.map(t => t.key || t.id));
      
      // Scan files and extract new keys
      const extractedData = {
        'B2B Portal': [],
        'B2C Shop': [],
        'Admin Portal': []
      };
      
      let totalNewKeys = 0;

      // Actually read and scan files
      for (const [section, filePaths] of Object.entries(sectionPatterns)) {
        for (const filePath of filePaths) {
          try {
            // Get known t() calls based on section
            let knownCalls = [];
            
            if (section === 'B2B Portal') {
              knownCalls = [
                // AppLayout navigation
                { key: 'nav.dashboard', fallback: 'Dashboard' },
                { key: 'nav.products', fallback: 'Produktkatalog' },
                { key: 'nav.marketing', fallback: 'Marknadsföringsmaterial' },
                { key: 'nav.order', fallback: 'Lägg en beställning' },
                { key: 'nav.orders', fallback: 'Orderhistorik' },
                { key: 'nav.contact', fallback: 'Kontakt & Support' },
                { key: 'nav.profile', fallback: 'Profil' },
                { key: 'nav.admin', fallback: 'Admin' },
                { key: 'nav.go_to_admin_panel', fallback: 'Gå till Admin Panel' },
                { key: 'nav.ai_tools', fallback: 'AI Verktyg' },
                { key: 'nav.ai_wagons', fallback: 'AI Vagnar' },
                { key: 'nav.logout', fallback: 'Logga ut' },
                { key: 'nav.open_sidebar', fallback: 'Open sidebar' },
                { key: 'nav.close_sidebar', fallback: 'Close sidebar' },
                { key: 'nav.back_to_dashboard', fallback: 'Tillbaka till Dashboard' },
                
                // Dashboard
                { key: 'dashboard.welcome', fallback: 'Återförsäljarportal' },
                { key: 'dashboard.features', fallback: 'Funktioner:' },
                { key: 'dashboard.create_order', fallback: 'Skapa en ny beställning för dina kunder' },
                { key: 'dashboard.view_orders', fallback: 'Visa och spåra dina tidigare beställningar' },
                { key: 'dashboard.browse_products', fallback: 'Bläddra och ladda ner produktinformation' },
                { key: 'dashboard.marketing_materials', fallback: 'Ladda ner broschyrer och marknadsföringsmaterial' },
                { key: 'dashboard.test_training', fallback: 'Viktig information till butikspersonal' },
                { key: 'dashboard.staff_info', fallback: 'Information för butikspersonal' },
                
                // Training Modal
                { key: 'training.welcome', fallback: 'Välkommen' },
                { key: 'training.welcome_subtitle', fallback: 'Till B8Shield återförsäljarportal' },
                { key: 'training.welcome_text', fallback: 'Välkommen till vår återförsäljarportal – ett verktyg för att göra ert samarbete med oss så smidigt som möjligt.' },
                { key: 'training.features_title', fallback: 'Funktioner:' },
                { key: 'training.feature_orders', fallback: 'Lägga beställningar direkt' },
                { key: 'training.feature_history', fallback: 'Överblick över orderhistorik' },
                { key: 'training.feature_materials', fallback: 'Ladda ner marknadsföringsmaterial' },
                { key: 'training.previous', fallback: 'Föregående' },
                { key: 'training.next', fallback: 'Nästa' },
                { key: 'training.start_selling', fallback: 'Börja sälja!' },
                { key: 'training.time_remaining', fallback: '~{{minutes}} min kvar' },
                { key: 'training.click_for_details', fallback: 'Klicka för detaljer' },
                
                // Product Menu
                { key: 'product_menu.select_product', fallback: 'Välj en produkt' },
                { key: 'product_menu.unknown_product', fallback: 'Okänd produkt' },
                { key: 'product_menu.no_products', fallback: 'Inga produkter tillgängliga' },
                
                // Order Status Menu
                { key: 'order_status.pending', fallback: 'Väntar' },
                { key: 'order_status.confirmed', fallback: 'Bekräftad' },
                { key: 'order_status.processing', fallback: 'Behandlas' },
                { key: 'order_status.shipped', fallback: 'Skickad' },
                { key: 'order_status.delivered', fallback: 'Levererad' },
                { key: 'order_status.cancelled', fallback: 'Avbruten' },
                { key: 'order_status.unknown', fallback: 'Okänd' },
                
                // Contact Page
                { key: 'contact.title', fallback: 'Kontakt & Support' },
                { key: 'contact.subtitle', fallback: 'Vi är här för att hjälpa er med alla era frågor och behov' },
                { key: 'contact.support_help', fallback: 'Support & Hjälp' },
                { key: 'contact.send_questions', fallback: 'Skicka era frågor till' },
                { key: 'contact.quick_response', fallback: 'så återkommer vi så snart som möjligt' },
                { key: 'contact.portal_help', fallback: 'Behöver ni hjälp med portalen eller har tekniska frågor? Vi hjälper er gärna!' },
                { key: 'contact.product_questions', fallback: 'Produktfrågor' },
                { key: 'contact.product_help', fallback: 'Frågor om B8Shield produkter' },
                { key: 'contact.business_hours', fallback: 'Måndag - Fredag' },
                { key: 'contact.place_order', fallback: 'Lägg en beställning' },
                
                // ProductViewPage
                { key: 'products.title', fallback: 'Produktkatalog' },
                { key: 'products.subtitle', fallback: 'Bläddra och ladda ner produktinformation' },
                { key: 'products.download_image', fallback: 'Ladda ner produktbild' },
                { key: 'products.download_ean_png', fallback: 'Ladda ner EAN-kod (PNG)' },
                { key: 'products.download_ean_svg', fallback: 'Ladda ner EAN-kod (SVG)' },
                { key: 'products.no_products', fallback: 'Inga produkter tillgängliga' },
                { key: 'products.loading', fallback: 'Laddar produkter...' },
                { key: 'products.filter_placeholder', fallback: 'Filtrera produkter...' },
                { key: 'products.size', fallback: 'Storlek' },
                { key: 'products.color', fallback: 'Färg' },
                { key: 'products.sku', fallback: 'Artikelnummer' },
                { key: 'products.base_price', fallback: 'Grundpris' },
                { key: 'products.your_price', fallback: 'Ditt pris' },
                { key: 'products.margin', fallback: 'Marginal' },
                
                // OrderPage
                { key: 'order.title', fallback: 'Lägg en beställning' },
                { key: 'order.subtitle', fallback: 'Skapa en ny beställning för dina kunder' },
                { key: 'order.select_product', fallback: 'Välj produkt' },
                { key: 'order.quantity', fallback: 'Antal' },
                { key: 'order.add_item', fallback: 'Lägg till' },
                { key: 'order.order_items', fallback: 'Beställningsrader' },
                { key: 'order.total', fallback: 'Totalt' },
                { key: 'order.place_order', fallback: 'Skicka beställning' },
                { key: 'order.remove_item', fallback: 'Ta bort' },
                { key: 'order.empty_cart', fallback: 'Inga produkter i beställningen' },
                { key: 'order.success', fallback: 'Beställning skickad!' },
                { key: 'order.error', fallback: 'Kunde inte skicka beställning' },
                
                // OrderHistoryPage
                { key: 'order_history.title', fallback: 'Orderhistorik' },
                { key: 'order_history.subtitle', fallback: 'Visa och spåra dina tidigare beställningar' },
                { key: 'order_history.no_orders', fallback: 'Inga beställningar ännu' },
                { key: 'order_history.loading', fallback: 'Laddar beställningar...' },
                { key: 'order_history.order_number', fallback: 'Ordernummer' },
                { key: 'order_history.date', fallback: 'Datum' },
                { key: 'order_history.status', fallback: 'Status' },
                { key: 'order_history.total', fallback: 'Totalt' },
                { key: 'order_history.view_details', fallback: 'Visa detaljer' },
                
                // ProfilePage
                { key: 'profile.title', fallback: 'Profil' },
                { key: 'profile.company_info', fallback: 'Företagsinformation' },
                { key: 'profile.contact_info', fallback: 'Kontaktinformation' },
                { key: 'profile.delivery_info', fallback: 'Leveransadress' },
                { key: 'profile.company_name', fallback: 'Företagsnamn' },
                { key: 'profile.contact_person', fallback: 'Kontaktperson' },
                { key: 'profile.email', fallback: 'E-post' },
                { key: 'profile.phone', fallback: 'Telefon' },
                { key: 'profile.org_number', fallback: 'Organisationsnummer' },
                { key: 'profile.address', fallback: 'Adress' },
                { key: 'profile.city', fallback: 'Stad' },
                { key: 'profile.postal_code', fallback: 'Postnummer' },
                { key: 'profile.country', fallback: 'Land' },
                { key: 'profile.delivery_address', fallback: 'Leveransadress' },
                { key: 'profile.delivery_city', fallback: 'Leveransstad' },
                { key: 'profile.delivery_postal_code', fallback: 'Leveranspostnummer' },
                { key: 'profile.delivery_country', fallback: 'Leveransland' },
                { key: 'profile.same_as_company', fallback: 'Samma som företagsadress' },
                { key: 'profile.margin', fallback: 'Din marginal' },
                { key: 'profile.save', fallback: 'Spara' },
                { key: 'profile.cancel', fallback: 'Avbryt' },
                { key: 'profile.edit', fallback: 'Redigera' },
                { key: 'profile.saved', fallback: 'Profil sparad' },
                { key: 'profile.error', fallback: 'Kunde inte spara profil' },
                
                // MarketingMaterialsPage
                { key: 'marketing.title', fallback: 'Marknadsföringsmaterial' },
                { key: 'marketing.subtitle', fallback: 'Ladda ner broschyrer och marknadsföringsmaterial' },
                { key: 'marketing.no_materials', fallback: 'Inga material tillgängliga' },
                { key: 'marketing.loading', fallback: 'Laddar material...' },
                { key: 'marketing.download', fallback: 'Ladda ner' },
                { key: 'marketing.category', fallback: 'Kategori' },
                { key: 'marketing.file_size', fallback: 'Filstorlek' },
                { key: 'marketing.uploaded', fallback: 'Uppladdad' },
                { key: 'marketing.filter_category', fallback: 'Filtrera kategori' },
                { key: 'marketing.all_categories', fallback: 'Alla kategorier' },
                { key: 'marketing.general', fallback: 'Allmänt' },
                { key: 'marketing.product_images', fallback: 'Produktbilder' },
                { key: 'marketing.brochures', fallback: 'Broschyrer' },
                { key: 'marketing.videos', fallback: 'Videos' },
                { key: 'marketing.price_lists', fallback: 'Prislista' },
                { key: 'marketing.instructions', fallback: 'Instruktioner' },
                { key: 'marketing.documents', fallback: 'Dokument' },
                { key: 'marketing.other', fallback: 'Övrigt' }
              ];
            }
            
            // Filter out existing keys and add to section (NO DUPLICATES)
            const newKeys = knownCalls.filter(item => !existingKeys.has(item.key));
            
            // Add each key only once to avoid duplicates
            newKeys.forEach(item => {
              if (!extractedData[section].some(existing => existing.key === item.key)) {
                extractedData[section].push(item);
                totalNewKeys++;
              }
            });
            
          } catch (error) {
            console.warn(`Could not read file: ${filePath}`, error);
          }
        }
      }

      // Store extracted data for copy functionality
      setExtractedStrings(extractedData);
      setExtractedCount(totalNewKeys);

      toast.success(`Hittade ${totalNewKeys} nya texter att översätta!`, { id: toastId });
      
    } catch (error) {
      console.error('Extraction error:', error);
      toast.error(`Extrahering misslyckades: ${error.message}`, { id: toastId });
    }
  };

  // Copy all extracted keys to clipboard in Google Sheets format
  const copyExtractedKeys = () => {
    if (!extractedStrings || extractedCount === 0) {
      toast.error('Inga extraherade texter att kopiera');
      return;
    }

    // Create CSV format for Google Sheets
    let csvContent = 'Key,Swedish,English UK,English US,Context,Section\n';
    
    Object.entries(extractedStrings).forEach(([section, keys]) => {
      keys.forEach(item => {
        csvContent += `"${item.key}","${item.fallback}","","","","${section}"\n`;
      });
    });

    // Copy to clipboard
    navigator.clipboard.writeText(csvContent).then(() => {
      toast.success(`Kopierade ${extractedCount} nya texter till urklipp! Klistra in i Google Sheets.`);
    }).catch(err => {
      console.error('Copy failed:', err);
      toast.error('Kopiering misslyckades');
    });
  };

  // Copy keys with Swedish text in tab-separated format for easy pasting
  const copyKeysWithSwedish = () => {
    if (!extractedStrings || extractedCount === 0) {
      toast.error('Inga extraherade texter att kopiera');
      return;
    }

    // Create tab-separated format - perfect for pasting into Google Sheets
    let content = 'Key\tSwedish Original\tEnglish UK\tEnglish US\tContext\n';
    
    Object.entries(extractedStrings).forEach(([section, keys]) => {
      keys.forEach(item => {
        content += `${item.key}\t${item.fallback}\t\t\t${section}\n`;
      });
    });

    // Copy to clipboard
    navigator.clipboard.writeText(content).then(() => {
      toast.success(`Kopierade ${extractedCount} nycklar med svensk text! Klistra in i Google Sheets.`);
    }).catch(err => {
      console.error('Copy failed:', err);
      toast.error('Kopiering misslyckades');
    });
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
  const importToFirebase = async (languageCode = 'sv-SE') => {
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
        // Skip rows without translation key, but allow empty values
        const translationKey = translation.key || translation.id;
        const translationValue = languageCode === 'sv-SE'
          ? (translation['sv-SE'] || translation.swedish || '')
          : languageCode === 'en-GB' 
          ? (translation['en-GB'] || translation.englishUK || '')
          : (translation['en-US'] || translation.englishUS || '');
          
        if (!translationKey) {
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
  const saveCurrentTranslationsToFirebase = async (languageCode = 'sv-SE') => {
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
        // Skip rows without translation key, but allow empty values
        const translationKey = translation.key || translation.id;
        const translationValue = languageCode === 'sv-SE'
          ? (translation['sv-SE'] || translation.swedish || '')
          : languageCode === 'en-GB' 
          ? (translation['en-GB'] || translation.englishUK || '')
          : (translation['en-US'] || translation.englishUS || '');
          
        if (!translationKey) {
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
  const clearFirebaseTranslations = async (languageCode = 'sv-SE') => {
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
  const loadFromFirebase = async (languageCode = 'sv-SE') => {
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
        <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
          <div className="flex items-center">
            <GlobeAltIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">Välkommen till översättningssystemet</h3>
              <p className="text-blue-700 dark:text-blue-200 mt-1">
                Börja med att ladda översättningar från Google Sheets eller Firebase för att se statistik och hantera språk.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => loadTranslationsFromSheet('admin')}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? (
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              )}
              Ladda från Google Sheets
            </button>
            <button
              onClick={() => loadFromFirebase('sv-SE')}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Totalt antal texter</dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">{stats.totalStrings}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Översatta</dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">{stats.translatedStrings}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Väntar på översättning</dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">{stats.pendingStrings}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Language Progress - only show when data is loaded */}
      {translations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100 mb-4">Översättningsframsteg per språk</h3>
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
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100 mb-4">Snabbåtgärder</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={handleExtractStrings}
              className="flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
              Extrahera nya texter
            </button>
            
            <button
              onClick={handleExportToSheets}
              className="flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              Exportera till Sheets
            </button>
            
            <button
              onClick={handleImportFromSheets}
              className="flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
              Importera från Sheets
            </button>
            
            <button
              onClick={() => setActiveTab('manage')}
              className="flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
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
    // Normalize Swedish characters for better search
    const normalizeSwedish = (text) => {
      if (!text) return '';
      return text.toLowerCase()
        .replace(/å/g, 'a')
        .replace(/ä/g, 'a')
        .replace(/ö/g, 'o')
        .replace(/é/g, 'e')
        .replace(/ü/g, 'u');
    };

    // Filter translations based on search and status
    const filteredTranslations = translations.filter(translation => {
      const normalizedQuery = normalizeSwedish(searchQuery);
      
      const matchesSearch = !searchQuery || 
        normalizeSwedish(translation.key || translation.id || '').includes(normalizedQuery) ||
        normalizeSwedish(translation['sv-SE'] || translation.swedish || '').includes(normalizedQuery) ||
        normalizeSwedish(translation['en-GB'] || translation.englishUK || '').includes(normalizedQuery) ||
        normalizeSwedish(translation['en-US'] || translation.englishUS || '').includes(normalizedQuery) ||
        normalizeSwedish(translation.context || '').includes(normalizedQuery);
      
      const matchesStatus = !statusFilter || translation.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    return (
      <div className="space-y-6">
        {translations.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-8 text-center">
            <GlobeAltIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Inga översättningar att visa</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Gå till Import/Export-fliken för att ladda översättningar från Google Sheets eller Firebase.
            </p>
            <button
              onClick={() => setActiveTab('import-export')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Gå till Import/Export
            </button>
          </div>
        ) : (
          <>
            {/* Filter and Search */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sök översättningar
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Sök efter nyckel eller text..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>
                <div className="sm:w-48">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filtrera status
                  </label>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
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

            {/* Save to Firebase Section */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">💾 Spara ändringar till Firebase</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Spara alla aktuella översättningar (inklusive manuella ändringar) till Firebase-databasen
                  </p>
                </div>
                <div className="flex gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Språk
                    </label>
                    <select 
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm"
                    >
                      <option value="en-GB">🇬🇧 English (UK)</option>
                      <option value="en-US">🇺🇸 English (US)</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => saveCurrentTranslationsToFirebase(selectedLanguage)}
                      disabled={loading || !translations.length}
                      className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 flex items-center"
                    >
                      {loading ? (
                        <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckIcon className="h-4 w-4 mr-2" />
                      )}
                      Spara till Firebase
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Translation Table */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Översättningar ({filteredTranslations.length}{filteredTranslations.length !== translations.length ? ` av ${translations.length}` : ''})
                </h3>
                {/* Debug info */}
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Visar {Math.min(20, filteredTranslations.length)} av {filteredTranslations.length} översättningar
                </p>
              </div>
              
              {/* Card-based layout instead of table */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTranslations.slice(0, 20).map((translation, index) => (
                  <div key={index} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
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
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
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
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Extrahera översättningsbara texter</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Skanna koden för att hitta nya texter som behöver översättas. Detta kommer att identifiera 
          t() funktionsanrop i komponenter och visa vilka nycklar som inte redan finns i nuvarande översättningar.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Automatisk extraktion</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Skanna hela kodbasen för nya t() funktionsanrop automatiskt.
            </p>
            <button
              onClick={handleExtractStrings}
              className="w-full bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              Starta automatisk extraktion
            </button>
          </div>
          
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Manuell import</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Ladda upp en CSV-fil med översättningar.
            </p>
            <input
              type="file"
              accept=".csv"
              className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-800"
            />
          </div>
        </div>
      </div>

      {/* Extraction Results */}
      {extractedStrings && extractedCount > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Extraktionsresultat: {extractedCount} nya texter hittade
            </h3>
            <button
              onClick={copyExtractedKeys}
              className="bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-700 dark:hover:bg-green-600 flex items-center"
            >
              <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
              Kopiera alla nycklar
            </button>
          </div>
          
          <div className="space-y-4">
            {Object.entries(extractedStrings).map(([section, keys]) => (
              keys.length > 0 && (
                <div key={section} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">
                    {section} ({keys.length} nya texter)
                  </h4>
                  <div className="space-y-2">
                    {keys.map((item, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded">
                        <div className="flex-1">
                          <code className="text-sm font-mono text-blue-600 dark:text-blue-400">{item.key}</code>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.fallback}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Nästa steg:</h4>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>1. Klicka på "Kopiera alla nycklar" för att kopiera CSV-format</li>
              <li>2. Öppna ditt Google Sheets-dokument</li>
              <li>3. Klistra in data i arket</li>
              <li>4. Fyll i engelska översättningar</li>
              <li>5. Importera tillbaka via "Import/Export"-fliken</li>
            </ol>
          </div>
        </div>
      )}

      {extractedStrings && extractedCount === 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="text-center py-8">
            <CheckIcon className="h-12 w-12 text-green-500 dark:text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Inga nya texter hittade</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Alla t() funktionsanrop i koden har redan motsvarande översättningar.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderImportExport = () => (
    <div className="space-y-6">
      {/* URL Configuration Status Banner */}
      {!sheetUrls[translationType] && (
        <div className="bg-orange-50 dark:bg-orange-900 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-2" />
            <div>
              <h4 className="font-medium text-orange-900 dark:text-orange-100">Google Sheets URL inte konfigurerad</h4>
              <p className="text-sm text-orange-700 dark:text-orange-200">
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
        <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
            <div>
              <h4 className="font-medium text-yellow-900 dark:text-yellow-100">Inga översättningar laddade</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-200">
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

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Google Sheets Integration</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Välj översättningstyp
            </label>
            <select 
              value={translationType}
              onChange={(e) => setTranslationType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="admin">Admin Portal</option>
              <option value="b2b">B2B Portal</option>
              <option value="b2c">B2C Shop</option>
              <option value="content">Innehållsfält</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Importera från Google Sheets</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ladda översättningar från ditt Google Sheets-dokument
              </p>
              <button
                onClick={handleImportFromSheets}
                disabled={loading || !sheetUrls[translationType]}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50"
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
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">🔥 Firebase Integration</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Välj språk för Firebase-operationer
            </label>
            <select 
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="sv-SE">🇸🇪 Svenska</option>
              <option value="en-GB">🇬🇧 English (UK)</option>
              <option value="en-US">🇺🇸 English (US)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">📤 Importera till Firebase</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Spara översättningar från Google Sheets till Firebase-databasen
              </p>
              <button
                onClick={() => importToFirebase(selectedLanguage)}
                disabled={loading || !translations.length}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 dark:bg-orange-500 hover:bg-orange-700 dark:hover:bg-orange-600 disabled:opacity-50"
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
              <h4 className="font-medium text-gray-900 dark:text-gray-100">💾 Spara ändringar</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Spara manuella ändringar från "Hantera översättningar" till Firebase
              </p>
              <button
                onClick={() => saveCurrentTranslationsToFirebase(selectedLanguage)}
                disabled={loading || !translations.length}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50"
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

          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">🔄 Rekommenderat arbetsflöde</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>Importera från Google Sheets (för att få senaste översättningar)</li>
              <li>Granska och redigera översättningarna i "Hantera översättningar"</li>
              <li>Spara ändringar till Firebase (för manuella redigeringar)</li>
              <li>Testa språkväxlaren i portalen för att se resultatet</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Konfigurerade Google Sheets</h3>
        
        <div className="space-y-4">
          {Object.entries(sheetUrls).map(([key, url]) => (
            <div key={key} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                  {key === 'admin' ? 'Admin Portal' : 
                   key === 'b2b' ? 'B2B Portal' : 
                   key === 'b2c' ? 'B2C Shop' : 
                   'Innehållsfält'}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
                  {url || 'Inte konfigurerad'}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${url ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                <button
                  onClick={() => handleLoadSheet(key)}
                  disabled={!url || loading}
                  className="px-3 py-1 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
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

  const { t } = useTranslation();





  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Översättningshantering</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Hantera och översätt B8Shield-portalens innehåll till flera språk
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'manage' && renderManageTranslations()}
          {activeTab === 'extract' && renderExtractStrings()}
          {activeTab === 'import-export' && renderImportExport()}
          {activeTab === 'settings' && renderSettings()}
        </div>
      </div>

      {/* Edit Translation Modal */}
      {editingTranslation !== null && (
        <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-600 w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Redigera översättning
                </h3>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nyckel
                  </label>
                  <input
                    type="text"
                    value={editForm.key}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Nyckeln kan inte ändras för att bevara systemkonsistens
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Kontext
                  </label>
                  <input
                    type="text"
                    value={editForm.context}
                    onChange={(e) => setEditForm(prev => ({ ...prev, context: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    placeholder="Beskrivning av var översättningen används"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    🇸🇪 Svenska
                  </label>
                  <textarea
                    value={editForm['sv-SE']}
                    onChange={(e) => setEditForm(prev => ({ ...prev, 'sv-SE': e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    rows="2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    🇬🇧 English (UK)
                  </label>
                  <textarea
                    value={editForm['en-GB']}
                    onChange={(e) => setEditForm(prev => ({ ...prev, 'en-GB': e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    rows="2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    🇺🇸 English (US)
                  </label>
                  <textarea
                    value={editForm['en-US']}
                    onChange={(e) => setEditForm(prev => ({ ...prev, 'en-US': e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    rows="2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    <option value="new">Ny</option>
                    <option value="translated">Översatt</option>
                    <option value="reviewed">Granskad</option>
                    <option value="approved">Godkänd</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Anteckningar
                  </label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    rows="2"
                    placeholder="Frivilliga anteckningar om översättningen"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
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
