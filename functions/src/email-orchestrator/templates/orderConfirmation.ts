// Order Confirmation Email Template — NORD-aligned, per-shop branded.
import { EMAIL_CONFIG, formatPrice, getSupportUrl, getOrderTrackingUrl } from '../core/config';
import { appUrls } from '../../config/app-urls';
import {
  renderEmailShell,
  renderHeading,
  renderParagraph,
  renderButton,
  renderOrderRows,
  renderTotals,
  renderKeyValueRows,
  renderPanel,
  renderFooterSupport,
  esc,
  emailTokens,
} from './emailLayout';

export interface OrderConfirmationData {
  orderData: {
    orderNumber: string;
    items: Array<{
      name: string | { [key: string]: string };
      color?: string;
      size?: string;
      quantity: number;
      price: number;
      image?: string;
    }>;
    subtotal: number;
    shipping: number;
    vat: number;
    total: number;
    discountAmount?: number;
    affiliateCode?: string;
    affiliate?: { code: string };
    // Multi-tenant + Click & Collect + deep-link fields carried from the order doc.
    shopId?: string;
    deliveryMethod?: string;
    pickupLocation?: { id?: string; name?: string; address?: string; date?: string };
    payment?: { paymentIntentId?: string };
  };
  customerInfo: {
    firstName?: string;
    lastName?: string;
    name?: string;
    email: string;
  };
  orderId: string;
  orderType: 'B2B' | 'B2C';
  brandName?: string;
}

// Helper function to get product name from multilingual object
function getProductName(item: any, lang: string): string {
  if (typeof item.name === 'object') {
    return item.name[lang] || item.name['sv-SE'] || item.name['en-GB'] || item.name['en-US'] || 'Okänd produkt';
  }
  return item.name || 'Okänd produkt';
}

function getDisplaySize(size: any): string {
  if (!size) return '-';
  if (typeof size === 'string') return size;
  if (typeof size === 'object') {
    return size['sv-SE'] || size['en-GB'] || size['en-US'] || Object.values(size)[0] || '-';
  }
  return String(size);
}

function getDisplayColor(color: any): string {
  if (!color) return '-';
  if (typeof color === 'string') return color;
  if (typeof color === 'object') {
    return color['sv-SE'] || color['en-GB'] || color['en-US'] || Object.values(color)[0] || '-';
  }
  return String(color);
}

// Variant/color pill. Product model v2: a variant `label` carries the choice;
// old orders fall back to color.
function getColorPill(item: any): string {
  const pill = (text: string) =>
    `<span style="display:inline-block;background-color:${emailTokens.panel};color:${emailTokens.ink};padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;margin-right:6px;border:1px solid ${emailTokens.border};">${esc(text)}</span>`;
  if (item.label) return pill(item.label);
  const color = getDisplayColor(item.color);
  if (!color || color === '-' || color === 'Blandade färger' || color === 'Mixed colors') return '';
  return pill(`Färg: ${color}`);
}

function getSizePill(item: any, lang: string): string {
  const size = getDisplaySize(item.size);
  if (!size || size === '-' || size === 'Blandade storlekar' || size === 'Mixed sizes') return '';
  const sizeLabel = lang.startsWith('en') ? 'Size' : 'Storlek';
  return `<span style="display:inline-block;background-color:${emailTokens.panel};color:${emailTokens.ink};padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;margin-right:6px;border:1px solid ${emailTokens.border};">${esc(sizeLabel)}: ${esc(size)}</span>`;
}

function getPillsRow(item: any, lang: string): string {
  const pills = getColorPill(item) + getSizePill(item, lang);
  return pills || '';
}

export function generateOrderConfirmationTemplate(data: OrderConfirmationData, lang: string = 'sv-SE', orderId?: string) {
  const { orderData, customerInfo, orderType } = data;

  const affiliateCode = orderData.affiliateCode || orderData.affiliate?.code;
  const customerName =
    (customerInfo.firstName ? customerInfo.firstName + (customerInfo.lastName ? ' ' + customerInfo.lastName : '') : '') ||
    customerInfo.name ||
    (lang.startsWith('en') ? 'there' : 'Kund');

  // USE ORDER DB ID NOT ORDER NUMBER (same pattern as status update)
  const finalOrderId = orderId || data.orderId;
  // "Visa order" must land on the storefront's shop-scoped order-confirmation
  // route: /{shopId}/order-confirmation/{paymentIntentId}. The bare
  // getOrderTrackingUrl (no shopId segment) misses the route → homepage redirect.
  const shopId = orderData.shopId;
  const paymentIntentId = orderData.payment?.paymentIntentId;
  const orderUrl = shopId && paymentIntentId
    ? `${appUrls.B2C_SHOP}/${encodeURIComponent(shopId)}/order-confirmation/${encodeURIComponent(paymentIntentId)}`
    : getOrderTrackingUrl(finalOrderId, lang);
  const supportUrl = getSupportUrl(lang);

  if (orderType === 'B2B') {
    return generateB2BTemplate(data, lang, customerName, supportUrl);
  }
  return generateB2CTemplate(data, lang, customerName, orderUrl, supportUrl, affiliateCode);
}

