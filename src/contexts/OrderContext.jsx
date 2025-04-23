import React, { createContext, useContext, useState } from 'react';
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
import { db, defaultDb, isDemoMode } from '../firebase/config';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

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
    DEFAULT_MARGINAL: 35 // Default margin percentage
  };

  // Generate an order number with format B8-YYYYMMDD-XXXX (where XXXX is a random number)
  const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000); // Random 4-digit number
    
    return `B8-${year}${month}${day}-${random}`;
  };

  // Create a new order
  const createOrder = async (orderData) => {
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
        // Make sure orderData has an orderNumber
        const orderToCreate = {
          ...orderData,
          orderNumber: orderData.orderNumber || generateOrderNumber(),
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: 'pending',
        };

        // For Cloud Functions - they expect items array for email notification
        // Convert our single product to an items array if it doesn't exist
        if (!orderToCreate.items) {
          orderToCreate.items = [{
            name: "B8 Shield",
            quantity: orderToCreate.antalForpackningar || 0,
            price: orderToCreate.prisInfo?.produktPris / (orderToCreate.antalForpackningar || 1) || 0
          }];
        }

        // Save to both databases with same orderNumber to avoid duplication
        let savedOrderId = null;
        let savedOrder = null;
        
        try {
          // Save to named database
          const orderRef = await addDoc(collection(db, "orders"), orderToCreate);
          savedOrderId = orderRef.id;
          savedOrder = {
            id: savedOrderId,
            ...orderToCreate
          };
        } catch (error) {
          console.error('Error saving to named database:', error);
        }

        try {
          // Also save to default database
          if (savedOrderId) {
            // Use same ID if possible to maintain consistency
            await setDoc(doc(defaultDb, "orders", savedOrderId), orderToCreate);
          } else {
            // If first save failed, create new doc
            const orderRef = await addDoc(collection(defaultDb, "orders"), orderToCreate);
            savedOrderId = orderRef.id;
            savedOrder = {
              id: savedOrderId,
              ...orderToCreate
            };
          }
        } catch (error) {
          console.error('Error saving to default database:', error);
        }

        if (!savedOrder) {
          throw new Error('Failed to create order in both databases');
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
  };

  // Get an order by ID
  const getOrderById = async (orderId) => {
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
        // Try to get the order from named database first
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
          }
        } catch (error) {
          console.error('Error fetching from named database:', error);
          // Continue to try the default database
        }
        
        // If not found in named DB and user is admin, try default database
        if (isAdmin) {
          try {
            const defaultOrderDoc = await getDoc(doc(defaultDb, "orders", orderId));
            
            if (defaultOrderDoc.exists()) {
              const orderData = defaultOrderDoc.data();
              
              // Process any timestamps to avoid re-render loops
              const processedData = processTimestamps(orderData);
              
              return {
                id: defaultOrderDoc.id,
                ...processedData
              };
            }
          } catch (error) {
            console.error('Error fetching from default database:', error);
          }
        }
        
        // If we reach here, the order was not found in either database
        setError('Order not found');
        return null;
      }
    } catch (error) {
      console.error('Error in getOrderById:', error);
      setError(error.message || 'Error fetching order');
      return null;
    } finally {
      setLoading(false);
    }
  };

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
  const getUserOrders = async () => {
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
        
        // Try named database first
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
        
        // Only try default database if user is admin
        // This prevents permission errors for regular users
        if (isAdmin) {
          try {
            const defaultOrdersQuery = query(
              collection(defaultDb, "orders"),
              where("userId", "==", currentUser.uid),
              orderBy("createdAt", "desc")
            );
            
            const querySnapshot = await getDocs(defaultOrdersQuery);
            
            querySnapshot.forEach((doc) => {
              // Check if we already have this order (in case it exists in both DBs)
              const existingIndex = orders.findIndex(o => o.orderNumber === doc.data().orderNumber);
              if (existingIndex === -1) {
                orders.push({
                  id: doc.id,
                  ...doc.data()
                });
              }
            });
          } catch (error) {
            console.error('Error fetching orders from default database:', error);
            // Don't throw error here, just log it
          }
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
  };

  // Get recent orders
  const getRecentOrders = async (limitCount = 5) => {
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
  };

  // Get all orders (admin only)
  const getAllOrders = async () => {
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
        // Real Firebase all orders
        console.log('getAllOrders: Fetching from Firestore');
        
        try {
          // First try the named database
          console.log('getAllOrders: Trying to fetch from named database (b8s-reseller-db)');
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
          
          // If named database has orders, return them
          if (namedDbOrders.length > 0) {
            return namedDbOrders;
          }
          
          // Otherwise, try the default database
          console.log('getAllOrders: Named database empty, trying default database');
          const defaultDbOrdersQuery = query(
            collection(defaultDb, "orders"),
            orderBy("createdAt", "desc")
          );
          
          const defaultDbSnapshot = await getDocs(defaultDbOrdersQuery);
          const defaultDbOrders = [];
          
          defaultDbSnapshot.forEach((doc) => {
            defaultDbOrders.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          console.log('getAllOrders: Retrieved', defaultDbOrders.length, 'orders from default database');
          return defaultDbOrders;
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
  };

  // Update order status (admin only)
  const updateOrderStatus = async (orderId, newStatus) => {
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
          changedAt: new Date().toISOString(),
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
                  statusHistory: [...(order.statusHistory || []), statusChange]
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
        
        // Create status history entry with regular timestamp instead of serverTimestamp
        const now = new Date();
        const statusChange = {
          from: previousStatus,
          to: newStatus,
          changedBy: currentUser.uid,
          changedAt: now,
          displayName: currentUser.displayName || currentUser.email || 'Admin User'
        };
        
        // Update order with new status and add to status history
        await updateDoc(orderRef, {
          status: newStatus,
          updatedAt: serverTimestamp(),
          statusHistory: [...(orderData.statusHistory || []), statusChange]
        });
        
        // Try to update in default database as well if admin
        try {
          if (isAdmin) {
            const defaultOrderRef = doc(defaultDb, "orders", orderId);
            const defaultOrderDoc = await getDoc(defaultOrderRef);
            
            if (defaultOrderDoc.exists()) {
              await updateDoc(defaultOrderRef, {
                status: newStatus,
                updatedAt: serverTimestamp(),
                statusHistory: [...(defaultOrderDoc.data().statusHistory || []), statusChange]
              });
            }
          }
        } catch (error) {
          console.error('Error updating order in default database:', error);
          // Continue even if this fails
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
  };

  // Get order statistics (admin only)
  const getOrderStats = async () => {
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
  };

  // Delete order (admin only)
  const deleteOrder = async (orderId) => {
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
        await deleteDoc(doc(db, "orders", orderId));
        
        toast.success('Order deleted successfully');
        return true;
      }
    } catch (error) {
      setError(error.message);
      toast.error('Failed to delete order');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Cancel an order (user can cancel their own pending orders)
  const cancelOrder = async (orderId) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!currentUser) throw new Error('No authenticated user');
      
      if (isDemoMode) {
        // Demo mode: mock order cancellation
        setDemoOrders(orders => 
          orders.map(order => 
            order.id === orderId 
              ? { ...order, status: 'cancelled', updatedAt: new Date().toISOString() } 
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
        
        // First try to update in named database
        let namedDbSuccess = false;
        try {
          await updateDoc(doc(db, "orders", orderId), updates);
          namedDbSuccess = true;
        } catch (error) {
          console.error('Error updating in named database:', error);
          // Continue even if this fails
        }
        
        // Only try to update in default database if we're admin
        // Regular users won't have permissions for the default database
        if (isAdmin) {
          try {
            await updateDoc(doc(defaultDb, "orders", orderId), updates);
          } catch (error) {
            console.error('Error updating in default database:', error);
            // If named DB succeeded, we can still consider this a success
            if (!namedDbSuccess) {
              throw error; // Only throw if both updates failed
            }
          }
        }
        
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
  };

  // Update product settings (admin only)
  async function updateProductSettings(settings) {
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
  }
  
  // Create default B8 Shield products (used when products collection is empty)
  const createDefaultProducts = async () => {
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
        DEFAULT_MARGINAL: 35,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Add products to both databases
      for (const product of products) {
        try {
          await addDoc(collection(db, "products"), product);
        } catch (error) {
          console.error("Error adding product to named DB:", error);
        }
        
        try {
          await addDoc(collection(defaultDb, "products"), product);
        } catch (error) {
          console.error("Error adding product to default DB:", error);
        }
      }
      
      // Add settings to both databases
      try {
        await addDoc(collection(db, "settings"), settingsData);
      } catch (error) {
        console.error("Error adding settings to named DB:", error);
      }
      
      try {
        await addDoc(collection(defaultDb, "settings"), settingsData);
      } catch (error) {
        console.error("Error adding settings to default DB:", error);
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
  };

  const value = {
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
  };

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