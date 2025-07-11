/**
 * Affiliate System Debug Utility
 * Diagnoses data inconsistencies between different affiliate data sources
 */

import { db } from '../firebase/config';
import { collection, query, where, getDocs, orderBy, limit, getDoc, doc } from 'firebase/firestore';

export const diagnoseAffiliateData = async (affiliateCode) => {
  console.log(`🔍 AFFILIATE DEBUG: Starting diagnosis for ${affiliateCode}`);
  
  const results = {
    affiliateRecord: null,
    affiliateClicks: [],
    affiliateOrders: [],
    fieldMismatches: [],
    currencyIssues: [],
    commissionIssues: [],
    recommendations: []
  };

  try {
    // 1. Get affiliate record from affiliates collection
    console.log(`📊 Fetching affiliate record...`);
    const affiliatesRef = collection(db, 'affiliates');
    const affiliateQuery = query(affiliatesRef, where('affiliateCode', '==', affiliateCode), where('status', '==', 'active'));
    const affiliateSnapshot = await getDocs(affiliateQuery);

    if (!affiliateSnapshot.empty) {
      results.affiliateRecord = affiliateSnapshot.docs[0].data();
      console.log(`✅ Affiliate record found:`, results.affiliateRecord);
    } else {
      console.log(`❌ No affiliate record found for code: ${affiliateCode}`);
      results.recommendations.push('Affiliate record not found - this is a critical issue');
      return results;
    }

    // 2. Get affiliate clicks
    console.log(`🖱️ Fetching affiliate clicks...`);
    const clicksRef = collection(db, 'affiliateClicks');
    const clicksQuery = query(
      clicksRef,
      where('affiliateCode', '==', affiliateCode),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    const clicksSnapshot = await getDocs(clicksQuery);
    results.affiliateClicks = clicksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`📊 Found ${results.affiliateClicks.length} clicks`);

    // 3. Get affiliate orders
    console.log(`📦 Fetching affiliate orders...`);
    const ordersRef = collection(db, 'orders');
    const ordersQuery = query(
      ordersRef,
      where('affiliateCode', '==', affiliateCode),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const ordersSnapshot = await getDocs(ordersQuery);
    results.affiliateOrders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`📊 Found ${results.affiliateOrders.length} orders`);

    // 4. Analyze field mismatches
    console.log(`🔍 Analyzing field mismatches...`);
    results.affiliateOrders.forEach(order => {
      const fieldIssues = [];
      
      // Check for totalAmount vs total field
      if (!order.totalAmount && !order.total) {
        fieldIssues.push('Missing both totalAmount and total fields');
      } else if (!order.totalAmount && order.total) {
        fieldIssues.push(`Using 'total' field (${order.total}) instead of 'totalAmount'`);
      }

      // Check for commission field
      if (!order.affiliateCommission && order.affiliateCode) {
        fieldIssues.push('Missing affiliateCommission field despite having affiliateCode');
      }

      // Check for conversion processing
      if (!order.conversionProcessed && order.affiliateCode) {
        fieldIssues.push('Order not marked as conversion processed');
      }

      if (fieldIssues.length > 0) {
        results.fieldMismatches.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          issues: fieldIssues,
          fields: {
            total: order.total,
            totalAmount: order.totalAmount,
            affiliateCommission: order.affiliateCommission,
            conversionProcessed: order.conversionProcessed,
            affiliateCode: order.affiliateCode
          }
        });
      }
    });

    // 5. Analyze currency issues
    console.log(`💱 Analyzing currency issues...`);
    const affiliateStats = results.affiliateRecord.stats;
    const calculatedEarnings = results.affiliateOrders.reduce((sum, order) => {
      return sum + (order.affiliateCommission || 0);
    }, 0);

    if (Math.abs(affiliateStats.totalEarnings - calculatedEarnings) > 1) {
      results.currencyIssues.push({
        type: 'earnings_mismatch',
        affiliateStatsEarnings: affiliateStats.totalEarnings,
        calculatedFromOrders: calculatedEarnings,
        difference: affiliateStats.totalEarnings - calculatedEarnings
      });
    }

    // 6. Analyze commission calculation issues
    console.log(`💰 Analyzing commission issues...`);
    results.affiliateOrders.forEach(order => {
      if (order.affiliateCode && !order.affiliateCommission) {
        const expectedCommission = (order.total || 0) * (results.affiliateRecord.commissionRate / 100);
        results.commissionIssues.push({
          orderId: order.id,
          orderTotal: order.total,
          expectedCommission,
          actualCommission: order.affiliateCommission || 0,
          commissionRate: results.affiliateRecord.commissionRate,
          issue: 'Commission not calculated or stored'
        });
      }
    });

    // 7. Generate recommendations
    console.log(`💡 Generating recommendations...`);
    if (results.fieldMismatches.length > 0) {
      results.recommendations.push(`Fix field mismatch: Analytics expects 'totalAmount' but orders use 'total'`);
    }
    
    if (results.commissionIssues.length > 0) {
      results.recommendations.push(`${results.commissionIssues.length} orders missing commission calculation`);
    }
    
    if (results.currencyIssues.length > 0) {
      results.recommendations.push(`Currency mismatch detected between affiliate stats and calculated earnings`);
    }

    // 8. Calculate correct totals
    const correctStats = {
      clicks: results.affiliateClicks.length,
      conversions: results.affiliateOrders.length,
      earnings: results.affiliateOrders.reduce((sum, order) => sum + (order.affiliateCommission || 0), 0),
      balance: results.affiliateRecord.stats.balance
    };

    results.correctStats = correctStats;
    results.currentStats = affiliateStats;

    console.log(`✅ DIAGNOSIS COMPLETE`);
    console.log(`📊 Current affiliate stats:`, affiliateStats);
    console.log(`📊 Calculated from orders:`, correctStats);
    console.log(`🚨 Issues found:`, {
      fieldMismatches: results.fieldMismatches.length,
      currencyIssues: results.currencyIssues.length,
      commissionIssues: results.commissionIssues.length
    });

    return results;

  } catch (error) {
    console.error(`❌ Error during affiliate diagnosis:`, error);
    results.error = error.message;
    return results;
  }
};