// B2C Template (Consumer-focused)
function generateB2CTemplate(
  data: OrderConfirmationData,
  lang: string,
  customerName: string,
  orderUrl: string,
  supportUrl: string,
  affiliateCode?: string
) {
  const { orderData, customerInfo } = data;
  const brand = data.brandName || 'ChopShop';
  const { orderNumber, items, subtotal, shipping, vat, total, discountAmount = 0 } = orderData;
  const en = lang.startsWith('en');

  // Click & Collect: pickup orders show an "Upphämtning" cost row + section
  // instead of shipping language. Non-pickup orders render exactly as before.
  const isPickup = orderData.deliveryMethod === 'pickup' && !!orderData.pickupLocation;
  const pu = orderData.pickupLocation;

  const rows = renderOrderRows(
    items.map((item) => ({
      name: getProductName(item, lang),
      meta: getPillsRow(item, lang) || undefined,
      qtyLine: `${item.quantity} ${en ? 'pcs' : 'st'} × ${formatPrice(item.price)}`,
      amount: formatPrice(item.price * item.quantity),
      image: item.image,
    }))
  );

  const totals = renderTotals([
    { label: en ? 'Subtotal' : 'Delsumma', value: formatPrice(subtotal) },
    { label: isPickup ? (en ? 'Pickup' : 'Upphämtning') : (en ? 'Shipping' : 'Frakt'), value: formatPrice(shipping) },
    ...(discountAmount > 0
      ? [{
          label: `${en ? 'Discount' : 'Rabatt'}${affiliateCode ? ' (' + affiliateCode + ')' : ''}`,
          value: `-${formatPrice(discountAmount)}`,
          positive: true,
        }]
      : []),
    { label: en ? 'VAT (25%)' : 'Moms (25%)', value: formatPrice(vat) },
    { label: en ? 'Total' : 'Totalt', value: formatPrice(total), emphasis: true },
  ]);

  const detailRows = renderKeyValueRows([
    { label: en ? 'Order number' : 'Ordernummer', value: orderNumber },
    { label: en ? 'Status' : 'Status', value: en ? 'Received' : 'Mottagen' },
    { label: en ? 'Email' : 'E-post', value: customerInfo.email },
  ]);

  const pickupSection = isPickup
    ? renderPanel(
        renderKeyValueRows([
          { label: en ? 'Location' : 'Plats', value: esc(pu?.name || '') },
          { label: en ? 'Address' : 'Adress', value: esc(pu?.address || '') },
          ...(pu?.date ? [{ label: en ? 'Pickup date' : 'Upphämtningsdatum', value: esc(pu.date) }] : []),
        ], { rawHtml: true }),
        en ? 'Pickup' : 'Upphämtning'
      )
    : '';

  const body =
    renderHeading(en ? `Thank you, ${esc(customerName)}!` : `Tack, ${esc(customerName)}!`) +
    renderParagraph(
      en
        ? `We’ve received your order and will start processing it right away.`
        : `Vi har tagit emot din beställning och börjar behandla den direkt.`
    ) +
    detailRows +
    pickupSection +
    rows +
    totals +
    renderButton(orderUrl, en ? 'View order' : 'Visa order');

  return {
    subject: en
      ? `Thank you for your order, ${customerName}! (Order ${orderNumber})`
      : `Tack för din beställning, ${customerName}! (Order ${orderNumber})`,
    html: renderEmailShell({
      brandName: brand,
      bodyHtml: body,
      footerExtraHtml: renderFooterSupport(supportUrl, lang),
      preheader: en ? `Order ${orderNumber} confirmed` : `Order ${orderNumber} bekräftad`,
    }),
  };
}

// B2B Template (Business-focused)
function generateB2BTemplate(
  data: OrderConfirmationData,
  lang: string,
  customerName: string,
  supportUrl: string
) {
  const { orderData } = data;
  const brand = data.brandName || 'ChopShop';
  const { orderNumber, total } = orderData;
  const en = lang.startsWith('en');

  const detailRows = renderKeyValueRows([
    { label: en ? 'Order number' : 'Ordernummer', value: orderNumber },
    { label: en ? 'Company' : 'Företag', value: customerName },
    { label: en ? 'Total (incl. your margin)' : 'Totalt (inkl. din marginal)', value: formatPrice(total) },
  ]);

  const body =
    renderHeading(en ? 'Order confirmation' : 'Orderbekräftelse') +
    renderParagraph(en ? `Hi ${esc(customerName)},` : `Hej ${esc(customerName)},`) +
    renderParagraph(
      en
        ? 'Thank you for your order. We’ve received it and will start processing it right away.'
        : 'Tack för din beställning. Vi har tagit emot den och börjar behandla den direkt.'
    ) +
    detailRows +
    renderButton(EMAIL_CONFIG.URLS.B2B_PORTAL, en ? 'Go to the portal' : 'Gå till portalen');

  return {
    subject: en ? `Order confirmation: ${orderNumber}` : `Orderbekräftelse: ${orderNumber}`,
    html: renderEmailShell({
      brandName: brand,
      bodyHtml: body,
      footerExtraHtml: renderFooterSupport(supportUrl, lang),
      preheader: en ? `Order ${orderNumber} confirmed` : `Order ${orderNumber} bekräftad`,
    }),
  };
}
