/**
 * DAC7 seller due-diligence + aggregation + export (Slices E/F).
 *
 * DAC7 obliges the platform to collect seller due-diligence data, aggregate per
 * seller per year, and report reportable sellers. This module provides:
 *   - saveDac7SellerProfile / getDac7SellerProfile — the seller fills/edits the
 *     DAC7 fields (branching individual vs company, Slice F), stored in the
 *     access-controlled dac7Sellers/{shopId} collection (NOT the public shops
 *     doc — PII would leak there). Can also pull validated values from Stripe.
 *   - aggregateDac7Year — per-shop gross + transaction count for a year (the
 *     pure math is aggregate.ts).
 *   - exportDac7Report — PLATFORM-ONLY: list reportable sellers for a year with
 *     their DAC7 fields + aggregate (the export the platform files / hands to
 *     Skatteverket, or cross-checks against Stripe's own DAC7 export).
 *
 * Stripe DAC7 feature (eval, 2026): Stripe Connect "platform tax reporting"
 * (tax_reporting additional verification) CAN be enabled for EU platforms incl.
 * Sweden — it collects+validates seller data and generates the EU XML report.
 * We store our own fields AND can pull from Stripe (decision E = both), so we're
 * not solely dependent on enabling the Stripe feature (which needs dashboard
 * setup). See docs/STRIPE_COMPLIANCE_REMEDIATION_PLAN.md §E.
 */
declare const CONTACT_KEYS: readonly ["legalName", "vatNumber", "address", "countryOfResidence"];
interface Dac7Profile {
    sellerType?: 'individual' | 'company';
    legalName?: string;
    taxId?: string;
    vatNumber?: string;
    address?: string;
    countryOfResidence?: string;
    dateOfBirth?: string;
}
interface SaveProfileRequest {
    shopId: string;
    profile: Dac7Profile;
}
export declare const saveDac7SellerProfile: import("firebase-functions/v2/https").CallableFunction<SaveProfileRequest, any, unknown>;
interface ShopIdRequest {
    shopId: string;
}
export declare const getDac7SellerProfile: import("firebase-functions/v2/https").CallableFunction<ShopIdRequest, any, unknown>;
interface OwnShopRequest {
    shopId: string;
}
export declare const getOwnDac7: import("firebase-functions/v2/https").CallableFunction<OwnShopRequest, any, unknown>;
interface CorrectContactRequest {
    shopId: string;
    contact: Partial<Record<typeof CONTACT_KEYS[number], string>>;
}
export declare const correctOwnDac7Contact: import("firebase-functions/v2/https").CallableFunction<CorrectContactRequest, any, unknown>;
interface RequestCorrectionRequest {
    shopId: string;
    field: string;
    requestedValue: string;
    note?: string;
}
export declare const requestDac7Correction: import("firebase-functions/v2/https").CallableFunction<RequestCorrectionRequest, any, unknown>;
interface ResolveCorrectionRequest {
    requestId: string;
    approve: boolean;
}
export declare const resolveDac7Correction: import("firebase-functions/v2/https").CallableFunction<ResolveCorrectionRequest, any, unknown>;
export declare const pullDac7FromStripe: import("firebase-functions/v2/https").CallableFunction<ShopIdRequest, any, unknown>;
interface AggregateRequest {
    shopId: string;
    year: number;
    sekToEurRate?: number;
}
export declare const aggregateDac7Year: import("firebase-functions/v2/https").CallableFunction<AggregateRequest, any, unknown>;
interface ExportRequest {
    year: number;
    sekToEurRate?: number;
    includeBelowDeMinimis?: boolean;
    markReported?: boolean;
}
export declare const exportDac7Report: import("firebase-functions/v2/https").CallableFunction<ExportRequest, any, unknown>;
export {};
