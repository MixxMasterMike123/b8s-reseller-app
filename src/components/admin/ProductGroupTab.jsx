import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/TranslationContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { 
  getProductGroupContent, 
  getDefaultGroupContent,
  getProductsInGroup
} from '../../utils/productGroups';
import { useContentTranslation } from '../../hooks/useContentTranslation';
import ContentLanguageIndicator from '../ContentLanguageIndicator';

const ProductGroupTab = ({ productGroup, onContentChange, onGroupContentUpdate }) => {
  const { t } = useTranslation();
  const { currentLanguage, getContentValue, setContentValue } = useContentTranslation();
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
      setProductsInGroup(products);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!productGroup) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-yellow-800">
              {t('no_product_group', 'Ingen produktgrupp')}
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div>
          <h3 className="text-lg font-medium text-blue-900">
            {t('group_content_title', 'Gruppinnehåll för {{group}}', { group: productGroup })}
          </h3>
          <p className="text-sm text-blue-700 mt-1">
            {t('group_content_desc', 'Detta innehåll delas mellan alla produkter i gruppen')}
          </p>
          {productsInGroup.length > 0 && (
            <p className="text-xs text-blue-600 mt-2">
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

        {/* Size and Fit */}
        <div>
          <ContentLanguageIndicator 
            contentField={groupContent.sizeAndFit}
            label={t('size_and_fit_label', 'Storlek och Passform')}
            className="mb-2"
          />
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

        {/* Shipping and Returns */}
        <div>
          <ContentLanguageIndicator 
            contentField={groupContent.shippingReturns}
            label={t('shipping_returns_label', 'Frakt och Retur')}
            className="mb-2"
          />
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

        {/* How It's Made */}
        <div>
          <ContentLanguageIndicator 
            contentField={groupContent.howItsMade}
            label={t('how_its_made_label', 'Hur den tillverkas')}
            className="mb-2"
          />
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

      {/* Products in Group (for reference) */}
      {productsInGroup.length > 0 && (
        <div className="mt-8 bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            {t('products_in_group', 'Produkter i denna grupp')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {productsInGroup.map((product) => (
              <div key={product.id} className="bg-white rounded border px-3 py-2">
                <p className="text-sm font-medium text-gray-900">{product.name}</p>
                <p className="text-xs text-gray-500">
                  {product.color} • {product.size}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductGroupTab; 