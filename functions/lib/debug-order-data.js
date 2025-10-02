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
exports.debugOrderData = void 0;
var https_1 = require("firebase-functions/v2/https");
var database_1 = require("./config/database");
exports.debugOrderData = (0, https_1.onRequest)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: true
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var ordersSnapshot, orderDoc, orderData, debugInfo, error_1;
    var _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 2, , 3]);
                console.log('🔍 DEBUG: Fetching recent B2C order...');
                return [4 /*yield*/, database_1.db.collection('orders')
                        .where('source', '==', 'b2c')
                        .orderBy('createdAt', 'desc')
                        .limit(1)
                        .get()];
            case 1:
                ordersSnapshot = _d.sent();
                if (ordersSnapshot.empty) {
                    res.json({ error: 'No B2C orders found' });
                    return [2 /*return*/];
                }
                orderDoc = ordersSnapshot.docs[0];
                orderData = orderDoc.data();
                console.log('🔍 DEBUG: Order found:', orderDoc.id);
                console.log('🔍 DEBUG: Order items:', JSON.stringify(orderData.items, null, 2));
                debugInfo = {
                    orderId: orderDoc.id,
                    orderNumber: orderData.orderNumber,
                    source: orderData.source,
                    itemCount: ((_a = orderData.items) === null || _a === void 0 ? void 0 : _a.length) || 0,
                    items: ((_b = orderData.items) === null || _b === void 0 ? void 0 : _b.map(function (item, index) { return ({
                        index: index,
                        name: item.name,
                        color: item.color,
                        size: item.size,
                        sku: item.sku,
                        quantity: item.quantity,
                        price: item.price,
                        colorType: typeof item.color,
                        sizeType: typeof item.size,
                        hasColor: !!item.color,
                        hasSize: !!item.size,
                        rawItem: item
                    }); })) || [],
                    customerEmail: (_c = orderData.customerInfo) === null || _c === void 0 ? void 0 : _c.email,
                    createdAt: orderData.createdAt
                };
                res.json({
                    success: true,
                    debug: debugInfo,
                    fullOrderData: orderData
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _d.sent();
                console.error('🔍 DEBUG ERROR:', error_1);
                res.status(500).json({
                    success: false,
                    error: error_1 instanceof Error ? error_1.message : 'Unknown error'
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
