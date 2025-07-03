// ZEN Customer Status Automation
// "It just works" - Apple-style automation for Swedish business intelligence

import { doc, updateDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import toast from 'react-hot-toast';

// Customer status definitions with Swedish business logic
export const CUSTOMER_STATUS = {
  GÄSTLISTA: 'prospect',      // New B2B customers = prospects
  STAMGÄSTER: 'active',       // Active customers with orders
  VIP: 'vip',                 // High-value customers
  VILANDE: 'inactive'         // Dormant customers
};

// VIP threshold in SEK
const VIP_THRESHOLD = 10000; // 10,000 SEK total order value

// ZEN Automation: Detect customer status changes
export const detectCustomerStatusChange = async (customerId, context = {}) => {
  try {
    console.log(`🤖 ZEN: Analyzing customer ${customerId} for status changes...`);
    
    // Get current customer data
    const customerRef = doc(db, 'users', customerId);
    const customerSnapshot = await customerRef.get();
    
    if (!customerSnapshot.exists()) {
      console.log('❌ Customer not found');
      return null;
    }
    
    const customer = customerSnapshot.data();
    const currentStatus = customer.status || 'prospect';
    
    console.log(`📊 Current status: ${currentStatus}`);
    
    // Analyze order history for VIP detection
    const orderValue = await calculateTotalOrderValue(customerId);
    console.log(`💰 Total order value: ${orderValue} SEK`);
    
    // Analyze recent activity for engagement
    const recentActivity = await getRecentCustomerActivity(customerId);
    console.log(`📈 Recent activity: ${recentActivity.count} activities in last 30 days`);
    
    // Determine new status based on Swedish business logic
    let newStatus = currentStatus;
    let reason = '';
    
    // Rule 1: VIP Status (High Order Value)
    if (orderValue >= VIP_THRESHOLD && currentStatus !== 'vip') {
      newStatus = 'vip';
      reason = `Automatisk VIP-status: ${orderValue.toLocaleString('sv-SE')} SEK i ordervärde`;
    }
    
    // Rule 2: Active Customer (Has Orders + Recent Activity)
    else if (orderValue > 0 && recentActivity.count > 0 && currentStatus === 'prospect') {
      newStatus = 'active';
      reason = 'Automatisk stamgäst: har gjort beställningar och är aktiv';
    }
    
    // Rule 3: New B2B Customer (Just Created)
    else if (context.isNewCustomer && currentStatus !== 'prospect') {
      newStatus = 'prospect';
      reason = 'Automatisk gästlista: ny B2B-kund';
    }
    
    // Rule 4: Customer Login + Order (B2C Activity)
    else if (context.hasLoggedIn && context.hasNewOrder && currentStatus === 'prospect') {
      newStatus = 'active';
      reason = 'Automatisk stamgäst: loggade in och skapade beställning';
    }
    
    // Only update if status actually changed
    if (newStatus !== currentStatus) {
      console.log(`🎯 Status change detected: ${currentStatus} → ${newStatus}`);
      await updateCustomerStatus(customerId, newStatus, reason);
      return { oldStatus: currentStatus, newStatus, reason };
    }
    
    console.log('✅ No status change needed');
    return null;
    
  } catch (error) {
    console.error('❌ Error in status automation:', error);
    return null;
  }
};

// Calculate total order value for customer
const calculateTotalOrderValue = async (customerId) => {
  try {
    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', customerId),
      where('status', 'in', ['delivered', 'shipped', 'completed'])
    );
    
    const ordersSnapshot = await getDocs(ordersQuery);
    let totalValue = 0;
    
    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      totalValue += order.totalAmount || order.total || 0;
    });
    
    return totalValue;
  } catch (error) {
    console.error('Error calculating order value:', error);
    return 0;
  }
};

// Get recent customer activity (CRM activities)
const getRecentCustomerActivity = async (customerId) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activitiesQuery = query(
      collection(db, 'activities'),
      where('contactId', '==', customerId),
      where('createdAt', '>=', thirtyDaysAgo),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const activitiesSnapshot = await getDocs(activitiesQuery);
    
    return {
      count: activitiesSnapshot.size,
      lastActivity: activitiesSnapshot.empty ? null : activitiesSnapshot.docs[0].data()
    };
  } catch (error) {
    console.error('Error getting recent activity:', error);
    return { count: 0, lastActivity: null };
  }
};

