// Simple router that maps email type identifiers to template modules.
// Each template module exports a function that receives ({ lang, ...data })
// and returns { subject, text, html }.

const templates = {
  orderShipped: require('./orderShipped'),
  orderPending: require('./orderPending'),
  orderProcessing: require('./orderProcessing'),
  orderDelivered: require('./orderDelivered'),
  orderCancelled: require('./orderCancelled'),
  orderConfirmed: require('./orderConfirmed'),
  welcomeCredentials: require('./welcomeCredentials'),
  affiliateWelcome: require('./affiliateWelcome'),
  b2cOrderPending: require('./b2cOrderPending'),
  adminB2COrderNotification: require('./adminB2COrderNotification'),
  b2bOrderConfirmationCustomer: require('./b2bOrderConfirmationCustomer'),
  b2bOrderConfirmationAdmin: require('./b2bOrderConfirmationAdmin'),
  passwordReset: require('./passwordReset'),
  // future templates will be added here
};

/**
 * Get a prepared email (subject/text/html) for a given type.
 * @param {string} type e.g. 'orderShipped'
 * @param {string} lang Language code (e.g. 'sv-SE', 'en-GB')
 * @param {object} data Additional data needed by the template
 */
exports.getEmail = (type, lang = 'sv-SE', data = {}) => {
  if (!templates[type]) {
    throw new Error(`Unknown email template: ${type}`);
  }
  // Pass lang + rest of data to template handler
  return templates[type]({ lang, ...data });
}; 