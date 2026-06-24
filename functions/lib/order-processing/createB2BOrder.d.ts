interface CartLine {
    productId: string;
    quantity: number;
    variantSku?: string | null;
}
interface CreateB2BOrderRequest {
    b2bCustomerId: string;
    items: CartLine[];
}
export declare const createB2BOrder: import("firebase-functions/v2/https").CallableFunction<CreateB2BOrderRequest, any, unknown>;
export {};
