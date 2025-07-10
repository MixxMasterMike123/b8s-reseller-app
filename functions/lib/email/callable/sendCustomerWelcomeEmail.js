"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendCustomerWelcomeEmail = void 0;
const https_1 = require("firebase-functions/v2/https");
const shared_utils_1 = require("../shared-utils");
// Send customer welcome email with credentials
exports.sendCustomerWelcomeEmail = (0, https_1.onCall)(async (request) => {
    const { auth: userAuth, data } = request;
    if (!userAuth?.uid) {
        throw new Error('Unauthorized');
    }
    try {
        const { customerId } = data;
        if (!customerId) {
            throw new Error('Customer ID is required');
        }
        // Get customer data
        const customerDoc = await shared_utils_1.db.collection('users').doc(customerId).get();
        if (!customerDoc.exists) {
            throw new Error('Customer not found');
        }
        const customerData = customerDoc.data();
        let isExistingUser = false;
        let temporaryPassword = await (0, shared_utils_1.generateTemporaryPassword)();
        let userRecord;
        try {
            // Try to create new Firebase Auth account
            userRecord = await shared_utils_1.auth.createUser({
                email: customerData.email,
                password: temporaryPassword,
                emailVerified: true
            });
            console.log(`Created new Firebase Auth user for ${customerData.email}`);
        }
        catch (error) {
            if (error.code === 'auth/email-already-exists') {
                // If user exists, update their password
                const existingUser = await shared_utils_1.auth.getUserByEmail(customerData.email);
                await shared_utils_1.auth.updateUser(existingUser.uid, {
                    password: temporaryPassword
                });
                userRecord = existingUser;
                isExistingUser = true;
                console.log(`Updated existing user password for ${customerData.email}`);
            }
            else {
                throw error;
            }
        }
        // Update customer document with new credentials info
        await customerDoc.ref.update({
            credentialsSent: true,
            credentialsSentAt: new Date(),
            credentialsSentBy: userAuth.uid,
            firebaseAuthUid: userRecord.uid,
            requiresPasswordChange: true,
            temporaryPassword,
            credentialsHistory: shared_utils_1.FieldValue.arrayUnion({
                sentAt: new Date(),
                sentBy: userAuth.uid,
                isResend: isExistingUser
            })
        });
        // Send welcome email using existing template
        const emailTemplate = (0, shared_utils_1.getEmail)('welcomeCredentials', customerData.preferredLang || 'sv-SE', {
            customerData,
            temporaryPassword,
            wasExistingAuthUser: isExistingUser
        });
        const emailData = (0, shared_utils_1.createEmailData)(customerData.email, shared_utils_1.EMAIL_FROM.system, emailTemplate, {
            userData: {
                email: customerData.email,
                companyName: customerData.companyName,
                contactPerson: customerData.contactPerson,
                preferredLang: customerData.preferredLang
            },
            tempPassword: temporaryPassword,
            wasExistingAuthUser: isExistingUser
        });
        await (0, shared_utils_1.sendEmail)(emailData);
        console.log(`${isExistingUser ? 'New credentials' : 'Welcome email'} sent successfully to ${customerData.email} for customer ${customerId}${isExistingUser ? ' (existing user)' : ''}`);
        return {
            success: true,
            isExistingUser,
            temporaryPassword,
            email: customerData.email
        };
    }
    catch (error) {
        console.error('Error sending welcome email:', error);
        throw new Error('Failed to send welcome email');
    }
});
//# sourceMappingURL=sendCustomerWelcomeEmail.js.map