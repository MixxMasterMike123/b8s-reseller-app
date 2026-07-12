// Admin Order Notification Email Template — NORD-aligned, per-shop branded.
// Internal notification (Swedish); English variants kept as light stubs.
import { EMAIL_CONFIG, formatPrice } from '../core/config';
import { appUrls } from '../../config/app-urls';
import {
  renderEmailShell,
  renderHeading,
  renderParagraph,
  renderButton,
  renderPanel,
  renderKeyValueRows,
  renderOrderRows,
  renderTotals,
  renderList,
  esc,
  emailTokens,
} from './emailLayout';

export interface AdminOrderNotificationData {
  orderData: {
    orderNumber: string;
    source?: string;
    // Tenant + DB id for the shop-scoped "Hantera order" deep-link.
    shopId?: string;
    orderId?: string;
    // Click & Collect: pickup replaces the shipping-address block.
    deliveryMethod?: string;
    pickupLocation?: { id?: string; name?: string; address?: string; date?: string };
    customerInfo: {
      firstName?: string;
      lastName?: string;
      name?: string;
      email: string;
      companyName?: string;
      contactPerson?: string;
      phone?: string;
      address?: string;
      city?: string;
      postalCode?: string;
      marginal?: number;
    };
    shippingInfo?: {
      address: string;
      apartment?: string;
      postalCode: string;
      city: string;
      country: string;
    };
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
    payment?: {
      method: string;
      status: string;
      paymentIntentId?: string;
    };
    createdAt?: string;
  };
  orderSummary?: string; // For B2B orders
  orderType: 'B2B' | 'B2C';
  brandName?: string;
}

function getDisplaySize(size: any): string {
  if (!size) return '-';
  if (typeof size === 'string') return size;
  if (typeof size === 'object') return size['sv-SE'] || size['en-GB'] || size['en-US'] || Object.values(size)[0] || '-';
  return String(size);
}

function getDisplayColor(color: any): string {
  if (!color) return '-';
  if (typeof color === 'string') return color;
  if (typeof color === 'object') return color['sv-SE'] || color['en-GB'] || color['en-US'] || Object.values(color)[0] || '-';
  return String(color);
}

function getCleanProductNameAdmin(item: any): string {
  return typeof item.name === 'object'
    ? item.name['sv-SE'] || item.name['en-GB'] || item.name['en-US'] || JSON.stringify(item.name)
    : item.name || 'Unknown Product';
}

function pill(text: string): string {
  return `<span style="display:inline-block;background-color:${emailTokens.panel};color:${emailTokens.ink};padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500;margin-right:6px;border:1px solid ${emailTokens.border};">${esc(text)}</span>`;
}

function getPillsRowAdmin(item: any): string {
  let out = '';
  if (item.label) {
    out += pill(item.label);
  } else {
    const color = getDisplayColor(item.color);
    if (color && color !== '-' && color !== 'Blandade färger' && color !== 'Mixed colors') out += pill(`Färg: ${color}`);
  }
  const size = getDisplaySize(item.size);
  if (size && size !== '-' && size !== 'Blandade storlekar' && size !== 'Mixed sizes') out += pill(`Storlek: ${size}`);
  return out;
}

function formatPaymentMethod(method: string): string {
  switch (method) {
    case 'stripe': return 'Stripe (Card/Klarna/Google Pay)';
    case 'mock_payment': return 'Test Payment';
    case 'swish': return 'Swish';
    case 'klarna': return 'Klarna';
    default: return method;
  }
}

export function generateOrderNotificationAdminTemplate(data: AdminOrderNotificationData, lang: string = 'sv-SE') {
  const { orderData, orderType, orderSummary } = data;
  const brand = data.brandName || 'ChopShop';

  const paymentMethod = orderData.payment?.method || 'unknown';
  const paymentStatus = orderData.payment?.status || 'unknown';
  const paymentIntentId = orderData.payment?.paymentIntentId || '';
  const affiliateCode = orderData.affiliateCode || orderData.affiliate?.code;
  // "Hantera order" deep-links into the MANAGED shop's admin order page
  // (?shopId= handled by the SPA), falling back to the orders list when the
  // ids are missing.
  const adminBase = appUrls.ADMIN_BASE.replace(/\/$/, '');
  const adminPortalUrl = orderData.orderId && orderData.shopId
    ? `${adminBase}/admin/orders/${encodeURIComponent(orderData.orderId)}?shopId=${encodeURIComponent(orderData.shopId)}`
    : `${adminBase}/admin/orders`;

  if (orderType === 'B2B') {
    return generateB2BAdminTemplate(data, lang, brand, adminPortalUrl, orderSummary);
  }
  return generateB2CAdminTemplate(data, lang, brand, adminPortalUrl, paymentMethod, paymentStatus, paymentIntentId, affiliateCode);
}

