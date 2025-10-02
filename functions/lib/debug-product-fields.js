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
exports.debugProductFields = void 0;
var https_1 = require("firebase-functions/v2/https");
var database_1 = require("./config/database");
exports.debugProductFields = (0, https_1.onRequest)({
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    cors: true
}, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var productId, productRef, productSnap, productData, cartItem, hasColorSize, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                productId = 'GvAc6NCtubvgE0edJBGS';
                console.log("\uD83D\uDD0D DEBUG: Testing product fields for: ".concat(productId));
                productRef = database_1.db.collection('products').doc(productId);
                return [4 /*yield*/, productRef.get()];
            case 1:
                productSnap = _a.sent();
                if (!productSnap.exists) {
                    res.json({ error: 'Product not found' });
                    return [2 /*return*/];
                }
                productData = productSnap.data();
                console.log('✅ DEBUG: Product found!');
                console.log('🔍 DEBUG: Product color:', productData === null || productData === void 0 ? void 0 : productData.color, '(type:', typeof (productData === null || productData === void 0 ? void 0 : productData.color), ')');
                console.log('🔍 DEBUG: Product size:', productData === null || productData === void 0 ? void 0 : productData.size, '(type:', typeof (productData === null || productData === void 0 ? void 0 : productData.size), ')');
                console.log('🔍 DEBUG: Product name:', productData === null || productData === void 0 ? void 0 : productData.name);
                console.log('🔍 DEBUG: Product sku:', productData === null || productData === void 0 ? void 0 : productData.sku);
                // Test cart logic
                console.log('\n🧪 DEBUG: Testing cart logic:');
                cartItem = {
                    id: (productData === null || productData === void 0 ? void 0 : productData.id) || productId,
                    name: productData === null || productData === void 0 ? void 0 : productData.name,
                    price: (productData === null || productData === void 0 ? void 0 : productData.b2cPrice) || (productData === null || productData === void 0 ? void 0 : productData.basePrice),
                    sku: productData === null || productData === void 0 ? void 0 : productData.sku,
                    color: (productData === null || productData === void 0 ? void 0 : productData.color) || null,
                    size: (productData === null || productData === void 0 ? void 0 : productData.size) || null,
                    quantity: 1
                };
                console.log('🔍 DEBUG: Cart item would be:', JSON.stringify(cartItem, null, 2));
                hasColorSize = cartItem.color && cartItem.size;
                console.log(hasColorSize ? '✅ SUCCESS: Cart item has both color and size fields!' : '❌ PROBLEM: Cart item is missing color and/or size fields');
                res.json({
                    success: true,
                    productData: {
                        id: productId,
                        color: productData === null || productData === void 0 ? void 0 : productData.color,
                        size: productData === null || productData === void 0 ? void 0 : productData.size,
                        name: productData === null || productData === void 0 ? void 0 : productData.name,
                        sku: productData === null || productData === void 0 ? void 0 : productData.sku
                    },
                    cartItem: cartItem,
                    hasColorSize: hasColorSize
                });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error('❌ DEBUG: Error testing product fields:', error_1);
                res.status(500).json({ success: false, error: error_1.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
