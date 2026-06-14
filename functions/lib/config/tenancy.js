"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SHOP_ID = void 0;
// Tenancy constants for Cloud Functions (server side).
//
// Mirrors src/config/tenancy.js DEFAULT_SHOP_ID. The two packages can't share
// code, so keep this value in sync with the client by hand. It is the fallback
// tenant id used when a request/metadata doesn't carry one — so a missing
// shopId can never produce an untagged order/doc. See
// docs/SUPERADMIN_TENANCY_PLAN.md Phase 1.
exports.DEFAULT_SHOP_ID = 'b8shield';
//# sourceMappingURL=tenancy.js.map