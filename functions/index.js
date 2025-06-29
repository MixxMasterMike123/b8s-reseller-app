const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const { getFirestore, Timestamp, query, where, getDocs, orderBy, limit, FieldValue } = require("firebase-admin/firestore");
const cors = require('cors')({
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
});

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Firestore for the CORRECT named database
const db = getFirestore('b8s-reseller-db');
db.settings({ ignoreUndefinedProperties: true });

// Create transporter for sending emails using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: "b8shield.reseller@gmail.com",
    pass: "lgpz rkhx isnt fqcg",
  },
});

// Email templates for different order statuses
const getEmailTemplate = (status, orderData, userData) => {
  const orderNumber = orderData.orderNumber;
  const companyName = userData.companyName;
  const contactPerson = userData.contactPerson;
  
  const templates = {
    pending: {
      subject: `Order Received: ${orderNumber}`,
      text: `
        Hej ${contactPerson},
        
        Tack för din beställning! Vi har mottagit din order och kommer att behandla den snarast.
        
        Ordernummer: ${orderNumber}
        Status: Mottagen
        
        Du kommer att få ytterligare uppdateringar när din order behandlas.
        
        Med vänliga hälsningar,
        B8Shield Team
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://b8shield-reseller-app.web.app/images/B8S_logo.png" alt="B8Shield" style="max-width: 200px; height: auto;">
          </div>
          <h2>Hej ${contactPerson},</h2>
          <p>Tack för din beställning! Vi har mottagit din order och kommer att behandla den snarast.</p>
          <p><strong>Ordernummer:</strong> ${orderNumber}</p>
          <p><strong>Status:</strong> Mottagen</p>
          <p>Du kommer att få ytterligare uppdateringar när din order behandlas.</p>
          <p>Med vänliga hälsningar,<br>B8Shield Team</p>
        </div>
      `
    },
    processing: {
      subject: `Order i behandling: ${orderNumber}`,
      text: `
        Hej ${contactPerson},
        
        Din order är nu under behandling och förbereds för leverans.
        
        Ordernummer: ${orderNumber}
        Status: Behandlas
        
        Vi kommer att meddela dig när ordern har skickats.
        
        Med vänliga hälsningar,
        B8Shield Team
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://b8shield-reseller-app.web.app/images/B8S_logo.png" alt="B8Shield" style="max-width: 200px; height: auto;">
          </div>
          <h2>Hej ${contactPerson},</h2>
          <p>Din order är nu under behandling och förbereds för leverans.</p>
          <p><strong>Ordernummer:</strong> ${orderNumber}</p>
          <p><strong>Status:</strong> Behandlas</p>
          <p>Vi kommer att meddela dig när ordern har skickats.</p>
          <p>Med vänliga hälsningar,<br>B8Shield Team</p>
        </div>
      `
    },
    shipped: {
      subject: `Order skickad: ${orderNumber}`,
      text: `
        Hej ${contactPerson},
        
        Goda nyheter! Din order har skickats och är nu på väg till dig.
        
        Ordernummer: ${orderNumber}
        Status: Skickad
        ${orderData.trackingNumber ? `Spårningsnummer: ${orderData.trackingNumber}` : ''}
        ${orderData.carrier ? `Transportör: ${orderData.carrier}` : ''}
        
        Din order kommer att levereras inom 1-3 arbetsdagar.
        
        Med vänliga hälsningar,
        B8Shield Team
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://b8shield-reseller-app.web.app/images/B8S_logo.png" alt="B8Shield" style="max-width: 200px; height: auto;">
          </div>
          <h2>Hej ${contactPerson},</h2>
          <p>Goda nyheter! Din order har skickats och är nu på väg till dig.</p>
          <p><strong>Ordernummer:</strong> ${orderNumber}</p>
          <p><strong>Status:</strong> Skickad</p>
          ${orderData.trackingNumber ? `<p><strong>Spårningsnummer:</strong> ${orderData.trackingNumber}</p>` : ''}
          ${orderData.carrier ? `<p><strong>Transportör:</strong> ${orderData.carrier}</p>` : ''}
          <p>Din order kommer att levereras inom 1-3 arbetsdagar.</p>
          <p>Med vänliga hälsningar,<br>B8Shield Team</p>
        </div>
      `
    },
    delivered: {
      subject: `Order levererad: ${orderNumber}`,
      text: `
        Hej ${contactPerson},
        
        Din order har levererats framgångsrikt!
        
        Ordernummer: ${orderNumber}
        Status: Levererad
        
        Tack för att du handlar med B8Shield. Om du har några frågor eller problem med din order, tveka inte att kontakta oss.
        
        Vi uppskattar ditt förtroende och ser fram emot att hjälpa dig igen.
        
        Med vänliga hälsningar,
        B8Shield Team
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://b8shield-reseller-app.web.app/images/B8S_logo.png" alt="B8Shield" style="max-width: 200px; height: auto;">
          </div>
          <h2>Hej ${contactPerson},</h2>
          <p>Din order har levererats framgångsrikt!</p>
          <p><strong>Ordernummer:</strong> ${orderNumber}</p>
          <p><strong>Status:</strong> Levererad</p>
          <p>Tack för att du handlar med B8Shield. Om du har några frågor eller problem med din order, tveka inte att kontakta oss.</p>
          <p>Vi uppskattar ditt förtroende och ser fram emot att hjälpa dig igen.</p>
          <p>Med vänliga hälsningar,<br>B8Shield Team</p>
        </div>
      `
    },
    cancelled: {
      subject: `Order avbruten: ${orderNumber}`,
      text: `
        Hej ${contactPerson},
        
        Din order har tyvärr avbrutits.
        
        Ordernummer: ${orderNumber}
        Status: Avbruten
        ${orderData.cancellationReason ? `Anledning: ${orderData.cancellationReason}` : ''}
        
        Om du har några frågor om denna avbokning, vänligen kontakta vår kundtjänst.
        
        Med vänliga hälsningar,
        B8Shield Team
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://b8shield-reseller-app.web.app/images/B8S_logo.png" alt="B8Shield" style="max-width: 200px; height: auto;">
          </div>
          <h2>Hej ${contactPerson},</h2>
          <p>Din order har tyvärr avbrutits.</p>
          <p><strong>Ordernummer:</strong> ${orderNumber}</p>
          <p><strong>Status:</strong> Avbruten</p>
          ${orderData.cancellationReason ? `<p><strong>Anledning:</strong> ${orderData.cancellationReason}</p>` : ''}
          <p>Om du har några frågor om denna avbokning, vänligen kontakta vår kundtjänst.</p>
          <p>Med vänliga hälsningar,<br>B8Shield Team</p>
        </div>
      `
    }
  };
  
  return templates[status] || templates.processing;
};

/**
 * TEMPORARY B2C Email Templates until they can be merged with the main one
 */
