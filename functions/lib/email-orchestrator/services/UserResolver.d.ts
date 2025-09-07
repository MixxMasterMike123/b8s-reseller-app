export interface ResolvedUser {
    email: string;
    name: string;
    companyName?: string;
    contactPerson?: string;
    type: 'B2B' | 'B2C' | 'GUEST';
    language?: string;
}
export interface OrderContext {
    userId?: string;
    b2cCustomerId?: string;
    customerInfo?: {
        email: string;
        name?: string;
        firstName?: string;
        lastName?: string;
    };
    source?: string;
    orderId?: string;
}
export declare class UserResolver {
    private db;
    constructor();
    /**
     * Resolve user data from any order context
     * Tries multiple identification methods in order of preference
     */
    resolve(context: OrderContext): Promise<ResolvedUser>;
    /**
     * Get B2B user from users collection
     */
    private getB2BUser;
    /**
     * Get B2C customer from b2cCustomers collection
     */
    private getB2CUser;
    /**
     * Create guest user profile from order customer info
     */
    private createGuestUser;
    /**
     * Detect order type from context
     */
    detectOrderType(context: OrderContext): 'B2B' | 'B2C' | 'GUEST';
}
