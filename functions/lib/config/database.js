"use strict";
// Database configuration for Firebase Functions
// Centralized database access using named database
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
// Use the named database consistently across all functions
exports.db = (0, firestore_1.getFirestore)((0, app_1.getApp)(), 'b8s-reseller-db');
//# sourceMappingURL=database.js.map