import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/TranslationContext';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import toast from 'react-hot-toast';
import { 
  getProductGroupContent, 
  saveProductGroupContent, 
  getDefaultGroupContent,
  getProductsInGroup,
  validateGroupContent
} from '../../utils/productGroups';
import { useAuth } from '../../contexts/AuthContext';

const ProductGroupTab = ({ productGroup, onContentChange }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [groupContent, setGroupContent] = useState(getDefaultGroupContent());
  const [productsInGroup, setProductsInGroup] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (productGroup) {
      loadGroupContent();
      loadProductsInGroup();
    }
  }, [productGroup]);

  const loadGroupContent = async () => {
    if (!productGroup) return;
    
    setLoading(true);
    try {
      const content = await getProductGroupContent(productGroup);
      if (content) {
        setGroupContent(content);
      } else {
        // Initialize with group name if no content exists
        setGroupContent({
          ...getDefaultGroupContent(),
          groupName: productGroup
        });
      }
    } catch (error) {
      console.error('Error loading group content:', error);
      toast.error(t('group_content_load_error', 'Kunde inte ladda gruppinnehåll'));
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
    setGroupContent(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
    
    if (onContentChange) {
      onContentChange(field, value);
    }
  };

  const handleSave = async () => {
    if (!productGroup || !user?.uid) return;
    
    // Validate content
    const errors = validateGroupContent(groupContent);
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }
    
    setSaving(true);
    try {
      await saveProductGroupContent(productGroup, groupContent, user.uid);
      setHasUnsavedChanges(false);
      toast.success(t('group_content_saved', 'Gruppinnehåll sparat'));
    } catch (error) {
      console.error('Error saving group content:', error);
      toast.error(t('group_content_save_error', 'Kunde inte spara gruppinnehåll'));
    } finally {
      setSaving(false);
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
        <div className="flex items-start justify-between">
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
          
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saving}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              hasUnsavedChanges && !saving
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {saving ? t('saving', 'Sparar...') : t('save_group_content', 'Spara gruppinnehåll')}
          </button>
        </div>
      </div>

      {/* Content Fields */}
      <div className="grid grid-cols-1 gap-6">
        {/* Size Guide */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('size_guide_label', 'Storleksguide')}
          </label>
          <ReactQuill
            theme="snow"
            value={groupContent.sizeGuide || ''}
            onChange={(value) => handleContentChange('sizeGuide', value)}
            modules={quillModules}
            placeholder={t('size_guide_placeholder', 'Ange storleksguide för produktgruppen...')}
          />
        </div>

        {/* Size and Fit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('size_and_fit_label', 'Storlek och Passform')}
          </label>
          <ReactQuill
            theme="snow"
            value={groupContent.sizeAndFit || ''}
            onChange={(value) => handleContentChange('sizeAndFit', value)}
            modules={quillModules}
            placeholder={t('size_and_fit_placeholder', 'Beskriv storlekar och passform...')}
          />
        </div>

        {/* Shipping and Returns */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('shipping_returns_label', 'Frakt och Retur')}
          </label>
          <ReactQuill
            theme="snow"
            value={groupContent.shippingReturns || ''}
            onChange={(value) => handleContentChange('shippingReturns', value)}
            modules={quillModules}
            placeholder={t('shipping_returns_placeholder', 'Ange frakt- och returinformation...')}
          />
        </div>

        {/* How It's Made */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('how_its_made_label', 'Hur den tillverkas')}
          </label>
          <ReactQuill
            theme="snow"
            value={groupContent.howItsMade || ''}
            onChange={(value) => handleContentChange('howItsMade', value)}
            modules={quillModules}
            placeholder={t('how_its_made_placeholder', 'Beskriv tillverkningsprocess och hållbarhet...')}
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