const getB2CEmailTemplate = (status, orderData, customerInfo) => {
  const orderNumber = orderData.orderNumber;
  const customerName = customerInfo.name;
  
  const templates = {
    pending: {
      subject: `Tack för din beställning, ${customerName}! (Order ${orderNumber})`,
      text: `
        Hej ${customerName},
        
        Tack för din beställning från B8Shield! Vi har mottagit din order och kommer att behandla den snarast.
        
        Ordernummer: ${orderNumber}
        Status: Mottagen
        
        Du kommer att få ytterligare uppdateringar när din order behandlas och skickas. Du kan se din orderstatus här: ${`https://shop.b8shield.com/order-confirmation/${orderData.id || ''}`}
        
        Med vänliga hälsningar,
        B8Shield Team
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://b8shield-reseller-app.web.app/images/B8S_logo.png" alt="B8Shield" style="max-width: 200px; height: auto;">
          </div>
          <h2>Hej ${customerName},</h2>
          <p>Tack för din beställning! Vi har mottagit din order och kommer att behandla den snarast.</p>
          <p><strong>Ordernummer:</strong> ${orderNumber}</p>
          <p><strong>Status:</strong> Mottagen</p>
          <p>Du kommer att få ett nytt mail när din order har skickats. Du kan se din orderinformation på vår hemsida:</p>
          <div style="text-align: center; margin: 20px 0;">
             <a href="https://shop.b8shield.com/order-confirmation/${orderData.id || ''}" style="background-color: #459CA8; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Visa din beställning</a>
          </div>
          <p>Med vänliga hälsningar,<br>B8Shield Team</p>
        </div>
      `
    },
    // Future B2C templates for shipped, etc. can go here
  };
  
  return templates[status] || templates.pending;
};

/**
 * [NEW] Callable function to approve an affiliate application.
 */
exports.approveAffiliate = functions.https.onCall(async (data, context) => {
  // 1. Authentication Check: Ensure the user is an authenticated admin.
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const adminUserDoc = await db.collection('users').doc(context.auth.uid).get();
  if (!adminUserDoc.exists || adminUserDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can approve affiliates.');
  }

  const { 
    applicationId, 
    checkoutDiscount,
    name,
    email,
    phone,
    address,
    postalCode,
    city,
    country,
    socials,
    promotionMethod,
    message
   } = data;
  if (!applicationId) {
    throw new functions.https.HttpsError('invalid-argument', 'The function must be called with an "applicationId".');
  }

  try {
    const applicationRef = db.collection('affiliateApplications').doc(applicationId);
    const applicationDoc = await applicationRef.get();
    if (!applicationDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Affiliate application not found.');
    }
    const appData = applicationDoc.data();

    // 2. Create a Firebase Auth user for the affiliate.
    const tempPassword = Math.random().toString(36).slice(-8);
    let authUser;
    let wasExistingAuthUser = false;

    try {
      authUser = await admin.auth().createUser({
        email: appData.email,
        emailVerified: true,
        password: tempPassword,
        displayName: appData.name,
      });
    } catch (error) {
       if (error.code === 'auth/email-already-exists') {
        // If auth user exists, find them and use their UID.
        authUser = await admin.auth().getUserByEmail(appData.email);
        wasExistingAuthUser = true;
        console.log(`User with email ${appData.email} already exists. Using existing auth UID.`);
      } else {
        throw error; // Rethrow other auth errors
      }
    }

    // 3. Generate a unique, human-readable affiliate code.
    const namePart = appData.name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').substring(0, 8);
    const randomPart = Math.floor(100 + Math.random() * 900); // 3-digit random number
    const affiliateCode = `${namePart}-${randomPart}`;

    // 4. Create the new affiliate record.
    const affiliateRef = db.collection('affiliates').doc(authUser.uid); // Use auth UID as document ID
    
    const newAffiliateData = {
      id: authUser.uid,
      affiliateCode,
      name,
      email,
      phone,
      address,
      postalCode,
      city,
      country,
      socials,
      promotionMethod,
      message,
      status: 'active',
      commissionRate: 15, // Default commission
      checkoutDiscount: checkoutDiscount || 10,
      stats: {
        clicks: 0,
        conversions: 0,
        totalEarnings: 0,
        balance: 0,
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await affiliateRef.set(newAffiliateData);

    // 5. Delete the original application.
    await applicationRef.delete();
    
    // 6. Send a welcome email to the new affiliate with their code and temp password.
    const loginInstructions = wasExistingAuthUser
      ? `<p>Du hade redan ett konto hos B8Shield, så du kan logga in med ditt befintliga lösenord. Om du har glömt det kan du återställa det på inloggningssidan.</p>`
      : `<ul>
          <li><strong>Användarnamn:</strong> ${appData.email}</li>
          <li><strong>Tillfälligt lösenord:</strong> ${tempPassword}</li>
        </ul>
        <p>Vi rekommenderar starkt att du byter ditt lösenord efter första inloggningen.</p>`;

    const welcomeEmail = {
      from: '"B8Shield" <b8shield.reseller@gmail.com>',
      to: appData.email,
      subject: 'Välkommen till B8Shield Affiliate Program!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>Grattis, ${appData.name}!</h2>
          <p>Din ansökan till B8Shields affiliate-program har blivit godkänd.</p>
          <p>Här är dina inloggningsuppgifter för <a href="https://shop.b8shield.com/affiliate-portal">Affiliate-portalen</a>:</p>
          ${loginInstructions}
          <hr>
          <h3>Din unika affiliatelänk:</h3>
          <p>Använd denna länk för att tjäna provision på alla köp:</p>
          <p><strong><a href="https://shop.b8shield.com/?ref=${affiliateCode}">https://shop.b8shield.com/?ref=${affiliateCode}</a></strong></p>
          <br>
          <p>Lycka till med försäljningen!</p>
          <p>Med vänliga hälsningar,<br>B8Shield Team</p>
        </div>
      `,
    };

    await transporter.sendMail(welcomeEmail);

    return { success: true, affiliateCode: affiliateCode };

  } catch (error) {
    console.error("Error approving affiliate:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'An internal error occurred while approving the affiliate.');
  }
});

/**
 * [NEW] Callable function to log an affiliate link click.
 */
exports.logAffiliateClick = functions
  .region('us-central1')
  .https.onCall(async (data, context) => {
  const { affiliateCode } = data;

  if (!affiliateCode) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'The function must be called with an affiliateCode.'
      );
  }

  try {
      // Get affiliate details
    const affiliatesRef = db.collection('affiliates');
      const q = affiliatesRef.where('affiliateCode', '==', affiliateCode).where('status', '==', 'active');
      const affiliateSnapshot = await q.get();

      if (affiliateSnapshot.empty) {
        throw new functions.https.HttpsError(
          'not-found',
          `No active affiliate found for code: ${affiliateCode}`
        );
      }

      const affiliateDoc = affiliateSnapshot.docs[0];
      const affiliate = affiliateDoc.data();

      // Create click record
      const clickRef = await db.collection('affiliateClicks').add({
      affiliateCode: affiliateCode,
        affiliateId: affiliateDoc.id,
        timestamp: admin.firestore.Timestamp.now(),
      ipAddress: context.rawRequest?.ip || 'unknown',
      userAgent: context.rawRequest?.headers?.['user-agent'] || 'unknown',
        landingPage: context.rawRequest?.headers?.referer || 'unknown',
        converted: false,
      });

      // Update affiliate stats
      await affiliateDoc.ref.update({
        'stats.clicks': admin.firestore.FieldValue.increment(1)
      });
    
      return { 
        success: true, 
        message: `Click logged for affiliate ${affiliateCode}`,
        clickId: clickRef.id
      };

  } catch (error) {
      console.error(`Error logging affiliate click for code ${affiliateCode}:`, error);
      throw new functions.https.HttpsError(
        'internal',
        'Error logging affiliate click.'
      );
  }
});

/**
 * [NEW & REFACTORED] This is an HTTP function invoked from the client-side after
 * a successful B2C order creation. Using HTTP instead of Callable for better CORS support.
 */
exports.processB2COrderCompletion = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB'
  })
  .region('us-central1')
  .https.onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', 'https://shop.b8shield.com');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Only allow POST
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    try {
      const { orderId } = req.body;

  if (!orderId) {
        res.status(400).json({ 
          success: false, 
          error: 'The function must be called with an "orderId".' 
        });
        return;
  }

  console.log(`Processing B2C order completion for orderId: ${orderId}`);
  const localDb = db; // Use the correct named database

  // --- Start of Affiliate Conversion Logic ---
  const orderRef = localDb.collection('orders').doc(orderId);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    console.error(`Order ${orderId} not found in b8s-reseller-db.`);
        res.status(404).json({ 
          success: false, 
          error: `Order ${orderId} not found in database` 
        });
        return;
      }

    const orderData = orderSnap.data();
      const { affiliateCode } = orderData;

      if (!affiliateCode) {
        console.log('No affiliate code found for order, skipping commission.');
        res.json({ success: true, message: 'Order processed (no affiliate)' });
        return;
      }

      // Get affiliate details
      const affiliateSnap = await localDb
        .collection('affiliates')
        .where('affiliateCode', '==', affiliateCode)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (affiliateSnap.empty) {
        console.error(`No active affiliate found for code: ${affiliateCode}`);
        res.json({ success: true, message: 'Order processed (invalid affiliate)' });
        return;
      }

      const affiliateDoc = affiliateSnap.docs[0];
        const affiliate = affiliateDoc.data();

      // Calculate commission
      const orderTotal = orderData.total || 0;
      const commissionRate = affiliate.commissionRate || 15; // Default 15%
      const commissionAmount = (orderTotal * (commissionRate / 100));

      // Update affiliate stats
      await affiliateDoc.ref.update({
        'stats.conversions': FieldValue.increment(1),
        'stats.totalEarnings': FieldValue.increment(commissionAmount),
        'stats.balance': FieldValue.increment(commissionAmount)
      });

      // Update the click to mark conversion
      if (orderData.affiliateClickId) {
        await localDb
          .collection('affiliateClicks')
          .doc(orderData.affiliateClickId)
          .update({
                converted: true,
                orderId: orderId,
            commissionAmount: commissionAmount
          });
      }

      console.log(`Successfully processed affiliate commission for order ${orderId}`);
      res.json({ 
        success: true, 
        message: 'Order processed with affiliate commission',
        commission: commissionAmount 
      });

          } catch (error) {
      console.error('Error processing B2C order completion:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error processing order' 
      });
    }
});

/**
 * [DEPRECATED] This trigger is no longer reliable due to the named database limitation.
 * It is replaced by the `processB2COrderCompletion` callable function.
 * We are keeping it here but it should be removed later.
 */
exports.processAffiliateConversion = functions.firestore
  .document('order-triggers/{orderId}')
  .onCreate(async (snap, context) => {
    console.log(`DEPRECATED trigger fired for ${context.params.orderId}. No action taken.`);
    return null;
  });

/**
 * Send order confirmation emails when a new order is created
 * NOTE: This trigger may not work reliably with named databases in some Firebase setups.
 * If emails aren't being sent, consider calling sendOrderConfirmationHttp directly from client.
 */
