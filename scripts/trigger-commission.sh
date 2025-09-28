#!/bin/bash

# Manual commission trigger for KAJJAN10 order B8S-249100-6RPW
# Replace [ORDER_FIRESTORE_ID] with the actual Firestore document ID from admin panel

echo "🔄 Triggering commission processing for KAJJAN10 order..."
echo ""

# You need to replace [ORDER_FIRESTORE_ID] with the real ID from the admin panel
ORDER_ID="[ORDER_FIRESTORE_ID]"

if [ "$ORDER_ID" = "[ORDER_FIRESTORE_ID]" ]; then
    echo "❌ Please replace [ORDER_FIRESTORE_ID] with the actual Firestore document ID"
    echo ""
    echo "📋 Steps to get the ID:"
    echo "1. Go to partner.b8shield.com/admin/orders"
    echo "2. Find order B8S-249100-6RPW (Mattias Kallur, Sept 4th)"
    echo "3. Click to view details"
    echo "4. Copy the Firestore document ID from the URL or order details"
    echo "5. Replace [ORDER_FIRESTORE_ID] in this script with that ID"
    echo "6. Run this script again"
    exit 1
fi

echo "📋 Processing commission for order ID: $ORDER_ID"
echo ""

curl -X POST https://api.b8shield.com/processB2COrderCompletionHttpV2 \
  -H 'Content-Type: application/json' \
  -d "{\"orderId\": \"$ORDER_ID\"}" \
  --verbose

echo ""
echo "✅ Commission processing request sent!"
echo ""
echo "📊 Expected result:"
echo "- KAJJAN10 should gain ~12.80 SEK commission"
echo "- Total earnings should go from 26.40 to ~39.20 SEK"
echo ""
echo "🔍 Check the affiliate panel to verify the commission was added."
