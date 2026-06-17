/**
 * Keep a user's Auth custom claims ({role, shopId, platform}) in sync with their
 * Firestore users/{uid} doc — on every write — and REVOKE refresh tokens on any
 * privilege reduction so a stale token can't retain access.
 *
 * Why: the security rules + Storage rules trust the custom claims (token.shopId /
 * token.platform) for tenant isolation. Claims were previously set only by
 * createShopUser (on provision) and syncAdminClaims (a manual maintenance HTTP
 * call). So demoting an admin (platform true→false), moving their shopId, or
 * un-admining them left the OLD claim live in their token for up to ~1h (token
 * TTL) — a cross-tenant / privilege-retention window, worst on Storage (claim is
 * the SOLE authority there). This trigger closes that window. (See
 * docs/TENANT_ISOLATION_HARDENING_PLAN.md.)
 *
 * Scope: acts only for users who ARE or WERE an admin (role=='admin'). Plain
 * B2B/B2C users (the bulk of the collection) get no claims and are skipped, so
 * this is cheap. Idempotent: skips when claims already match.
 */
export declare const syncUserClaimsOnWrite: import("firebase-functions").CloudFunction<import("firebase-functions/v2/firestore").FirestoreEvent<import("firebase-functions").Change<import("firebase-functions/v2/firestore").DocumentSnapshot> | undefined, {
    userId: string;
}>>;
