export declare function loadShopMappings(shopId: string): Promise<Map<string, any>>;
export declare function orderHasPodLine(order: any, mappingsBySku: Map<string, any>): boolean;
export declare function toQueueRow(orderId: string, order: any, shopName: string, mappingsBySku: Map<string, any>): {
    orderId: string;
    orderNumber: any;
    orderDate: any;
    shopId: any;
    shopName: any;
    status: any;
    podLineCount: any;
    shipToCity: any;
    shipToCountry: any;
};
export declare function toPrintJob(orderId: string, order: any, shopName: string, mappingsBySku: Map<string, any>): Promise<{
    order: {
        orderNumber: any;
        orderDate: any;
        status: any;
        orderRef: string;
    };
    shopName: any;
    shipTo: {
        name: any;
        line1: any;
        line2: any;
        postalCode: any;
        city: any;
        country: any;
    };
    lines: ({
        purpose: any;
        artwork: {
            unresolved: boolean;
            reason: string;
            tier?: undefined;
            fileName?: undefined;
            ext?: undefined;
            downloadUrl?: undefined;
            previewUrl?: undefined;
        };
        productName: any;
        sku: any;
        variantLabel: any;
        quantity: any;
        placement: any;
        profileId: any;
    } | {
        purpose: any;
        artwork: {
            tier: any;
            fileName: any;
            ext: any;
            downloadUrl: string | null;
            previewUrl: any;
            unresolved?: undefined;
            reason?: undefined;
        };
        productName: any;
        sku: any;
        variantLabel: any;
        quantity: any;
        placement: any;
        profileId: any;
    })[];
}>;
