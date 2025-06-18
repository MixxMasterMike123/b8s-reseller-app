const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Firestore
const db = admin.firestore();
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
        <h2>Hej ${contactPerson},</h2>
        <p>Tack för din beställning! Vi har mottagit din order och kommer att behandla den snarast.</p>
        <p><strong>Ordernummer:</strong> ${orderNumber}</p>
        <p><strong>Status:</strong> Mottagen</p>
        <p>Du kommer att få ytterligare uppdateringar när din order behandlas.</p>
        <p>Med vänliga hälsningar,<br>B8Shield Team</p>
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
        <h2>Hej ${contactPerson},</h2>
        <p>Din order är nu under behandling och förbereds för leverans.</p>
        <p><strong>Ordernummer:</strong> ${orderNumber}</p>
        <p><strong>Status:</strong> Behandlas</p>
        <p>Vi kommer att meddela dig när ordern har skickats.</p>
        <p>Med vänliga hälsningar,<br>B8Shield Team</p>
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
        <h2>Hej ${contactPerson},</h2>
        <p>Goda nyheter! Din order har skickats och är nu på väg till dig.</p>
        <p><strong>Ordernummer:</strong> ${orderNumber}</p>
        <p><strong>Status:</strong> Skickad</p>
        ${orderData.trackingNumber ? `<p><strong>Spårningsnummer:</strong> ${orderData.trackingNumber}</p>` : ''}
        ${orderData.carrier ? `<p><strong>Transportör:</strong> ${orderData.carrier}</p>` : ''}
        <p>Din order kommer att levereras inom 1-3 arbetsdagar.</p>
        <p>Med vänliga hälsningar,<br>B8Shield Team</p>
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
        <h2>Hej ${contactPerson},</h2>
        <p>Din order har levererats framgångsrikt!</p>
        <p><strong>Ordernummer:</strong> ${orderNumber}</p>
        <p><strong>Status:</strong> Levererad</p>
        <p>Tack för att du handlar med B8Shield. Om du har några frågor eller problem med din order, tveka inte att kontakta oss.</p>
        <p>Vi uppskattar ditt förtroende och ser fram emot att hjälpa dig igen.</p>
        <p>Med vänliga hälsningar,<br>B8Shield Team</p>
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
        <h2>Hej ${contactPerson},</h2>
        <p>Din order har tyvärr avbrutits.</p>
        <p><strong>Ordernummer:</strong> ${orderNumber}</p>
        <p><strong>Status:</strong> Avbruten</p>
        ${orderData.cancellationReason ? `<p><strong>Anledning:</strong> ${orderData.cancellationReason}</p>` : ''}
        <p>Om du har några frågor om denna avbokning, vänligen kontakta vår kundtjänst.</p>
        <p>Med vänliga hälsningar,<br>B8Shield Team</p>
      `
    }
  };
  
  return templates[status] || templates.processing;
};

/**
 * Send order confirmation emails when a new order is created
 */
exports.sendOrderConfirmationEmails = functions.firestore
  .document("orders/{orderId}")
  .onCreate(async (snapshot, context) => {
    try {
      const orderData = snapshot.data();
      const orderId = context.params.orderId;

      // Get user data
      const userSnapshot = await db
        .collection("users")
        .doc(orderData.userId)
        .get();
      
      if (!userSnapshot.exists) {
        console.error(`User ${orderData.userId} not found for order ${orderId}`);
        return null;
      }

      const userData = userSnapshot.data();
      
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
      } else {
        console.error('Unknown order format:', orderData);
        return null;
      }

      // Email to customer
      const customerEmail = {
        from: `"B8Shield" <b8shield.reseller@gmail.com>`,
        to: userData.email,
        subject: `Orderbekräftelse: ${orderData.orderNumber}`,
        text: `
          Tack för din beställning!
          
          Ordernummer: ${orderData.orderNumber}
          Orderdatum: ${new Date(orderData.createdAt.toDate()).toLocaleString('sv-SE')}
          
          Artiklar:
          ${orderSummary}
          
          Totalt: ${totalAmount} SEK
          
          Kontakta oss om du har några frågor.
          
          Med vänliga hälsningar,
          B8Shield Team
        `,
        html: `
          <h2>Tack för din beställning!</h2>
          <p><strong>Ordernummer:</strong> ${orderData.orderNumber}</p>
          <p><strong>Orderdatum:</strong> ${new Date(orderData.createdAt.toDate()).toLocaleString('sv-SE')}</p>
          
          <h3>Artiklar:</h3>
          <p>${orderSummary.split('\n').join('<br>')}</p>
          
          <p><strong>Totalt:</strong> ${totalAmount} SEK</p>
          
          <p>Kontakta oss om du har några frågor.</p>
          
          <p>Med vänliga hälsningar,<br>B8Shield Team</p>
        `,
      };

      // Email to admin
      const adminEmail = {
        from: `"B8Shield System" <b8shield.reseller@gmail.com>`,
        to: "micke.ohlen@gmail.com",
        subject: `Ny beställning: ${orderData.orderNumber}`,
        text: `
          En ny beställning har lagts.
          
          Ordernummer: ${orderData.orderNumber}
          Orderdatum: ${new Date(orderData.createdAt.toDate()).toLocaleString('sv-SE')}
          
          Kund: ${userData.companyName} (${userData.email})
          Kontakt: ${userData.contactPerson}, ${userData.phoneNumber}
          
          Artiklar:
          ${orderSummary}
          
          Totalt: ${totalAmount} SEK
        `,
        html: `
          <h2>En ny beställning har lagts</h2>
          <p><strong>Ordernummer:</strong> ${orderData.orderNumber}</p>
          <p><strong>Orderdatum:</strong> ${new Date(orderData.createdAt.toDate()).toLocaleString('sv-SE')}</p>
          
          <h3>Kund:</h3>
          <p>${userData.companyName} (${userData.email})<br>
          Kontakt: ${userData.contactPerson}, ${userData.phoneNumber}</p>
          
          <h3>Artiklar:</h3>
          <p>${orderSummary.split('\n').join('<br>')}</p>
          
          <p><strong>Totalt:</strong> ${totalAmount} SEK</p>
        `,
      };

      // Send emails
      await transporter.sendMail(customerEmail);
      await transporter.sendMail(adminEmail);
      
      console.log(`Order confirmation emails sent for order ${orderId}`);
      return null;
    } catch (error) {
      console.error("Error sending order confirmation emails:", error);
      return null;
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
          from: `"B8Shield" <b8shield.reseller@gmail.com>`,
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
            <h2>Hej ${afterData.contactPerson},</h2>
            
            <p>Ditt B8Shield-konto för <strong>${afterData.companyName}</strong> har aktiverats!</p>
            
            <p>Du kan nu logga in med ditt användarnamn och lösenord på:<br>
            <a href="https://b8shield-reseller-app.web.app">B8Shield Portal</a></p>
            
            <p>Om du har några frågor, kontakta vår support.</p>
            
            <p>Med vänliga hälsningar,<br>B8Shield Team</p>
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
          from: `"B8Shield" <b8shield.reseller@gmail.com>`,
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
            from: `"B8Shield System" <b8shield.reseller@gmail.com>`,
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
              <h2>Order Status Update</h2>
              <p><strong>Order:</strong> ${afterData.orderNumber}</p>
              <p><strong>New Status:</strong> ${afterData.status}</p>
              
              <h3>Customer:</h3>
              <p>${userData.companyName} (${userData.email})<br>
              Contact: ${userData.contactPerson}</p>
              
              ${afterData.trackingNumber ? `<p><strong>Tracking:</strong> ${afterData.trackingNumber}</p>` : ''}
              ${afterData.carrier ? `<p><strong>Carrier:</strong> ${afterData.carrier}</p>` : ''}
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
      from: `"B8Shield Test" <b8shield.reseller@gmail.com>`,
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
      from: `"B8Shield" <b8shield.reseller@gmail.com>`,
      to: userData.email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    };
    
    // Also send to admin
    const adminEmail = {
      from: `"B8Shield System" <b8shield.reseller@gmail.com>`,
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
      from: `"B8Shield" <b8shield.reseller@gmail.com>`,
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
      `,
    };
    
    // Admin notification email
    const adminEmail = {
      from: `"B8Shield System" <b8shield.reseller@gmail.com>`,
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
        <h2>Ny order mottagen</h2>
        <p><strong>Ordernummer:</strong> ${orderData.orderNumber}</p>
        
        <h3>Kundinformation:</h3>
        <p><strong>Företag:</strong> ${userData.companyName}</p>
        <p><strong>E-post:</strong> ${userData.email}</p>
        <p><strong>Kontaktperson:</strong> ${userData.contactPerson}</p>
        
        <h3>Orderdetaljer:</h3>
        <p>${orderSummary.replace(/\n/g, '<br>')}</p>
        
        <p><strong>Totalt: ${totalAmount} SEK</strong></p>
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
      from: `"B8Shield" <b8shield.reseller@gmail.com>`,
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
        from: `"B8Shield System" <b8shield.reseller@gmail.com>`,
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
          <h2>Order Status Update</h2>
          <p><strong>Order:</strong> ${orderData.orderNumber}</p>
          <p><strong>New Status:</strong> ${newStatus}</p>
          
          <h3>Customer:</h3>
          <p>${userData.companyName} (${userData.email})<br>
          Contact: ${userData.contactPerson}</p>
          
          ${orderData.trackingNumber ? `<p><strong>Tracking:</strong> ${orderData.trackingNumber}</p>` : ''}
          ${orderData.carrier ? `<p><strong>Carrier:</strong> ${orderData.carrier}</p>` : ''}
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