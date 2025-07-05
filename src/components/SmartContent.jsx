/**
 * Smart Content Component
 * 
 * Automatically handles multilingual content rendering.
 * Can be used as a drop-in replacement for direct content rendering.
 * 
 * Usage Examples:
 * <SmartContent content={product.descriptions?.b2b} />
 * <SmartContent content={product.description} fallback="No description" />
 * <SmartContent 
 *   content={product.descriptions?.b2b} 
 *   fallback={product.description}
 *   className="text-gray-600"
 * />
 */

import React from 'react';
import { useContentTranslation } from '../hooks/useContentTranslation';

const SmartContent = ({ 
  content, 
  fallback = '', 
  className = '',
  as: Component = 'span',
  preserveWhitespace = false,
  ...props 
}) => {
  const { renderContent } = useContentTranslation();
  
  // Get the content in current language
  const displayContent = renderContent(content, renderContent(fallback));
  
  // Don't render if no content
  if (!displayContent) return null;
  
  // Apply whitespace preservation if needed
  const finalClassName = preserveWhitespace 
    ? `${className} whitespace-pre-line`.trim()
    : className;
  
  return (
    <Component className={finalClassName} {...props}>
      {displayContent}
    </Component>
  );
};

/**
 * Smart Product Description Component
 * Automatically chooses the best description for a product
 */
export const SmartProductDescription = ({ 
  product, 
  type = 'best', // 'best', 'b2b', 'b2c', 'general'
  className = '',
  ...props 
}) => {
  const { getProductContent } = useContentTranslation();
  
  if (!product) return null;
  
  const productContent = getProductContent(product);
  
  let content = '';
  switch (type) {
    case 'b2b':
      content = productContent.b2bDescription;
      break;
    case 'b2c':
      content = productContent.b2cDescription;
      break;
    case 'general':
      content = productContent.generalDescription;
      break;
    case 'best':
    default:
      content = productContent.bestDescription;
      break;
  }
  
  return content ? (
    <SmartContent 
      content={content} 
      className={className}
      preserveWhitespace={true}
      {...props}
    />
  ) : null;
};

export default SmartContent; 