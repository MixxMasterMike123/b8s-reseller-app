import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ShopNavigation from '../../components/shop/ShopNavigation';
import ShopFooter from '../../components/shop/ShopFooter';
import toast from 'react-hot-toast';
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const AffiliateRegistration = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    postalCode: '',
    city: '',
    country: 'SE',
    socials: {
      website: '',
      instagram: '',
      youtube: '',
      facebook: '',
      tiktok: '',
    },
    promotionMethod: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('socials.')) {
      const socialPlatform = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        socials: {
          ...prev.socials,
          [socialPlatform]: value
        }
      }));
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.promotionMethod) {
      toast.error('Vänligen fyll i alla obligatoriska fält.');
      return;
    }
    setLoading(true);
    try {
      // This only submits an application, not creates an affiliate directly
      await addDoc(collection(db, 'affiliateApplications'), {
        ...formData,
        status: 'pending', // Initial status
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
      toast.success('Tack för din ansökan! Vi återkommer inom kort.');
    } catch (error) {
      console.error('Error submitting affiliate application:', error);
      toast.error('Ett fel uppstod. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <ShopNavigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          
          {!submitted ? (
            <>
              <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center">Bli en B8Shield Partner</h1>
              <p className="text-lg text-gray-600 mb-8 text-center max-w-2xl mx-auto">
                Älskar du våra produkter? Gå med i vårt affiliate-program och tjäna provision genom att marknadsföra B8Shield till din publik.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-800">Grunduppgifter</h3>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Fullständigt Namn <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    E-postadress <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Telefonnummer
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <h3 className="text-lg font-semibold text-gray-800 pt-4 border-t">Adressuppgifter</h3>
                
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Gatuadress
                  </label>
                  <input
                    type="text"
                    name="address"
                    id="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                      Postnummer
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                      Stad
                    </label>
                    <input
                      type="text"
                      name="city"
                      id="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                 <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                    Land
                  </label>
                  <select
                    name="country"
                    id="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="SE">Sverige</option>
                    <option value="NO">Norge</option>
                    <option value="DK">Danmark</option>
                    <option value="FI">Finland</option>
                    <option value="DE">Tyskland</option>
                    <option value="GB">Storbritannien</option>
                    {/* Add more countries as needed */}
                  </select>
                </div>

                <h3 className="text-lg font-semibold text-gray-800 pt-4 border-t">Kanaler & Marknadsföring</h3>

                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Länka till dina relevanta kanaler. Fyll i de som är applicerbara.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <label htmlFor="socials.website" className="block text-sm font-medium text-gray-700 mb-1">Webbplats / Blogg</label>
                      <input type="url" name="socials.website" id="socials.website" value={formData.socials.website} onChange={handleChange} placeholder="https://dinsida.se" className="w-full px-4 py-2 border border-gray-300 rounded-lg"/>
                    </div>
                    <div>
                      <label htmlFor="socials.instagram" className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                      <input type="url" name="socials.instagram" id="socials.instagram" value={formData.socials.instagram} onChange={handleChange} placeholder="https://instagram.com/dittnamn" className="w-full px-4 py-2 border border-gray-300 rounded-lg"/>
                    </div>
                    <div>
                      <label htmlFor="socials.youtube" className="block text-sm font-medium text-gray-700 mb-1">YouTube</label>
                      <input type="url" name="socials.youtube" id="socials.youtube" value={formData.socials.youtube} onChange={handleChange} placeholder="https://youtube.com/c/dinkanal" className="w-full px-4 py-2 border border-gray-300 rounded-lg"/>
                    </div>
                     <div>
                      <label htmlFor="socials.facebook" className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
                      <input type="url" name="socials.facebook" id="socials.facebook" value={formData.socials.facebook} onChange={handleChange} placeholder="https://facebook.com/dinsida" className="w-full px-4 py-2 border border-gray-300 rounded-lg"/>
                    </div>
                     <div>
                      <label htmlFor="socials.tiktok" className="block text-sm font-medium text-gray-700 mb-1">TikTok</label>
                      <input type="url" name="socials.tiktok" id="socials.tiktok" value={formData.socials.tiktok} onChange={handleChange} placeholder="https://tiktok.com/@dittnamn" className="w-full px-4 py-2 border border-gray-300 rounded-lg"/>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="promotionMethod" className="block text-sm font-medium text-gray-700 mb-1">
                    Vilken är din primära kanal för marknadsföring? <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="promotionMethod"
                    id="promotionMethod"
                    value={formData.promotionMethod}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Välj ett alternativ...</option>
                    <option value="blog">Blogg / Webbplats</option>
                    <option value="youtube">YouTube-kanal</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook-grupp / Sida</option>
                    <option value="tiktok">TikTok</option>
                    <option value="forum">Onlineforum</option>
                    <option value="other">Annat</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Meddelande (valfritt)
                  </label>
                  <textarea
                    name="message"
                    id="message"
                    rows="4"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Berätta lite mer om dig själv och din publik..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  ></textarea>
                </div>

                <div className="text-center">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                  >
                    {loading ? 'Skickar...' : 'Skicka ansökan'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Tack för din ansökan!</h2>
              <p className="text-gray-600 mb-8">
                Vi har tagit emot din ansökan och kommer att granska den inom 3-5 arbetsdagar. Du kommer att få ett e-postmeddelande från oss när vi har ett beslut.
              </p>
              <Link to="/" className="text-blue-600 hover:underline">
                ← Tillbaka till butiken
              </Link>
            </div>
          )}
        </div>
      </div>

      <ShopFooter />
    </div>
  );
};

export default AffiliateRegistration; 