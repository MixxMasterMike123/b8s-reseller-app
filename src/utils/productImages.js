// Product images for B8Shield products
// These are placeholder images that can be replaced with actual product photos

export const generateProductImage = (productName, color = 'blue') => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set canvas size
  canvas.width = 400;
  canvas.height = 400;
  
  // Color mappings for different B8Shield variants
  const colorMap = {
    'red': '#DC2626',
    'röd': '#DC2626',
    'transparent': '#64748B',
    'fluorescent': '#10B981',
    'fluorescerande': '#10B981',
    'glitter': '#F59E0B',
    'blue': '#2563EB',
    'default': '#2563EB'
  };
  
  // Detect color from product name
  let productColor = colorMap.default;
  Object.keys(colorMap).forEach(key => {
    if (productName.toLowerCase().includes(key)) {
      productColor = colorMap[key];
    }
  });
  
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

// Pre-generated product images for B8Shield variants
export const productImages = {
  'B8Shield Röd': generateProductImage('B8Shield Röd', 'red'),
  'B8Shield Transparent': generateProductImage('B8Shield Transparent', 'transparent'),
  'B8Shield Fluorescerande': generateProductImage('B8Shield Fluorescerande', 'fluorescent'),
  'B8Shield Glitter': generateProductImage('B8Shield Glitter', 'glitter'),
  'B8Shield 3-pack': generateProductImage('B8Shield 3-pack', 'blue'),
};

// Function to get product image by name
export const getProductImage = (productName) => {
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
}; 