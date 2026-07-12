"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOrderStatusUpdateTemplate = void 0;
// Order Status Update Email Template — NORD-aligned, per-shop branded.
const config_1 = require("../core/config");
const emailLayout_1 = require("./emailLayout");
// Human-readable status names (colour/emoji dropped for a calmer, modern look).
function getStatusName(status, lang) {
    const statusMap = {
        'sv-SE': {
            pending: 'Väntande',
            confirmed: 'Bekräftad',
            processing: 'Behandlas',
            ready_for_pickup: 'Redo att hämtas',
            shipped: 'Skickad',
            delivered: 'Levererad',
            cancelled: 'Avbruten',
        },
        'en-GB': {
            pending: 'Pending',
            confirmed: 'Confirmed',
            processing: 'Processing',
            ready_for_pickup: 'Ready for pickup',
            shipped: 'Shipped',
            delivered: 'Delivered',
            cancelled: 'Cancelled',
        },
        'en-US': {
            pending: 'Pending',
            confirmed: 'Confirmed',
            processing: 'Processing',
            ready_for_pickup: 'Ready for pickup',
            shipped: 'Shipped',
            delivered: 'Delivered',
            cancelled: 'Canceled',
        },
    };
    const langMap = statusMap[lang] || statusMap['sv-SE'];
    return langMap[status] || status;
}
// Helper function to get next steps based on status
function getNextSteps(status, lang, pickupLocationName) {
    const pickupLine = pickupLocationName
        ? (lang.startsWith('en') ? `Pickup location: ${pickupLocationName}` : `Upphämtningsställe: ${pickupLocationName}`)
        : '';
    const nextStepsMap = {
        'sv-SE': {
            confirmed: [
                'Vi förbereder din beställning för behandling',
                'Du får en uppdatering när vi börjar behandla ordern',
                'Beräknad behandlingstid: 1–2 arbetsdagar',
            ],
            processing: [
                'Din order behandlas och förbereds för leverans',
                'Alla produkter kontrolleras och packas noggrant',
            ],
            ready_for_pickup: [
                'Din beställning är redo att hämtas',
                ...(pickupLine ? [pickupLine] : []),
                'Ta med ditt ordernummer vid upphämtning',
            ],
            shipped: [
                'Din order är nu på väg till dig',
                'Använd spårningsnumret för att följa leveransen',
                'Hör av dig om du har frågor om leveransen',
            ],
            delivered: [
                'Din beställning har levererats',
                'Vi hoppas att du blir nöjd med ditt köp',
                'Hör av dig om du behöver hjälp eller har frågor',
            ],
            cancelled: [
                'Din beställning har avbrutits',
                'Har du betalat sker återbetalning inom 3–5 arbetsdagar',
                'Hör av dig till supporten om du har frågor',
            ],
        },
        'en-GB': {
            confirmed: [
                'We are preparing your order for processing',
                'You will get an update when we start processing it',
                'Estimated processing time: 1–2 business days',
            ],
            processing: [
                'Your order is being processed and prepared for shipment',
                'All products are checked and carefully packed',
                'You will receive tracking information once it ships',
            ],
            ready_for_pickup: [
                'Your order is ready for pickup',
                ...(pickupLine ? [pickupLine] : []),
                'Bring your order number when you collect it',
            ],
            shipped: [
                'Your order is now on its way to you',
                'Use the tracking number to follow your delivery',
                'Get in touch if you have any questions about the delivery',
            ],
            delivered: [
                'Your order has been delivered',
                'We hope you are happy with your purchase',
                'Get in touch if you need help or have any questions',
            ],
            cancelled: [
                'Your order has been cancelled',
                'If you have paid, a refund will be issued within 3–5 business days',
                'Contact support if you have any questions',
            ],
        },
    };
    const langMap = nextStepsMap[lang] || nextStepsMap['sv-SE'];
    return langMap[status] || (lang.startsWith('en') ? ['Contact us for more information'] : ['Kontakta oss för mer information']);
}
function generateOrderStatusUpdateTemplate(data, lang = 'sv-SE', orderId) {
    const { orderData, userData, newStatus, previousStatus, trackingNumber, estimatedDelivery, notes, pickupLocationName } = data;
    const { orderNumber } = orderData;
    const brand = data.brandName || 'ChopShop';
    // Ensure all required fields are present and valid
    if (!orderData?.orderNumber || !userData?.email || !newStatus) {
        throw new Error('Missing required data for order status update template');
    }
    const contactPerson = userData.contactPerson || userData.companyName || '';
    const statusName = getStatusName(newStatus, lang);
    const nextSteps = getNextSteps(newStatus, lang, pickupLocationName);
    const supportUrl = (0, config_1.getSupportUrl)(lang);
    const orderUrl = (0, config_1.getOrderTrackingUrl)(orderId || orderNumber, lang);
    const en = lang.startsWith('en');
    const detailRows = (0, emailLayout_1.renderKeyValueRows)([
        { label: en ? 'Order number' : 'Ordernummer', value: orderNumber },
        { label: en ? 'New status' : 'Ny status', value: statusName },
        ...(previousStatus ? [{ label: en ? 'Previous status' : 'Tidigare status', value: getStatusName(previousStatus, lang) }] : []),
    ]);
    const trackingRows = trackingNumber
        ? (0, emailLayout_1.renderPanel)((0, emailLayout_1.renderKeyValueRows)([
            { label: en ? 'Tracking number' : 'Spårningsnummer', value: trackingNumber },
            ...(estimatedDelivery ? [{ label: en ? 'Estimated delivery' : 'Beräknad leverans', value: estimatedDelivery }] : []),
        ]), en ? 'Tracking' : 'Spårning')
        : '';
    const notesBlock = notes
        ? (0, emailLayout_1.renderPanel)((0, emailLayout_1.renderParagraph)(notes, { muted: true }), en ? 'Additional information' : 'Ytterligare information')
        : '';
    const greeting = contactPerson
        ? (en ? `Hi ${(0, emailLayout_1.esc)(contactPerson)},` : `Hej ${(0, emailLayout_1.esc)(contactPerson)},`)
        : (en ? 'Hi,' : 'Hej,');
    const body = (0, emailLayout_1.renderHeading)(greeting) +
        (0, emailLayout_1.renderParagraph)(en ? 'We have an update on your order.' : 'Vi har en uppdatering om din beställning.') +
        detailRows +
        trackingRows +
        (0, emailLayout_1.renderParagraph)(en ? 'What happens next:' : 'Vad händer nu:') +
        (0, emailLayout_1.renderList)(nextSteps) +
        notesBlock +
        (0, emailLayout_1.renderButton)(orderUrl, en ? 'View order' : 'Visa order');
    return {
        subject: en
            ? `Order update: ${orderNumber} – ${statusName}`
            : `Orderuppdatering: ${orderNumber} – ${statusName}`,
        html: (0, emailLayout_1.renderEmailShell)({
            brandName: brand,
            bodyHtml: body,
            footerExtraHtml: (0, emailLayout_1.renderFooterSupport)(supportUrl, lang),
            preheader: en ? `Order ${orderNumber}: ${statusName}` : `Order ${orderNumber}: ${statusName}`,
        }),
    };
}
exports.generateOrderStatusUpdateTemplate = generateOrderStatusUpdateTemplate;
//# sourceMappingURL=orderStatusUpdate.js.map