import { AdminContext } from '../email-orchestrator/functions/authGuard';
export declare function requireContentStudio(rawShopId: string | undefined, uid?: string): Promise<{
    shopId: string;
    ctx: AdminContext;
    data: Record<string, any>;
}>;
export declare function shopBrandName(shopId: string, data: Record<string, any>): string;
export declare function isShopMediaPath(shopId: string, p: string): boolean;
