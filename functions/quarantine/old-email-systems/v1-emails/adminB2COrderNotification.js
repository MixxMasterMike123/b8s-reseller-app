// Helper function to get product display name with color and size for admin emails
function getProductDisplayNameAdmin(item) {
  // Handle multilingual product names
  const baseName = typeof item.name === 'object' 
    ? (item.name['sv-SE'] || item.name['en-GB'] || item.name['en-US'] || JSON.stringify(item.name))
    : item.name || 'Unknown Product';
  
  const color = item.color;
  const size = item.size;
  
  let displayName = baseName;
  
  // Add color if available
  if (color && color !== 'Blandade färger' && color !== 'Mixed colors') {
    displayName += ` ${color}`;
  }
  
  // Add size if available
  if (size && size !== 'Blandade storlekar' && size !== 'Mixed sizes') {
    // Convert size to readable format
    if (size.includes('Storlek') || size.includes('Size')) {
      // Extract number from "Storlek 2" -> "stl. 2"
      const sizeNumber = size.replace(/Storlek|Size/i, '').trim();
      displayName += `, stl. ${sizeNumber}`;
    } else {
      displayName += `, stl. ${size}`;
    }
  }
  
  return displayName;
}

module.exports = ({ orderData }) => {
  const subject = `New B2C Order Received: ${orderData.orderNumber}`;
  
  // Extract payment method information
  const paymentMethod = orderData.payment?.method || 'unknown';
  const paymentStatus = orderData.payment?.status || 'unknown';
  const paymentIntentId = orderData.payment?.paymentIntentId || '';
  
  // Format payment method display
  const formatPaymentMethod = (method) => {
    switch(method) {
      case 'stripe': return 'Stripe (Card/Klarna/Google Pay)';
      case 'mock_payment': return 'Test Payment';
      default: return method;
    }
  };
  
  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1f2937;">New B2C ${orderData.source === 'b2c' ? 'Guest' : ''} Order Received</h2>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <h3 style="margin-top: 0; color: #374151;">Customer Information</h3>
        <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
        <p><strong>Customer:</strong> ${orderData.customerInfo.firstName} ${orderData.customerInfo.lastName}</p>
        <p><strong>Email:</strong> ${orderData.customerInfo.email}</p>
        ${orderData.shippingInfo ? `
        <p><strong>Shipping Address:</strong><br>
        ${orderData.shippingInfo.address}${orderData.shippingInfo.apartment ? ', ' + orderData.shippingInfo.apartment : ''}<br>
        ${orderData.shippingInfo.postalCode} ${orderData.shippingInfo.city}<br>
        ${orderData.shippingInfo.country}</p>
        ` : ''}
      </div>

      <div style="background-color: #ecfdf5; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <h3 style="margin-top: 0; color: #065f46;">Order Details</h3>
        <ul style="list-style: none; padding: 0;">
          ${orderData.items.map(item => {
            return `<li style="padding: 12px 0; border-bottom: 1px solid #d1fae5;">
              <strong>${getProductDisplayNameAdmin(item)}</strong> - ${item.quantity} pcs @ ${item.price} SEK
              <span style="float: right; font-weight: bold;">${(item.price * item.quantity).toFixed(0)} SEK</span>
            </li>`;
          }).join('')}
        </ul>
      </div>

      <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <h3 style="margin-top: 0; color: #92400e;">Order Summary</h3>
        <table style="width: 100%;">
          <tr><td>Subtotal:</td><td style="text-align: right;"><strong>${(orderData.subtotal || 0).toFixed(0)} SEK</strong></td></tr>
          <tr><td>Shipping:</td><td style="text-align: right;"><strong>${(orderData.shipping || 0).toFixed(0)} SEK</strong></td></tr>
          ${orderData.discountAmount > 0 ? `<tr><td>Discount:</td><td style="text-align: right; color: #059669;"><strong>-${orderData.discountAmount.toFixed(0)} SEK</strong></td></tr>` : ''}
          <tr><td>VAT (25%):</td><td style="text-align: right;"><strong>${(orderData.vat || 0).toFixed(0)} SEK</strong></td></tr>
          <tr style="border-top: 2px solid #f59e0b; font-size: 18px;">
            <td><strong>Total Amount:</strong></td>
            <td style="text-align: right;"><strong>${(orderData.total || 0).toFixed(0)} SEK</strong></td>
          </tr>
        </table>
      </div>

      <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <h3 style="margin-top: 0; color: #1e40af;">Payment Information</h3>
        <p><strong>Payment Method:</strong> ${formatPaymentMethod(paymentMethod)}</p>
        <p><strong>Payment Status:</strong> ${paymentStatus}</p>
        ${paymentIntentId ? `<p><strong>Payment Intent ID:</strong> ${paymentIntentId}</p>` : ''}
      </div>

      ${(orderData.affiliateCode || orderData.affiliate?.code) ? `
      <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <h3 style="margin-top: 0; color: #0369a1;">Affiliate Information</h3>
        <p><strong>Affiliate Code:</strong> ${orderData.affiliateCode || orderData.affiliate?.code}</p>
        ${orderData.discountAmount > 0 ? `<p><strong>Discount Applied:</strong> ${orderData.discountAmount.toFixed(0)} SEK</p>` : ''}
      </div>
      ` : ''}
      
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280;">
        <p>This order was placed on the B2C shop at shop.b8shield.com</p>
      </div>
    </div>
  `;
  return { subject, html: body };
}; 