exports.sendOrderConfirmationEmails = functions.firestore
  .document("orders/{orderId}")
  .onCreate(async (snapshot, context) => {
    try {
      const orderData = snapshot.data();
      const orderId = context.params.orderId;

      console.log(`Email trigger fired for order ${orderId} from named database`);

      let customerEmail;
      let customerName;
      let adminEmailDetails = {
        subject: `New B2C Order Received: ${orderData.orderNumber}`,
        body: `
          <div style="font-family: Arial, sans-serif;">
            <h2>New B2C Guest Order Received</h2>
            <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
            <p><strong>Customer:</strong> ${orderData.customerInfo.firstName} ${orderData.customerInfo.lastName}</p>
            <p><strong>Email:</strong> ${orderData.customerInfo.email}</p>
            <h3>Order Details:</h3>
            <ul>
              ${orderData.items.map(item => `<li>${item.name} - ${item.quantity} pcs @ ${item.price} SEK</li>`).join('')}
            </ul>
            <p><strong>Total Amount:</strong> ${orderData.total} SEK</p>
            ${orderData.affiliateCode ? `<p><strong>Affiliate Code:</strong> ${orderData.affiliateCode}</p>` : ''}
          </div>
        `
      };

      // Handle B2C (guest or simple auth user) vs B2B (full auth user)
      if (orderData.source === 'b2c') {
        customerEmail = orderData.customerInfo.email;
        customerName = orderData.customerInfo.firstName || 'Customer';
        
        // If a B2C user is logged in, add that to the admin email
        if(orderData.userId) {
           adminEmailDetails.subject = `New B2C Order (Logged-in User): ${orderData.orderNumber}`;
           adminEmailDetails.body += `<p><strong>User ID:</strong> ${orderData.userId}</p>`;
        }
      
      } else { // Legacy or B2B order
        // Use the named database for B2B user lookup
        const userSnapshot = await db
          .collection("users")
          .doc(orderData.userId)
          .get();

        if (!userSnapshot.exists) {
          console.error(`B2B user with ID ${orderData.userId} not found for order ${orderId}.`);
          // Don't send customer email if we can't find them
        } else {
          const userData = userSnapshot.data();
          customerEmail = userData.email;
          customerName = userData.contactPerson || userData.companyName;
          
          adminEmailDetails.subject = `New B2B Order Received: ${orderData.orderNumber}`;
          adminEmailDetails.body = `
            <div style="font-family: Arial, sans-serif;">
              <h2>New B2B Order Received</h2>
              <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
              <p><strong>Company:</strong> ${userData.companyName}</p>
              <p><strong>Contact:</strong> ${userData.contactPerson}</p>
              <p><strong>Email:</strong> ${userData.email}</p>
              <h3>Order Details:</h3>
              <ul>
                ${orderData.items.map(item => `<li>${item.name} - ${item.quantity} pcs @ ${item.price} SEK</li>`).join('')}
              </ul>
              <p><strong>Total Amount:</strong> ${orderData.totalAmount || orderData.total} SEK</p>
              ${orderData.affiliateCode ? `<p><strong>Affiliate Code:</strong> ${orderData.affiliateCode}</p>` : ''}
            </div>
          `;
        }
      }

      // 1. Send email to customer (if email is available)
      if (customerEmail) {
        let customerTemplate;

        if (orderData.source === 'b2c') {
          customerTemplate = getB2CEmailTemplate('pending', orderData, { name: customerName });
        } else {
          // For B2B, we need the full userData object for the original template
          const userSnapshot = await db.collection("users").doc(orderData.userId).get();
          if (userSnapshot.exists) {
            customerTemplate = getEmailTemplate('pending', orderData, userSnapshot.data());
          }
        }
        
        if (customerTemplate) {
            const mailOptions = {
              from: '"B8Shield" <b8shield.reseller@gmail.com>',
              to: customerEmail,
              subject: customerTemplate.subject,
              text: customerTemplate.text,
              html: customerTemplate.html,
            };

            await transporter.sendMail(mailOptions);
            console.log(`Order confirmation email sent to ${customerEmail}`);
        } else {
            console.log(`Could not generate email template for order ${orderId}. Skipping customer confirmation.`);
        }
      } else {
         console.log(`No customer email available for order ${orderId}. Skipping customer confirmation.`);
      }

      // 2. Send email to admin
      const adminMailOptions = {
        from: '"B8Shield" <b8shield.reseller@gmail.com>',
        to: "b8shield.reseller@gmail.com", // Admin's email address
        subject: adminEmailDetails.subject,
        html: adminEmailDetails.body,
      };
      
      await transporter.sendMail(adminMailOptions);
      console.log(`Admin notification sent for order ${orderId}.`);

    } catch (error) {
      console.error(`Error sending confirmation emails for order ${context.params.orderId}:`, error);
    }
  });

/**
 * Send email to user when their account is activated
 */
exports.sendUserActivationEmail = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    try {
      const beforeData = change.before.data();
      const afterData = change.after.data();
      const userId = context.params.userId;

      // Check if user was activated
      if (!beforeData.isActive && afterData.isActive) {
        const email = {
          from: `"B8Shield" <info@b8shield.com>`,
          to: afterData.email,
          subject: "Ditt B8Shield-konto är nu aktivt",
          text: `
            Hej ${afterData.contactPerson},
            
            Ditt B8Shield-konto för ${afterData.companyName} har aktiverats!
            
            Du kan nu logga in med ditt användarnamn och lösenord på:
            https://b8shield-reseller-app.web.app
            
            Om du har några frågor, kontakta vår support.
            
            Med vänliga hälsningar,
            B8Shield Team
          `,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="text-align: center; margin-bottom: 30px;">
                <img src="https://b8shield-reseller-app.web.app/images/B8S_logo.png" alt="B8Shield" style="max-width: 200px; height: auto;">
              </div>
              <h2>Hej ${afterData.contactPerson},</h2>
              
              <p>Ditt B8Shield-konto för <strong>${afterData.companyName}</strong> har aktiverats!</p>
              
              <p>Du kan nu logga in med ditt användarnamn och lösenord på:<br>
              <a href="https://b8shield-reseller-app.web.app">B8Shield Portal</a></p>
              
              <p>Om du har några frågor, kontakta vår support.</p>
              
              <p>Med vänliga hälsningar,<br>B8Shield Team</p>
            </div>
          `,
        };
        
        await transporter.sendMail(email);
        console.log(`Activation email sent to user ${userId}`);
      }
      
      return null;
    } catch (error) {
      console.error("Error sending user activation email:", error);
      return null;
    }
  });

/**
 * Send order status update emails when order status changes
 */
exports.sendOrderStatusUpdateEmail = functions.firestore
  .document("orders/{orderId}")
  .onUpdate(async (change, context) => {
    try {
      const beforeData = change.before.data();
      const afterData = change.after.data();
      const orderId = context.params.orderId;

      // Check if status changed
      if (beforeData.status !== afterData.status) {
        // Get user data
        const userSnapshot = await db
          .collection("users")
          .doc(afterData.userId)
          .get();
        
        if (!userSnapshot.exists) {
          console.error(`User ${afterData.userId} not found for order ${orderId}`);
          return null;
        }

        const userData = userSnapshot.data();
        const template = getEmailTemplate(afterData.status, afterData, userData);

        // Email to user
        const email = {
          from: `"B8Shield" <info@b8shield.com>`,
          to: userData.email,
          subject: template.subject,
          text: template.text,
          html: template.html,
        };
        
        // Send email to user
        await transporter.sendMail(email);
        
        // Also notify admin for important status changes
        if (['shipped', 'delivered', 'cancelled'].includes(afterData.status)) {
          const adminEmail = {
            from: `"B8Shield System" <info@b8shield.com>`,
            to: "micke.ohlen@gmail.com",
            subject: `Order Status Update: ${afterData.orderNumber}`,
            text: `
              Order ${afterData.orderNumber} status has been updated to: ${afterData.status}
              
              Customer: ${userData.companyName} (${userData.email})
              Contact: ${userData.contactPerson}
              
              ${afterData.trackingNumber ? `Tracking: ${afterData.trackingNumber}` : ''}
              ${afterData.carrier ? `Carrier: ${afterData.carrier}` : ''}
            `,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <img src="https://b8shield-reseller-app.web.app/images/B8S_logo.png" alt="B8Shield" style="max-width: 200px; height: auto;">
                </div>
                <h2>Order Status Update</h2>
                <p><strong>Order:</strong> ${afterData.orderNumber}</p>
                <p><strong>New Status:</strong> ${afterData.status}</p>
                
                <h3>Customer:</h3>
                <p>${userData.companyName} (${userData.email})<br>
                Contact: ${userData.contactPerson}</p>
                
                ${afterData.trackingNumber ? `<p><strong>Tracking:</strong> ${afterData.trackingNumber}</p>` : ''}
                ${afterData.carrier ? `<p><strong>Carrier:</strong> ${afterData.carrier}</p>` : ''}
              </div>
            `,
          };
          
          await transporter.sendMail(adminEmail);
        }
        
        console.log(`Status update email sent for order ${orderId}: ${beforeData.status} -> ${afterData.status}`);
      }
      
      return null;
    } catch (error) {
      console.error("Error sending order status update email:", error);
      return null;
    }
  });

