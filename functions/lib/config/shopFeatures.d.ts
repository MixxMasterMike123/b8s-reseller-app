/**
 * Is `key` enabled for `shopId`? Default-ON: true unless the flag is the literal
 * boolean false. Fails OPEN (returns true) on a missing doc or a read error, so
 * a transient Firestore problem never disables a paid feature mid-checkout.
 */
export declare const isShopFeatureEnabled: (shopId: string | undefined, key: string) => Promise<boolean>;
