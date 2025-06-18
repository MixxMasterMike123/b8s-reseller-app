const admin = require('firebase-admin');

// Initialize Firebase Admin with project ID
admin.initializeApp({
  projectId: 'b8shield-reseller-app'
});

const db = admin.firestore();

async function testStatusUpdate() {
  try {
    console.log('Fetching orders...');
    
    // Get all orders
    const ordersSnapshot = await db.collection('orders').get();
    
    if (ordersSnapshot.empty) {
      console.log('No orders found');
      return;
    }
    
    const orders = [];
    ordersSnapshot.forEach(doc => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`Found ${orders.length} orders:`);
    orders.forEach(order => {
      console.log(`- ${order.orderNumber}: ${order.status} (User: ${order.userId})`);
    });
    
    // Take the first order and update its status
    const firstOrder = orders[0];
    const newStatus = firstOrder.status === 'processing' ? 'shipped' : 'processing';
    
    console.log(`\nUpdating order ${firstOrder.orderNumber} from ${firstOrder.status} to ${newStatus}...`);
    
    // Add tracking info if shipping
    const updateData = {
      status: newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (newStatus === 'shipped') {
      updateData.trackingNumber = 'TEST-123456789';
      updateData.carrier = 'PostNord';
    }
    
    await db.collection('orders').doc(firstOrder.id).update(updateData);
    
    console.log('Order status updated successfully!');
    console.log('Check your email for the status update notification.');
    
    // Wait a moment for the function to trigger
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('Done! Check Firebase Functions logs for any errors.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testStatusUpdate(); 