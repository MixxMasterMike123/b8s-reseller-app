/** 32 random bytes as a URL-safe base64 string (no padding). */
export declare function generateToken(): string;
/** SHA-256 (hex) of the already-normalized email. */
export declare function emailHash(emailNorm: string): string;
/** Deterministic suppression doc id, per shop + normalized email. */
export declare function suppressionDocId(shopId: string, emailNorm: string): string;
