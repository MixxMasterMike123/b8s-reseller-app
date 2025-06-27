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
    website: '',
    promotionMethod: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                    Webbplats eller sociala medier (länk)
                  </label>
                  <input
                    type="url"
                    name="website"
                    id="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://exempel.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="promotionMethod" className="block text-sm font-medium text-gray-700 mb-1">
                    Hur planerar du att marknadsföra B8Shield? <span className="text-red-500">*</span>
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