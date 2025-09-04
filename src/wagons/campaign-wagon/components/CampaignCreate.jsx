import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  TrophyIcon,
  TagIcon,
  RocketLaunchIcon,
  CalendarIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import AppLayout from '../../../components/layout/AppLayout';
import ContentLanguageIndicator from '../../../components/ContentLanguageIndicator';
import { useContentTranslation } from '../../../hooks/useContentTranslation';
import { useCampaigns } from '../hooks/useCampaigns';
import { CAMPAIGN_TYPES, getDefaultCampaign } from '../utils/campaignUtils';
import toast from 'react-hot-toast';

const CampaignCreate = () => {
  const navigate = useNavigate();
  const { getContentValue, setContentValue } = useContentTranslation();
  const { addCampaign } = useCampaigns();
  
  // Form data state
  const [formData, setFormData] = useState(getDefaultCampaign());
  const [loading, setLoading] = useState(false);
  const [affiliates, setAffiliates] = useState([]);
  const [loadingAffiliates, setLoadingAffiliates] = useState(true);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Fetch affiliates and products for targeting
  useEffect(() => {
    fetchAffiliates();
    fetchProducts();
  }, []);

  const fetchAffiliates = async () => {
    try {
      const affiliatesQuery = query(collection(db, 'affiliates'), orderBy('createdAt', 'desc'));
      const affiliatesSnapshot = await getDocs(affiliatesQuery);
      const affiliatesData = affiliatesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(affiliate => affiliate.status === 'active'); // Only active affiliates
      
      setAffiliates(affiliatesData);
    } catch (error) {
      console.error('Error fetching affiliates:', error);
      toast.error('Kunde inte hämta affiliates');
    } finally {
      setLoadingAffiliates(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const productsQuery = query(collection(db, 'products'), orderBy('name', 'asc'));
      const productsSnapshot = await getDocs(productsQuery);
      const productsData = productsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(product => product.isActive !== false); // Only active products
      
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Kunde inte hämta produkter');
    } finally {
      setLoadingProducts(false);
    }
  };



  // Handle form field updates
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle affiliate selection
  const handleAffiliateSelection = (affiliateId) => {
    const currentSelected = formData.affiliateIds || [];
    let newSelected;
    
    if (currentSelected.includes(affiliateId)) {
      newSelected = currentSelected.filter(id => id !== affiliateId);
    } else {
      newSelected = [...currentSelected, affiliateId];
    }
    
    setFormData(prev => ({
      ...prev,
      affiliateIds: newSelected,
      selectedAffiliates: newSelected.length === 0 ? 'all' : 'selected'
    }));
  };

  // Handle product selection
  const handleProductSelection = (productId) => {
    const currentSelected = formData.productIds || [];
    let newSelected;
    
    if (currentSelected.includes(productId)) {
      newSelected = currentSelected.filter(id => id !== productId);
    } else {
      newSelected = [...currentSelected, productId];
    }
    
    setFormData(prev => ({
      ...prev,
      productIds: newSelected,
      applicableProducts: newSelected.length === 0 ? 'all' : 'selected'
    }));
  };

  // Form validation
  const validateStep = (step) => {
    switch (step) {
      case 1:
        return getContentValue(formData.name, 'sv-SE').trim() !== '';
      case 2:
        return formData.type && (formData.selectedAffiliates === 'all' || formData.affiliateIds?.length > 0);
      case 3:
        return formData.customAffiliateRate >= 0 && formData.customerDiscountRate >= 0;
      case 4:
        return formData.startDate && formData.endDate && new Date(formData.startDate) < new Date(formData.endDate);
      default:
        return true;
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateStep(4)) {
      toast.error('Vänligen fyll i alla obligatoriska fält');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Skapar kampanj...');

    try {
      const campaignId = await addCampaign(formData);
      
      if (campaignId) {
        toast.dismiss(toastId);
        toast.success('Kampanj skapad framgångsrikt!');
        navigate(`/admin/campaigns/${campaignId}`);
      } else {
        toast.dismiss(toastId);
        toast.error('Kunde inte skapa kampanj');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.dismiss(toastId);
      toast.error('Ett fel uppstod vid skapande av kampanj');
    } finally {
      setLoading(false);
    }
  };

  // Step navigation
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    } else {
      toast.error('Vänligen fyll i alla obligatoriska fält för detta steg');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Get campaign type icon
  const getCampaignTypeIcon = (type) => {
    const icons = {
      competition: TrophyIcon,
      offer: TagIcon,
      product_launch: RocketLaunchIcon,
      seasonal: CalendarIcon,
      special_discount: TagIcon
    };
    return icons[type] || TagIcon;
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                to="/admin/campaigns"
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Skapa Kampanj</h1>
                <p className="text-gray-600 mt-1">Campaign Wagon™ - Ny kampanj (Steg {currentStep} av {totalSteps})</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
              <React.Fragment key={step}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  step <= currentStep 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step}
                </div>
                {step < totalSteps && (
                  <div className={`flex-1 h-1 mx-2 ${
                    step < currentStep ? 'bg-purple-600' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Grundinfo</span>
            <span>Typ & Målgrupp</span>
            <span>Prissättning</span>
            <span>Schema & Lansering</span>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white shadow rounded-lg">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Grundläggande Information</h2>
              
              {/* Campaign Name - Multilingual */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kampanjnamn <span className="text-red-500">*</span>
                </label>
                <ContentLanguageIndicator 
                  contentField={formData.name}
                  label="Kampanjnamn"
                  className="mb-2"
                />
                <input
                  type="text"
                  value={getContentValue(formData.name)}
                  onChange={(e) => setFormData({
                    ...formData,
                    name: setContentValue(formData.name, e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  placeholder="T.ex. Sommartävling 2025"
                  required
                />
              </div>

              {/* Campaign Description - Multilingual */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beskrivning
                </label>
                <ContentLanguageIndicator 
                  contentField={formData.description}
                  label="Kampanjbeskrivning"
                  className="mb-2"
                />
                <textarea
                  value={getContentValue(formData.description)}
                  onChange={(e) => setFormData({
                    ...formData,
                    description: setContentValue(formData.description, e.target.value)
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Beskriv kampanjen..."
                />
              </div>

              {/* Affiliate Information - Multilingual (Only visible to affiliates) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Affiliate-information
                  <span className="text-xs text-gray-500 ml-2">(Synlig endast för affiliates)</span>
                </label>
                <ContentLanguageIndicator 
                  contentField={formData.affiliateInfo}
                  label="Affiliate-information"
                  className="mb-2"
                />
                <textarea
                  value={getContentValue(formData.affiliateInfo)}
                  onChange={(e) => setFormData({
                    ...formData,
                    affiliateInfo: setContentValue(formData.affiliateInfo, e.target.value)
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Speciell information endast för dina affiliates..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Denna information syns endast för affiliates i deras portal, inte för admins.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Campaign Type & Targeting */}
          {currentStep === 2 && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Kampanjtyp & Målgrupp</h2>
              
              {/* Campaign Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Kampanjtyp <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(CAMPAIGN_TYPES).map(([key, config]) => {
                    const IconComponent = getCampaignTypeIcon(key);
                    return (
                      <div
                        key={key}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          formData.type === key
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        onClick={() => handleFieldChange('type', key)}
                      >
                        <div className="flex items-center mb-2">
                          <IconComponent className="h-5 w-5 text-purple-600 mr-2" />
                          <span className="font-medium">{config.name}</span>
                        </div>
                        <p className="text-sm text-gray-600">{config.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Affiliate Targeting */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Affiliate-målgrupp <span className="text-red-500">*</span>
                </label>
                
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="affiliateTargeting"
                      value="all"
                      checked={formData.selectedAffiliates === 'all'}
                      onChange={(e) => handleFieldChange('selectedAffiliates', e.target.value)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm">Alla aktiva affiliates ({affiliates.length})</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="affiliateTargeting"
                      value="selected"
                      checked={formData.selectedAffiliates === 'selected'}
                      onChange={(e) => handleFieldChange('selectedAffiliates', e.target.value)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm">Valda affiliates ({(formData.affiliateIds || []).length} valda)</span>
                  </label>
                </div>

                {/* Show affiliate selection when "selected" is chosen */}
                {formData.selectedAffiliates === 'selected' && (
                  <div className="mt-4 border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                    {loadingAffiliates ? (
                      <div className="p-4 text-center text-gray-500">Laddar affiliates...</div>
                    ) : affiliates.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">Inga aktiva affiliates hittades</div>
                    ) : (
                      <div className="p-2">
                        {affiliates.map((affiliate) => (
                          <label key={affiliate.id} className="flex items-center p-2 hover:bg-gray-50 rounded">
                            <input
                              type="checkbox"
                              checked={(formData.affiliateIds || []).includes(affiliate.id)}
                              onChange={() => handleAffiliateSelection(affiliate.id)}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                            <div className="ml-3 flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {affiliate.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                Kod: {affiliate.affiliateCode} • Status: {affiliate.status}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Product Targeting */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Produktmålgrupp
                </label>
                
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="productTargeting"
                      value="all"
                      checked={formData.applicableProducts === 'all'}
                      onChange={(e) => handleFieldChange('applicableProducts', e.target.value)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm">Alla produkter ({products.length})</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="productTargeting"
                      value="selected"
                      checked={formData.applicableProducts === 'selected'}
                      onChange={(e) => handleFieldChange('applicableProducts', e.target.value)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm">Valda produkter ({(formData.productIds || []).length} valda)</span>
                  </label>
                </div>

                {/* Show product selection when "selected" is chosen */}
                {formData.applicableProducts === 'selected' && (
                  <div className="mt-4 border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                    {loadingProducts ? (
                      <div className="p-4 text-center text-gray-500">Laddar produkter...</div>
                    ) : products.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">Inga aktiva produkter hittades</div>
                    ) : (
                      <div className="p-2">
                        {products.map((product) => (
                          <label key={product.id} className="flex items-center p-2 hover:bg-gray-50 rounded">
                            <input
                              type="checkbox"
                              checked={(formData.productIds || []).includes(product.id)}
                              onChange={() => handleProductSelection(product.id)}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                            <div className="ml-3 flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {getContentValue(product.name) || product.name || 'Namnlös produkt'}
                              </div>
                              <div className="text-xs text-gray-500">
                                SKU: {product.sku} • {product.color || 'Ingen färg'} • {product.size || 'Ingen storlek'}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Pricing & Commissions */}
          {currentStep === 3 && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Prissättning & Provisioner</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Affiliate-provision (%) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.5"
                      value={formData.customAffiliateRate}
                      onChange={(e) => handleFieldChange('customAffiliateRate', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                    />
                    <CurrencyDollarIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Standard: 15%</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kundrabatt (%) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="30"
                      step="0.5"
                      value={formData.customerDiscountRate}
                      onChange={(e) => handleFieldChange('customerDiscountRate', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                    />
                    <TagIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Rabatt som kunden får vid checkout</p>
                </div>
              </div>

              {/* Lottery/Competition Settings */}
              {CAMPAIGN_TYPES[formData.type]?.supportsLottery && (
                <div className="mt-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isLottery}
                      onChange={(e) => handleFieldChange('isLottery', e.target.checked)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      Aktivera lotteri/tävlingssystem
                    </span>
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    Varje produktköp = 1 lott i tävlingen
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Schedule & Launch */}
          {currentStep === 4 && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Schema & Lansering</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Startdatum <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startDate ? new Date(formData.startDate).toISOString().slice(0, 16) : ''}
                    onChange={(e) => handleFieldChange('startDate', new Date(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slutdatum <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endDate ? new Date(formData.endDate).toISOString().slice(0, 16) : ''}
                    onChange={(e) => handleFieldChange('endDate', new Date(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Campaign Summary */}
              <div className="mt-8 bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Kampanjsammanfattning</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="font-medium text-gray-700">Namn:</dt>
                    <dd className="text-gray-900">{getContentValue(formData.name, 'sv-SE') || 'Ej angivet'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Typ:</dt>
                    <dd className="text-gray-900">{CAMPAIGN_TYPES[formData.type]?.name || 'Ej angivet'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Målgrupp:</dt>
                    <dd className="text-gray-900">
                      {formData.selectedAffiliates === 'all' 
                        ? `Alla affiliates (${affiliates.length})`
                        : `Valda affiliates (${(formData.affiliateIds || []).length})`
                      }
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Provision:</dt>
                    <dd className="text-gray-900">{formData.customAffiliateRate}%</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Kundrabatt:</dt>
                    <dd className="text-gray-900">{formData.customerDiscountRate}%</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-700">Lotteri:</dt>
                    <dd className="text-gray-900">{formData.isLottery ? 'Aktiverat' : 'Inaktiverat'}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                currentStep === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Föregående
            </button>
            
            <div className="flex space-x-3">
              <Link
                to="/admin/campaigns"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Avbryt
              </Link>
              
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Nästa
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Skapar...' : 'Skapa Kampanj'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CampaignCreate;