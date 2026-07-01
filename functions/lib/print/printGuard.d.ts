export interface PrintShopContext {
    uid: string;
    printShopShops: string[];
}
/**
 * Assert the caller is an ACTIVE print_shop user; return their allowed shop list.
 * Throws (unauthenticated / permission-denied) otherwise. Reads the live doc.
 */
export declare function getPrintShopContext(authUid?: string): Promise<PrintShopContext>;
/** Assert an order's shop is one the caller may fulfil (per-resource scope check). */
export declare function assertShopAllowed(ctx: PrintShopContext, shopId: string): void;
