"use strict";
// UserResolver Service
// Intelligently resolves user data from any order type (B2B/B2C/Guest)
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserResolver = void 0;
const firestore_1 = require("firebase-admin/firestore");
class UserResolver {
    constructor() {
        this.db = (0, firestore_1.getFirestore)('b8s-reseller-db');
    }
    /**
     * Resolve user data from any order context
     * Tries multiple identification methods in order of preference
     */
    async resolve(context) {
        console.log('🔍 UserResolver: Starting resolution with context:', {
            userId: context.userId,
            b2cCustomerId: context.b2cCustomerId,
            customerEmail: context.customerInfo?.email,
            source: context.source
        });
        // Method 1: B2B User ID
        if (context.userId) {
            console.log('🔍 UserResolver: Trying B2B user lookup');
            const b2bUser = await this.getB2BUser(context.userId);
            if (b2bUser) {
                console.log('✅ UserResolver: Found B2B user:', b2bUser.email);
                return b2bUser;
            }
        }
        // Method 2: B2C Customer ID
        if (context.b2cCustomerId) {
            console.log('🔍 UserResolver: Trying B2C customer lookup');
            const b2cUser = await this.getB2CUser(context.b2cCustomerId);
            if (b2cUser) {
                console.log('✅ UserResolver: Found B2C customer:', b2cUser.email);
                return b2cUser;
            }
        }
        // Method 3: Guest order with email
        if (context.customerInfo?.email) {
            console.log('🔍 UserResolver: Creating guest user profile');
            const guestUser = this.createGuestUser(context.customerInfo);
            console.log('✅ UserResolver: Created guest user:', guestUser.email);
            return guestUser;
        }
        // Method 4: Last resort - try to find B2C customer by user ID
        if (context.userId) {
            console.log('🔍 UserResolver: Trying B2C lookup with userId as fallback');
            const b2cUser = await this.getB2CUser(context.userId);
            if (b2cUser) {
                console.log('✅ UserResolver: Found B2C customer via userId fallback:', b2cUser.email);
                return b2cUser;
            }
        }
        console.error('❌ UserResolver: No user identification method succeeded');
        console.error('Available context:', Object.keys(context));
        throw new Error('Unable to resolve user from order context - no valid user identifier found');
    }
    /**
     * Get B2B user from users collection
     */
    async getB2BUser(userId) {
        try {
            const userDoc = await this.db.collection('users').doc(userId).get();
            if (!userDoc.exists) {
                console.log('🔍 UserResolver: B2B user not found in users collection');
                return null;
            }
            const userData = userDoc.data();
            return {
                email: userData.email,
                name: userData.contactPerson || userData.companyName || 'B2B Customer',
                companyName: userData.companyName,
                contactPerson: userData.contactPerson,
                type: 'B2B',
                language: userData.preferredLang || 'sv-SE'
            };
        }
        catch (error) {
            console.error('❌ UserResolver: Error fetching B2B user:', error);
            return null;
        }
    }
    /**
     * Get B2C customer from b2cCustomers collection
     */
    async getB2CUser(customerId) {
        try {
            const customerDoc = await this.db.collection('b2cCustomers').doc(customerId).get();
            if (!customerDoc.exists) {
                console.log('🔍 UserResolver: B2C customer not found in b2cCustomers collection');
                return null;
            }
            const customerData = customerDoc.data();
            return {
                email: customerData.email,
                name: customerData.name || 'B2C Customer',
                type: 'B2C',
                language: customerData.preferredLang || 'sv-SE'
            };
        }
        catch (error) {
            console.error('❌ UserResolver: Error fetching B2C customer:', error);
            return null;
        }
    }
    /**
     * Create guest user profile from order customer info
     */
    createGuestUser(customerInfo) {
        const name = customerInfo.firstName && customerInfo.lastName
            ? `${customerInfo.firstName} ${customerInfo.lastName}`
            : customerInfo.name || 'Guest Customer';
        return {
            email: customerInfo.email,
            name: name,
            type: 'GUEST',
            language: 'sv-SE' // Default to Swedish for guests
        };
    }
    /**
     * Detect order type from context
     */
    detectOrderType(context) {
        if (context.userId && !context.b2cCustomerId)
            return 'B2B';
        if (context.b2cCustomerId)
            return 'B2C';
        if (context.customerInfo?.email)
            return 'GUEST';
        return 'GUEST'; // Default fallback
    }
}
exports.UserResolver = UserResolver;
//# sourceMappingURL=UserResolver.js.map