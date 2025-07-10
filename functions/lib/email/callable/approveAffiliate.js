"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveAffiliate = void 0;
const https_1 = require("firebase-functions/v2/https");
const shared_utils_1 = require("../shared-utils");
// Approve affiliate application and send welcome email
exports.approveAffiliate = (0, https_1.onCall)(async (request) => {
    const { auth: userAuth } = request;
    if (!userAuth?.uid) {
        throw new Error('Unauthorized');
    }
    const adminUserDoc = await shared_utils_1.db.collection('users').doc(userAuth.uid).get();
    if (!adminUserDoc.exists || adminUserDoc.data()?.role !== 'admin') {
        throw new Error('Unauthorized - Admin only');
    }
    const { applicationId, checkoutDiscount, name, email, phone, address, postalCode, city, country, socials, promotionMethod, message } = request.data;
    if (!applicationId) {
        throw new Error('Application ID is required');
    }
    try {
        const applicationRef = shared_utils_1.db.collection('affiliateApplications').doc(applicationId);
        const applicationDoc = await applicationRef.get();
        if (!applicationDoc.exists) {
            throw new Error('Affiliate application not found');
        }
        const appData = applicationDoc.data();
        if (!appData) {
            throw new Error('Application data is missing');
        }
        // Create Firebase Auth user
        const tempPassword = Math.random().toString(36).slice(-8);
        let authUser;
        let wasExistingAuthUser = false;
        try {
            authUser = await shared_utils_1.auth.createUser({
                email: appData.email,
                emailVerified: true,
                password: tempPassword,
                displayName: appData.name,
            });
        }
        catch (error) {
            if (error.code === 'auth/email-already-exists') {
                authUser = await shared_utils_1.auth.getUserByEmail(appData.email);
                wasExistingAuthUser = true;
                console.log(`User with email ${appData.email} already exists. Using existing auth UID.`);
            }
            else {
                throw error;
            }
        }
        // Generate affiliate code
        const namePart = appData.name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').substring(0, 8);
        const randomPart = Math.floor(100 + Math.random() * 900);
        const affiliateCode = `${namePart}-${randomPart}`;
        // Create affiliate record
        const affiliateRef = shared_utils_1.db.collection('affiliates').doc(authUser.uid);
        const newAffiliateData = {
            id: authUser.uid,
            affiliateCode,
            name,
            email,
            phone,
            address,
            postalCode,
            city,
            country,
            socials,
            promotionMethod,
            message,
            status: 'active',
            commissionRate: 15,
            checkoutDiscount: checkoutDiscount || 10,
            stats: {
                clicks: 0,
                conversions: 0,
                totalEarnings: 0,
                balance: 0,
            },
            createdAt: new Date(),
            updatedAt: new Date() // Placeholder for Timestamp
        };
        await affiliateRef.set(newAffiliateData);
        await applicationRef.delete();
        // Generate login instructions in Swedish
        const loginInstructions = wasExistingAuthUser
            ? `<p>Du hade redan ett konto hos B8Shield, så du kan logga in med ditt befintliga lösenord. Om du har glömt det kan du återställa det på inloggningssidan.</p>`
            : `<ul>
          <li><strong>Användarnamn:</strong> ${appData.email}</li>
          <li><strong>Tillfälligt lösenord:</strong> ${tempPassword}</li>
        </ul>
        <p>Vi rekommenderar starkt att du byter ditt lösenord efter första inloggningen.</p>`;
        // Send welcome email using template with all translations
        const emailTemplate = (0, shared_utils_1.getEmail)('affiliateWelcome', appData.preferredLang || 'sv-SE', {
            appData,
            affiliateCode,
            tempPassword,
            loginInstructions,
            wasExistingAuthUser
        });
        const emailData = {
            to: appData.email,
            from: shared_utils_1.EMAIL_FROM.affiliate,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text,
            appData: {
                name: appData.name,
                email: appData.email,
                preferredLang: appData.preferredLang
            }
        };
        await (0, shared_utils_1.sendEmail)(emailData);
        console.log(`Welcome email sent successfully to affiliate ${appData.email}`);
        return {
            success: true,
            affiliateCode,
            wasExistingAuthUser
        };
    }
    catch (error) {
        console.error('Error approving affiliate:', error);
        throw new Error('Failed to approve affiliate');
    }
});
//# sourceMappingURL=approveAffiliate.js.map