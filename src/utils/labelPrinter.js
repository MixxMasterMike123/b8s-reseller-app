/**
 * Label Printer Service for BT-M110 Bluetooth Label Printer
 * Formats addresses for 40x60mm labels and handles printing via Web Bluetooth API
 */

class LabelPrinterService {
  constructor() {
    this.printer = null;
    this.isConnected = false;
    this.labelWidth = 40; // mm
    this.labelHeight = 60; // mm
  }

  /**
   * Connect to BT-M110 printer via Bluetooth
   */
  async connectToPrinter() {
    try {
      console.log('🖨️ Connecting to BT-M110 label printer...');
      
      // Request Bluetooth device
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { name: 'BT-M110' },
          { namePrefix: 'BT-M' },
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] } // Generic printer service
        ],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });

      console.log('📱 Found device:', device.name);
      
      // Connect to GATT server
      const server = await device.gatt.connect();
      console.log('🔗 Connected to GATT server');
      
      this.printer = { device, server };
      this.isConnected = true;
      
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to printer:', error);
      throw new Error(`Bluetooth connection failed: ${error.message}`);
    }
  }

  /**
   * Format order address for label printing
   */
  formatAddressLabel(order, userData = null) {
    const isB2C = order.source === 'b2c';
    
    let addressData;
    
    if (isB2C) {
      // B2C order - use shippingInfo and customerInfo
      addressData = {
        name: `${order.customerInfo?.firstName || ''} ${order.customerInfo?.lastName || ''}`.trim(),
        company: '', // B2C customers don't have companies
        address: order.shippingInfo?.address || '',
        apartment: order.shippingInfo?.apartment || '',
        postalCode: order.shippingInfo?.postalCode || '',
        city: order.shippingInfo?.city || '',
        country: order.shippingInfo?.country || 'SE'
      };
    } else {
      // B2B order - use userData delivery address
      addressData = {
        name: userData?.contactPerson || 'Unknown',
        company: userData?.companyName || '',
        address: userData?.deliveryAddress || userData?.address || '',
        apartment: '', // B2B usually doesn't have apartment numbers
        postalCode: userData?.deliveryPostalCode || userData?.postalCode || '',
        city: userData?.deliveryCity || userData?.city || '',
        country: userData?.deliveryCountry || userData?.country || 'SE'
      };
    }

    // Format for 40x60mm label (approximately 6-7 lines)
    const labelLines = [];
    
    // Line 1: Name (required)
    if (addressData.name) {
      labelLines.push(addressData.name.substring(0, 20)); // Max 20 chars for name
    }
    
    // Line 2: Company (if B2B and different from name)
    if (addressData.company && addressData.company !== addressData.name) {
      labelLines.push(addressData.company.substring(0, 20));
    }
    
    // Line 3: Street address
    if (addressData.address) {
      labelLines.push(addressData.address.substring(0, 20));
    }
    
    // Line 4: Apartment (if present)
    if (addressData.apartment) {
      labelLines.push(addressData.apartment.substring(0, 20));
    }
    
    // Line 5: Postal code + City
    const postalCity = `${addressData.postalCode} ${addressData.city}`.trim();
    if (postalCity) {
      labelLines.push(postalCity.substring(0, 20));
    }
    
    // Line 6: Country (if not Sweden)
    if (addressData.country && addressData.country !== 'SE') {
      const countryName = addressData.country === 'NO' ? 'NORGE' : 
                         addressData.country === 'DK' ? 'DANMARK' : 
                         addressData.country === 'FI' ? 'FINLAND' : 
                         addressData.country;
      labelLines.push(countryName);
    }

    return {
      lines: labelLines,
      orderNumber: order.orderNumber || order.id,
      rawData: addressData
    };
  }

  /**
   * Generate ESC/POS commands for BT-M110 printer
   */
  generatePrintCommands(labelData) {
    const ESC = '\x1b';
    const GS = '\x1d';
    
    let commands = '';
    
    // Initialize printer
    commands += ESC + '@'; // Initialize
    commands += ESC + 'a' + '\x01'; // Center alignment
    
    // Set character size (smaller for 40mm width)
    commands += GS + '!' + '\x00'; // Normal size
    
    // Print order number (smaller font)
    commands += `Order: ${labelData.orderNumber}\n`;
    commands += '\n'; // Blank line
    
    // Print address lines
    labelData.lines.forEach(line => {
      commands += line + '\n';
    });
    
    // Add some spacing and cut
    commands += '\n\n';
    commands += GS + 'V' + '\x42' + '\x00'; // Partial cut
    
    return new TextEncoder().encode(commands);
  }

  /**
   * Print label - Primary method using system print dialog
   */
  async printLabel(order, userData = null) {
    try {
      console.log('🖨️ Formatting label for order:', order.orderNumber || order.id);
      
      // Format address for label
      const labelData = this.formatAddressLabel(order, userData);
      console.log('📋 Label data:', labelData);
      
      // Always use system print dialog (most reliable)
      this.printViaSystemDialog(labelData);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to print label:', error);
      throw error;
    }
  }

  /**
   * Advanced: Print via Bluetooth (for tech-savvy users)
   */
  async printViaBluetooth(order, userData = null) {
    if (!this.isConnected) {
      throw new Error('Bluetooth printer not connected. Use "Anslut BT-M110" button first.');
    }

    try {
      console.log('📱 Printing via Bluetooth for order:', order.orderNumber || order.id);
      
      const labelData = this.formatAddressLabel(order, userData);
      const printCommands = this.generatePrintCommands(labelData);
      
      // TODO: Implement actual Bluetooth printing
      // For now, fallback to system dialog
      this.printViaSystemDialog(labelData);
      
      return true;
    } catch (error) {
      console.error('❌ Bluetooth printing failed:', error);
      throw error;
    }
  }

  /**
   * Primary: Print via system dialog (optimized for BT-M110 40x60mm labels)
   */
  printViaSystemDialog(labelData) {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>B8Shield Fraktetikett - ${labelData.orderNumber}</title>
        <meta charset="utf-8">
        <style>
          @page {
            size: 40mm 60mm;
            margin: 2mm;
          }
          
          body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            font-size: 11px;
            line-height: 1.1;
            margin: 0;
            padding: 2mm;
            background: white;
            color: black;
            width: 36mm;
            height: 56mm;
          }
          
          .label-container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
          }
          
          .order-header {
            font-size: 8px;
            text-align: center;
            margin-bottom: 2mm;
            color: #333;
            font-weight: normal;
            border-bottom: 1px solid #ccc;
            padding-bottom: 1mm;
          }
          
          .address-section {
            flex-grow: 1;
          }
          
          .address-line {
            margin-bottom: 0.5mm;
            font-weight: bold;
            font-size: 10px;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          
          .address-line:first-child {
            font-size: 11px;
            margin-bottom: 1mm;
          }
          
          .postal-line {
            font-size: 10px;
            font-weight: bold;
            margin-top: 1mm;
          }
          
          .country-line {
            font-size: 9px;
            margin-top: 1mm;
            text-align: center;
            font-weight: bold;
          }
          
          @media print {
            body { 
              margin: 0; 
              padding: 1mm;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .order-header {
              border-bottom: 1px solid #000;
            }
          }
          
          /* Optimize for thermal printers */
          @media print and (monochrome) {
            * {
              color: black !important;
              background: white !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="order-header">B8Shield Order: ${labelData.orderNumber}</div>
          <div class="address-section">
            ${labelData.lines.map((line, index) => {
              // Detect postal code + city line
              const isPostalLine = /^\d{5}\s+/.test(line);
              const isCountryLine = line.length <= 8 && line.toUpperCase() === line;
              
              let className = 'address-line';
              if (isPostalLine) className += ' postal-line';
              if (isCountryLine) className += ' country-line';
              
              return `<div class="${className}">${line}</div>`;
            }).join('')}
          </div>
        </div>
        
        <script>
          // Enhanced printing for different systems
          window.onload = function() {
            // Small delay to ensure styles are loaded
            setTimeout(() => {
              // Trigger print dialog
              window.print();
              
              // Auto-close after printing (or timeout)
              setTimeout(() => {
                try {
                  window.close();
                } catch (e) {
                  // Some browsers block auto-close
                  console.log('Print dialog opened successfully');
                }
              }, 2000);
            }, 500);
          };
          
          // Handle print events
          window.addEventListener('beforeprint', function() {
            console.log('🖨️ Opening print dialog for BT-M110 label');
            document.title = 'Fraktetikett ${labelData.orderNumber} - Välj BT-M110 eller spara som PDF';
          });
          
          window.addEventListener('afterprint', function() {
            console.log('✅ Print dialog completed');
          });
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  }

  /**
   * Print multiple labels (for order list)
   */
  async printMultipleLabels(orders, userDataMap = {}) {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Shipping Labels - Batch Print</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.2;
            margin: 20px;
            background: white;
          }
          .label {
            width: 40mm;
            height: 60mm;
            border: 2px dashed #ccc;
            padding: 5mm;
            box-sizing: border-box;
            page-break-after: always;
            display: inline-block;
            margin: 5mm;
            vertical-align: top;
          }
          .order-number {
            font-size: 10px;
            text-align: center;
            margin-bottom: 3mm;
            color: #666;
          }
          .address-line {
            margin-bottom: 1mm;
            font-weight: bold;
          }
          @media print {
            body { margin: 0; }
            .label { border: none; margin: 2mm; }
          }
        </style>
      </head>
      <body>
    `;
    
    orders.forEach(order => {
      const userData = userDataMap[order.userId];
      const labelData = this.formatAddressLabel(order, userData);
      
      html += `
        <div class="label">
          <div class="order-number">Order: ${labelData.orderNumber}</div>
          ${labelData.lines.map(line => `<div class="address-line">${line}</div>`).join('')}
        </div>
      `;
    });
    
    html += `
        <script>
          window.onload = function() {
            window.print();
            setTimeout(() => window.close(), 1000);
          }
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  }

  /**
   * Disconnect from printer
   */
  disconnect() {
    if (this.printer && this.printer.device) {
      this.printer.device.gatt.disconnect();
      this.printer = null;
      this.isConnected = false;
      console.log('📱 Disconnected from printer');
    }
  }
}

// Create singleton instance
const labelPrinter = new LabelPrinterService();

export default labelPrinter;

// Export utility functions
export const formatAddressForLabel = (order, userData = null) => {
  return labelPrinter.formatAddressLabel(order, userData);
};

export const printShippingLabel = async (order, userData = null) => {
  return labelPrinter.printLabel(order, userData);
};

export const printMultipleShippingLabels = async (orders, userDataMap = {}) => {
  return labelPrinter.printMultipleLabels(orders, userDataMap);
};

export const connectLabelPrinter = async () => {
  return labelPrinter.connectToPrinter();
};
