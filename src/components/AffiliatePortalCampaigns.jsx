import React, { useState, useEffect } from 'react';
import { 
  MegaphoneIcon,
  ClipboardDocumentIcon,
  QrCodeIcon,
  CalendarIcon,
  TagIcon,
  TrophyIcon,
  RocketLaunchIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { 
  CheckIcon
} from '@heroicons/react/24/solid';
import { useContentTranslation } from '../hooks/useContentTranslation';
import { useTranslation } from '../contexts/TranslationContext';
import { useCampaigns } from '../wagons/campaign-wagon/hooks/useCampaigns';
import { generateAffiliateLink, getCountryAwareUrl } from '../utils/productUrls';
import { CAMPAIGN_STATUS } from '../wagons/campaign-wagon/utils/campaignUtils';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';

const AffiliatePortalCampaigns = ({ affiliateData }) => {
  const { t } = useTranslation();
  const { getContentValue } = useContentTranslation();
  const { campaigns, loading, error } = useCampaigns();
  
  const [availableCampaigns, setAvailableCampaigns] = useState([]);
  const [generatedLinks, setGeneratedLinks] = useState({});
  const [generatedQRs, setGeneratedQRs] = useState({});
  const [copyStatus, setCopyStatus] = useState({});

  // Filter campaigns available to this affiliate
  useEffect(() => {
    if (!campaigns || !affiliateData) return;

    const filtered = campaigns.filter(campaign => {
      // Only show active campaigns
      if (campaign.status !== 'active') return false;
      
      // Show campaigns that target all affiliates
      if (campaign.selectedAffiliates === 'all') return true;
      
      // Show campaigns that specifically target this affiliate
      if (campaign.selectedAffiliates === 'selected' && campaign.affiliateIds?.includes(affiliateData.id)) {
        return true;
      }
      
      return false;
    });

    setAvailableCampaigns(filtered);
  }, [campaigns, affiliateData]);

  // Generate campaign-specific affiliate link
  const generateCampaignLink = (campaign, productPath = '') => {
    if (!affiliateData?.affiliateCode || !campaign?.code) return '';
    
    // Create campaign-specific affiliate code: AFFILIATE_CODE-CAMPAIGN_CODE
    const campaignAffiliateCode = `${affiliateData.affiliateCode}-${campaign.code}`;
    
    return generateAffiliateLink(campaignAffiliateCode, affiliateData?.preferredLang, productPath);
  };

  // Generate QR Code for campaign
  const generateCampaignQR = async (campaignId, link) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(link, {
        width: 200,
        margin: 2,
        color: {
          dark: '#1f2937',
          light: '#ffffff'
        }
      });
      
      setGeneratedQRs(prev => ({
        ...prev,
        [campaignId]: qrDataUrl
      }));
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Fel vid generering av QR-kod');
    }
  };

  // Copy link to clipboard
  const copyToClipboard = async (campaignId, link) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopyStatus(prev => ({ ...prev, [campaignId]: true }));
      toast.success('Länk kopierad!');
      
      setTimeout(() => {
        setCopyStatus(prev => ({ ...prev, [campaignId]: false }));
      }, 2000);
    } catch (error) {
      toast.error('Kunde inte kopiera länk');
    }
  };

  // Get campaign type icon
  const getCampaignTypeIcon = (type) => {
    const icons = {
      competition: TrophyIcon,
      offer: TagIcon,
      product_launch: RocketLaunchIcon,
      seasonal: CalendarIcon
    };
    
    const IconComponent = icons[type] || MegaphoneIcon; 
    return <IconComponent className="h-5 w-5 text-purple-600" />;
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = CAMPAIGN_STATUS[status] || CAMPAIGN_STATUS.active;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor} border`}>
        {statusConfig.name}
      </span>
    );
  };

  // Safe campaign name rendering
  const safeGetCampaignName = (campaign) => {
    if (!campaign) return 'Namnlös kampanj';
    const name = getContentValue(campaign.name);
    if (typeof name === 'string' && name.trim()) return name;
    return campaign.code ? `Kampanj ${campaign.code}` : 'Namnlös kampanj';
  };

  // Safe campaign description rendering  
  const safeGetCampaignDescription = (campaign) => {
    if (!campaign) return '';
    const description = getContentValue(campaign.description);
    if (typeof description === 'string' && description.trim()) return description;
    return '';
  };

  // Generate link on component mount
  useEffect(() => {
    const links = {};
    availableCampaigns.forEach(campaign => {
      links[campaign.id] = generateCampaignLink(campaign);
    });
    setGeneratedLinks(links);
  }, [availableCampaigns, affiliateData]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-3 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Ett fel uppstod</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (availableCampaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <MegaphoneIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Inga aktiva kampanjer</h3>
        <p className="text-gray-600">Det finns inga kampanjer tillgängliga för dig just nu.</p>
        <p className="text-sm text-gray-500 mt-2">Kontakta din kampanjansvarig för mer information.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg p-6">
        <div className="flex items-center">
          <MegaphoneIcon className="h-8 w-8 mr-3" />
          <div>
            <h2 className="text-xl font-bold">Aktiva Kampanjer</h2>
            <p className="text-purple-100 mt-1">
              {availableCampaigns.length} kampanjer tillgängliga för dig
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {availableCampaigns.map((campaign) => {
          const campaignLink = generatedLinks[campaign.id];
          const qrCode = generatedQRs[campaign.id];
          const isCopied = copyStatus[campaign.id];

          return (
            <div key={campaign.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Campaign Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    {getCampaignTypeIcon(campaign.type)}
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {safeGetCampaignName(campaign)}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Kampanjkod: <span className="font-mono font-medium">{campaign.code}</span>
                      </p>
                      {safeGetCampaignDescription(campaign) && (
                        <p className="text-sm text-gray-600 mt-2">
                          {safeGetCampaignDescription(campaign)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(campaign.status)}
                  </div>
                </div>

                {/* Campaign Details */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  {campaign.startDate && (
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Start: {new Date(campaign.startDate).toLocaleDateString('sv-SE')}
                    </div>
                  )}
                  {campaign.endDate && (
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Slut: {new Date(campaign.endDate).toLocaleDateString('sv-SE')}
                    </div>
                  )}
                  {campaign.customerDiscountRate > 0 && (
                    <div className="flex items-center">
                      <TagIcon className="h-4 w-4 mr-2" />
                      Kundrabatt: {campaign.customerDiscountRate}%
                    </div>
                  )}
                </div>
              </div>

              {/* Campaign Link & Tools */}
              <div className="p-6">
                <div className="space-y-4">
                  {/* Generated Link */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Din kampanjspecifika länk:
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={campaignLink}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                      />
                      <button
                        onClick={() => copyToClipboard(campaign.id, campaignLink)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          isCopied 
                            ? 'bg-green-100 text-green-800 border border-green-300' 
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <CheckIcon className="h-4 w-4 mr-1 inline" />
                            Kopierad!
                          </>
                        ) : (
                          <>
                            <ClipboardDocumentIcon className="h-4 w-4 mr-1 inline" />
                            Kopiera
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* QR Code Section */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">QR-kod för delning:</p>
                      <p className="text-xs text-gray-500">Perfekt för sociala medier och utskrifter</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      {qrCode && (
                        <img 
                          src={qrCode} 
                          alt="QR Code" 
                          className="w-16 h-16 border border-gray-200 rounded"
                        />
                      )}
                      <button
                        onClick={() => generateCampaignQR(campaign.id, campaignLink)}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium transition-colors"
                      >
                        <QrCodeIcon className="h-4 w-4 mr-1 inline" />
                        {qrCode ? 'Uppdatera QR' : 'Generera QR'}
                      </button>
                    </div>
                  </div>

                  {/* Campaign Performance Info */}
                  {campaign.customAffiliateRate > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <p className="text-sm text-green-800">
                        <span className="font-medium">Din provision:</span> {campaign.customAffiliateRate}% per försäljning genom denna kampanj
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AffiliatePortalCampaigns;