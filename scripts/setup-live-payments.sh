#!/bin/bash

# B8Shield Live Payments Setup Script
# This script helps you configure live Stripe payments safely

echo "🚀 B8Shield Live Payments Setup"
echo "==============================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  IMPORTANT SAFETY REMINDER:${NC}"
echo "Before proceeding, ensure you have:"
echo "✅ Fully verified Stripe account"
echo "✅ Connected business bank account"
echo "✅ Completed tax information"
echo "✅ Live Stripe keys ready"
echo ""

read -p "Do you want to proceed? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 1
fi

echo ""
echo -e "${BLUE}📝 Please provide your live Stripe keys:${NC}"
echo ""

# Get Stripe Publishable Key
echo -n "Enter your live publishable key (pk_live_...): "
read STRIPE_PK_LIVE

# Get Stripe Secret Key
echo -n "Enter your live secret key (sk_live_...): "
read -s STRIPE_SK_LIVE
echo ""

# Get Webhook Secret
echo -n "Enter your webhook secret (whsec_...): "
read -s WEBHOOK_SECRET
echo ""

# Validate keys
if [[ ! $STRIPE_PK_LIVE =~ ^pk_live_ ]]; then
    echo -e "${RED}❌ Invalid publishable key format. Must start with 'pk_live_'${NC}"
    exit 1
fi

if [[ ! $STRIPE_SK_LIVE =~ ^sk_live_ ]]; then
    echo -e "${RED}❌ Invalid secret key format. Must start with 'sk_live_'${NC}"
    exit 1
fi

if [[ ! $WEBHOOK_SECRET =~ ^whsec_ ]]; then
    echo -e "${RED}❌ Invalid webhook secret format. Must start with 'whsec_'${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔄 Updating configuration...${NC}"

# Update frontend .env file
sed -i '' "s/VITE_STRIPE_PUBLISHABLE_KEY=.*/VITE_STRIPE_PUBLISHABLE_KEY=$STRIPE_PK_LIVE/" .env

# Update Firebase Functions configuration
firebase functions:config:set stripe.secret_key="$STRIPE_SK_LIVE"
firebase functions:config:set stripe.webhook_secret="$WEBHOOK_SECRET"

echo ""
echo -e "${GREEN}✅ Configuration updated successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Test with a small payment (€1)"
echo "2. Verify webhook endpoint in Stripe dashboard"
echo "3. Monitor Stripe dashboard for successful processing"
echo "4. Deploy functions: firebase deploy --only functions"
echo "5. Build and deploy frontend: npm run build && firebase deploy --only hosting"
echo ""
echo -e "${BLUE}🌐 Webhook URL for Stripe dashboard:${NC}"
echo "https://us-central1-b8shield-reseller-app.cloudfunctions.net/processPaymentWebhook"
echo ""
echo -e "${GREEN}🎉 Live payments setup complete!${NC}"