/**
 * Fix affiliate data inconsistencies
 */
export const fixAffiliateDataIssues = async (affiliateCode) => {
  console.log(`🔧 FIXING AFFILIATE DATA for ${affiliateCode}`);
  
  try {
    const diagnosis = await diagnoseAffiliateData(affiliateCode);
    
    if (diagnosis.error) {
      throw new Error(diagnosis.error);
    }

    const fixes = [];

    // Fix 1: Update analytics to use correct field names
    if (diagnosis.fieldMismatches.length > 0) {
      console.log(`🔧 Field mismatch detected - Analytics should use 'total' instead of 'totalAmount'`);
      fixes.push('Update AffiliateAnalyticsTab.jsx to use order.total instead of order.totalAmount');
    }

    // Fix 2: Reprocess missing commissions
    for (const issue of diagnosis.commissionIssues) {
      console.log(`🔧 Reprocessing commission for order ${issue.orderId}`);
      // This would trigger the commission processing function
      fixes.push(`Reprocess commission for order ${issue.orderId}: expected ${issue.expectedCommission} SEK`);
    }

    // Fix 3: Currency format consistency
    if (diagnosis.currencyIssues.length > 0) {
      console.log(`🔧 Currency format inconsistency detected`);
      fixes.push('Ensure all affiliate earnings are stored in SEK and displayed consistently');
    }

    return {
      success: true,
      fixes,
      diagnosis
    };

  } catch (error) {
    console.error(`❌ Error fixing affiliate data:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Debug specific order for affiliate issues
 */
export const debugAffiliateOrder = async (orderId) => {
  try {
    console.log(`🔍 DEBUGGING ORDER: ${orderId}`);
    
    const orderRef = collection(db, 'orders');
    const orderQuery = query(orderRef, where('__name__', '==', orderId));
    const orderSnapshot = await getDocs(orderQuery);
    
    if (orderSnapshot.empty) {
      console.log(`❌ Order ${orderId} not found`);
      return { error: 'Order not found' };
    }
    
    const order = orderSnapshot.docs[0].data();
    console.log(`📦 Order data:`, order);
    
    const analysis = {
      orderId,
      hasAffiliateCode: !!order.affiliateCode,
      hasCommission: !!order.affiliateCommission,
      hasConversionProcessed: !!order.conversionProcessed,
      orderTotal: order.total || order.totalAmount || 0,
      affiliateCommission: order.affiliateCommission || 0,
      expectedCommission: null,
      issues: []
    };
    
    if (order.affiliateCode && !order.affiliateCommission) {
      analysis.issues.push('Has affiliate code but no commission calculated');
    }
    
    if (order.affiliateCode && !order.conversionProcessed) {
      analysis.issues.push('Affiliate conversion not processed');
    }
    
    return analysis;
    
  } catch (error) {
    console.error(`❌ Error debugging order:`, error);
    return { error: error.message };
  }
}; 

/**
 * Test commission processing manually for specific orders
 * This helps diagnose why the Firebase Function isn't working
 */
export const testCommissionProcessing = async (orderId) => {
  try {
    console.log(`🔧 Testing commission processing for order: ${orderId}`);
    
    // Get order data
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    if (!orderDoc.exists()) {
      console.error(`❌ Order ${orderId} not found`);
      return { success: false, error: 'Order not found' };
    }
    
    const orderData = orderDoc.data();
    console.log(`📦 Order data:`, {
      id: orderId,
      affiliateCode: orderData.affiliateCode,
      total: orderData.total,
      subtotal: orderData.subtotal,
      totalAmount: orderData.totalAmount,
      affiliateCommission: orderData.affiliateCommission,
      conversionProcessed: orderData.conversionProcessed
    });
    
    if (!orderData.affiliateCode) {
      console.log(`⚠️ No affiliate code found for order ${orderId}`);
      return { success: false, error: 'No affiliate code' };
    }
    
    // Get affiliate data
    const affiliatesQuery = query(
      collection(db, 'affiliates'),
      where('affiliateCode', '==', orderData.affiliateCode),
      where('status', '==', 'active')
    );
    
    const affiliateSnapshot = await getDocs(affiliatesQuery);
    if (affiliateSnapshot.empty) {
      console.error(`❌ No active affiliate found for code: ${orderData.affiliateCode}`);
      return { success: false, error: 'Affiliate not found' };
    }
    
    const affiliateDoc = affiliateSnapshot.docs[0];
    const affiliateData = affiliateDoc.data();
    console.log(`👤 Affiliate data:`, {
      id: affiliateDoc.id,
      name: affiliateData.name,
      affiliateCode: affiliateData.affiliateCode,
      status: affiliateData.status,
      commissionRate: affiliateData.commissionRate,
      stats: affiliateData.stats
    });
    
    // Calculate commission
    const orderAmount = orderData.total || orderData.subtotal || orderData.totalAmount || 0;
    const commissionRate = (affiliateData.commissionRate || 15) / 100;
    const commissionAmount = orderAmount * commissionRate;
    
    console.log(`💰 Commission calculation:`, {
      orderAmount,
      commissionRate: affiliateData.commissionRate || 15,
      commissionAmount
    });
    
    // Test the Firebase Function call
    console.log(`🔄 Testing Firebase Function call...`);
    const functionUrl = `https://us-central1-b8shield-reseller-app.cloudfunctions.net/processB2COrderCompletionHttpV2`;
    
    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({ orderId }),
      });
      
      const result = await response.json();
      console.log(`🔧 Firebase Function response:`, result);
      
      if (response.ok) {
        console.log(`✅ Function call successful`);
        
        // Check if order was updated
        const updatedOrderDoc = await getDoc(doc(db, 'orders', orderId));
        const updatedOrderData = updatedOrderDoc.data();
        
        console.log(`📦 Updated order data:`, {
          affiliateCommission: updatedOrderData.affiliateCommission,
          conversionProcessed: updatedOrderData.conversionProcessed,
          conversionProcessedAt: updatedOrderData.conversionProcessedAt
        });
        
        return { 
          success: true, 
          functionResult: result,
          commissionAdded: updatedOrderData.affiliateCommission > 0,
          commissionAmount: updatedOrderData.affiliateCommission
        };
      } else {
        console.error(`❌ Function call failed:`, result);
        return { success: false, error: result.error || 'Function call failed' };
      }
    } catch (error) {
      console.error(`❌ Error calling Firebase Function:`, error);
      return { success: false, error: error.message };
    }
    
  } catch (error) {
    console.error(`❌ Error in testCommissionProcessing:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Process missing commissions for all orders that need it
 * This is a bulk fix for the commission processing issue
 */
export const fixMissingCommissions = async () => {
  try {
    console.log(`🔧 Starting bulk commission fix...`);
    
    // Get all orders with affiliate codes but no commission
    const ordersQuery = query(
      collection(db, 'orders'),
      where('affiliateCode', '!=', null)
    );
    
    const ordersSnapshot = await getDocs(ordersQuery);
    const ordersToFix = [];
    
    ordersSnapshot.forEach(doc => {
      const orderData = doc.data();
      if (!orderData.affiliateCommission || orderData.affiliateCommission === 0) {
        ordersToFix.push({ id: doc.id, ...orderData });
      }
    });
    
    console.log(`📊 Found ${ordersToFix.length} orders needing commission fixes`);
    
    const results = [];
    
    for (const order of ordersToFix) {
      console.log(`🔄 Processing order ${order.id}...`);
      const result = await testCommissionProcessing(order.id);
      results.push({ orderId: order.id, ...result });
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`✅ Bulk commission fix completed. Results:`, results);
    
    return {
      success: true,
      ordersProcessed: ordersToFix.length,
      results
    };
    
  } catch (error) {
    console.error(`❌ Error in fixMissingCommissions:`, error);
    return { success: false, error: error.message };
  }
}; 

/**
 * Intelligent bulk commission fix that respects rate limits
 * Processes orders in batches with delays to avoid rate limiting
 */
export const fixMissingCommissionsIntelligent = async () => {
  try {
    console.log('🔧 Starting intelligent bulk commission fix...');
    
    const orders = await getDocs(query(collection(db, 'orders'), where('affiliateCode', '!=', null)));
    const ordersNeedingFix = [];
    
    // Find orders that need commission fixes
    orders.forEach(doc => {
      const order = doc.data();
      if (order.affiliateCode && !order.affiliateCommission) {
        ordersNeedingFix.push({ id: doc.id, ...order });
      }
    });
    
    console.log(`📊 Found ${ordersNeedingFix.length} orders needing commission fixes`);
    
    if (ordersNeedingFix.length === 0) {
      return { success: true, message: 'No orders need commission fixes', processedCount: 0 };
    }
    
    // Process in batches of 10 with 30-second delays
    const BATCH_SIZE = 10;
    const DELAY_BETWEEN_BATCHES = 30000; // 30 seconds
    const results = [];
    
    for (let i = 0; i < ordersNeedingFix.length; i += BATCH_SIZE) {
      const batch = ordersNeedingFix.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(ordersNeedingFix.length / BATCH_SIZE);
      
      console.log(`🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} orders)...`);
      
      // Process batch with small delays between requests
      for (let j = 0; j < batch.length; j++) {
        const order = batch[j];
        
        try {
          console.log(`  📦 Processing order ${j+1}/${batch.length}: ${order.id}`);
          
          // Small delay between individual requests (2 seconds)
          if (j > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          const result = await testCommissionProcessing(order.id);
          results.push(result);
          
          if (result.success) {
            console.log(`  ✅ Successfully processed order ${order.id}`);
          } else {
            console.log(`  ❌ Failed to process order ${order.id}: ${result.error}`);
          }
        } catch (error) {
          console.error(`  ❌ Error processing order ${order.id}:`, error);
          results.push({ 
            success: false, 
            orderId: order.id, 
            error: error.message 
          });
        }
      }
      
      // Wait between batches (except for the last batch)
      if (i + BATCH_SIZE < ordersNeedingFix.length) {
        console.log(`⏱️  Waiting ${DELAY_BETWEEN_BATCHES/1000} seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Intelligent bulk commission fix completed!`);
    console.log(`📊 Results: ${successful} successful, ${failed} failed out of ${ordersNeedingFix.length} orders`);
    
    return {
      success: true,
      message: `Processed ${ordersNeedingFix.length} orders in ${Math.ceil(ordersNeedingFix.length / BATCH_SIZE)} batches`,
      processedCount: successful,
      failedCount: failed,
      totalCount: ordersNeedingFix.length,
      results: results
    };
    
  } catch (error) {
    console.error('❌ Error in intelligent bulk commission fix:', error);
    return { success: false, error: error.message };
  }
}; 