// Product images for B8Shield products
// These are placeholder images that can be replaced with actual product photos

export const generateProductImage = (productName, color = 'blue', productColorField = null) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set canvas size
  canvas.width = 400;
  canvas.height = 400;
  
  // Color mappings for different B8Shield variants - using standardized color field values
  const colorMap = {
    'Transparent': '#64748B',
    'Röd': '#DC2626',
    'Fluorescerande': '#10B981',
    'Glitter': '#F59E0B',
    'blue': '#2563EB',
    'default': '#2563EB'
  };
  
  // Use productColorField if provided, otherwise fallback to legacy name parsing
  let productColor = colorMap.default;
  
  if (productColorField && colorMap[productColorField]) {
    productColor = colorMap[productColorField];
  } else {
    // Legacy fallback for old color parameter or name parsing
    const legacyColorMap = {
      'red': '#DC2626',
      'röd': '#DC2626',
      'transparent': '#64748B',
      'fluorescent': '#10B981',
      'fluorescerande': '#10B981',
      'glitter': '#F59E0B',
      'blue': '#2563EB'
    };
    
    if (typeof color === 'string' && legacyColorMap[color.toLowerCase()]) {
      productColor = legacyColorMap[color.toLowerCase()];
    } else {
      // Fallback to name parsing for backward compatibility
      Object.keys(legacyColorMap).forEach(key => {
        if (productName.toLowerCase().includes(key)) {
          productColor = legacyColorMap[key];
        }
      });
    }
  }
  
  // Create gradient background
  const gradient = ctx.createRadialGradient(200, 200, 0, 200, 200, 200);
  gradient.addColorStop(0, '#FFFFFF');
  gradient.addColorStop(1, '#F8FAFC');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 400, 400);
  
  // Draw B8Shield logo/shape
  ctx.save();
  ctx.translate(200, 200);
  
  // Main shield shape
  ctx.beginPath();
  ctx.fillStyle = productColor;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 5;
  
  // Draw shield-like shape
  ctx.moveTo(0, -80);
  ctx.quadraticCurveTo(60, -60, 60, 0);
  ctx.quadraticCurveTo(60, 60, 0, 80);
  ctx.quadraticCurveTo(-60, 60, -60, 0);
  ctx.quadraticCurveTo(-60, -60, 0, -80);
  ctx.fill();
  
  // Add inner details
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.moveTo(0, -60);
  ctx.quadraticCurveTo(40, -45, 40, 0);
  ctx.quadraticCurveTo(40, 45, 0, 60);
  ctx.quadraticCurveTo(-40, 45, -40, 0);
  ctx.quadraticCurveTo(-40, -45, 0, -60);
  ctx.fill();
  
  // Add "B8" text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('B8', 0, -10);
  
  // Add "SHIELD" text
  ctx.font = 'bold 12px Arial';
  ctx.fillText('SHIELD', 0, 15);
  
  ctx.restore();
  
  // Add product name at bottom
  ctx.fillStyle = '#374151';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(productName.split(' ')[0], 200, 350);
  
  return canvas.toDataURL('image/png');
};

// Pre-generated product images for B8Shield variants - using new color field approach
export const productImages = {
  'B8Shield Röd': generateProductImage('B8Shield Röd', 'red', 'Röd'),
  'B8Shield Transparent': generateProductImage('B8Shield Transparent', 'transparent', 'Transparent'),
  'B8Shield Fluorescerande': generateProductImage('B8Shield Fluorescerande', 'fluorescent', 'Fluorescerande'),
  'B8Shield Glitter': generateProductImage('B8Shield Glitter', 'glitter', 'Glitter'),
  'B8Shield 3-pack': generateProductImage('B8Shield 3-pack', 'blue'),
};

// Function to get product image by name or product object
export const getProductImage = (productData) => {
  // If productData is a string (legacy usage), use name-based lookup
  if (typeof productData === 'string') {
    const productName = productData;
    
    // Try exact match first
    if (productImages[productName]) {
      return productImages[productName];
    }
    
    // Try partial match
    for (const [key, image] of Object.entries(productImages)) {
      if (productName.toLowerCase().includes(key.toLowerCase().split(' ')[1])) {
        return image;
      }
    }
    
    // Generate new image if no match found
    return generateProductImage(productName);
  }
  
  // If productData is an object (preferred usage), use color field
  if (productData && typeof productData === 'object') {
    const { name, color } = productData;
    
    // Generate image using the color field for accurate color matching
    if (color) {
      return generateProductImage(name || 'B8Shield', null, color);
    }
    
    // Fallback to name-based generation if no color field
    return generateProductImage(name || 'B8Shield');
  }
  
  // Final fallback
  return generateProductImage('B8Shield');
}; 