// Update customer status with Swedish business intelligence
const updateCustomerStatus = async (customerId, newStatus, reason) => {
  try {
    const customerRef = doc(db, 'users', customerId);
    
    const updateData = {
      status: newStatus,
      lastStatusUpdate: new Date(),
      statusUpdateReason: reason,
      updatedAt: new Date().toISOString()
    };
    
    // Add CRM-specific fields based on status
    switch (newStatus) {
      case 'vip':
        updateData.priority = 'high';
        updateData.tags = ['vip', 'högvärde'];
        break;
      case 'active':
        updateData.priority = 'medium';
        updateData.tags = ['stamgäst', 'aktiv'];
        break;
      case 'prospect':
        updateData.priority = 'medium';
        updateData.tags = ['prospect', 'gästlista'];
        break;
      default:
        break;
    }
    
    await updateDoc(customerRef, updateData);
    
    // Show ZEN notification
    const statusNames = {
      'vip': 'VIP-kund',
      'active': 'Stamgäst',
      'prospect': 'Gästlista',
      'inactive': 'Vilande'
    };
    
    toast.success(`🤖 ${statusNames[newStatus]}: ${reason}`, {
      duration: 5000,
      icon: '✨'
    });
    
    console.log(`✅ Customer status updated: ${newStatus}`);
    
  } catch (error) {
    console.error('Error updating customer status:', error);
    toast.error('Kunde inte uppdatera kundstatus automatiskt');
  }
};

// Hook into B2B customer creation
export const onNewB2BCustomer = async (customerId) => {
  console.log('🆕 New B2B customer created, running automation...');
  return await detectCustomerStatusChange(customerId, { isNewCustomer: true });
};

// Hook into order completion
export const onOrderCompleted = async (order) => {
  console.log('📦 Order completed, running automation...');
  return await detectCustomerStatusChange(order.userId, { 
    hasNewOrder: true,
    orderValue: order.totalAmount || order.total || 0
  });
};

// Hook into customer login (B2C)
export const onCustomerLogin = async (customerId) => {
  console.log('🔐 Customer logged in, running automation...');
  return await detectCustomerStatusChange(customerId, { hasLoggedIn: true });
};

// Manual status refresh (for admin use)
export const refreshCustomerStatus = async (customerId) => {
  console.log('🔄 Manual status refresh requested...');
  return await detectCustomerStatusChange(customerId, { manualRefresh: true });
};

// Batch process all customers (admin function)
export const batchUpdateAllCustomerStatuses = async () => {
  try {
    console.log('🚀 Starting batch customer status update...');
    
    // Get all non-admin customers
    const customersQuery = query(
      collection(db, 'users'),
      where('role', '!=', 'admin')
    );
    
    const customersSnapshot = await getDocs(customersQuery);
    let updatedCount = 0;
    
    for (const customerDoc of customersSnapshot.docs) {
      const result = await detectCustomerStatusChange(customerDoc.id);
      if (result) {
        updatedCount++;
      }
      
      // Small delay to avoid overwhelming Firebase
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    toast.success(`🎯 Batch update complete: ${updatedCount} customers updated`);
    console.log(`✅ Batch update complete: ${updatedCount}/${customersSnapshot.size} customers updated`);
    
    return { total: customersSnapshot.size, updated: updatedCount };
    
  } catch (error) {
    console.error('Error in batch update:', error);
    toast.error('Batch-uppdatering misslyckades');
    return null;
  }
};

// Get customer status display info
export const getCustomerStatusInfo = (status) => {
  const statusInfo = {
    'prospect': {
      label: 'Gästlista',
      color: 'bg-blue-100 text-blue-800',
      icon: '👋',
      description: 'Potentiell kund'
    },
    'active': {
      label: 'Stamgäst',
      color: 'bg-green-100 text-green-800',
      icon: '⭐',
      description: 'Aktiv kund'
    },
    'vip': {
      label: 'VIP-kund',
      color: 'bg-purple-100 text-purple-800',
      icon: '👑',
      description: 'Högvärdeskund'
    },
    'inactive': {
      label: 'Vilande',
      color: 'bg-gray-100 text-gray-800',
      icon: '😴',
      description: 'Inaktiv kund'
    }
  };
  
  return statusInfo[status] || statusInfo['prospect'];
}; 