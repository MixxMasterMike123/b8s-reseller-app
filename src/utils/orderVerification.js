/**
 * Order Verification Export
 * Creates individual verification documents for Swedish accounting compliance
 * 
 * Swedish accounting law (Bokföringslagen) requires each business transaction
 * to have a separate verification document for audit trail and tax compliance.
 */

import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

/**
 * Format date for verification documents
 */
const formatDate = (dateValue) => {
  if (!dateValue) return '';
  
  try {
    if (dateValue && typeof dateValue.toDate === 'function') {
      return format(dateValue.toDate(), 'yyyy-MM-dd', { locale: sv });
    }
    if (typeof dateValue === 'string') {
      return format(new Date(dateValue), 'yyyy-MM-dd', { locale: sv });
    }
    if (dateValue instanceof Date) {
      return format(dateValue, 'yyyy-MM-dd', { locale: sv });
    }
    if (dateValue.seconds) {
      return format(new Date(dateValue.seconds * 1000), 'yyyy-MM-dd', { locale: sv });
    }
    return '';
  } catch (err) {
    console.error('Error formatting date:', err);
    return '';
  }
};

/**
 * Format currency amount
 */
const formatAmount = (amount) => {
  return parseFloat(amount || 0).toFixed(2) + ' kr';
};

/**
 * Extract product name from multilingual object or string
 */
const getProductName = (nameField) => {
  if (!nameField) return 'Produkt';
  if (typeof nameField === 'string') return nameField;
  if (typeof nameField === 'object') {
    return nameField['sv-SE'] || nameField['sv'] || 
           nameField['en-GB'] || nameField['en-US'] || nameField['en'] ||
           Object.values(nameField)[0] || 'Produkt';
  }
  return 'Produkt';
};

/**
 * Calculate order totals
 */
const calculateOrderTotals = (order) => {
  const items = order.items || [];
  
  const subtotal = order.subtotal || items.reduce((sum, item) => {
    return sum + ((item.price || 0) * (item.quantity || 0));
  }, 0);
  
  const shipping = (typeof order.shipping === 'number' ? order.shipping : 
                   (order.shipping?.cost || order.shippingCost || order.prisInfo?.frakt)) || 0;
  
  const discount = order.discountAmount || order.discount || 0;
  const vat = order.vat || 0;
  const totalAmount = order.total || order.totalAmount || (subtotal + shipping + vat - discount);
  const totalBeforeVAT = totalAmount - vat;
  
  return {
    subtotal,
    shipping,
    discount,
    totalBeforeVAT,
    vat,
    totalAmount
  };
};

/**
 * Create HTML verification document for a single order
 * Swedish accounting compliant format
 */
