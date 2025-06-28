import React, { useState, useRef, useEffect } from 'react';

const ProductMenu = ({ products, selectedProduct, onProductSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Get current product label
  const getCurrentProductLabel = () => {
    if (!selectedProduct) return 'Select a product';
    return selectedProduct.name || 'Unknown product';
  };

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle product selection
  const handleProductSelect = (product) => {
    onProductSelect(product);
    setIsOpen(false);
  };

  // Add this helper function at the top level of the component
  const getProductImage = (product) => {
    if (product.b2bImageUrl) return product.b2bImageUrl;
    if (product.imageUrl) return product.imageUrl;
    if (product.imageData) return product.imageData;
    return null;
  };

  return (
    <div className="relative inline-block w-full" ref={menuRef}>
      <button
        type="button"
        className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white rounded-md shadow-sm border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{getCurrentProductLabel()}</span>
        <svg
          className="w-5 h-5 ml-2 flex-shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-10 mt-2 max-h-60 overflow-y-auto origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {products && products.length > 0 ? (
              products.map((product) => (
                <button
                  key={product.id}
                  className={`block w-full text-left px-4 py-2 text-sm ${
                    selectedProduct && product.id === selectedProduct.id
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => handleProductSelect(product)}
                >
                  <div className="flex items-center">
                    {(() => {
                      const imageUrl = getProductImage(product);
                      return imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt={product.name} 
                          className="w-8 h-8 mr-3 object-cover rounded"
                        />
                      ) : null;
                    })()}
                    <div>
                      <div className="font-medium">{product.name}</div>
                      {product.size && <div className="text-xs text-gray-500">Size: {product.size}</div>}
                    </div>
                    {selectedProduct && product.id === selectedProduct.id && (
                      <svg className="h-5 w-5 ml-auto text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">No products available</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductMenu; 