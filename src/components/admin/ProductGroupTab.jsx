import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/TranslationContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { 
  getProductGroupContent, 
  getDefaultGroupContent,
  getProductsInGroup,
  saveProductGroupContent
} from '../../utils/productGroups';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import ContentLanguageIndicator from '../ContentLanguageIndicator';
import { useAuth } from '../../contexts/AuthContext';

const ProductGroupTab = ({ productGroup, onContentChange, onGroupContentUpdate }) => {
  const { t } = useTranslation();
  const { currentLanguage, getContentValue, setContentValue } = useContentTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [groupContent, setGroupContent] = useState(getDefaultGroupContent());
  const [productsInGroup, setProductsInGroup] = useState([]);

  useEffect(() => {
    if (productGroup) {
      loadGroupContent();
      loadProductsInGroup();
    }
  }, [productGroup]);

  const loadGroupContent = async () => {
    if (!productGroup) {
      console.log('🚫 loadGroupContent: No productGroup provided');
      return;
    }
    
    console.log('📖 Loading group content for:', productGroup);
    setLoading(true);
    try {
      const content = await getProductGroupContent(productGroup);
      console.log('📖 Loaded content from DB:', content);
      
      if (content) {
        // Ensure groupName is always set
        const finalContent = {
          ...content,
          groupName: content.groupName || productGroup
        };
        console.log('📖 Setting loaded content:', finalContent);
        setGroupContent(finalContent);
        
        // Notify parent of loaded content
        if (onGroupContentUpdate) {
          onGroupContentUpdate(finalContent);
        }
      } else {
        // Initialize with group name if no content exists
        const defaultContent = {
          ...getDefaultGroupContent(),
          groupName: productGroup
        };
        console.log('📖 No content found, using default:', defaultContent);
        setGroupContent(defaultContent);
        
        // Notify parent of default content
        if (onGroupContentUpdate) {
          onGroupContentUpdate(defaultContent);
        }
      }
    } catch (error) {
      console.error('❌ Error loading group content:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProductsInGroup = async () => {
    if (!productGroup) return;
    
    try {
      const products = await getProductsInGroup(productGroup);
      
      // Sort products by name for consistent display
      const sortedProducts = [...products].sort((a, b) => {
        const nameA = getContentValue(a.name) || a.name || '';
        const nameB = getContentValue(b.name) || b.name || '';
        return nameA.localeCompare(nameB);
      });

      setProductsInGroup(sortedProducts);
    } catch (error) {
      console.error('Error loading products in group:', error);
    }
  };

  const handleContentChange = (field, value) => {
    console.log('📝 Content change:', { field, value, currentLanguage });
    
    const newValue = setContentValue(groupContent[field], value);
    console.log('🔄 New content value:', { field, oldValue: groupContent[field], newValue });
    
    const updatedContent = {
      ...groupContent,
      [field]: newValue
    };
    
    setGroupContent(updatedContent);
    
    if (onContentChange) {
      onContentChange(field, value);
    }
    
    if (onGroupContentUpdate) {
      onGroupContentUpdate(updatedContent);
    }
  };

  const handleDefaultProductSelect = (productId) => {
    const updatedContent = {
      ...groupContent,
      defaultProductId: productId
    };
    setGroupContent(updatedContent);
    if (onGroupContentUpdate) {
      onGroupContentUpdate(updatedContent);
    }

    // Immediate persistence for default product selection
    if (productGroup && user?.uid) {
      saveProductGroupContent(productGroup, updatedContent, user.uid)
        .then(() => console.log('✅ defaultProductId saved'))
        .catch((err) => console.error('❌ Failed to save defaultProductId', err));
    }
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ]
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (!productGroup) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {t('no_product_group', 'Ingen produktgrupp')}
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              {t('no_product_group_desc', 'Denna produkt har ingen grupp tilldelad. Lägg till en grupp för att hantera delat innehåll.')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div>
          <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">
            {t('group_content_title', 'Gruppinnehåll för {{group}}', { group: productGroup })}
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
            {t('group_content_desc', 'Detta innehåll delas mellan alla produkter i gruppen')}
          </p>
          {productsInGroup.length > 0 && (
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
              {t('affected_products', 'Påverkar {{count}} produkter', { count: productsInGroup.length })}
            </p>
          )}
        </div>
      </div>

      {/* Content Fields */}
      <div className="grid grid-cols-1 gap-6">
        {/* Size Guide */}
        <div>
          <ContentLanguageIndicator 
            contentField={groupContent.sizeGuide}
            label={t('size_guide_label', 'Storleksguide')}
            className="mb-2"
          />
          <div className="quill-dark-mode">
            <ReactQuill
              theme="snow"
              value={(() => {
                const value = getContentValue(groupContent.sizeGuide) || '';
                console.log('🎨 Rendering sizeGuide:', { 
                  raw: groupContent.sizeGuide, 
                  processed: value, 
                  currentLanguage 
                });
                return value;
              })()}
              onChange={(value) => handleContentChange('sizeGuide', value)}
              modules={quillModules}
              placeholder={currentLanguage === 'sv-SE' ? 
                t('size_guide_placeholder', 'Ange storleksguide för produktgruppen...') :
                'Enter size guide for the product group...'
              }
            />
          </div>
        </div>

        {/* Size and Fit */}
        <div>
          <ContentLanguageIndicator 
            contentField={groupContent.sizeAndFit}
            label={t('size_and_fit_label', 'Storlek och Passform')}
            className="mb-2"
          />
          <div className="quill-dark-mode">
            <ReactQuill
              theme="snow"
              value={getContentValue(groupContent.sizeAndFit) || ''}
              onChange={(value) => handleContentChange('sizeAndFit', value)}
              modules={quillModules}
              placeholder={currentLanguage === 'sv-SE' ? 
                t('size_and_fit_placeholder', 'Beskriv storlekar och passform...') :
                'Describe sizes and fit...'
              }
            />
          </div>
        </div>

        {/* Shipping and Returns */}
        <div>
          <ContentLanguageIndicator 
            contentField={groupContent.shippingReturns}
            label={t('shipping_returns_label', 'Frakt och Retur')}
            className="mb-2"
          />
          <div className="quill-dark-mode">
            <ReactQuill
              theme="snow"
              value={getContentValue(groupContent.shippingReturns) || ''}
              onChange={(value) => handleContentChange('shippingReturns', value)}
              modules={quillModules}
              placeholder={currentLanguage === 'sv-SE' ? 
                t('shipping_returns_placeholder', 'Ange frakt- och returinformation...') :
                'Enter shipping and return information...'
              }
            />
          </div>
        </div>

        {/* How It's Made */}
        <div>
          <ContentLanguageIndicator 
            contentField={groupContent.howItsMade}
            label={t('how_its_made_label', 'Hur den tillverkas')}
            className="mb-2"
          />
          <div className="quill-dark-mode">
            <ReactQuill
              theme="snow"
              value={(() => {
                const value = getContentValue(groupContent.howItsMade) || '';
                console.log('🎨 Rendering howItsMade:', { 
                  raw: groupContent.howItsMade, 
                  processed: value, 
                  currentLanguage 
                });
                return value;
              })()}
              onChange={(value) => handleContentChange('howItsMade', value)}
              modules={quillModules}
              placeholder={currentLanguage === 'sv-SE' ? 
                t('how_its_made_placeholder', 'Beskriv tillverkningsprocess och hållbarhet...') :
                'Describe manufacturing process and sustainability...'
              }
            />
          </div>
        </div>
      </div>

      {/* Products in Group (for reference) */}
      {productsInGroup.length > 0 && (
        <div className="mt-8 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            {t('products_in_group', 'Produkter i denna grupp')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {productsInGroup.map((product) => (
              <div key={product.id} className="bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 px-3 py-2 flex items-start gap-2">
                <input
                  type="radio"
                  name="defaultProduct"
                  className="mt-1 h-4 w-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-500 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-600"
                  checked={groupContent.defaultProductId === product.id}
                  onChange={() => handleDefaultProductSelect(product.id)}
                  title={t('default_product_tooltip', 'Markera som standardprodukt')}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{getContentValue(product.name)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {product.color} • {product.size}
                </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductGroupTab; 