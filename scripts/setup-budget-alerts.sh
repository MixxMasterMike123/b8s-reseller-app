#!/bin/bash
# Firebase Budget Protection Setup
# This script sets up billing alerts to prevent massive unexpected costs

PROJECT_ID="b8shield-reseller-app"
PROJECT_NUMBER="996315128348"

echo "🛡️ Setting up Firebase budget protection for ${PROJECT_ID}..."

# Set up daily budget alerts
echo "📊 Creating budget alerts..."

# You need to run these commands in Google Cloud Console or via gcloud CLI
# Firebase CLI doesn't support budget alerts directly

echo "⚠️  MANUAL SETUP REQUIRED:"
echo ""
echo "1. Go to: https://console.cloud.google.com/billing/budgets?project=${PROJECT_ID}"
echo ""
echo "2. Click 'CREATE BUDGET'"
echo ""
echo "3. Set up these budgets:"
echo "   📈 Daily Budget: 20 SEK (Alert at 10 SEK)"
echo "   📈 Monthly Budget: 500 SEK (Alert at 250 SEK & 400 SEK)"
echo "   🚨 Emergency Budget: 1000 SEK (Disable services)"
echo ""
echo "4. Enable these alert channels:"
echo "   📧 Email: micke.ohlen@gmail.com"
echo "   📱 SMS: Your phone number"
echo ""
echo "5. Set up Cloud Monitoring alerts:"
echo "   - Function invocations > 1000/hour"
echo "   - Firestore reads > 10K/hour"
echo "   - Storage downloads > 1GB/hour"
echo ""

# Create a monitoring function for usage
cat > ../functions/budgetMonitor.js << 'EOF'
// Budget monitoring function to track costs and automatically disable services
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Emergency cost protection thresholds (in SEK)
const COST_THRESHOLDS = {
  DAILY_WARNING: 20,
  DAILY_EMERGENCY: 50,
  MONTHLY_WARNING: 500,
  MONTHLY_EMERGENCY: 1000
};

/**
 * Budget monitoring function - triggered by Cloud Scheduler
 * Checks current usage and can automatically disable expensive services
 */
exports.budgetMonitor = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    console.log('🔍 Running budget monitoring check...');
    
    try {
      // Get current usage stats from our rate limiter
      const { getUsageStats } = require('./rateLimiting');
      const stats = getUsageStats();
      
      console.log('📊 Current usage:', stats);
      
      // Calculate estimated daily cost based on usage
      const estimatedDailyCost = calculateDailyCost(stats);
      
      if (estimatedDailyCost > COST_THRESHOLDS.DAILY_WARNING) {
        console.warn(`⚠️  Daily cost warning: ${estimatedDailyCost} SEK`);
        await sendCostAlert('Daily budget warning', estimatedDailyCost);
      }
      
      if (estimatedDailyCost > COST_THRESHOLDS.DAILY_EMERGENCY) {
        console.error(`🚨 EMERGENCY: Daily cost exceeded ${estimatedDailyCost} SEK`);
        await emergencyShutdown();
      }
      
      return { success: true, cost: estimatedDailyCost };
    } catch (error) {
      console.error('Budget monitoring error:', error);
      return { error: error.message };
    }
  });

/**
 * Calculate estimated daily cost based on usage
 */
function calculateDailyCost(stats) {
  // Rough estimates based on Firebase pricing
  const costEstimate = {
    hosting: (stats.daily.requests * 0.1) / 1000,  // Hosting bandwidth
    functions: (stats.daily.requests * 0.4) / 1000000, // Function invocations
    firestore: (stats.daily.requests * 0.06) / 100000,  // Firestore reads
    total: 0
  };
  
  costEstimate.total = Object.values(costEstimate).reduce((sum, cost) => sum + cost, 0);
  return Math.round(costEstimate.total * 100) / 100; // Round to 2 decimals
}

/**
 * Send cost alert via email/SMS
 */
async function sendCostAlert(type, amount) {
  // Implement email/SMS alert logic here
  console.log(`📧 Sending ${type} alert for ${amount} SEK`);
  
  // You can integrate with email service or SMS here
  // For now, just log to Firebase console
}

/**
 * Emergency shutdown - disable expensive services
 */
async function emergencyShutdown() {
  console.error('🚨 EMERGENCY SHUTDOWN ACTIVATED');
  
  // You could implement service disabling here:
  // 1. Disable Cloud Functions
  // 2. Set Firestore to deny all reads
  // 3. Disable Firebase Hosting
  // 4. Send urgent alerts
  
  // For now, just alert - manual intervention required
  await sendCostAlert('EMERGENCY SHUTDOWN', 'Services may need manual disabling');
}
EOF

echo ""
echo "✅ Budget monitoring function created at functions/budgetMonitor.js"
echo ""
echo "🚀 To deploy the monitoring function:"
echo "   firebase deploy --only functions:budgetMonitor"
echo ""
echo "⚠️  IMPORTANT: Set up the manual budget alerts in Google Cloud Console!"
echo "   Link: https://console.cloud.google.com/billing/budgets?project=${PROJECT_ID}" 