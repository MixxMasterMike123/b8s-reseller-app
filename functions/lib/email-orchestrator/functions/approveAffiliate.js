"use strict";
// approveAffiliate - Unified Affiliate Approval Function
// Replaces: approveAffiliateV3
// Complete workflow: Creates Firebase Auth user + Affiliate record + Sends welcome email via orchestrator
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveAffiliate = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const EmailOrchestrator_1 = require("../core/EmailOrchestrator");
// Initialize Firebase services
const db = (0, firestore_1.getFirestore)('b8s-reseller-db');
const auth = (0, auth_1.getAuth)();
// Helper function for admin authentication
async function verifyAdminAuth(authUid) {
    if (!authUid) {
        throw new Error('Authentication required');
    }
    try {
        const userDoc = await db.collection('users').doc(authUid).get();
        const userData = userDoc.data();
        if (!userData || userData.role !== 'admin') {
            throw new Error('Admin access required');
        }
    }
    catch (error) {
        console.error('Admin verification failed:', error);
        throw new Error('Unauthorized access');
    }
}
exports.approveAffiliate = (0, https_1.onCall)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 120,
    cors: ['https://partner.b8shield.com', 'https://shop.b8shield.com']
}, async (request) => {
    try {
        console.log('🎉 approveAffiliate: Starting unified affiliate approval workflow');
        console.log('🎉 Request data:', {
            applicationId: request.data.applicationId,
            checkoutDiscount: request.data.checkoutDiscount
        });
        // Verify admin authentication
        await verifyAdminAuth(request.auth?.uid);
        const { applicationId, checkoutDiscount, phone, address, postalCode, city, country, socials, promotionMethod, message } = request.data;
        if (!applicationId) {
            throw new Error('Application ID is required');
        }
        // 1. Get application data
        console.log('📄 Fetching affiliate application...');
        const applicationRef = db.collection('affiliateApplications').doc(applicationId);
        const applicationDoc = await applicationRef.get();
        if (!applicationDoc.exists) {
            throw new Error('Affiliate application not found');
        }
        const appData = applicationDoc.data();
        if (!appData) {
            throw new Error('Application data is missing');
        }
        // 2. Create Firebase Auth user
        console.log('🔐 Creating Firebase Auth user...');
        const tempPassword = Math.random().toString(36).substring(2, 15);
        let authUser;
        let wasExistingAuthUser = false;
        try {
            authUser = await auth.createUser({
                email: appData.email,
                password: tempPassword,
                displayName: appData.name,
                emailVerified: true
            });
            console.log(`✅ Created new Firebase Auth user for ${appData.email}`);
        }
        catch (error) {
            if (error.code === 'auth/email-already-exists') {
                authUser = await auth.getUserByEmail(appData.email);
                await auth.updateUser(authUser.uid, {
                    password: tempPassword
                });
                wasExistingAuthUser = true;
                console.log(`✅ Updated existing user password for ${appData.email}`);
            }
            else {
                throw error;
            }
        }
        // 3. Generate unique affiliate code
        const affiliateCode = `${appData.name.substring(0, 3).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        console.log(`🏷️ Generated affiliate code: ${affiliateCode}`);
        // 4. Create affiliate record
        console.log('📝 Creating affiliate record...');
        const affiliateData = {
            id: authUser.uid,
            affiliateCode,
            name: appData.name,
            email: appData.email,
            phone: phone || appData.phone || '',
            address: address || appData.address || '',
            postalCode: postalCode || appData.postalCode || '',
            city: city || appData.city || '',
            country: country || appData.country || 'SE',
            socials: socials || appData.socials || {},
            promotionMethod: promotionMethod || appData.promotionMethod || '',
            message: message || appData.message || '',
            status: 'active',
            commissionRate: 15,
            checkoutDiscount: Number(checkoutDiscount) || 10,
            preferredLang: appData.preferredLang || 'sv-SE',
            stats: {
                clicks: 0,
                conversions: 0,
                totalEarnings: 0,
                balance: 0,
            },
            firebaseAuthUid: authUser.uid,
            credentialsSent: false,
            credentialsSentAt: null,
            credentialsSentBy: null,
            temporaryPassword: tempPassword,
            requiresPasswordChange: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        await db.collection('affiliates').doc(authUser.uid).set(affiliateData);
        console.log('✅ Affiliate record created successfully');
        // 5. Send welcome email via orchestrator
        console.log('📧 Sending welcome email via orchestrator...');
        const orchestrator = new EmailOrchestrator_1.EmailOrchestrator();
        const emailResult = await orchestrator.sendEmail({
            emailType: 'AFFILIATE_WELCOME',
            customerInfo: {
                email: appData.email,
                name: appData.name
            },
            language: appData.preferredLang || 'sv-SE',
            additionalData: {
                affiliateInfo: {
                    name: appData.name,
                    email: appData.email,
                    affiliateCode: affiliateCode,
                    commissionRate: 15,
                    checkoutDiscount: Number(checkoutDiscount) || 10
                },
                credentials: {
                    email: appData.email,
                    temporaryPassword: tempPassword
                },
                wasExistingAuthUser: wasExistingAuthUser
            }
        });
        if (!emailResult.success) {
            console.error('❌ Welcome email failed:', emailResult.error);
            // Don't fail the whole process, but log the error
        }
        else {
            console.log('✅ Welcome email sent successfully');
            // Update affiliate record with email sent info
            await db.collection('affiliates').doc(authUser.uid).update({
                credentialsSent: true,
                credentialsSentAt: new Date(),
                credentialsSentBy: request.auth?.uid || 'system'
            });
        }
        // 6. Delete application record
        console.log('🗑️ Cleaning up application record...');
        await applicationRef.delete();
        console.log('✅ Application record deleted');
        console.log('🎉 Affiliate approval workflow completed successfully');
        return {
            success: true,
            email: appData.email,
            affiliateCode: affiliateCode,
            affiliateId: authUser.uid,
            wasExistingAuthUser: wasExistingAuthUser,
            language: appData.preferredLang || 'sv-SE',
            messageId: emailResult.messageId,
            emailSent: emailResult.success,
            commissionRate: 15,
            checkoutDiscount: Number(checkoutDiscount) || 10
        };
    }
    catch (error) {
        console.error('❌ approveAffiliate: Fatal error:', error);
        throw new Error(error instanceof Error ? error.message : 'Unknown error in affiliate approval');
    }
});
//# sourceMappingURL=approveAffiliate.js.map