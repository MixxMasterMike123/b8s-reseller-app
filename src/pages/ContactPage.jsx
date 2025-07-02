import React from 'react';
import AppLayout from '../components/layout/AppLayout';

const ContactPage = () => {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-8 mb-8 text-white">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              📞 Kontakt & Support
            </h1>
            <p className="text-xl text-blue-100">
              Vi är här för att hjälpa er med alla era frågor och behov
            </p>
          </div>
        </div>

        {/* Main Contact Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Contact Details Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 border-l-4 border-blue-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <svg className="w-8 h-8 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Företagsinformation
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <svg className="w-6 h-6 mr-3 text-blue-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <div>
                  <p className="font-bold text-lg text-gray-800">JPH Innovation AB</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <svg className="w-6 h-6 mr-3 text-blue-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="text-gray-700">Östergatan 30 C</p>
                  <p className="text-gray-700">152 43 Södertälje</p>
                  <p className="text-gray-700 font-semibold">SWEDEN</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <svg className="w-6 h-6 mr-3 text-blue-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div>
                  <a 
                    href="mailto:info@b8shield.com" 
                    className="text-blue-600 hover:text-blue-800 font-semibold text-lg underline"
                  >
                    info@b8shield.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Support Information Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 border-l-4 border-green-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <svg className="w-8 h-8 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Support & Hjälp
            </h2>
            
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">📧 E-post support</h3>
                <p className="text-green-700">
                  Skicka era frågor till <span className="font-semibold">info@b8shield.com</span> så återkommer vi så snart som möjligt.
                </p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
                  </svg>
                  Teknisk support
                </h3>
                <p className="text-blue-700">
                  Behöver ni hjälp med portalen eller har tekniska frågor? Vi hjälper er gärna!
                </p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                  Produktfrågor
                </h3>
                <p className="text-purple-700">
                  Frågor om B8Shield produkter, priser eller leveranser hanteras via samma e-post.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            🕒 Öppettider & Svarstider
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Kontakttider</h3>
              <p className="text-gray-600">
                Måndag - Fredag<br />
                08:00 - 17:00
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Svarstid E-post</h3>
              <p className="text-gray-600">
                Vanligtvis inom<br />
                24 timmar
              </p>
            </div>
          </div>
        </div>

        {/* Quick Links Section */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            🔗 Snabblänkar
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a 
              href="/order" 
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition duration-200 text-center border border-gray-200 hover:border-blue-300"
            >
              <svg className="w-8 h-8 mx-auto mb-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <h3 className="font-semibold text-gray-800">Lägg beställning</h3>
              <p className="text-sm text-gray-600">Skapa ny order</p>
            </a>
            
            <a 
              href="/orders" 
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition duration-200 text-center border border-gray-200 hover:border-blue-300"
            >
              <svg className="w-8 h-8 mx-auto mb-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="font-semibold text-gray-800">Orderhistorik</h3>
              <p className="text-sm text-gray-600">Se tidigare beställningar</p>
            </a>
            
            <a 
              href="/profile" 
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition duration-200 text-center border border-gray-200 hover:border-blue-300"
            >
              <svg className="w-8 h-8 mx-auto mb-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h3 className="font-semibold text-gray-800">Profil</h3>
              <p className="text-sm text-gray-600">Uppdatera uppgifter</p>
            </a>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ContactPage; 