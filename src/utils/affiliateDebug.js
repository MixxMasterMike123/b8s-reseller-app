/**
 * Affiliate System Debug Utility
 * Diagnoses data inconsistencies between different affiliate data sources
 */

import { db } from '../firebase/config';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

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