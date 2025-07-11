import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  doc, 
  query, 
  where, 
  orderBy,
  limit,
  deleteDoc,
  Timestamp,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db, isDemoMode } from '../firebase/config';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import { onOrderCompleted } from '../wagons/dining-wagon/utils/customerStatusAutomation';

// Create context
const OrderContext = createContext();

// Demo mode mock orders
const DEMO_ORDERS = [
  {
    id: 'order-1',
    orderNumber: 'B8-20230110-1234',
    userId: 'admin-user-1',
    companyName: 'B8shield Admin',
    customerName: 'Client A',
    customerEmail: 'clienta@example.com',
    items: [
      { productId: 'prod-1', name: 'Product A', quantity: 2, price: 100 },
      { productId: 'prod-2', name: 'Product B', quantity: 3, price: 150 }
    ],
    totalPrice: 650,
    status: 'delivered',
    createdAt: '2023-01-10T10:30:00.000Z',
    updatedAt: '2023-01-15T14:20:00.000Z'
  },
  {
    id: 'order-2',
    orderNumber: 'B8-20230215-5678',
    userId: 'user-1',
    companyName: 'Company A',
    customerName: 'Client B',
    customerEmail: 'clientb@example.com',
    items: [
      { productId: 'prod-1', name: 'Product A', quantity: 1, price: 100 },
      { productId: 'prod-3', name: 'Product C', quantity: 2, price: 200 }
    ],
    totalPrice: 500,
    status: 'processing',
    createdAt: '2023-02-15T09:45:00.000Z',
    updatedAt: '2023-02-16T11:30:00.000Z'
  },
  {
    id: 'order-3',
    orderNumber: 'B8-20230301-9012',
    userId: 'user-1',
    companyName: 'Company A',
    customerName: 'Client C',
    customerEmail: 'clientc@example.com',
    items: [
      { productId: 'prod-2', name: 'Product B', quantity: 4, price: 150 }
    ],
    totalPrice: 600,
    status: 'pending',
    createdAt: '2023-03-01T15:20:00.000Z',
    updatedAt: '2023-03-01T15:20:00.000Z'
  },
  {
    id: 'order-4',
    orderNumber: 'B8-20230305-3456',
    userId: 'user-2',
    companyName: 'Company B',
    customerName: 'Client D',
    customerEmail: 'clientd@example.com',
    items: [
      { productId: 'prod-1', name: 'Product A', quantity: 3, price: 100 },
      { productId: 'prod-2', name: 'Product B', quantity: 2, price: 150 },
      { productId: 'prod-3', name: 'Product C', quantity: 1, price: 200 }
    ],
    totalPrice: 800,
    status: 'shipped',
    createdAt: '2023-03-05T13:10:00.000Z',
    updatedAt: '2023-03-07T09:15:00.000Z'
  },
  {
    id: 'order-5',
    orderNumber: 'B8-20230312-7890',
    userId: 'admin-user-1',
    companyName: 'B8shield Admin',
    customerName: 'Client E',
    customerEmail: 'cliente@example.com',
    items: [
      { productId: 'prod-3', name: 'Product C', quantity: 5, price: 200 }
    ],
    totalPrice: 1000,
    status: 'pending',
    createdAt: '2023-03-12T16:40:00.000Z',
    updatedAt: '2023-03-12T16:40:00.000Z'
  }
];

