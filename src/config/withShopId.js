// withShopId — the single place that stamps the tenant id onto a document
// before it is written. Every CLIENT-side create of shop-scoped data passes its
// payload through this so the `shopId` field is added consistently and can't be
// forgotten or spelled differently at individual call sites.
//
// Usage (in a component/hook that has the shopId from useShopId()):
//   await addDoc(collection(db, 'products'), withShopId(productData, shopId));
//
// Server-side creates (Cloud Functions) do NOT use this — they derive shopId
// from their own trusted inputs (e.g. PaymentIntent metadata) and stamp it
// directly, since they have no React context.
import { DEFAULT_SHOP_ID } from './tenancy';

/**
 * Return a shallow copy of `data` with `shopId` set.
 * @param {object} data - the document payload to be written
 * @param {string} [shopId] - resolved tenant id (from useShopId()); falls back
 *   to DEFAULT_SHOP_ID so a missing context can never write an untagged doc.
 * @returns {object} data + { shopId }
 */
export const withShopId = (data, shopId) => ({
  ...data,
  shopId: shopId || DEFAULT_SHOP_ID,
});
