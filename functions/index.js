const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Firestore
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// Create transporter for sending emails
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: functions.config().email && functions.config().email.user || "noreply@example.com",
    pass: functions.config().email && functions.config().email.password || "password",
  },
});

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
        from: `"B8Shield" <${functions.config().email && functions.config().email.user || "noreply@example.com"}>`,
        to: userData.email,
        subject: `Order Confirmation: ${orderData.orderNumber}`,
        text: `
          Thank you for your order!
          
          Order Number: ${orderData.orderNumber}
          Order Date: ${new Date(orderData.createdAt.toDate()).toLocaleString()}
          
          Items:
          ${orderSummary}
          
          Total: ${totalAmount} SEK
          
          Please let us know if you have any questions.
          
          Regards,
          B8Shield Team
        `,
        html: `
          <h2>Thank you for your order!</h2>
          <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
          <p><strong>Order Date:</strong> ${new Date(orderData.createdAt.toDate()).toLocaleString()}</p>
          
          <h3>Items:</h3>
          <p>${orderSummary.split('\n').join('<br>')}</p>
          
          <p><strong>Total:</strong> ${totalAmount} SEK</p>
          
          <p>Please let us know if you have any questions.</p>
          
          <p>Regards,<br>B8Shield Team</p>
        `,
      };

      // Email to admin
      const adminEmail = {
        from: `"B8Shield System" <${functions.config().email && functions.config().email.user || "noreply@example.com"}>`,
        to: functions.config().admin && functions.config().admin.email || "admin@b8shield.com",
        subject: `New Order: ${orderData.orderNumber}`,
        text: `
          A new order has been placed.
          
          Order Number: ${orderData.orderNumber}
          Order Date: ${new Date(orderData.createdAt.toDate()).toLocaleString()}
          
          Customer: ${userData.companyName} (${userData.email})
          Contact: ${userData.contactPerson}, ${userData.phoneNumber}
          
          Items:
          ${orderSummary}
          
          Total: ${totalAmount} SEK
        `,
        html: `
          <h2>A new order has been placed</h2>
          <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
          <p><strong>Order Date:</strong> ${new Date(orderData.createdAt.toDate()).toLocaleString()}</p>
          
          <h3>Customer:</h3>
          <p>${userData.companyName} (${userData.email})<br>
          Contact: ${userData.contactPerson}, ${userData.phoneNumber}</p>
          
          <h3>Items:</h3>
          <p>${orderSummary.split('\n').join('<br>')}</p>
          
          <p><strong>Total:</strong> ${totalAmount} SEK</p>
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
          from: `"B8Shield" <${functions.config().email && functions.config().email.user || "noreply@example.com"}>`,
          to: afterData.email,
          subject: "Your B8Shield Account is Now Active",
          text: `
            Hello ${afterData.contactPerson},
            
            Your B8Shield account for ${afterData.companyName} has been activated!
            
            You can now log in with your username and password at:
            ${functions.config().app && functions.config().app.url || "https://b8shield-reseller-app.web.app"}
            
            If you have any questions, please contact our support team.
            
            Regards,
            B8Shield Team
          `,
          html: `
            <h2>Hello ${afterData.contactPerson},</h2>
            
            <p>Your B8Shield account for <strong>${afterData.companyName}</strong> has been activated!</p>
            
            <p>You can now log in with your username and password at:<br>
            <a href="${functions.config().app && functions.config().app.url || "https://b8shield-reseller-app.web.app"}">B8Shield Portal</a></p>
            
            <p>If you have any questions, please contact our support team.</p>
            
            <p>Regards,<br>B8Shield Team</p>
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
 * Send email when order status is updated
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
        
        // Get status data
        const statusSnapshot = await db
          .collection("orderStatuses")
          .doc(afterData.status)
          .get();
        
        const statusName = statusSnapshot.exists 
          ? statusSnapshot.data().name 
          : afterData.status;
        
        const email = {
          from: `"B8Shield" <${functions.config().email && functions.config().email.user || "noreply@example.com"}>`,
          to: userData.email,
          subject: `Order Status Update: ${afterData.orderNumber}`,
          text: `
            Hello ${userData.contactPerson},
            
            Your order #${afterData.orderNumber} has been updated to: ${statusName}
            
            ${afterData.adminNotes ? `Notes: ${afterData.adminNotes}` : ""}
            
            You can check your order details in your account.
            
            Regards,
            B8Shield Team
          `,
          html: `
            <h2>Hello ${userData.contactPerson},</h2>
            
            <p>Your order #${afterData.orderNumber} has been updated to: <strong>${statusName}</strong></p>
            
            ${afterData.adminNotes ? `<p><strong>Notes:</strong> ${afterData.adminNotes}</p>` : ""}
            
            <p>You can check your order details in your account.</p>
            
            <p>Regards,<br>B8Shield Team</p>
          `,
        };
        
        await transporter.sendMail(email);
        console.log(`Status update email sent for order ${orderId}`);
      }
      
      return null;
    } catch (error) {
      console.error("Error sending order status update email:", error);
      return null;
    }
  }); 