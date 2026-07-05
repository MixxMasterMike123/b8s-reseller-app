export interface ReviewRequestItem {
    productId?: string;
    name?: any;
    image?: string;
}
export interface ReviewRequestData {
    brandName: string;
    customerFirstName?: string;
    items: ReviewRequestItem[];
    reviewUrl: string;
    unsubscribeUrl: string;
}
export declare function generateReviewRequestTemplate(data: ReviewRequestData, lang?: string): {
    subject: string;
    html: string;
};
