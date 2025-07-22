import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { generateProductImage } from '../utils/productImages';
import { useTranslation } from '../contexts/TranslationContext';

const ProductDetailPopup = ({ isOpen, onClose, variantType }) => {
  const { t } = useTranslation();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);

  // Variant type mapping to standardized color field values
  const variantToColorMapping = {
    'TRANSPARENT': 'Transparent',
    'RÖD': 'Röd',
    'FLUORESCERANDE': 'Fluorescerande',
    'GLITTER': 'Glitter'
  };

  useEffect(() => {
    if (isOpen && variantType) {
      fetchProductData();
    }
  }, [isOpen, variantType]);

  const fetchProductData = async () => {
    try {
      setLoading(true);
      console.log(`🔍 Searching for product variant: ${variantType}`);

      // Get all products from the database
      const querySnapshot = await getDocs(collection(db, 'products'));
      const products = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isActive !== false) { // Only active products
          products.push({
            id: doc.id,
            ...data
          });
        }
      });

      console.log(`📊 Found ${products.length} active products`);

      // Find product that matches the variant type using the color field
      const targetColor = variantToColorMapping[variantType];
      let matchingProduct = null;

      if (targetColor) {
        // Look for a product with the exact color field match
        matchingProduct = products.find(product => product.color === targetColor);
        
        if (matchingProduct) {
          console.log(`✅ Found matching product with color field: ${matchingProduct.name} (${matchingProduct.color})`);
        } else {
          console.log(`⚠️ No product found with color: ${targetColor}`);
        }
      }

      // If no specific variant found, use a generic B8Shield product
      if (!matchingProduct) {
        matchingProduct = products.find(p => 
          p.name && p.name.toLowerCase().includes('b8shield')
        );
        console.log(`📦 Using generic product: ${matchingProduct?.name || 'None found'}`);
      }

      // Create a product object with variant-specific information
      if (matchingProduct) {
        const productData = {
          ...matchingProduct,
          name: `B8Shield ${variantType}`,
          variantDescription: getVariantDescription(variantType),
          variantFeatures: getVariantFeatures(variantType)
        };
        setProduct(productData);
      } else {
        // Create a fallback product if none found in database
        setProduct(createFallbackProduct(variantType));
      }

    } catch (error) {
      console.error('❌ Error fetching product data:', error);
      // Create fallback product on error
      setProduct(createFallbackProduct(variantType));
    } finally {
      setLoading(false);
    }
  };

  const getVariantDescription = (variant) => {
    const descriptions = {
      'TRANSPARENT': 'Den transparenta varianten av B8Shield bevarar fiskedragets naturliga färger och utseende. Perfekt när du vill ha maximalt skydd utan att kompromissa med dragets ursprungliga attraktivitet.',
      'RÖD': 'Den röda varianten utnyttjar den traditionella röda färgen som många betesfiskar har. Denna färg har visat sig vara mycket effektiv för att attrahera rovfisk i olika vattenförhållanden.',
      'FLUORESCERANDE': 'Den fluorescerande varianten är speciellt utvecklad för nattfiske och fiske i grumliga eller mörka vatten. Lyser upp och gör draget mer synligt för fisken även under svåra förhållanden.',
      'GLITTER': 'Glitter-varianten är perfekt för fiske i stark solljus. De gnistrande partiklarna reflekterar ljuset och skapar en attraktiv blinkning som lockar fisken från långt håll.'
    };
    return descriptions[variant] || 'Högkvalitativ B8Shield som skyddar ditt fiskedrag från att fastna i undervattensvegetation.';
  };

  const getVariantFeatures = (variant) => {
    const baseFeatures = [
      'Skyddar mot undervattensvegetation',
      'Påverkar inte krokens funktion',
      'Enkelt att växla mellan drag',
      'Passar krokstorlek 2, 4 och 6'
    ];

    const variantSpecific = {
      'TRANSPARENT': ['Bevarar dragets naturliga färger', 'Diskret skydd'],
      'RÖD': ['Attraherar rovfisk', 'Traditionell betesfärg'],
      'FLUORESCERANDE': ['Synlig i mörka vatten', 'Perfekt för nattfiske'],
      'GLITTER': ['Reflekterar solljus', 'Attraktiv blinkning']
    };

    return [...baseFeatures, ...(variantSpecific[variant] || [])];
  };

  const createFallbackProduct = (variant) => {
    return {
      id: `fallback-${variant.toLowerCase()}`,
      name: `B8Shield ${variant}`,
      description: getVariantDescription(variant),
      variantDescription: getVariantDescription(variant),
      variantFeatures: getVariantFeatures(variant),
      basePrice: 71.2,
      size: 'Storlek 2, 4, 6',
      isActive: true
    };
  };

  const getProductImage = (product) => {
    // Priority: Firebase Storage URL > Generated image
    if (product.imageUrl) return product.imageUrl;
    if (product.b2bImageUrl) return product.b2bImageUrl;
    
    // Generate image based on product color field or variant type
    const colorForGeneration = product.color || variantToColorMapping[variantType];
    return generateProductImage(`B8Shield ${variantType}`, variantType.toLowerCase(), colorForGeneration);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK'
    }).format(price);
  };

  const getSalesTip = (variant) => {
    const tips = {
      'TRANSPARENT': t('training.popup.sales_tip_transparent', 'vill ha skydd utan att ändra dragets utseende.'),
      'RÖD': t('training.popup.sales_tip_red', 'fiskar efter rovfisk och vill attrahera mer fisk.'),
      'FLUORESCERANDE': t('training.popup.sales_tip_fluorescent', 'fiskar på kvällar eller i grumliga vatten.'),
      'GLITTER': t('training.popup.sales_tip_glitter', 'fiskar i stark solljus och vill ha extra attraktion.')
    };
    return tips[variant] || t('training.popup.sales_tip_default', 'vill skydda sina fiskedrag från vegetation.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              {product?.name || `B8Shield ${variantType}`}
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : product ? (
            <div className="space-y-6">
              {/* Product Image */}
              <div className="flex justify-center">
                <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    className="w-48 h-48 object-contain"
                    onError={(e) => {
                      const colorForGeneration = product.color || variantToColorMapping[variantType];
                      e.target.src = generateProductImage(`B8Shield ${variantType}`, variantType.toLowerCase(), colorForGeneration);
                    }}
                  />
                </div>
              </div>

              {/* Product Info */}
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {product.name}
                </h3>
                {product.basePrice && (
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">
                      {t('training.popup.recommended_price', 'Rekommenderat pris')}
                    </p>
                    <p className="text-xl font-semibold text-blue-600">
                      {formatPrice(product.basePrice * 1.25)} {/* Add 25% VAT for display */}
                    </p>
                  </div>
                )}
                {product.size && (
                  <p className="text-sm text-gray-600 mt-1">
                    {t('training.popup.available_in', 'Tillgänglig i:')} {product.size}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">{t('training.popup.description', 'Beskrivning')}</h4>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {product.variantDescription || product.description}
                </p>
              </div>

              {/* Features */}
              {product.variantFeatures && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">{t('training.popup.features', 'Egenskaper')}</h4>
                  <ul className="space-y-2">
                    {product.variantFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sales Tips */}
              <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-400">
                <h4 className="font-semibold text-green-900 mb-2">{t('training.popup.sales_arguments', 'Säljargument')}</h4>
                <p className="text-green-800 text-sm">
                  "Den här varianten är perfekt för kunder som {getSalesTip(variantType)}"
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">{t('training.popup.load_error', 'Kunde inte ladda produktinformation')}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('training.popup.close', 'Stäng')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};



export default ProductDetailPopup; 