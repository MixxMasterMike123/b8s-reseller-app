export declare function requireAdmin(authUid?: string): Promise<void>;
export declare function requireAuth(authUid?: string): void;
export declare function requirePlatform(authUid?: string): Promise<void>;
export interface AdminContext {
    uid: string;
    role: string;
    platform: boolean;
    shopId: string | null;
}
export declare function getAdminContext(authUid?: string): Promise<AdminContext>;
export declare function requireAdminOfShop(targetShopId: string | null | undefined, authUid?: string): Promise<AdminContext>;
