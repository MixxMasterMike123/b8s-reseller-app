import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../../../components/layout/AppLayout';
import { useDiningContacts } from '../hooks/useDiningContacts';
import {
  UserPlusIcon,
  ArrowLeftIcon,
  BuildingOfficeIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  MapPinIcon,
  TagIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { normalizeWebsiteUrl, normalizeEmail } from '../../../utils/urlUtils';
import { functionUrl } from '../../../config/urls';

const ContactForm = () => {
  const navigate = useNavigate();
  const { addContact, loading, getAllTags } = useDiningContacts();

  const [formData, setFormData] = useState({
    // Core contact info
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Sverige',
    
    // CRM fields
    status: 'ej_kontaktad',
    priority: 'medium',
    source: 'manual',
    tags: [],
    notes: '',
    
    // B2B fields (with defaults)
    marginal: 35,
    deliveryAddress: '',
    deliveryCity: '',
    deliveryPostalCode: '',
    deliveryCountry: 'Sverige',
    sameAsCompanyAddress: true
  });

  const [errors, setErrors] = useState({});
  const [newTag, setNewTag] = useState('');
  const [metaScraping, setMetaScraping] = useState(false);
  const [showTagAutocomplete, setShowTagAutocomplete] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState([]);

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

  // Handle tag input changes with autocomplete
  const handleTagInputChange = (e) => {
    const value = e.target.value;
    setNewTag(value);
    
    if (value.trim().length > 0) {
      const allTags = getAllTags();
      const inputText = value.trim().toLowerCase();
      const matches = allTags.filter(tag => 
        tag.includes(inputText) && !formData.tags.includes(tag)
      );
      setTagSuggestions(matches.slice(0, 8)); // Max 8 suggestions
      setShowTagAutocomplete(matches.length > 0);
    } else {
      setShowTagAutocomplete(false);
      setTagSuggestions([]);
    }
  };

  // Add tag to contact
  const handleAddTag = (tagToAdd = null) => {
    const tag = tagToAdd || newTag.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setNewTag('');
      setShowTagAutocomplete(false);
      setTagSuggestions([]);
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
    } else if (e.key === 'Escape') {
      setShowTagAutocomplete(false);
      setTagSuggestions([]);
    }
  };

  // META scraping function for website data enrichment
  const handleScrapeWebsiteMeta = async () => {
    if (!formData.website) {
      toast.error('Ingen webbsida angiven');
      return;
    }

    setMetaScraping(true);

    try {
      // Call Firebase Function for META scraping
      const response = await fetch(functionUrl('scrapeWebsiteMetaV2'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: formData.website
        })
      });

      const result = await response.json();

      if (!result.success) {
        toast.error(`Kunde inte hämta META data: ${result.error}`);
        return;
      }

      const { data } = result;
      
      // Format the META data for appending to notes
      let metaText = `\n\n=== AUTO-HÄMTAD WEBBPLATS-INFO ===\n`;
      metaText += `Titel: ${data.title || 'Ingen titel'}\n`;
      metaText += `Beskrivning: ${data.description || 'Ingen beskrivning'}\n`;
      
      if (data.keywords && data.keywords.length > 0) {
        metaText += `Nyckelord: ${data.keywords.join(', ')}\n`;
      }
      
      metaText += `Språk: ${data.detectedLanguage || 'Okänt'}\n`;
      
      if (data.translatedText && data.translatedText !== data.description) {
        metaText += `Översättning: ${data.translatedText}\n`;
      }
      
      metaText += `Hämtad: ${new Date().toLocaleString('sv-SE')}\n`;
      metaText += `==========================================`;

      // Append to existing notes
      setFormData(prev => ({
        ...prev,
        notes: (prev.notes || '') + metaText
      }));

      toast.success('🌐 META data hämtad och tillagd i anteckningar!');
      
    } catch (error) {
      console.error('META scraping error:', error);
      toast.error('Kunde inte hämta META data. Försök igen.');
    } finally {
      setMetaScraping(false);
    }
  };

  // Validate form - ALL fields optional for cold outreach flexibility
  const validateForm = () => {
    const newErrors = {};

    // NO mandatory fields - perfect for cold outreach scenarios
    // Only validate format if data is provided

    // Validate email format if provided (optional)
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Ogiltig e-postadress';
    }

    // Validate phone format if provided (optional)
    if (formData.phone.trim() && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Ogiltigt telefonnummer';
    }

    // Validate website URL format if provided (optional)
    if (formData.website.trim() && !formData.website.match(/^https?:\/\/.+\..+/)) {
      newErrors.website = 'Ange fullständig URL (http://... eller https://...)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Vänligen kontrollera formatet på e-post, telefon och webbsida');
      return;
    }

    try {
      const contactId = await addContact({
        ...formData,
        website: formData.website ? normalizeWebsiteUrl(formData.website) : '',
        email: formData.email ? normalizeEmail(formData.email) : ''
      });
      
      // Success! Navigate to the new contact
      navigate(`/admin/dining/contacts/${contactId}`);
      
      toast.success('Ny gäst har lagts till i reservationssystemet');
      
    } catch (error) {
      console.error('Error adding contact:', error);
      toast.error('Kunde inte lägga till gäst. Försök igen.');
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center">
            <Link 
              to="/admin/dining/contacts" 
              className="mr-4 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
            <div className="flex items-center">
              <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-xl mr-4">
                <UserPlusIcon className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">Lägg till Ny Gäst</h1>
                <p className="text-gray-600 dark:text-gray-400">Välkomna en ny gäst till restaurangen</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Company Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <BuildingOfficeIcon className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-2" />
                Företagsinformation
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Företagsnamn *
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 ${
                      errors.companyName ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Företagets namn"
                  />
                  {errors.companyName && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                      <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                      {errors.companyName}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Webbplats
                    </label>
                    <button
                      type="button"
                      onClick={handleScrapeWebsiteMeta}
                      disabled={!formData.website || metaScraping}
                      className={`flex items-center px-2 py-1 text-xs rounded-md transition-colors ${
                        !formData.website 
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                          : 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800'
                      } ${metaScraping ? 'opacity-50' : ''}`}
                      title={!formData.website ? 'Ange webbsida först' : 'Hämta META data från webbsidan'}
                    >
                      <GlobeAltIcon className="h-3 w-3 mr-1" />
                      {metaScraping ? 'Hämtar...' : 'Hämta META'}
                    </button>
                  </div>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                    placeholder="https://exempel.se"
                  />
                </div>
              </div>
            </div>

            {/* Contact Person */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <UserIcon className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-2" />
                Kontaktperson
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Namn
                  </label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 ${
                      errors.contactPerson ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Förnamn Efternamn"
                  />
                  {errors.contactPerson && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                      <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                      {errors.contactPerson}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    E-post
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 ${
                      errors.email ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="namn@företag.se"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                      <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Telefon
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 ${
                    errors.phone ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="+46 70 123 45 67"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <MapPinIcon className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-2" />
                Adress
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Adress
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                    placeholder="Gatuadress"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Stad
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                      placeholder="Stockholm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Postnummer
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                      placeholder="12345"
                    />
                  </div>

                                    <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Land
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                      placeholder="Sverige"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Status & Priority */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <TagIcon className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-2" />
                Kategorisering
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  >
                    {/* New status options - prioritized */}
                    <option value="ej_kontaktad">Ej kontaktad</option>
                    <option value="kontaktad">Kontaktad</option>
                    <option value="dialog">Dialog</option>
                    <option value="af">ÅF</option>
                    <option value="closed">Stängd</option>
                    
                    {/* Legacy status options - for backward compatibility */}
                    <option value="prospect">Reservering (Prospekt)</option>
                    <option value="active">Stamgäst (Aktiv)</option>
                    <option value="inactive">Inaktiv</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Prioritet
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  >
                    <option value="low">Låg</option>
                    <option value="medium">Medium</option>
                    <option value="high">Hög (VIP)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Källa
                  </label>
                  <select
                    name="source"
                    value={formData.source}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  >
                    <option value="ai">AI</option>
                    <option value="manual">Manuell inmatning</option>
                    <option value="website">Webbplats</option>
                    <option value="phone">Telefonsamtal</option>
                    <option value="email">E-post</option>
                    <option value="referral">Rekommendation</option>
                    <option value="event">Evenemang</option>
                    <option value="other">Övrigt</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Taggar</h3>
              
              <div className="space-y-4">
                <div className="relative">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={handleTagInputChange}
                      onKeyPress={handleTagKeyPress}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                      placeholder="Lägg till tagg... (sök bland befintliga)"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTag()}
                      className="px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors"
                    >
                      Lägg till
                    </button>
                  </div>

                  {/* Tag Autocomplete Dropdown */}
                  {showTagAutocomplete && tagSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                      <div className="py-1">
                        {tagSuggestions.map((tag, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleAddTag(tag)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-hidden"
                          >
                            <span className="text-sm text-gray-900 dark:text-gray-100">#{tag}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Anteckningar</h3>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                placeholder="Anteckningar om gästen..."
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-600">
              <Link
                to="/admin/dining/contacts"
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Avbryt
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-orange-600 dark:bg-orange-500 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Lägger till...</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5" />
                    <span>Lägg till Gäst</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
};

export default ContactForm; 