// Test email function
exports.testEmail = functions.https.onRequest(async (req, res) => {
  try {
    console.log('Testing email functionality...');
    
    const testEmail = {
      from: `"B8Shield Test" <info@b8shield.com>`,
      to: "micke.ohlen@gmail.com",
      subject: "Test Email from B8Shield Portal",
      text: "This is a test email to verify Gmail SMTP integration is working.",
      html: "<h2>Test Email</h2><p>This is a test email to verify Gmail SMTP integration is working.</p>"
    };

    await transporter.sendMail(testEmail);
    console.log('Test email sent successfully');
    
    res.status(200).json({ 
      success: true, 
      message: 'Test email sent successfully',
      config: {
        service: 'gmail',
        from_email: 'b8shield.reseller@gmail.com'
      }
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      config: {
        service: 'gmail',
        from_email: 'b8shield.reseller@gmail.com'
      }
    });
  }
});

// Function to create test data in the default database
exports.createTestData = functions.https.onRequest(async (req, res) => {
  try {
    console.log('Creating test data in default database...');
    
    // Test users data
    const testUsers = [
      {
        id: 'test-user-1',
        email: 'test@example.com',
        companyName: 'Test Company AB',
        contactPerson: 'Test Customer',
        phoneNumber: '+46701234567',
        address: 'Testgatan 123, 111 22 Stockholm',
        role: 'user',
        active: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'test-user-2',
        email: 'jane@example.com',
        companyName: 'Another Test Company',
        contactPerson: 'Jane Doe',
        phoneNumber: '+46707654321',
        address: 'Drottninggatan 456, 222 33 Göteborg',
        role: 'user',
        active: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'test-user-3',
        email: 'bob@example.com',
        companyName: 'Third Test Company',
        contactPerson: 'Bob Smith',
        phoneNumber: '+46709876543',
        address: 'Kungsgatan 789, 333 44 Malmö',
        role: 'user',
        active: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    // Test orders data
    const testOrders = [
      {
        orderNumber: 'B8-20250118-1001',
        userId: 'test-user-1',
        companyName: 'Test Company AB',
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        antalForpackningar: 50,
        color: 'Transparent',
        size: 'Storlek 4',
        marginal: 35,
        prisInfo: {
          produktPris: 3560,
          totalPris: 3560,
          marginalKr: 1246
        },
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        orderNumber: 'B8-20250118-1002',
        userId: 'test-user-2', 
        companyName: 'Another Test Company',
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        antalForpackningar: 100,
        color: 'Röd',
        size: 'Storlek 6',
        marginal: 40,
        prisInfo: {
          produktPris: 7120,
          totalPris: 7120,
          marginalKr: 2848
        },
        status: 'processing',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        orderNumber: 'B8-20250118-1003',
        userId: 'test-user-3',
        companyName: 'Third Test Company',
        customerName: 'Bob Smith',
        customerEmail: 'bob@example.com',
        antalForpackningar: 25,
        color: 'Glitter',
        size: 'Storlek 2',
        marginal: 30,
        prisInfo: {
          produktPris: 1780,
          totalPris: 1780,
          marginalKr: 534
        },
        status: 'shipped',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    ];
    
    // Create users first
    for (const user of testUsers) {
      const { id, ...userData } = user;
      await db.collection('users').doc(id).set(userData);
      console.log(`Created user: ${userData.contactPerson} (${userData.email})`);
    }
    
    // Create orders
    const createdOrders = [];
    for (const order of testOrders) {
      const docRef = await db.collection('orders').add(order);
      createdOrders.push({
        id: docRef.id,
        orderNumber: order.orderNumber,
        status: order.status
      });
      console.log(`Created order: ${order.orderNumber} with ID: ${docRef.id}`);
    }
    
    console.log('Test data created successfully!');
    
    res.status(200).json({
      success: true,
      message: 'Test data created successfully',
      users: testUsers.length,
      orders: createdOrders.length,
      createdOrders: createdOrders
    });
    
  } catch (error) {
    console.error('Error creating test data:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Manual function to update order status and test triggers
exports.manualStatusUpdate = functions.https.onRequest(async (req, res) => {
  try {
    console.log('Manual status update test...');
    
    // Get the first order
    const ordersSnapshot = await db.collection('orders').limit(1).get();
    
    if (ordersSnapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: 'No orders found' 
      });
    }
    
    const orderDoc = ordersSnapshot.docs[0];
    const orderData = orderDoc.data();
    const orderId = orderDoc.id;
    
    console.log(`Updating order ${orderData.orderNumber} from ${orderData.status} to "delivered"`);
    
    // Update the order status - this should trigger sendOrderStatusUpdateEmail
    await db.collection('orders').doc(orderId).update({
      status: 'delivered',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      trackingNumber: 'TEST-MANUAL-123',
      carrier: 'PostNord'
    });
    
    console.log('Order status updated successfully - Firebase Function should trigger');
    
    res.status(200).json({
      success: true,
      message: 'Order status updated - check logs for Firebase Function trigger',
      orderId: orderId,
      orderNumber: orderData.orderNumber,
      oldStatus: orderData.status,
      newStatus: 'delivered'
    });
    
  } catch (error) {
    console.error('Error in manual status update:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Debug function to check database contents
exports.debugDatabase = functions.https.onRequest(async (req, res) => {
  try {
    console.log('Checking database contents...');
    
    // Check orders
    const ordersSnapshot = await db.collection('orders').get();
    const orders = [];
    ordersSnapshot.forEach(doc => {
      orders.push({
        id: doc.id,
        orderNumber: doc.data().orderNumber,
        status: doc.data().status,
        userId: doc.data().userId
      });
    });
    
    // Check users
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({
        id: doc.id,
        email: doc.data().email,
        companyName: doc.data().companyName
      });
    });
    
    console.log(`Found ${orders.length} orders and ${users.length} users`);
    
    res.status(200).json({
      success: true,
      database: 'default',
      orders: orders,
      users: users,
      counts: {
        orders: orders.length,
        users: users.length
      }
    });
    
  } catch (error) {
    console.error('Error checking database:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Manual order status update test function
exports.testOrderUpdate = functions.https.onRequest(async (req, res) => {
  try {
    console.log('Testing order status update email...');
    
    // Get the first order from Firestore
    const ordersSnapshot = await db.collection('orders').limit(1).get();
    
    if (ordersSnapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: 'No orders found in database' 
      });
    }
    
    const orderDoc = ordersSnapshot.docs[0];
    const orderData = orderDoc.data();
    const orderId = orderDoc.id;
    
    console.log(`Found order: ${orderData.orderNumber} with status: ${orderData.status}`);
    
    // Get user data
    const userSnapshot = await db.collection('users').doc(orderData.userId).get();
    
    if (!userSnapshot.exists) {
      return res.status(404).json({ 
        success: false, 
        error: `User ${orderData.userId} not found` 
      });
    }
    
    const userData = userSnapshot.data();
    console.log(`Found user: ${userData.email}`);
    
    // Create a test status update email
    const template = getEmailTemplate('shipped', orderData, userData);
    
    const testEmail = {
      from: `"B8Shield" <info@b8shield.com>`,
      to: userData.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    };
    
    // Also send to admin
    const adminEmail = {
      from: `"B8Shield System" <info@b8shield.com>`,
      to: "micke.ohlen@gmail.com",
      subject: `Manual Test: Order Status Update - ${orderData.orderNumber}`,
      text: `This is a manual test of the order status update email system.\n\nOrder: ${orderData.orderNumber}\nCustomer: ${userData.email}\nTest Status: shipped`,
      html: `<h2>Manual Test: Order Status Update</h2><p>This is a manual test of the order status update email system.</p><p><strong>Order:</strong> ${orderData.orderNumber}</p><p><strong>Customer:</strong> ${userData.email}</p><p><strong>Test Status:</strong> shipped</p>`
    };
    
    // Send both emails
    await transporter.sendMail(testEmail);
    await transporter.sendMail(adminEmail);
    
    console.log('Order status update emails sent successfully');
    
    res.status(200).json({ 
      success: true, 
      message: 'Order status update emails sent successfully',
      order: orderData.orderNumber,
      customer: userData.email,
      status: 'shipped (test)'
    });
    
  } catch (error) {
    console.error('Error testing order status update:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Migration function to copy data from named database to default database
exports.migrateToDefaultDatabase = functions.https.onRequest(async (req, res) => {
  try {
    console.log('Starting migration from named database to default database...');
    
    // Initialize connection to the named database
    const namedDb = admin.firestore('b8s-reseller-db');
    
    // Initialize connection to default database (already initialized as 'db')
    const defaultDb = db;
    
    let migratedUsers = 0;
    let migratedOrders = 0;
    let migratedProducts = 0;
    let migratedOrderStatuses = 0;
    let migratedAppSettings = 0;
    
    // Migrate users
    console.log('Migrating users...');
    const usersSnapshot = await namedDb.collection('users').get();
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      await defaultDb.collection('users').doc(userDoc.id).set(userData);
      console.log(`Migrated user: ${userData.email || userDoc.id}`);
      migratedUsers++;
    }
    
    // Migrate orders
    console.log('Migrating orders...');
    const ordersSnapshot = await namedDb.collection('orders').get();
    for (const orderDoc of ordersSnapshot.docs) {
      const orderData = orderDoc.data();
      await defaultDb.collection('orders').doc(orderDoc.id).set(orderData);
      console.log(`Migrated order: ${orderData.orderNumber || orderDoc.id}`);
      migratedOrders++;
    }
    
    // Migrate products
    console.log('Migrating products...');
    const productsSnapshot = await namedDb.collection('products').get();
    for (const productDoc of productsSnapshot.docs) {
      const productData = productDoc.data();
      await defaultDb.collection('products').doc(productDoc.id).set(productData);
      console.log(`Migrated product: ${productData.name || productDoc.id}`);
      migratedProducts++;
    }
    
    // Migrate order statuses
    console.log('Migrating order statuses...');
    const orderStatusesSnapshot = await namedDb.collection('order-statuses').get();
    for (const statusDoc of orderStatusesSnapshot.docs) {
      const statusData = statusDoc.data();
      await defaultDb.collection('order-statuses').doc(statusDoc.id).set(statusData);
      console.log(`Migrated order status: ${statusDoc.id}`);
      migratedOrderStatuses++;
    }
    
    // Migrate app settings
    console.log('Migrating app settings...');
    const appSettingsSnapshot = await namedDb.collection('app-settings').get();
    for (const settingDoc of appSettingsSnapshot.docs) {
      const settingData = settingDoc.data();
      await defaultDb.collection('settings').doc('app').set({
        ...settingData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`Migrated app setting: ${settingDoc.id}`);
      migratedAppSettings++;
    }
    
    console.log('Migration completed successfully!');
    
    res.status(200).json({
      success: true,
      message: 'Migration completed successfully',
      migrated: {
        users: migratedUsers,
        orders: migratedOrders,
        products: migratedProducts,
        orderStatuses: migratedOrderStatuses,
        appSettings: migratedAppSettings
      },
      total: migratedUsers + migratedOrders + migratedProducts + migratedOrderStatuses + migratedAppSettings
    });
    
  } catch (error) {
    console.error('Error during migration:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.stack
    });
  }
});

// Create admin user in default database
exports.createAdminUser = functions.https.onRequest(async (req, res) => {
  try {
    console.log('Creating admin user in default database...');
    
    // Admin user data based on your login credentials
    const adminUserData = {
      email: 'micke.ohlen@gmail.com',
      companyName: 'B8Shield Admin',
      role: 'admin',
      isActive: true,
      contactPerson: 'Micke Ohlén',
      phone: '+46123456789',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Check if admin user already exists
    const existingAdmin = await db.collection('users')
      .where('email', '==', adminUserData.email)
      .get();
    
    if (!existingAdmin.empty) {
      console.log('Admin user already exists, updating...');
      const adminDoc = existingAdmin.docs[0];
      await db.collection('users').doc(adminDoc.id).update({
        ...adminUserData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      res.status(200).json({
        success: true,
        message: 'Admin user updated successfully',
        userId: adminDoc.id,
        email: adminUserData.email
      });
    } else {
      // Create new admin user
      const docRef = await db.collection('users').add(adminUserData);
      console.log(`Created admin user with ID: ${docRef.id}`);
      
      res.status(200).json({
        success: true,
        message: 'Admin user created successfully',
        userId: docRef.id,
        email: adminUserData.email
      });
    }
    
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Complete database setup function
exports.setupCompleteDatabase = functions.https.onRequest(async (req, res) => {
  try {
    console.log('Setting up complete database with all required collections...');
    
    let createdCollections = [];
    let createdDocuments = 0;
    
    // 1. Create admin user
    const adminUserData = {
      email: 'micke.ohlen@gmail.com',
      companyName: 'B8Shield Admin',
      role: 'admin',
      isActive: true,
      contactPerson: 'Micke Ohlén',
      phone: '+46123456789',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Check if admin exists, if not create
    const existingAdmin = await db.collection('users').where('email', '==', adminUserData.email).get();
    if (existingAdmin.empty) {
      await db.collection('users').add(adminUserData);
      console.log('Created admin user');
      createdDocuments++;
    } else {
      console.log('Admin user already exists');
    }
    createdCollections.push('users');
    
    // 2. Create order statuses
    const orderStatuses = [
      {
        id: 'pending',
        name: 'Pending',
        description: 'Order is pending confirmation',
        order: 1,
        color: '#f59e0b',
        isActive: true
      },
      {
        id: 'confirmed',
        name: 'Confirmed',
        description: 'Order has been confirmed',
        order: 2,
        color: '#3b82f6',
        isActive: true
      },
      {
        id: 'processing',
        name: 'Processing',
        description: 'Order is being processed',
        order: 3,
        color: '#8b5cf6',
        isActive: true
      },
      {
        id: 'shipped',
        name: 'Shipped',
        description: 'Order has been shipped',
        order: 4,
        color: '#06b6d4',
        isActive: true
      },
      {
        id: 'delivered',
        name: 'Delivered',
        description: 'Order has been delivered',
        order: 5,
        color: '#10b981',
        isActive: true
      },
      {
        id: 'cancelled',
        name: 'Cancelled',
        description: 'Order has been cancelled',
        order: 6,
        color: '#ef4444',
        isActive: true
      }
    ];
    
    for (const status of orderStatuses) {
      const { id, ...statusData } = status;
      await db.collection('orderStatuses').doc(id).set({
        ...statusData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`Created order status: ${status.name}`);
      createdDocuments++;
    }
    createdCollections.push('orderStatuses');
    
    // 3. Create products
    const products = [
      {
        id: 'b8shield-base',
        name: 'B8 Shield',
        description: 'B8 Shield protection for smartphones',
        basePrice: 71.2, // 89 SEK including VAT (89 / 1.25)
        manufacturingCost: 10,
        defaultMargin: 35,
        isActive: true,
        variants: [
          {
            type: 'color',
            name: 'Färg',
            options: [
              { id: 'transparent', name: 'Transparent' },
              { id: 'rod', name: 'Röd' },
              { id: 'florerande', name: 'Florerande' },
              { id: 'glitter', name: 'Glitter' }
            ]
          },
          {
            type: 'size',
            name: 'Storlek',
            options: [
              { id: 'storlek2', name: 'Storlek 2' },
              { id: 'storlek4', name: 'Storlek 4' },
              { id: 'storlek6', name: 'Storlek 6' }
            ]
          }
        ]
      }
    ];
    
    for (const product of products) {
      const { id, ...productData } = product;
      await db.collection('products').doc(id).set({
        ...productData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`Created product: ${product.name}`);
      createdDocuments++;
    }
    createdCollections.push('products');
    
    // 4. Create app settings
    const appSettings = {
      FORSALJNINGSPRIS_INKL_MOMS: 89,
      TILLVERKNINGSKOSTNAD: 10,
      DEFAULT_MARGINAL: 35,
      COMPANY_NAME: 'B8Shield',
      COMPANY_EMAIL: 'b8shield.reseller@gmail.com',
      ADMIN_EMAIL: 'micke.ohlen@gmail.com',
      VERSION: '1.0.0'
    };
    
    await db.collection('settings').doc('app').set({
      ...appSettings,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Created app settings');
    createdDocuments++;
    createdCollections.push('settings');
    
    console.log('Complete database setup completed successfully!');
    
    res.status(200).json({
      success: true,
      message: 'Complete database setup completed successfully',
      collections: createdCollections,
      documentsCreated: createdDocuments,
      details: {
        users: 1,
        orderStatuses: orderStatuses.length,
        products: products.length,
        settings: 1
      }
    });
    
  } catch (error) {
    console.error('Error setting up complete database:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.stack
    });
  }
});

// Check what's in the named database (the original data)
exports.checkNamedDatabase = functions.https.onRequest(async (req, res) => {
  try {
    console.log('Checking named database contents...');
    
    // Try to access the named database using the app method
    const namedApp = admin.app();
    
    // We need to use the REST API to access the named database
    // Let's use the default database for now and see if we can find the real data
    
    // Check all collections in default database
    const collections = ['users', 'orders', 'products', 'orderStatuses', 'settings', 'order-statuses', 'app-settings'];
    const results = {};
    
    for (const collectionName of collections) {
      try {
        const snapshot = await db.collection(collectionName).get();
        results[collectionName] = {
          count: snapshot.size,
          docs: snapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
          }))
        };
        console.log(`Collection ${collectionName}: ${snapshot.size} documents`);
      } catch (error) {
        console.log(`Collection ${collectionName}: Error accessing - ${error.message}`);
        results[collectionName] = { error: error.message };
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Named database check completed',
      collections: results
    });
    
  } catch (error) {
    console.error('Error checking named database:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Emergency restore function - clears test data and restores from backup if available
exports.emergencyRestore = functions.https.onRequest(async (req, res) => {
  try {
    console.log('Starting emergency restore...');
    
    // First, let's clear the test data but keep the admin user
    const testUserIds = ['test-user-1', 'test-user-2', 'test-user-3'];
    const testOrderIds = ['WBbgCgWlnuFBrlE4Af5g', 'eilHc71Zs8zqk6o0FecV', 'fv3789vNK4bmPDQH4fPq'];
    
    // Delete test users
    for (const userId of testUserIds) {
      try {
        await db.collection('users').doc(userId).delete();
        console.log(`Deleted test user: ${userId}`);
      } catch (error) {
        console.log(`Could not delete test user ${userId}: ${error.message}`);
      }
    }
    
    // Delete test orders
    for (const orderId of testOrderIds) {
      try {
        await db.collection('orders').doc(orderId).delete();
        console.log(`Deleted test order: ${orderId}`);
      } catch (error) {
        console.log(`Could not delete test order ${orderId}: ${error.message}`);
      }
    }
    
    console.log('Emergency restore completed - test data cleared');
    
    res.status(200).json({
      success: true,
      message: 'Emergency restore completed - test data cleared',
      actions: [
        'Deleted test users',
        'Deleted test orders',
        'Kept admin user and essential collections'
      ]
    });
    
  } catch (error) {
    console.error('Error in emergency restore:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// HTTP-triggered email function for order confirmations (called from frontend)
exports.sendOrderConfirmationHttp = functions.https.onRequest(async (req, res) => {
  try {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.status(200).send();
      return;
    }
    
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }
    
    const { orderId, orderData, userData } = req.body;
    
    if (!orderId || !orderData || !userData) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required data: orderId, orderData, userData' 
      });
      return;
    }
    
    console.log(`Sending order confirmation emails for order ${orderId}`);
    
    // Handle different order formats
    let orderSummary = '';
    let totalAmount = 0;
    
    if (orderData.items && Array.isArray(orderData.items)) {
      // Standard format with items array
      orderSummary = orderData.items.map((item) => 
        `${item.name} x ${item.quantity} - ${item.price * item.quantity} SEK`
      ).join("\n");
      
      totalAmount = orderData.items.reduce(
        (total, item) => total + item.price * item.quantity, 0
      );
    } else if (orderData.prisInfo) {
      // New format from order page
      orderSummary = `B8 Shield (${orderData.color || ''}) - Size: ${orderData.size || ''} x ${orderData.antalForpackningar || 0}`;
      totalAmount = orderData.prisInfo.totalPris || 0;
    }
    
    // Customer confirmation email
    const customerEmail = {
      from: `"B8Shield" <info@b8shield.com>`,
      to: userData.email,
      subject: `Orderbekräftelse: ${orderData.orderNumber}`,
      text: `
        Hej ${userData.contactPerson || userData.companyName},
        
        Tack för din beställning! Vi har mottagit din order och kommer att behandla den snarast.
        
        Ordernummer: ${orderData.orderNumber}
        Företag: ${userData.companyName}
        
        Orderdetaljer:
        ${orderSummary}
        
        Totalt: ${totalAmount} SEK
        
        Du kommer att få ytterligare uppdateringar när din order behandlas.
        
        Med vänliga hälsningar,
        B8Shield Team
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://b8shield-reseller-app.web.app/images/B8S_logo.png" alt="B8Shield" style="max-width: 200px; height: auto;">
          </div>
          <h2>Orderbekräftelse</h2>
          <p>Hej ${userData.contactPerson || userData.companyName},</p>
          <p>Tack för din beställning! Vi har mottagit din order och kommer att behandla den snarast.</p>
          
          <h3>Orderdetaljer:</h3>
          <p><strong>Ordernummer:</strong> ${orderData.orderNumber}</p>
          <p><strong>Företag:</strong> ${userData.companyName}</p>
          
          <h3>Beställning:</h3>
          <p>${orderSummary.replace(/\n/g, '<br>')}</p>
          
          <p><strong>Totalt: ${totalAmount} SEK</strong></p>
          
          <p>Du kommer att få ytterligare uppdateringar när din order behandlas.</p>
          
          <p>Med vänliga hälsningar,<br>B8Shield Team</p>
        </div>
      `,
    };
    
    // Admin notification email
    const adminEmail = {
      from: `"B8Shield System" <info@b8shield.com>`,
      to: "micke.ohlen@gmail.com",
      subject: `Ny order: ${orderData.orderNumber}`,
      text: `
        En ny order har skapats:
        
        Ordernummer: ${orderData.orderNumber}
        Kund: ${userData.companyName} (${userData.email})
        Kontaktperson: ${userData.contactPerson}
        
        Orderdetaljer:
        ${orderSummary}
        
        Totalt: ${totalAmount} SEK
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://b8shield-reseller-app.web.app/images/B8S_logo.png" alt="B8Shield" style="max-width: 200px; height: auto;">
          </div>
          <h2>Ny order mottagen</h2>
          <p><strong>Ordernummer:</strong> ${orderData.orderNumber}</p>
          
          <h3>Kundinformation:</h3>
          <p><strong>Företag:</strong> ${userData.companyName}</p>
          <p><strong>E-post:</strong> ${userData.email}</p>
          <p><strong>Kontaktperson:</strong> ${userData.contactPerson}</p>
          
          <h3>Orderdetaljer:</h3>
          <p>${orderSummary.replace(/\n/g, '<br>')}</p>
          
          <p><strong>Totalt: ${totalAmount} SEK</strong></p>
        </div>
      `,
    };
    
    // Send both emails
    await transporter.sendMail(customerEmail);
    await transporter.sendMail(adminEmail);
    
    console.log(`Order confirmation emails sent for order ${orderId}`);
    
    res.status(200).json({
      success: true,
      message: 'Order confirmation emails sent successfully',
      orderId: orderId,
      orderNumber: orderData.orderNumber
    });
    
  } catch (error) {
    console.error('Error sending order confirmation emails:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// HTTP-triggered email function for status updates (called from frontend)
exports.sendStatusUpdateHttp = functions.https.onRequest(async (req, res) => {
  try {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.status(200).send();
      return;
    }
    
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }
    
    const { orderId, orderData, userData, oldStatus, newStatus } = req.body;
    
    if (!orderId || !orderData || !userData || !newStatus) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required data: orderId, orderData, userData, newStatus' 
      });
      return;
    }
    
    console.log(`Sending status update emails for order ${orderId}: ${oldStatus} -> ${newStatus}`);
    
    // Get email template for the new status
    const template = getEmailTemplate(newStatus, orderData, userData);
    
    // Customer status update email
    const customerEmail = {
      from: `"B8Shield" <info@b8shield.com>`,
      to: userData.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    };
    
    // Send customer email
    await transporter.sendMail(customerEmail);
    
    // Also notify admin for important status changes
    if (['shipped', 'delivered', 'cancelled'].includes(newStatus)) {
      const adminEmail = {
        from: `"B8Shield System" <info@b8shield.com>`,
        to: "micke.ohlen@gmail.com",
        subject: `Order Status Update: ${orderData.orderNumber}`,
        text: `
          Order ${orderData.orderNumber} status has been updated to: ${newStatus}
          
          Customer: ${userData.companyName} (${userData.email})
          Contact: ${userData.contactPerson}
          
          ${orderData.trackingNumber ? `Tracking: ${orderData.trackingNumber}` : ''}
          ${orderData.carrier ? `Carrier: ${orderData.carrier}` : ''}
        `,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://b8shield-reseller-app.web.app/images/B8S_logo.png" alt="B8Shield" style="max-width: 200px; height: auto;">
            </div>
            <h2>Order Status Update</h2>
            <p><strong>Order:</strong> ${orderData.orderNumber}</p>
            <p><strong>New Status:</strong> ${newStatus}</p>
            
            <h3>Customer:</h3>
            <p>${userData.companyName} (${userData.email})<br>
            Contact: ${userData.contactPerson}</p>
            
            ${orderData.trackingNumber ? `<p><strong>Tracking:</strong> ${orderData.trackingNumber}</p>` : ''}
            ${orderData.carrier ? `<p><strong>Carrier:</strong> ${orderData.carrier}</p>` : ''}
          </div>
        `,
      };
      
      await transporter.sendMail(adminEmail);
    }
    
    console.log(`Status update emails sent for order ${orderId}: ${oldStatus} -> ${newStatus}`);
    
    res.status(200).json({
      success: true,
      message: 'Status update emails sent successfully',
      orderId: orderId,
      orderNumber: orderData.orderNumber,
      status: newStatus
    });
    
  } catch (error) {
    console.error('Error sending status update emails:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Add this new endpoint
exports.productFeed = functions.https.onRequest(async (req, res) => {
  try {
    const products = await admin.firestore()
      .collection('products')
      .where('availability.b2c', '==', true)
      .get();

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>B8Shield - Vasskydd för fiskedrag</title>
    <link>https://shop.b8shield.com</link>
    <description>Innovativa vasskydd för dina fiskedrag</description>
    ${products.docs.map(doc => {
      const product = doc.data();
      return `
    <item>
      <g:id>${doc.id}</g:id>
      <g:title>${product.name}</g:title>
      <g:description>${product.descriptions?.b2c || product.description}</g:description>
      <g:link>https://shop.b8shield.com/produkt/${doc.id}</g:link>
      <g:image_link>${product.b2cImageUrl || product.imageUrl}</g:image_link>
      <g:condition>new</g:condition>
      <g:availability>${product.stock > 0 ? 'in stock' : 'out of stock'}</g:availability>
      <g:price>${product.b2cPrice || product.basePrice} SEK</g:price>
      <g:brand>B8Shield</g:brand>
      <g:gtin>${product.eanCode || ''}</g:gtin>
      <g:identifier_exists>no</g:identifier_exists>
      <g:google_product_category>Sporting Goods > Outdoor Recreation > Fishing > Fishing Tackle > Fishing Lures &amp; Flies</g:google_product_category>
      <g:custom_label_0>${product.size || 'Standard'}</g:custom_label_0>
      <g:shipping>
        <g:country>SE</g:country>
        <g:service>Standard</g:service>
        <g:price>49 SEK</g:price>
      </g:shipping>
    </item>`;
    }).join('')}
  </channel>
</rss>`;

    res.set('Content-Type', 'application/xml');
    res.send(xmlContent);
  } catch (error) {
    console.error('Error generating product feed:', error);
    res.status(500).send('Error generating product feed');
  }
}); 

/**
 * [NEW] HTTP endpoint for B2C order processing
 */
exports.processB2COrderCompletionHttp = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB'
  })
  .region('us-central1')
  .https.onRequest(async (req, res) => {
    // Enable CORS with more permissive settings for testing
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', '*');
    res.set('Access-Control-Max-Age', '3600');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Only allow POST
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    try {
      const { orderId } = req.body;

      if (!orderId) {
        res.status(400).json({ 
          success: false, 
          error: 'The function must be called with an "orderId".' 
        });
        return;
      }

      console.log(`Processing B2C order completion for orderId: ${orderId}`);
      const localDb = db; // Use the correct named database

      // --- Start of Affiliate Conversion Logic ---
      const orderRef = localDb.collection('orders').doc(orderId);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        console.error(`Order ${orderId} not found in b8s-reseller-db.`);
        res.status(404).json({ 
          success: false, 
          error: `Order ${orderId} not found in database` 
        });
        return;
      }

      const orderData = orderSnap.data();
      const { affiliateCode } = orderData;

      if (!affiliateCode) {
        console.log('No affiliate code found for order, skipping commission.');
        res.json({ success: true, message: 'Order processed (no affiliate)' });
        return;
      }

      // Get affiliate details
      const affiliateSnap = await localDb
        .collection('affiliates')
        .where('affiliateCode', '==', affiliateCode)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (affiliateSnap.empty) {
        console.error(`No active affiliate found for code: ${affiliateCode}`);
        res.json({ success: true, message: 'Order processed (invalid affiliate)' });
        return;
      }

      const affiliateDoc = affiliateSnap.docs[0];
      const affiliate = affiliateDoc.data();

      // Calculate commission
      const orderTotal = orderData.total || 0;
      const commissionRate = affiliate.commissionRate || 15; // Default 15%
      const commissionAmount = (orderTotal * (commissionRate / 100));

      // Update affiliate stats
      await affiliateDoc.ref.update({
        'stats.conversions': FieldValue.increment(1),
        'stats.totalEarnings': FieldValue.increment(commissionAmount),
        'stats.balance': FieldValue.increment(commissionAmount)
      });

      // Update the click to mark conversion
      if (orderData.affiliateClickId) {
        await localDb
          .collection('affiliateClicks')
          .doc(orderData.affiliateClickId)
          .update({
            converted: true,
            orderId: orderId,
            commissionAmount: commissionAmount
          });
      }

      console.log(`Successfully processed affiliate commission for order ${orderId}`);
      res.json({ 
        success: true, 
        message: 'Order processed with affiliate commission',
        commission: commissionAmount 
      });

    } catch (error) {
      console.error('Error processing B2C order completion:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error processing order' 
      });
    }
  });

// Keep the original callable function unchanged
exports.processB2COrderCompletion = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB'
  })
  .region('us-central1')
  .https.onCall(async (data, context) => {
    // Validate request origin
    const allowedOrigins = [
      'https://shop.b8shield.com',
      'https://b8shield-reseller-app.web.app',
      'http://localhost:5173' // For local development
    ];
    
    const origin = data.origin || context.rawRequest?.headers?.origin;
    if (!allowedOrigins.includes(origin)) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Origin not allowed'
      );
    }

    const { orderId } = data;

    if (!orderId) {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'The function must be called with an "orderId".'
      );
    }

    console.log(`Processing B2C order completion for orderId: ${orderId}`);
    const localDb = db; // Use the correct named database

    try {
      // --- Start of Affiliate Conversion Logic ---
      const orderRef = localDb.collection('orders').doc(orderId);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        console.error(`Order ${orderId} not found in b8s-reseller-db.`);
        return { success: false, error: `Order ${orderId} not found in database` };
      }

      const orderData = orderSnap.data();
      console.log(`Processing order ${orderId}. Affiliate code: ${orderData.affiliateCode || 'none'}`);

      if (orderData.affiliateCode) {
        console.log(`Processing conversion for order ${orderId} with affiliate code: ${orderData.affiliateCode}`);

        // Find the affiliate by code
        const affiliatesRef = localDb.collection('affiliates');
        const q = affiliatesRef.where('affiliateCode', '==', orderData.affiliateCode).where('status', '==', 'active');
        const affiliateSnapshot = await q.get();

        if (affiliateSnapshot.empty) {
          console.error(`No active affiliate found for code: ${orderData.affiliateCode}`);
          return { success: false, error: `No active affiliate found for code: ${orderData.affiliateCode}` };
        }

        const affiliateDoc = affiliateSnapshot.docs[0];
        const affiliate = affiliateDoc.data();
        const affiliateId = affiliateDoc.id;
        console.log(`Found affiliate: ${affiliate.name} (ID: ${affiliateId})`);

        // Calculate commission - try multiple fields for compatibility
        const commissionRate = affiliate.commissionRate / 100;
        const orderAmount = orderData.subtotal || orderData.total || orderData.totalAmount || 0;
        const commissionAmount = orderAmount * commissionRate;

        console.log(`Commission calculation: ${orderAmount} * ${commissionRate} = ${commissionAmount}`);

        if (commissionAmount > 0) {
          try {
            // Update affiliate stats in a transaction
            await localDb.runTransaction(async (transaction) => {
              const affiliateRef = localDb.collection('affiliates').doc(affiliateId);
              const currentAffiliateDoc = await transaction.get(affiliateRef);
              
              if (!currentAffiliateDoc.exists) {
                throw new Error("Affiliate not found during transaction.");
              }
              
              const currentStats = currentAffiliateDoc.data().stats || {};
              const newStats = {
                conversions: (currentStats.conversions || 0) + 1,
                totalEarnings: (currentStats.totalEarnings || 0) + commissionAmount,
                balance: (currentStats.balance || 0) + commissionAmount,
                clicks: currentStats.clicks || 0,
              };
              
              console.log(`Updating affiliate stats:`, newStats);
              transaction.update(affiliateRef, { stats: newStats });
            });

            // Update the order with commission information
            await orderRef.update({ 
              affiliateCommission: commissionAmount, 
              affiliateId: affiliateId,
              conversionProcessed: true,
              conversionProcessedAt: admin.firestore.Timestamp.now()
            });

            console.log(`Successfully updated stats and order for affiliate ${affiliateId}.`);

            // Try to mark corresponding click as converted
            // Since we don't have clickId in order, find the most recent click by this affiliate
            try {
              const clicksRef = localDb.collection('affiliateClicks');
              const recentClicksQuery = clicksRef
                .where('affiliateCode', '==', orderData.affiliateCode)
                .where('converted', '==', false)
                .orderBy('timestamp', 'desc')
                .limit(1);
              
              const recentClicksSnapshot = await recentClicksQuery.get();
              
              if (!recentClicksSnapshot.empty) {
                const clickDoc = recentClicksSnapshot.docs[0];
                await clickDoc.ref.update({
                  converted: true,
                  orderId: orderId,
                  commissionAmount: commissionAmount,
                  convertedAt: admin.firestore.Timestamp.now()
                });
                console.log(`Click document ${clickDoc.id} marked as converted.`);
              } else {
                console.log(`No unconverted clicks found for affiliate code ${orderData.affiliateCode}`);
              }
            } catch (clickError) {
              console.error(`Error updating click record:`, clickError);
              // Don't fail the whole process if click update fails
            }

            return { 
              success: true, 
              message: `Processed order ${orderId}`,
              affiliateCommission: commissionAmount,
              affiliateId: affiliateId
            };

          } catch (error) {
            console.error(`Failed to process conversion transaction for order ${orderId}. Error:`, error);
            return { 
              success: false, 
              error: `Transaction failed: ${error.message}` 
            };
          }
        } else {
          console.log(`Commission amount is 0 for order ${orderId}, skipping affiliate processing`);
          return { success: true, message: `Order ${orderId} processed, but no commission (amount: ${orderAmount})` };
        }
      } else {
        console.log(`No affiliate code found for order ${orderId}`);
        return { success: true, message: `Order ${orderId} processed (no affiliate)` };
      }
      // --- End of Affiliate Conversion Logic ---

    } catch (error) {
      console.error(`Error processing order completion for ${orderId}:`, error);
      return { 
        success: false, 
        error: `Processing failed: ${error.message}` 
      };
    }
  });

/**
 * [NEW] HTTP endpoint for affiliate click logging
 */
exports.logAffiliateClickHttp = functions
  .region('us-central1')
  .https.onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', '*');
    res.set('Access-Control-Max-Age', '3600');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Only allow POST
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const { affiliateCode } = req.body;

    if (!affiliateCode) {
      res.status(400).json({
        success: false,
        error: 'The request must include an affiliateCode.'
      });
      return;
    }

    try {
      // Get affiliate details
      const affiliatesRef = db.collection('affiliates');
      const q = affiliatesRef.where('affiliateCode', '==', affiliateCode).where('status', '==', 'active');
      const affiliateSnapshot = await q.get();

      if (affiliateSnapshot.empty) {
        res.status(404).json({
          success: false,
          error: `No active affiliate found for code: ${affiliateCode}`
        });
        return;
      }

      const affiliateDoc = affiliateSnapshot.docs[0];
      const affiliate = affiliateDoc.data();

      // Create click record
      const clickRef = await db.collection('affiliateClicks').add({
        affiliateCode: affiliateCode,
        affiliateId: affiliateDoc.id,
        timestamp: admin.firestore.Timestamp.now(),
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        landingPage: req.headers.referer || 'unknown',
        converted: false,
      });

      // Update affiliate stats
      await affiliateDoc.ref.update({
        'stats.clicks': admin.firestore.FieldValue.increment(1)
      });

      res.status(200).json({ 
        success: true, 
        message: `Click logged for affiliate ${affiliateCode}`,
        clickId: clickRef.id
      });

    } catch (error) {
      console.error(`Error logging affiliate click for code ${affiliateCode}:`, error);
      res.status(500).json({
        success: false,
        error: 'Error logging affiliate click.'
      });
  }
});

/**
 * [NEW] Claude API Proxy for Writer's Wagon™
 * Handles AI content generation requests to avoid CORS issues
 */
exports.generateContentWithClaude = functions
  .region('us-central1')
  .https.onRequest(async (req, res) => {
    // Enable CORS for B8Shield domains
    const allowedOrigins = [
      'https://b8shield-reseller-app.web.app',
      'https://shop.b8shield.com',
      'http://localhost:5173', // Local development
      'http://localhost:3000'  // Alternative local port
    ];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
    }
    
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Only allow POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    try {
      const { 
        prompt, 
        model = 'claude-3-5-sonnet-20241022', 
        maxTokens = 1000,
        temperature = 0.7 
      } = req.body;

      if (!prompt) {
        res.status(400).json({ error: 'Prompt is required' });
        return;
      }

      // Claude API key from environment variables
      const claudeApiKey = functions.config().claude?.api_key;
      if (!claudeApiKey) {
        console.error('Claude API key not configured');
        res.status(500).json({ error: 'API key not configured' });
        return;
      }

      console.log(`🎯 Writer's Wagon: Generating content with ${model}`);

      // Make request to Claude API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model,
          max_tokens: maxTokens,
          temperature: temperature,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Claude API error: ${response.status} - ${errorText}`);
        res.status(response.status).json({ 
          error: `Claude API error: ${response.status}`,
          details: errorText
        });
        return;
      }

      const data = await response.json();
      
      // Extract the generated content
      const generatedContent = data.content?.[0]?.text || 'No content generated';
      
      console.log(`✅ Writer's Wagon: Content generated successfully (${generatedContent.length} chars)`);

      // Return the generated content
      res.status(200).json({
        success: true,
        content: generatedContent,
        model: model,
        usage: data.usage || {}
      });

    } catch (error) {
      console.error('Error generating content with Claude:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate content',
        details: error.message
      });
    }
  });

/**
 * [NEW] Pre-deployed Setup Function for Wagons
 * Handles API key configuration and wagon setup without requiring customer deployment
 */
exports.setupWritersWagon = functions
  .region('us-central1')
  .https.onRequest(async (req, res) => {
    // Enable CORS for B8Shield domains
    const allowedOrigins = [
      'https://b8shield-reseller-app.web.app',
      'https://shop.b8shield.com',
      'http://localhost:5173',
      'http://localhost:3000'
    ];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
    }
    
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    try {
      const { action, apiKey, wagonId, userId } = req.body;

      if (action === 'setup' && apiKey && wagonId) {
        // Store encrypted API key for this user/wagon combination
        const wagonConfigRef = db.collection('wagonConfigurations').doc(`${userId || 'default'}_${wagonId}`);
        
        // Simple encryption (in production, use proper encryption)
        const encryptedKey = Buffer.from(apiKey).toString('base64');
        
        await wagonConfigRef.set({
          wagonId: wagonId,
          userId: userId || 'default',
          encryptedApiKey: encryptedKey,
          status: 'active',
          setupAt: admin.firestore.Timestamp.now(),
          lastUsed: admin.firestore.Timestamp.now()
        });

        console.log(`✅ Writer's Wagon: Setup completed for ${wagonId}`);

        res.status(200).json({
          success: true,
          message: `${wagonId} setup completed successfully`,
          wagonId: wagonId
        });

      } else if (action === 'test' && wagonId) {
        // Test if wagon is configured
        const wagonConfigRef = db.collection('wagonConfigurations').doc(`${userId || 'default'}_${wagonId}`);
        const wagonDoc = await wagonConfigRef.get();

        if (wagonDoc.exists) {
          res.status(200).json({ success: true, configured: true });
        } else {
          res.status(200).json({ success: true, configured: false });
        }

      } else {
        res.status(400).json({ error: 'Invalid request parameters' });
      }

    } catch (error) {
      console.error('Setup error:', error);
      res.status(500).json({
        success: false,
        error: 'Setup failed',
        details: error.message
      });
    }
  });

/**
 * [UPDATED] Claude API Proxy with User-specific API Keys
 */
exports.generateContentWithClaude = functions
  .region('us-central1')
  .https.onRequest(async (req, res) => {
    // Enable CORS for B8Shield domains
    const allowedOrigins = [
      'https://b8shield-reseller-app.web.app',
      'https://shop.b8shield.com',
      'http://localhost:5173',
      'http://localhost:3000'
    ];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
    }
    
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    try {
      const { 
        prompt, 
        model = 'claude-3-5-sonnet-20241022', 
        maxTokens = 1000,
        temperature = 0.7,
        userId = 'default',
        wagonId = 'writers-wagon'
      } = req.body;

      if (!prompt) {
        res.status(400).json({ error: 'Prompt is required' });
        return;
      }

      // Get user-specific API key
      const wagonConfigRef = db.collection('wagonConfigurations').doc(`${userId}_${wagonId}`);
      const wagonDoc = await wagonConfigRef.get();

      let claudeApiKey;
      if (wagonDoc.exists) {
        // Use user's API key
        const encryptedKey = wagonDoc.data().encryptedApiKey;
        claudeApiKey = Buffer.from(encryptedKey, 'base64').toString('utf8');
        
        // Update last used
        await wagonConfigRef.update({ lastUsed: admin.firestore.Timestamp.now() });
      } else {
        // Fallback to system API key (if available)
        claudeApiKey = functions.config().claude?.api_key;
        if (!claudeApiKey) {
          res.status(400).json({ 
            error: 'No API key configured. Please setup your wagon first.',
            setupRequired: true
          });
          return;
        }
      }

      console.log(`🎯 Writer's Wagon: Generating content with ${model} for ${userId}`);

      // Make request to Claude API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model,
          max_tokens: maxTokens,
          temperature: temperature,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Claude API error: ${response.status} - ${errorText}`);
        res.status(response.status).json({ 
          error: `Claude API error: ${response.status}`,
          details: errorText
        });
        return;
      }

      const data = await response.json();
      
      // Extract the generated content
      const generatedContent = data.content?.[0]?.text || 'No content generated';
      
      console.log(`✅ Writer's Wagon: Content generated successfully (${generatedContent.length} chars)`);

      // Return the generated content
      res.status(200).json({
        success: true,
        content: generatedContent,
        model: model,
        usage: data.usage || {}
      });

    } catch (error) {
      console.error('Error generating content with Claude:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate content',
        details: error.message
      });
    }
  });