// Provider component
export const OrderProvider = ({ children }) => {
  const { currentUser, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [demoOrders, setDemoOrders] = useState(DEMO_ORDERS);

  // Product constants - in a real app, these would come from Firestore settings
  const PRODUCT_SETTINGS = {
    FORSALJNINGSPRIS_INKL_MOMS: 89, // kr per förpackning inkl moms
    TILLVERKNINGSKOSTNAD: 10, // kr per förpackning
    DEFAULT_MARGINAL: 40 // Default margin percentage
  };

  // Generate an order number with format B8-YYYYMMDD-XXXX (where XXXX is a random number)
  const generateOrderNumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000); // Random 4-digit number
    
    return `B8-${year}${month}${day}-${random}`;
  }, []);

  // Create a new order
  const createOrder = useCallback(async (orderData) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!currentUser) throw new Error('No authenticated user');
      
      if (isDemoMode) {
        // Demo mode: mock order creation
        const orderNumber = generateOrderNumber();
        const timestamp = new Date().toISOString();
        const newOrder = {
          id: `order-${Date.now()}`,
          orderNumber,
          userId: currentUser.uid,
          companyName: orderData.companyName || 'Demo Company',
          ...orderData,
          status: 'pending',
          createdAt: timestamp,
          updatedAt: timestamp
        };
        
        setDemoOrders([newOrder, ...demoOrders]);
        toast.success('Order created successfully (Demo Mode)');
        
        return newOrder;
      } else {
        // --- AFFILIATE TRACKING ---
        let affiliateCode = null;
        console.log('🔍 Checking for affiliate code during order creation...');
        
        try {
          const affiliateInfoStr = localStorage.getItem('b8s_affiliate_ref');
          console.log('📦 Raw affiliate data from localStorage:', affiliateInfoStr);
          
          if (affiliateInfoStr) {
            const affiliateInfo = JSON.parse(affiliateInfoStr);
            console.log('🔍 Parsed affiliate info:', affiliateInfo);
            
            // Check if the code is still valid (not expired)
            if (new Date().getTime() < affiliateInfo.expiry) {
              affiliateCode = affiliateInfo.code;
              console.log(`✅ Attaching affiliate code ${affiliateCode} to order.`);
            } else {
              console.log('🕒 Affiliate code expired, not attaching to order');
              // Clear expired code
              localStorage.removeItem('b8s_affiliate_ref');
            }
          } else {
            console.log('❌ No affiliate code found in localStorage');
          }
        } catch (e) {
          console.error("❌ Error reading affiliate code from localStorage", e);
        }
        // --- END AFFILIATE TRACKING ---

        // Make sure orderData has an orderNumber
        const orderToCreate = {
          ...orderData,
          orderNumber: orderData.orderNumber || generateOrderNumber(),
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: 'pending',
        };

        // Add affiliate code to order if it exists
        if (affiliateCode) {
          orderToCreate.affiliateCode = affiliateCode;
          console.log(`🏷️ Order will be created with affiliate code: ${affiliateCode}`);
        } else {
          console.log('🚫 Order will be created without affiliate code');
        }

        // For Cloud Functions - they expect items array for email notification
        // Convert our single product to an items array if it doesn't exist or is empty
        if (!orderToCreate.items || orderToCreate.items.length === 0) {
          // For B2B orders, create items array from fordelning
          if (orderToCreate.fordelning && Array.isArray(orderToCreate.fordelning)) {
            orderToCreate.items = orderToCreate.fordelning.map(item => ({
              name: "B8 Shield",
              color: item.color,
              size: item.size,
              quantity: item.quantity,
              price: orderToCreate.prisInfo?.produktPris / orderToCreate.antalForpackningar || 0
            }));
          } else {
            // Fallback for simple orders
          orderToCreate.items = [{
            name: "B8 Shield",
              color: orderToCreate.color || 'Blandade färger',
              size: orderToCreate.size || 'Blandade storlekar',
            quantity: orderToCreate.antalForpackningar || 0,
            price: orderToCreate.prisInfo?.produktPris / (orderToCreate.antalForpackningar || 1) || 0
          }];
        }
        }
        
        // Ensure all items have the required fields
        orderToCreate.items = orderToCreate.items.map(item => ({
          name: item.name || "B8 Shield",
          color: item.color || 'Blandade färger',
          size: item.size || 'Blandade storlekar',
          quantity: item.quantity || 0,
          price: item.price || 0
        }));

        // Save to the named database only
        const orderRef = await addDoc(collection(db, "orders"), orderToCreate);
        const savedOrderId = orderRef.id;
        const savedOrder = {
          id: savedOrderId,
          ...orderToCreate
        };
        
        // Get user profile for email
        let userProfileForEmail;
        if (orderToCreate.source === 'b2b') {
          try {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            if (userDoc.exists()) {
              userProfileForEmail = userDoc.data();
            }
          } catch (error) {
            console.error('Error fetching user profile for email:', error);
          }
        }
        
        // Trigger email notification via HTTP function
        try {
          const response = await fetch('https://us-central1-b8shield-reseller-app.cloudfunctions.net/sendOrderConfirmationHttp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderId: savedOrderId,
              orderData: savedOrder,
              userData: userProfileForEmail || {
                email: currentUser.email,
                companyName: orderData.companyName || 'Unknown Company',
                contactPerson: orderData.contactPerson || currentUser.displayName || 'Unknown'
              }
            })
          });
          
          if (response.ok) {
            console.log('Order confirmation emails sent successfully');
          } else {
            console.error('Failed to send order confirmation emails:', await response.text());
          }
        } catch (emailError) {
          console.error('Error sending order confirmation emails:', emailError);
          // Don't fail the order creation if email fails
        }
        
        toast.success('Order created successfully');
        
        return savedOrder;
      }
    } catch (error) {
      setError(error.message);
      toast.error('Failed to create order');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentUser, demoOrders]);

  // Get an order by ID
  const getOrderById = useCallback(async (orderId) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!currentUser) throw new Error('No authenticated user');
      
      if (isDemoMode) {
        // Demo mode: mock order retrieval
        const order = demoOrders.find(o => o.id === orderId);
        
        if (!order) {
          setError('Order not found');
          return null;
        }
        
        // Check if user is authorized to view this order
        if (order.userId !== currentUser.uid && !isAdmin) {
          setError('Unauthorized');
          return null;
        }
        
        return order;
      } else {
        // Only try to get the order from named database 
        try {
          const orderDoc = await getDoc(doc(db, "orders", orderId));
          
          if (orderDoc.exists()) {
            const orderData = orderDoc.data();
            
            // Check if user is authorized to view this order
            if (orderData.userId !== currentUser.uid && !isAdmin) {
              setError('Unauthorized');
              return null;
            }
            
            // Process any timestamps to avoid re-render loops
            const processedData = processTimestamps(orderData);
            
            return {
              id: orderDoc.id,
              ...processedData
            };
          } else {
            // If we reach here, the order was not found
            setError('Order not found');
            return null;
          }
        } catch (firestoreError) {
          console.error('Error fetching from Firestore:', firestoreError);
          setError(`Error fetching order: ${firestoreError.message}`);
          return null;
        }
      }
    } catch (error) {
      console.error('Error in getOrderById:', error);
      setError(error.message || 'Error fetching order');
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentUser, demoOrders, isAdmin]);

  // Helper function to process Firestore timestamps to stable format
  // This prevents re-render loops caused by timestamp objects changing identity
  const processTimestamps = (data) => {
    if (!data) return data;
    
    const processed = { ...data };
    
    // Process common timestamp fields
    const timestampFields = ['createdAt', 'updatedAt', 'cancelledAt'];
    
    timestampFields.forEach(field => {
      if (processed[field] && typeof processed[field].toDate === 'function') {
        // Convert to ISO string for stability
        processed[field] = processed[field].toDate().toISOString();
      }
    });
    
    // Process status history array if it exists
    if (Array.isArray(processed.statusHistory)) {
      processed.statusHistory = processed.statusHistory.map(entry => {
        const processedEntry = { ...entry };
        if (processedEntry.changedAt && typeof processedEntry.changedAt.toDate === 'function') {
          processedEntry.changedAt = processedEntry.changedAt.toDate().toISOString();
        }
        return processedEntry;
      });
    }
    
    return processed;
  };

  // Get user's orders
  const getUserOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!currentUser) throw new Error('No authenticated user');
      
      if (isDemoMode) {
        // Demo mode: mock user orders
        const userOrders = demoOrders.filter(order => order.userId === currentUser.uid);
        return userOrders;
      } else {
        const orders = [];
        
        // Only use named database
        try {
          const ordersQuery = query(
            collection(db, "orders"),
            where("userId", "==", currentUser.uid),
            orderBy("createdAt", "desc")
          );
          
          const querySnapshot = await getDocs(ordersQuery);
          
          querySnapshot.forEach((doc) => {
            orders.push({
              id: doc.id,
              ...doc.data()
            });
          });
        } catch (error) {
          console.error('Error fetching orders from named database:', error);
        }
        
        return orders;
      }
    } catch (error) {
      setError(error.message);
      console.error('Error in getUserOrders:', error);
      // Return empty array instead of throwing to prevent loops
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentUser, demoOrders]);

  // Get recent orders
  const getRecentOrders = useCallback(async (limitCount = 5) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!currentUser) throw new Error('No authenticated user');
      
      if (isDemoMode) {
        // Demo mode: mock recent orders
        if (isAdmin) {
          // Admin can see all orders
          return demoOrders.slice(0, limitCount);
        } else {
          // Regular users only see their own orders
          return demoOrders
            .filter(order => order.userId === currentUser.uid)
            .slice(0, limitCount);
        }
      } else {
        // Real Firebase recent orders
        let ordersQuery;
        
        if (isAdmin) {
          // Admin can see all orders
          ordersQuery = query(
            collection(db, "orders"),
            orderBy("createdAt", "desc"),
            limit(limitCount)
          );
        } else {
          // Regular users only see their own orders
          ordersQuery = query(
            collection(db, "orders"),
            where("userId", "==", currentUser.uid),
            orderBy("createdAt", "desc"),
            limit(limitCount)
          );
        }
        
        const querySnapshot = await getDocs(ordersQuery);
        const orders = [];
        
        querySnapshot.forEach((doc) => {
          orders.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        return orders;
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin, demoOrders]);

  // Get all orders (admin only)
  const getAllOrders = useCallback(async () => {
    try {
      console.log('getAllOrders: Starting to fetch orders');
      setLoading(true);
      setError(null);
      
      if (!currentUser) {
        console.log('getAllOrders: No authenticated user');
        throw new Error('No authenticated user');
      }
      
      if (!isAdmin) {
        console.log('getAllOrders: User is not admin');
        throw new Error('Unauthorized');
      }
      
      console.log('getAllOrders: Auth checks passed, isDemoMode:', isDemoMode);
      
      if (isDemoMode) {
        // Demo mode: return all mock orders
        console.log('getAllOrders: Returning demo orders', demoOrders.length);
        return demoOrders;
      } else {
        // Real Firebase all orders - only from named database
        console.log('getAllOrders: Fetching from Firestore');
        
        try {
          // Only use the named database
          console.log('getAllOrders: Fetching from named database (b8s-reseller-db)');
          const namedDbOrdersQuery = query(
            collection(db, "orders"),
            orderBy("createdAt", "desc")
          );
          
          const namedDbSnapshot = await getDocs(namedDbOrdersQuery);
          const namedDbOrders = [];
          
          namedDbSnapshot.forEach((doc) => {
            namedDbOrders.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          console.log('getAllOrders: Retrieved', namedDbOrders.length, 'orders from named database');
          return namedDbOrders;
        } catch (firestoreError) {
          console.error('getAllOrders: Firestore error:', firestoreError);
          throw firestoreError;
        }
      }
    } catch (error) {
      console.error('getAllOrders: Error:', error);
      setError(error.message);
      throw error;
    } finally {
      console.log('getAllOrders: Setting loading to false');
      setLoading(false);
    }
  }, [currentUser, isAdmin, demoOrders]);

  // Update order status (admin only)
  const updateOrderStatus = useCallback(async (orderId, newStatus, additionalData = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!currentUser) throw new Error('No authenticated user');
      if (!isAdmin) throw new Error('Unauthorized');
      
      if (isDemoMode) {
        // Get current order to check previous status
        const currentOrder = demoOrders.find(order => order.id === orderId);
        const previousStatus = currentOrder?.status || 'unknown';
        
        // Create status history entry
        const statusChange = {
          from: previousStatus,
          to: newStatus,
          changedBy: currentUser.uid,
          changedAt: serverTimestamp(),
          displayName: currentUser.displayName || 'Admin User'
        };
        
        // Update order with new status and add to status history
        setDemoOrders(orders => 
          orders.map(order => 
            order.id === orderId 
              ? { 
                  ...order, 
                  status: newStatus, 
                  updatedAt: new Date().toISOString(),
                  statusHistory: [...(order.statusHistory || []), {
                    ...statusChange,
                    changedAt: new Date().toISOString() // Convert to ISO string for demo mode
                  }],
                  ...additionalData // Include tracking number, carrier, admin notes, etc.
                } 
              : order
          )
        );
        
        toast.success(`Order status updated to ${newStatus} (Demo Mode)`);
        return true;
      } else {
        // Get current order data to check previous status
        const orderRef = doc(db, "orders", orderId);
        const orderDoc = await getDoc(orderRef);
        
        if (!orderDoc.exists()) {
          throw new Error('Order not found');
        }
        
        const orderData = orderDoc.data();
        const previousStatus = orderData.status || 'unknown';
        
        // Create status history entry - use Date for array items, serverTimestamp for top-level fields
        const statusChange = {
          from: previousStatus,
          to: newStatus,
          changedBy: currentUser.uid,
          changedAt: new Date(), // Use Date object instead of serverTimestamp() for array items
          displayName: currentUser.displayName || currentUser.email || 'Admin User'
        };
        
        // Update order with new status and add to status history
        await updateDoc(orderRef, {
          status: newStatus,
          updatedAt: serverTimestamp(),
          statusHistory: [...(orderData.statusHistory || []), statusChange],
          ...additionalData // Include tracking number, carrier, admin notes, etc.
        });
        
        // Trigger email notification via HTTP function
        try {
          // Get user data for email
          const userDoc = await getDoc(doc(db, "users", orderData.userId));
          const userData = userDoc.exists() ? userDoc.data() : {
            email: 'unknown@example.com',
            companyName: 'Unknown Company',
            contactPerson: 'Unknown'
          };
          
          const response = await fetch('https://sendstatusupdatehttpv2-csdvvcrpzq-uc.a.run.app', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderId: orderId,
              orderData: { ...orderData, ...additionalData, status: newStatus },
              userData: userData,
              oldStatus: previousStatus,
              newStatus: newStatus
            })
          });
          
          if (response.ok) {
            console.log('Status update emails sent successfully');
          } else {
            console.error('Failed to send status update emails:', await response.text());
          }
        } catch (emailError) {
          console.error('Error sending status update emails:', emailError);
          // Don't fail the status update if email fails
        }
        
        // ZEN Automation: Trigger customer status update on order completion
        if (['delivered', 'shipped', 'completed'].includes(newStatus)) {
          try {
            await onOrderCompleted({ 
              ...orderData, 
              ...additionalData, 
              status: newStatus,
              userId: orderData.userId,
              totalAmount: orderData.totalAmount || orderData.total
            });
          } catch (automationError) {
            console.error('Order automation error (non-critical):', automationError);
          }
        }
        
        toast.success(`Order status updated to ${newStatus}`);
        return true;
      }
    } catch (error) {
      setError(error.message);
      toast.error('Failed to update order status: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin, demoOrders]);

  // Get order statistics (admin only) - memoized with useCallback
  const getOrderStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!currentUser) throw new Error('No authenticated user');
      if (!isAdmin) throw new Error('Unauthorized');
      
      if (isDemoMode) {
        // Demo mode: calculate stats from mock orders
        let totalOrders = demoOrders.length;
        let newOrders = demoOrders.filter(order => order.status === 'pending').length;
        let processingOrders = demoOrders.filter(order => order.status === 'processing').length;
        let completedOrders = demoOrders.filter(order => 
          order.status === 'delivered' || order.status === 'shipped'
        ).length;
        
        return {
          totalOrders,
          newOrders,
          processingOrders,
          completedOrders
        };
      } else {
        // Real Firebase order stats
        const ordersSnapshot = await getDocs(collection(db, "orders"));
        
        let totalOrders = 0;
        let newOrders = 0;
        let processingOrders = 0;
        let completedOrders = 0;
        
        ordersSnapshot.forEach((doc) => {
          const orderData = doc.data();
          totalOrders++;
          
          if (orderData.status === 'pending') {
            newOrders++;
          } else if (orderData.status === 'processing') {
            processingOrders++;
          } else if (orderData.status === 'delivered' || orderData.status === 'shipped') {
            completedOrders++;
          }
        });
        
        return {
          totalOrders,
          newOrders,
          processingOrders,
          completedOrders
        };
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin, demoOrders, isDemoMode]);

  // Delete order (admin only)
  const deleteOrder = useCallback(async (orderId) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!currentUser) throw new Error('No authenticated user');
      if (!isAdmin) throw new Error('Unauthorized');
      
      if (isDemoMode) {
        // Demo mode: mock order deletion
        setDemoOrders(orders => orders.filter(order => order.id !== orderId));
        toast.success('Order deleted successfully (Demo Mode)');
        return true;
      } else {
        // Real Firebase order deletion
        try {
          // Get the order to verify it exists
          const orderDoc = await getDoc(doc(db, "orders", orderId));
          
          if (!orderDoc.exists()) {
            throw new Error('Order not found');
          }
          
          // Delete the order
          await deleteDoc(doc(db, "orders", orderId));
          
          toast.success('Order deleted successfully');
          return true;
        } catch (error) {
          console.error('Error deleting order:', error);
          toast.error('Failed to delete order: ' + error.message);
          throw error;
        }
      }
    } catch (error) {
      setError(error.message);
      toast.error('Failed to delete order: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin, demoOrders]);

  // Cancel an order (user can cancel their own pending orders)
  const cancelOrder = useCallback(async (orderId) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!currentUser) throw new Error('No authenticated user');
      
      if (isDemoMode) {
        // Demo mode: mock order cancellation
        // Get current order to validate
        const currentOrder = demoOrders.find(order => order.id === orderId);
        
        if (!currentOrder) {
          throw new Error('Order not found');
        }
        
        // Verify user owns this order or is admin
        if (currentOrder.userId !== currentUser.uid && !isAdmin) {
          throw new Error('Unauthorized');
        }
        
        // Verify order is in a cancellable state
        if (currentOrder.status !== 'pending' && currentOrder.status !== 'confirmed' && !isAdmin) {
          throw new Error('This order cannot be cancelled');
        }
        
        // Update order
        setDemoOrders(orders => 
          orders.map(order => 
            order.id === orderId 
              ? { 
                  ...order, 
                  status: 'cancelled',
                  updatedAt: new Date().toISOString(),
                  cancelledBy: currentUser.uid,
                  cancelledAt: new Date().toISOString()
                } 
              : order
          )
        );
        
        toast.success('Order cancelled successfully (Demo Mode)');
        return true;
      } else {
        // Get order to verify ownership
        const orderDoc = await getDoc(doc(db, "orders", orderId));
        
        if (!orderDoc.exists()) {
          throw new Error('Order not found');
        }
        
        const orderData = orderDoc.data();
        
        // Verify user owns this order or is admin
        if (orderData.userId !== currentUser.uid && !isAdmin) {
          throw new Error('Unauthorized');
        }
        
        // Verify order is in a cancellable state
        if (orderData.status !== 'pending' && orderData.status !== 'confirmed' && !isAdmin) {
          throw new Error('This order cannot be cancelled');
        }
        
        // Update order status to cancelled
        const updates = {
          status: 'cancelled',
          updatedAt: serverTimestamp(),
          cancelledBy: currentUser.uid,
          cancelledAt: serverTimestamp()
        };
        
        // Update in named database only
        await updateDoc(doc(db, "orders", orderId), updates);
        
        toast.success('Order cancelled successfully');
        return true;
      }
    } catch (error) {
      setError(error.message);
      toast.error('Failed to cancel order: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin, demoOrders]);

  // Update product settings (admin only)
  const updateProductSettings = useCallback(async (settings) => {
    try {
      setLoading(true);
      setError('');
      
      if (!isAdmin) {
        throw new Error('Not authorized');
      }
      
      if (isDemoMode) {
        // Demo mode: just update local settings
        Object.assign(PRODUCT_SETTINGS, settings);
        toast.success('Product settings updated (Demo Mode)');
        return true;
      } else {
        // In a real app, you would save this to Firestore
        // For now, we'll just update the local state
        Object.assign(PRODUCT_SETTINGS, settings);
        
        return true;
      }
    } catch (error) {
      console.error('Error updating product settings:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);
  
  // Create default B8 Shield products (used when products collection is empty)
  const createDefaultProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!currentUser || !isAdmin) {
        throw new Error('Unauthorized');
      }
      
      // Product data from aterforsaljare-portal.tsx
      const products = [
        {
          id: 'b8shield-base',
          name: 'B8 Shield',
          description: 'B8 Shield protection for smartphones',
          basePrice: 71.2, // 89 SEK including VAT (89 / 1.25)
          manufacturingCost: 10,
          defaultMargin: 35,
          variants: [
            // Colors
            {
              type: 'color',
              options: [
                { id: 'transparent', name: 'Transparent' },
                { id: 'rod', name: 'Röd' },
                { id: 'florerande', name: 'Florerande' },
                { id: 'glitter', name: 'Glitter' }
              ]
            },
            // Sizes
            {
              type: 'size',
              options: [
                { id: 'storlek2', name: 'Storlek 2' },
                { id: 'storlek4', name: 'Storlek 4' },
                { id: 'storlek6', name: 'Storlek 6' }
              ]
            }
          ],
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      ];

      // Add settings to Firestore
      const settingsData = {
        id: 'product-settings',
        FORSALJNINGSPRIS_INKL_MOMS: 89,
        TILLVERKNINGSKOSTNAD: 10,
        DEFAULT_MARGINAL: 40,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Add products to named database only
      for (const product of products) {
        try {
          await addDoc(collection(db, "products"), product);
        } catch (error) {
          console.error("Error adding product to named DB:", error);
        }
      }
      
      // Add settings to named database only
      try {
        await addDoc(collection(db, "settings"), settingsData);
      } catch (error) {
        console.error("Error adding settings to named DB:", error);
      }
      
      toast.success('Default products created');
      return true;
    } catch (error) {
      setError(error.message);
      toast.error('Failed to create products: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin]);

  const value = useMemo(() => ({
    loading,
    error,
    PRODUCT_SETTINGS,
    generateOrderNumber,
    createOrder,
    getOrderById,
    getUserOrders,
    getRecentOrders,
    getAllOrders,
    updateOrderStatus,
    getOrderStats,
    deleteOrder,
    cancelOrder,
    updateProductSettings,
    createDefaultProducts,
    isDemoMode
  }), [
    loading, error, createOrder, getOrderById, getUserOrders, getRecentOrders, 
    getAllOrders, updateOrderStatus, getOrderStats, deleteOrder, cancelOrder, 
    updateProductSettings, createDefaultProducts
  ]);

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};

// Create a hook to use the order context
export const useOrder = () => {
  return useContext(OrderContext);
}; 