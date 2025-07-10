"use strict";
// Affiliate System V2 Functions
// Modular structure with individual files for each function
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAffiliateConversionV2 = exports.logAffiliateClickHttpV2 = exports.logAffiliateClickV2 = void 0;
// Export all types
__exportStar(require("./types"), exports);
// Export callable functions (V2 names to avoid V1 conflicts)
var logAffiliateClick_1 = require("./callable/logAffiliateClick");
Object.defineProperty(exports, "logAffiliateClickV2", { enumerable: true, get: function () { return logAffiliateClick_1.logAffiliateClickV2; } });
// Export HTTP functions (V2 names to avoid V1 conflicts)
var logAffiliateClickHttp_1 = require("./http/logAffiliateClickHttp");
Object.defineProperty(exports, "logAffiliateClickHttpV2", { enumerable: true, get: function () { return logAffiliateClickHttp_1.logAffiliateClickHttpV2; } });
// Export triggers (V2 names to avoid V1 conflicts)
var processAffiliateConversion_1 = require("./triggers/processAffiliateConversion");
Object.defineProperty(exports, "processAffiliateConversionV2", { enumerable: true, get: function () { return processAffiliateConversion_1.processAffiliateConversionV2; } });
// Note: approveAffiliate is handled in the email functions module
// as it's primarily an email-sending function with affiliate creation as a side effect 
//# sourceMappingURL=index.js.map