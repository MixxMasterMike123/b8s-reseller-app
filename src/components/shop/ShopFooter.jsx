import React from 'react';
import { Link } from 'react-router-dom';

const ShopFooter = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">B8Shield</h3>
            <p className="text-gray-300 text-sm mb-4">
              Professionellt skydd för dina fiskedon. Utvecklat av JPH Innovation AB 
              för att maximera din framgång på vattnet.
            </p>
            <div className="text-gray-400 text-sm">
              <p>JPH Innovation AB</p>
              <p>Östergatan 30c</p>
              <p>152 43 Södertälje</p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Snabblänkar</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-gray-300 hover:text-white transition-colors">
                  Hem
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-gray-300 hover:text-white transition-colors">
                  Varukorg
                </Link>
              </li>
              <li>
                <Link to="/account" className="text-gray-300 hover:text-white transition-colors">
                  Mitt konto
                </Link>
              </li>
              <li>
                <a href="mailto:info@b8shield.com" className="text-gray-300 hover:text-white transition-colors">
                  Kontakt
                </a>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Kundservice</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/shipping" className="text-gray-300 hover:text-white transition-colors">
                  Leveransinformation
                </Link>
              </li>
              <li>
                <Link to="/returns" className="text-gray-300 hover:text-white transition-colors">
                  Returer & Ångerrätt
                </Link>
              </li>
              <li>
                <Link to="/affiliate-program" className="text-gray-300 hover:text-white transition-colors">
                  Affiliate-program
                </Link>
              </li>
              <li>
                <a href="mailto:info@b8shield.com" className="text-gray-300 hover:text-white transition-colors">
                  Kundtjänst
                </a>
              </li>
              <li>
                <span className="text-gray-400">
                  Mån-Fre: 09:00-17:00
                </span>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Juridiskt</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/terms" className="text-gray-300 hover:text-white transition-colors">
                  Användarvillkor
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-300 hover:text-white transition-colors">
                  Integritetspolicy
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-gray-300 hover:text-white transition-colors">
                  Cookie-policy
                </Link>
              </li>
              <li>
                <Link to="/returns" className="text-gray-300 hover:text-white transition-colors">
                  Returpolicy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm">
              <p>&copy; {new Date().getFullYear()} JPH Innovation AB. Alla rättigheter förbehållna.</p>
            </div>
            
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              {/* Trust Badges */}
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <span className="bg-green-600 text-white px-2 py-1 rounded">
                  ✓ SSL
                </span>
                <span className="bg-blue-600 text-white px-2 py-1 rounded">
                  ✓ GDPR
                </span>
                <span className="bg-purple-600 text-white px-2 py-1 rounded">
                  ✓ 14 dagar ångerrätt
                </span>
              </div>
            </div>
          </div>
          
          {/* Additional Legal Text */}
          <div className="mt-4 text-xs text-gray-500 text-center md:text-left">
            <p>
              Organisationsnummer: [ORG-NR] | 
              Registrerad för F-skatt | 
              Medlem i Svensk Handel
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default ShopFooter; 