// B2C Admin Template (Consumer order notification)
function generateB2CAdminTemplate(
  data: AdminOrderNotificationData,
  lang: string,
  brand: string,
  adminPortalUrl: string,
  paymentMethod: string,
  paymentStatus: string,
  paymentIntentId: string,
  affiliateCode?: string
) {
  const { orderData } = data;
  const ci = orderData.customerInfo;

  // Click & Collect: a pickup order shows "Upphämtning" (location + address +
  // date) instead of a shipping address that would otherwise read as bare "SE".
  const isPickup = orderData.deliveryMethod === 'pickup' && !!orderData.pickupLocation;
  const pu = orderData.pickupLocation;

  const shippingValue = orderData.shippingInfo
    ? `${esc(orderData.shippingInfo.address)}${orderData.shippingInfo.apartment ? ', ' + esc(orderData.shippingInfo.apartment) : ''}<br>${esc(orderData.shippingInfo.postalCode)} ${esc(orderData.shippingInfo.city)}<br>${esc(orderData.shippingInfo.country)}`
    : '';

  const pickupValue = isPickup
    ? `${esc(pu?.name || '')}${pu?.address ? '<br>' + esc(pu.address) : ''}${pu?.date ? '<br>Datum: ' + esc(pu.date) : ''}`
    : '';

  const customerPanel = renderPanel(
    renderKeyValueRows(
      [
        { label: 'Ordernummer', value: esc(orderData.orderNumber) },
        { label: 'Kund', value: esc(`${ci.firstName || ''} ${ci.lastName || ''}`.trim()) || '-' },
        { label: 'E-post', value: `<a href="mailto:${esc(ci.email)}" style="color:${emailTokens.ink};text-decoration:underline;">${esc(ci.email)}</a>` },
        ...(isPickup
          ? [{ label: 'Upphämtning', value: pickupValue }]
          : shippingValue ? [{ label: 'Leveransadress', value: shippingValue }] : []),
      ],
      { rawHtml: true }
    ),
    'Kundinformation'
  );

  const itemsPanel = renderPanel(
    renderOrderRows(
      orderData.items.map((item) => ({
        name: getCleanProductNameAdmin(item),
        meta: getPillsRowAdmin(item) || undefined,
        qtyLine: `${item.quantity} st × ${formatPrice(item.price)}`,
        amount: formatPrice(item.price * item.quantity),
      }))
    ),
    'Orderdetaljer'
  );

  const totalsPanel = renderPanel(
    renderTotals([
      { label: 'Delsumma', value: formatPrice(orderData.subtotal || 0) },
      { label: isPickup ? 'Upphämtning' : 'Frakt', value: formatPrice(orderData.shipping || 0) },
      ...(orderData.discountAmount && orderData.discountAmount > 0
        ? [{ label: 'Rabatt', value: `-${formatPrice(orderData.discountAmount)}`, positive: true }]
        : []),
      { label: 'Moms (25%)', value: formatPrice(orderData.vat || 0) },
      { label: 'Totalt', value: formatPrice(orderData.total || 0), emphasis: true },
    ]),
    'Ordersammanfattning'
  );

  const paymentPanel = renderPanel(
    renderKeyValueRows([
      { label: 'Betalningsmetod', value: formatPaymentMethod(paymentMethod) },
      { label: 'Betalningsstatus', value: paymentStatus },
      ...(paymentIntentId ? [{ label: 'Payment Intent ID', value: paymentIntentId }] : []),
    ]),
    'Betalningsinformation'
  );

  const affiliatePanel = affiliateCode
    ? renderPanel(
        renderKeyValueRows([
          { label: 'Affiliate-kod', value: affiliateCode },
          ...(orderData.discountAmount && orderData.discountAmount > 0 ? [{ label: 'Rabatt tillämpad', value: formatPrice(orderData.discountAmount) }] : []),
        ]),
        'Affiliate-information'
      )
    : '';

  const body =
    renderHeading(`Ny beställning${orderData.source === 'b2c' ? ' (gäst)' : ''}`) +
    renderParagraph('En ny beställning har kommit in i butiken.', { muted: true }) +
    customerPanel +
    itemsPanel +
    totalsPanel +
    paymentPanel +
    affiliatePanel +
    renderButton(adminPortalUrl, 'Hantera order');

  const shopDomain = EMAIL_CONFIG.URLS.B2C_SHOP.replace(/^https?:\/\//, '');

  return {
    subject: `Ny beställning mottagen: ${orderData.orderNumber}`,
    html: renderEmailShell({
      brandName: `${brand} System`,
      bodyHtml: body,
      footerNote: `Beställningen gjordes i butiken på ${esc(shopDomain)}.`,
      preheader: `Ny beställning: ${esc(orderData.orderNumber)}`,
    }),
  };
}

// B2B Admin Template (Business order notification)
function generateB2BAdminTemplate(
  data: AdminOrderNotificationData,
  lang: string,
  brand: string,
  adminPortalUrl: string,
  orderSummary?: string
) {
  const { orderData } = data;
  const ci = orderData.customerInfo;

  const orderInfoPanel = renderPanel(
    renderKeyValueRows([
      { label: 'Ordernummer', value: orderData.orderNumber },
      { label: 'Skapad', value: orderData.createdAt || 'Just nu' },
      { label: 'Status', value: 'Ny – behöver behandling' },
    ]),
    'Orderinformation'
  );

  const customerPanel = renderPanel(
    renderKeyValueRows(
      [
        { label: 'Företag', value: esc(ci.companyName || ci.name || '-') },
        { label: 'E-post', value: `<a href="mailto:${esc(ci.email)}" style="color:${emailTokens.ink};text-decoration:underline;">${esc(ci.email)}</a>` },
        { label: 'Kontaktperson', value: esc(ci.contactPerson || 'Ej angiven') },
        ...(ci.phone ? [{ label: 'Telefon', value: `<a href="tel:${esc(ci.phone)}" style="color:${emailTokens.ink};text-decoration:underline;">${esc(ci.phone)}</a>` }] : []),
        ...(ci.address ? [{ label: 'Adress', value: esc(`${ci.address}${ci.postalCode && ci.city ? `, ${ci.postalCode} ${ci.city}` : ''}`) }] : []),
        ...(ci.marginal ? [{ label: 'Kundmarginal', value: `${ci.marginal}%` }] : []),
      ],
      { rawHtml: true }
    ),
    'Kundinformation'
  );

  const summaryPanel = renderPanel(
    `<div style="white-space:pre-line;color:${emailTokens.ink};line-height:1.5;font-family:'Courier New',monospace;font-size:13px;">${esc(orderSummary || 'Orderdetaljer saknas')}</div>`,
    'Orderdetaljer'
  );

  const totalPanel = renderPanel(
    `<div style="text-align:right;"><div style="font-size:20px;font-weight:700;color:${emailTokens.ink};font-variant-numeric:tabular-nums;">${esc(formatPrice(orderData.total))}</div><div style="font-size:13px;color:${emailTokens.muted};margin-top:4px;">Inklusive kundens återförsäljarmarginal</div></div>`,
    'Ordersammanfattning'
  );

  const actionsPanel = renderPanel(
    renderList([
      'Granska orderdetaljer och kunduppgifter',
      'Bekräfta lagerstatus för alla produkter',
      'Uppdatera orderstatus till "Bekräftad" eller "Behandlas"',
      'Skicka orderbekräftelse till kunden',
      'Planera leverans och packning',
    ]),
    'Åtgärder som behövs'
  );

  const body =
    renderHeading('Ny företagsbeställning') +
    renderParagraph('En ny beställning har skapats i portalen och behöver behandling.', { muted: true }) +
    orderInfoPanel +
    customerPanel +
    summaryPanel +
    totalPanel +
    actionsPanel +
    renderButton(adminPortalUrl, 'Hantera order');

  return {
    subject: `Ny företagsbeställning: ${orderData.orderNumber} från ${ci.companyName || ci.name}`,
    html: renderEmailShell({
      brandName: `${brand} System`,
      bodyHtml: body,
      footerNote: 'Detta meddelande skickades automatiskt från orderhanteringen.',
      preheader: `Ny företagsbeställning: ${esc(orderData.orderNumber)}`,
    }),
  };
}
