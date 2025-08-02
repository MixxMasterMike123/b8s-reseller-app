import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../../components/layout/AppLayout';
import { useAmbassadorContacts } from '../hooks/useAmbassadorContacts';
import {
  UserPlusIcon,
  ArrowLeftIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  MapPinIcon,
  TagIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ShareIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const AmbassadorContactForm = () => {
  const navigate = useNavigate();
  const { addContact, loading } = useAmbassadorContacts();

  const [formData, setFormData] = useState({
    // Basic info
    name: '',
    email: '',
    phone: '',
    businessEmail: '',
    managementContact: '',
    
    // Location
    country: 'Sverige',
    language: 'sv-SE',
    timezone: 'Europe/Stockholm',
    
    // Social media platforms
    platforms: {
      instagram: { handle: '', followers: 0, url: '' },
      youtube: { handle: '', subscribers: 0, url: '' },
      tiktok: { handle: '', followers: 0, url: '' },
      facebook: { handle: '', followers: 0, url: '' },
      twitter: { handle: '', followers: 0, url: '' },
      linkedin: { handle: '', followers: 0, url: '' }
    },
    
    // Important links
    websiteUrl: '',
    mediaKitUrl: '',
    rateCardUrl: '',
    portfolioUrls: [],
    
    // Categorization
    category: 'fishing',
    influencerTier: 'nano', // Will be calculated automatically
    
    // Tracking & Status
    status: 'prospect',
    priority: 'medium',
    tags: [],
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [newTag, setNewTag] = useState('');
  const [newPortfolioUrl, setNewPortfolioUrl] = useState('');

  // Calculate influencer tier based on highest platform followers
  const calculateInfluencerTier = (platforms) => {
    const maxFollowers = Math.max(
      ...Object.values(platforms).map(p => p.followers || p.subscribers || 0)
    );
    
    if (maxFollowers >= 1000000) return 'mega';
    if (maxFollowers >= 100000) return 'macro'; 
    if (maxFollowers >= 10000) return 'micro';
    return 'nano';
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Handle platform changes
  const handlePlatformChange = (platform, field, value) => {
    setFormData(prev => {
      const newPlatforms = {
        ...prev.platforms,
        [platform]: {
          ...prev.platforms[platform],
          [field]: field === 'followers' || field === 'subscribers' ? parseInt(value) || 0 : value
        }
      };
      
      return {
        ...prev,
        platforms: newPlatforms,
        influencerTier: calculateInfluencerTier(newPlatforms)
      };
    });
  };

  // Add tag to contact
  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  // Remove tag from contact
  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Handle Enter key for tags
  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Add portfolio URL
  const handleAddPortfolioUrl = () => {
    if (newPortfolioUrl.trim() && !formData.portfolioUrls.includes(newPortfolioUrl.trim())) {
      setFormData(prev => ({
        ...prev,
        portfolioUrls: [...prev.portfolioUrls, newPortfolioUrl.trim()]
      }));
      setNewPortfolioUrl('');
    }
  };

  // Remove portfolio URL
  const handleRemovePortfolioUrl = (urlToRemove) => {
    setFormData(prev => ({
      ...prev,
      portfolioUrls: prev.portfolioUrls.filter(url => url !== urlToRemove)
    }));
  };

  // Generate handle name from social media platforms if name is empty
  const generateHandleName = (platforms) => {
    // Priority order for handle selection
    const platformPriority = ['instagram', 'tiktok', 'youtube', 'twitter', 'facebook', 'linkedin'];
    
    for (const platform of platformPriority) {
      if (platforms[platform]?.handle?.trim()) {
        return `@${platforms[platform].handle.replace('@', '')}`;
      }
    }
    
    return 'Prospect'; // Fallback for prospects with no handles
  };

  // Validate form - RELAXED: No mandatory fields
  const validateForm = () => {
    const newErrors = {};
    
    // Only validate email format if provided
    if (formData.email.trim() && !/^[^\@]+@[^\@]+\.[^\@]+$/.test(formData.email)) {
      newErrors.email = 'Ogiltig email-adress';
    }
    
    // No mandatory fields - ambassadors can be prospects without complete info
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Vänligen kontrollera formuläret för fel');
      return;
    }
    
    try {
      // Generate display name: use provided name or handle name for prospects
      const displayName = formData.name.trim() || generateHandleName(formData.platforms);
      
      const ambassadorData = {
        ...formData,
        name: displayName, // Use generated handle name if no name provided
        // Keep all platforms (even without followers for prospects)
        platforms: Object.fromEntries(
          Object.entries(formData.platforms).filter(([key, platform]) => 
            platform.handle || platform.followers > 0 || platform.subscribers > 0
          )
        ),
        createdBy: 'admin'
      };
      
      const contactId = await addContact(ambassadorData);
      toast.success('Ambassadör tillagd framgångsrikt!');
      navigate(`/admin/ambassadors/prospects/${contactId}`);
    } catch (error) {
      console.error('Error adding ambassador:', error);
      toast.error('Kunde inte lägga till ambassadör');
    }
  };

  // Get tier badge
  const getTierBadge = (tier) => {
    const styles = {
      nano: 'bg-green-100 text-green-800',
      micro: 'bg-blue-100 text-blue-800',
      macro: 'bg-purple-100 text-purple-800',
      mega: 'bg-yellow-100 text-yellow-800'
    };
    
    const labels = {
      nano: 'Nano (1K-10K)',
      micro: 'Mikro (10K-100K)',
      macro: 'Makro (100K-1M)',
      mega: 'Mega (1M+)'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[tier]}`}>
        {labels[tier]}
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center">
            <Link
              to="/admin/ambassadors/prospects"
              className="mr-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <UserPlusIcon className="h-8 w-8 text-purple-600 mr-3" />
                Ny Ambassadör
              </h1>
              <p className="text-gray-600 mt-1">Lägg till influencer-prospekt - fyll i så mycket du vet, resten kan kompletteras senare</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-6">
              <UserIcon className="h-6 w-6 text-purple-600 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Grundläggande Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Namn <span className="text-gray-400 text-xs">(används @handle om tomt)</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-purple-500 focus:border-purple-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Influencerns fullständiga namn (valfritt för prospects)"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-gray-400 text-xs">(valfritt)</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-purple-500 focus:border-purple-500 ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="kontakt@example.com (kan lämnas tomt för prospects)"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  placeholder="+46 70 123 45 67"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Affärs-email</label>
                <input
                  type="email"
                  name="businessEmail"
                  value={formData.businessEmail}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  placeholder="business@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Management Kontakt</label>
                <input
                  type="text"
                  name="managementContact"
                  value={formData.managementContact}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Manager/agent kontaktinfo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Land</label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="Sverige">Sverige</option>
                  <option value="Norge">Norge</option>
                  <option value="Danmark">Danmark</option>
                  <option value="Finland">Finland</option>
                  <option value="Tyskland">Tyskland</option>
                  <option value="Storbritannien">Storbritannien</option>
                  <option value="USA">USA</option>
                  <option value="Annat">Annat</option>
                </select>
              </div>
            </div>
          </div>

          {/* Social Media Platforms */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <ShareIcon className="h-6 w-6 text-purple-600 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Social Media Plattformar</h2>
                <div className="ml-4">
                  {getTierBadge(formData.influencerTier)}
                </div>
              </div>
              <p className="text-sm text-gray-500">Lägg till så många du känner till</p>
            </div>

            <div className="space-y-6">
              {Object.entries(formData.platforms).map(([platform, data]) => (
                <div key={platform} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3 capitalize">
                    {platform === 'youtube' ? 'YouTube' : platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Handle/Användarnamn</label>
                      <input
                        type="text"
                        value={data.handle}
                        onChange={(e) => handlePlatformChange(platform, 'handle', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        placeholder={`@${platform}handle`}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {platform === 'youtube' ? 'Prenumeranter' : 'Följare'}
                      </label>
                      <input
                        type="number"
                        value={platform === 'youtube' ? data.subscribers : data.followers}
                        onChange={(e) => handlePlatformChange(
                          platform, 
                          platform === 'youtube' ? 'subscribers' : 'followers', 
                          e.target.value
                        )}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        placeholder="10000"
                        min="0"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                      <input
                        type="url"
                        value={data.url}
                        onChange={(e) => handlePlatformChange(platform, 'url', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        placeholder={`https://${platform}.com/username`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Important Links */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-6">
              <GlobeAltIcon className="h-6 w-6 text-purple-600 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Viktiga Länkar</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Webbsida</label>
                <input
                  type="url"
                  name="websiteUrl"
                  value={formData.websiteUrl}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  placeholder="https://www.example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Media Kit URL</label>
                <input
                  type="url"
                  name="mediaKitUrl"
                  value={formData.mediaKitUrl}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  placeholder="https://drive.google.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rate Card URL</label>
                <input
                  type="url"
                  name="rateCardUrl"
                  value={formData.rateCardUrl}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Prislista för samarbeten"
                />
              </div>
            </div>

            {/* Portfolio URLs */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Portfolio-länkar</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="url"
                  value={newPortfolioUrl}
                  onChange={(e) => setNewPortfolioUrl(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                  placeholder="https://example.com/portfolio"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPortfolioUrl())}
                />
                <button
                  type="button"
                  onClick={handleAddPortfolioUrl}
                  className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100"
                >
                  Lägg till
                </button>
              </div>
              
              {formData.portfolioUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.portfolioUrls.map((url, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                      {url}
                      <button
                        type="button"
                        onClick={() => handleRemovePortfolioUrl(url)}
                        className="ml-2 text-purple-600 hover:text-purple-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status and Priority */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-6">
              <StarIcon className="h-6 w-6 text-purple-600 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Status & Prioritet</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="prospect">Prospekt</option>
                  <option value="contacted">Kontaktad</option>
                  <option value="negotiating">Förhandlar</option>
                  <option value="converted">Konverterad</option>
                  <option value="declined">Avböjd</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prioritet</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="low">Låg</option>
                  <option value="medium">Medium</option>
                  <option value="high">Hög</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="fishing">Fiske</option>
                  <option value="outdoor">Outdoor</option>
                  <option value="lifestyle">Livsstil</option>
                  <option value="sports">Sport</option>
                  <option value="travel">Resor</option>
                  <option value="other">Annat</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-6">
              <TagIcon className="h-6 w-6 text-purple-600 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Taggar</h2>
            </div>
            
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                placeholder="Lägg till tagg (t.ex. #hett, #kontrakt)"
                onKeyPress={handleTagKeyPress}
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100"
              >
                Lägg till
              </button>
            </div>
            
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-2 text-purple-600 hover:text-purple-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Anteckningar</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                placeholder="Ytterligare information om ambassadören..."
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <Link
              to="/admin/ambassadors/prospects"
              className="px-6 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Avbryt
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sparar...' : 'Spara Ambassadör'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default AmbassadorContactForm;