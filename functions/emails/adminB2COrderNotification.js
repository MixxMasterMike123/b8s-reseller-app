module.exports = ({ orderData }) => {
  const subject = `New B2C Order Received: ${orderData.orderNumber}`;
  const body = `
    <div style="font-family: Arial, sans-serif;">
      <h2>New B2C Guest Order Received</h2>
      <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
      <p><strong>Customer:</strong> ${orderData.customerInfo.firstName} ${orderData.customerInfo.lastName}</p>
      <p><strong>Email:</strong> ${orderData.customerInfo.email}</p>
      <h3>Order Details:</h3>
      <ul>
        ${orderData.items.map(item => {
          // Handle multilingual product names
          const productName = typeof item.name === 'object' 
            ? (item.name['sv-SE'] || item.name['en-GB'] || item.name['en-US'] || JSON.stringify(item.name))
            : item.name || 'Unknown Product';
          return `<li>${productName} - ${item.quantity} pcs @ ${item.price} SEK</li>`;
        }).join('')}
      </ul>
      <p><strong>Total Amount:</strong> ${orderData.total || orderData.totalAmount} SEK</p>
      ${orderData.affiliateCode ? `<p><strong>Affiliate Code:</strong> ${orderData.affiliateCode}</p>` : ''}
    </div>
  `;
  return { subject, html: body };
}; 