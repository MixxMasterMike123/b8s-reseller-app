"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.logAffiliateClickV2 = void 0;
var https_1 = require("firebase-functions/v2/https");
var firestore_1 = require("firebase-admin/firestore");
var app_1 = require("firebase-admin/app");
/**
 * Log affiliate link click (Callable version)
 * Called when a user clicks an affiliate link
 */
exports.logAffiliateClickV2 = (0, https_1.onCall)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60
}, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var db, data, affiliateCode, campaignCode, affiliatesRef, q, affiliateSnapshot, affiliateDoc, clickRef, campaignsRef, campaignQuery, campaignSnapshot, campaignDoc, campaignError_1, error_1;
    var _a, _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                db = (0, firestore_1.getFirestore)((0, app_1.getApp)(), 'b8s-reseller-db');
                data = request.data;
                affiliateCode = data.affiliateCode, campaignCode = data.campaignCode;
                if (!affiliateCode) {
                    throw new Error('The function must be called with an affiliateCode.');
                }
                _f.label = 1;
            case 1:
                _f.trys.push([1, 12, , 13]);
                affiliatesRef = db.collection('affiliates');
                q = affiliatesRef.where('affiliateCode', '==', affiliateCode).where('status', '==', 'active');
                return [4 /*yield*/, q.get()];
            case 2:
                affiliateSnapshot = _f.sent();
                if (affiliateSnapshot.empty) {
                    throw new Error("No active affiliate found for code: ".concat(affiliateCode));
                }
                affiliateDoc = affiliateSnapshot.docs[0];
                return [4 /*yield*/, db.collection('affiliateClicks').add({
                        affiliateCode: affiliateCode,
                        affiliateId: affiliateDoc.id,
                        campaignCode: campaignCode || null,
                        timestamp: firestore_1.Timestamp.now(),
                        ipAddress: ((_a = request.rawRequest) === null || _a === void 0 ? void 0 : _a.ip) || 'unknown',
                        userAgent: ((_c = (_b = request.rawRequest) === null || _b === void 0 ? void 0 : _b.headers) === null || _c === void 0 ? void 0 : _c['user-agent']) || 'unknown',
                        landingPage: ((_e = (_d = request.rawRequest) === null || _d === void 0 ? void 0 : _d.headers) === null || _e === void 0 ? void 0 : _e.referer) || 'unknown',
                        converted: false
                    })];
            case 3:
                clickRef = _f.sent();
                // Update affiliate stats
                return [4 /*yield*/, affiliateDoc.ref.update({
                        'stats.clicks': firestore_1.FieldValue.increment(1)
                    })];
            case 4:
                // Update affiliate stats
                _f.sent();
                if (!campaignCode) return [3 /*break*/, 11];
                _f.label = 5;
            case 5:
                _f.trys.push([5, 10, , 11]);
                campaignsRef = db.collection('campaigns');
                campaignQuery = campaignsRef.where('code', '==', campaignCode);
                return [4 /*yield*/, campaignQuery.get()];
            case 6:
                campaignSnapshot = _f.sent();
                if (!!campaignSnapshot.empty) return [3 /*break*/, 8];
                campaignDoc = campaignSnapshot.docs[0];
                return [4 /*yield*/, campaignDoc.ref.update({
                        'totalClicks': firestore_1.FieldValue.increment(1)
                    })];
            case 7:
                _f.sent();
                console.log("Campaign click logged for campaign ".concat(campaignCode));
                return [3 /*break*/, 9];
            case 8:
                console.warn("Campaign not found for code: ".concat(campaignCode));
                _f.label = 9;
            case 9: return [3 /*break*/, 11];
            case 10:
                campaignError_1 = _f.sent();
                console.error("Error updating campaign stats for ".concat(campaignCode, ":"), campaignError_1);
                return [3 /*break*/, 11];
            case 11:
                console.log("Click logged for affiliate ".concat(affiliateCode).concat(campaignCode ? " with campaign ".concat(campaignCode) : '', ", clickId: ").concat(clickRef.id));
                return [2 /*return*/, {
                        success: true,
                        message: "Click logged for affiliate ".concat(affiliateCode),
                        clickId: clickRef.id
                    }];
            case 12:
                error_1 = _f.sent();
                console.error("Error logging affiliate click for code ".concat(affiliateCode, ":"), error_1);
                throw new Error('Error logging affiliate click.');
            case 13: return [2 /*return*/];
        }
    });
}); });