export const createOrderVerificationHTML = (order) => {
  const totals = calculateOrderTotals(order);
  const isB2C = order.source === 'b2c';
  
  // Customer information
  let companyName = '';
  let contactPerson = '';
  let email = '';
  let address = '';
  
  if (isB2C && order.customerInfo) {
    companyName = order.customerInfo.companyName || '';
    contactPerson = `${order.customerInfo.firstName || ''} ${order.customerInfo.lastName || ''}`.trim();
    email = order.customerInfo.email || '';
    if (order.shippingInfo) {
      address = `${order.shippingInfo.address || ''}, ${order.shippingInfo.postalCode || ''} ${order.shippingInfo.city || ''}, ${order.shippingInfo.country || ''}`.trim();
    }
  } else {
    companyName = order.companyName || '';
    contactPerson = order.contactPerson || '';
    email = order.userEmail || order.email || '';
    address = `${order.address || ''}, ${order.postalCode || ''} ${order.city || ''}, ${order.country || ''}`.trim();
  }
  
  // Order date
  const orderDate = formatDate(order.createdAt);
  
  // Payment method
  const paymentMethod = order.payment?.method || order.paymentMethod || 'Faktura';
  
  // Create HTML document
  const html = `
<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Orderverifikation ${order.orderNumber || order.id}</title>
  <style>
    @media print {
      @page { margin: 2cm; }
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
      color: #333;
      line-height: 1.6;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #459CA8;
    }
    
    .company-info {
      flex: 1;
    }
    
    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: #459CA8;
      margin-bottom: 5px;
    }
    
    .verification-info {
      text-align: right;
    }
    
    .verification-label {
      font-size: 28px;
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
    }
    
    .verification-number {
      font-size: 18px;
      color: #666;
      font-family: 'Courier New', monospace;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: bold;
      text-transform: uppercase;
      color: #459CA8;
      margin-bottom: 10px;
      letter-spacing: 0.5px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 8px;
      font-size: 14px;
    }
    
    .info-label {
      font-weight: 600;
      color: #666;
    }
    
    .info-value {
      color: #333;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 14px;
    }
    
    th {
      background-color: #459CA8;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    tr:hover {
      background-color: #f8f9fa;
    }
    
    .text-right {
      text-align: right;
    }
    
    .totals-section {
      margin-top: 30px;
      padding: 20px;
      background-color: #f8f9fa;
      border-radius: 8px;
    }
    
    .totals-grid {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 12px;
      max-width: 400px;
      margin-left: auto;
    }
    
    .total-label {
      text-align: right;
      font-weight: 600;
      color: #666;
    }
    
    .total-value {
      text-align: right;
      font-family: 'Courier New', monospace;
      min-width: 120px;
    }
    
    .total-final {
      border-top: 2px solid #459CA8;
      padding-top: 12px;
      margin-top: 8px;
    }
    
    .total-final .total-label {
      font-size: 18px;
      color: #333;
    }
    
    .total-final .total-value {
      font-size: 20px;
      font-weight: bold;
      color: #459CA8;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .status-confirmed { background-color: #d4edda; color: #155724; }
    .status-pending { background-color: #fff3cd; color: #856404; }
    .status-processing { background-color: #cce5ff; color: #004085; }
    .status-shipped { background-color: #d1ecf1; color: #0c5460; }
    .status-delivered { background-color: #d4edda; color: #155724; }
    .status-cancelled { background-color: #f8d7da; color: #721c24; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <div class="company-name">B8Shield</div>
      <div>JPH Innovation AB</div>
      <div>Org.nr: 559434-4245</div>
    </div>
    <div class="verification-info">
      <div class="verification-label">ORDERVERIFIKATION</div>
      <div class="verification-number">#${order.orderNumber || order.id}</div>
      <div style="margin-top: 10px;">${orderDate}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Kundinformation</div>
    <div class="info-grid">
      ${companyName ? `<div class="info-label">Företag:</div><div class="info-value">${companyName}</div>` : ''}
      <div class="info-label">Kontaktperson:</div>
      <div class="info-value">${contactPerson}</div>
      <div class="info-label">E-post:</div>
      <div class="info-value">${email}</div>
      ${address ? `<div class="info-label">Adress:</div><div class="info-value">${address}</div>` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Orderdetaljer</div>
    <div class="info-grid">
      <div class="info-label">Ordernummer:</div>
      <div class="info-value">${order.orderNumber || order.id}</div>
      <div class="info-label">Orderdatum:</div>
      <div class="info-value">${orderDate}</div>
      <div class="info-label">Status:</div>
      <div class="info-value">
        <span class="status-badge status-${order.status || 'pending'}">
          ${order.status === 'confirmed' ? 'Bekräftad' : 
            order.status === 'pending' ? 'Väntar' :
            order.status === 'processing' ? 'Behandlas' :
            order.status === 'shipped' ? 'Skickad' :
            order.status === 'delivered' ? 'Levererad' :
            order.status === 'cancelled' ? 'Avbruten' : 'Okänd'}
        </span>
      </div>
      <div class="info-label">Betalmetod:</div>
      <div class="info-value">${paymentMethod === 'stripe' ? 'Stripe (Kort/Swish)' : 
                                   paymentMethod === 'klarna' ? 'Klarna' : 
                                   paymentMethod === 'swish' ? 'Swish' : 
                                   paymentMethod}</div>
      <div class="info-label">Källa:</div>
      <div class="info-value">${isB2C ? 'B2C (Privatkund)' : 'B2B (Återförsäljare)'}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Produkter</div>
    <table>
      <thead>
        <tr>
          <th>Produkt</th>
          <th class="text-right">Antal</th>
          <th class="text-right">Á-pris</th>
          <th class="text-right">Summa</th>
        </tr>
      </thead>
      <tbody>
        ${(order.items || []).map(item => {
          const name = getProductName(item.name || item.productName);
          const details = [];
          if (item.color) details.push(item.color);
          if (item.size) details.push(item.size);
          const detailsStr = details.length > 0 ? `<br><small style="color: #666;">${details.join(', ')}</small>` : '';
          const quantity = item.quantity || 0;
          const price = item.price || 0;
          const total = quantity * price;
          
          return `
            <tr>
              <td>${name}${detailsStr}</td>
              <td class="text-right">${quantity} st</td>
              <td class="text-right">${formatAmount(price)}</td>
              <td class="text-right">${formatAmount(total)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>

  <div class="totals-section">
    <div class="totals-grid">
      <div class="total-label">Delsumma:</div>
      <div class="total-value">${formatAmount(totals.subtotal)}</div>
      
      <div class="total-label">Frakt:</div>
      <div class="total-value">${formatAmount(totals.shipping)}</div>
      
      ${totals.discount > 0 ? `
        <div class="total-label">Rabatt:</div>
        <div class="total-value">-${formatAmount(totals.discount)}</div>
      ` : ''}
      
      <div class="total-label">Moms (25%):</div>
      <div class="total-value">${formatAmount(totals.vat)}</div>
      
      <div class="total-label total-final">TOTALT ATT BETALA:</div>
      <div class="total-value total-final">${formatAmount(totals.totalAmount)}</div>
    </div>
  </div>

  ${order.affiliate?.code ? `
    <div class="section">
      <div class="section-title">Affiliateinformation</div>
      <div class="info-grid">
        <div class="info-label">Affiliatekod:</div>
        <div class="info-value">${order.affiliate.code}</div>
        ${order.affiliate.discountPercentage ? `
          <div class="info-label">Rabatt:</div>
          <div class="info-value">${order.affiliate.discountPercentage}%</div>
        ` : ''}
      </div>
    </div>
  ` : ''}

  <div class="footer">
    <p><strong>B8Shield - JPH Innovation AB</strong></p>
    <p>Detta är en orderverifikation för bokföring enligt Bokföringslagen (BFL 1999:1078)</p>
    <p>Spara detta dokument i minst 7 år enligt Skatteverkets krav</p>
  </div>
</body>
</html>
  `;
  
  return html;
};

/**
 * Export single order as HTML verification (opens in new window for print/save as PDF)
 */
export const exportSingleOrderVerification = (order) => {
  try {
    const html = createOrderVerificationHTML(order);
    
    // Open in new window for printing/saving as PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Kunde inte öppna nytt fönster. Kontrollera popup-blockerare.');
    }
    
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Auto-trigger print dialog after content loads
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
    
    return {
      success: true,
      message: `Verifikation för order ${order.orderNumber || order.id} öppnad`
    };
  } catch (error) {
    console.error('Error exporting order verification:', error);
    return {
      success: false,
      message: error.message || 'Kunde inte skapa orderverifikation'
    };
  }
};

/**
 * Export all orders as individual verification files
 * Opens each in separate tab for printing/saving as PDF
 */
export const exportAllOrderVerifications = (orders, options = {}) => {
  try {
    if (!orders || orders.length === 0) {
      throw new Error('Inga ordrar att exportera');
    }
    
    const maxSimultaneous = options.maxSimultaneous || 5;
    const delay = options.delay || 500;
    
    // Warning for large batches
    if (orders.length > 10) {
      const confirmed = window.confirm(
        `Du är på väg att öppna ${orders.length} verifikationer.\n\n` +
        `Detta kan ta en stund och öppnar flera fönster.\n\n` +
        `Fortsätt?`
      );
      
      if (!confirmed) {
        return {
          success: false,
          message: 'Export avbruten av användaren'
        };
      }
    }
    
    // Export in batches to avoid overwhelming browser
    let exported = 0;
    const exportBatch = (startIndex) => {
      const endIndex = Math.min(startIndex + maxSimultaneous, orders.length);
      
      for (let i = startIndex; i < endIndex; i++) {
        setTimeout(() => {
          exportSingleOrderVerification(orders[i]);
          exported++;
        }, (i - startIndex) * delay);
      }
      
      if (endIndex < orders.length) {
        setTimeout(() => {
          exportBatch(endIndex);
        }, maxSimultaneous * delay + 1000);
      }
    };
    
    exportBatch(0);
    
    return {
      success: true,
      message: `Exporterar ${orders.length} verifikationer...`,
      count: orders.length
    };
  } catch (error) {
    console.error('Error exporting order verifications:', error);
    return {
      success: false,
      message: error.message || 'Kunde inte exportera orderverifikationer'
    };
  }
};

