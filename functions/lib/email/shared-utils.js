"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleError = exports.generateTemporaryPassword = exports.createEmailData = exports.appUrls = exports.FieldValue = exports.getEmail = exports.EMAIL_FROM = exports.db = exports.sendEmail = exports.auth = void 0;
const firestore_1 = require("firebase-admin/firestore");
Object.defineProperty(exports, "FieldValue", { enumerable: true, get: function () { return firestore_1.FieldValue; } });
const auth_1 = require("firebase-admin/auth");
const app_urls_1 = require("../config/app-urls");
Object.defineProperty(exports, "appUrls", { enumerable: true, get: function () { return app_urls_1.appUrls; } });
const email_handler_1 = require("./email-handler");
Object.defineProperty(exports, "sendEmail", { enumerable: true, get: function () { return email_handler_1.sendEmail; } });
Object.defineProperty(exports, "db", { enumerable: true, get: function () { return email_handler_1.db; } });
Object.defineProperty(exports, "EMAIL_FROM", { enumerable: true, get: function () { return email_handler_1.EMAIL_FROM; } });
const emails_1 = require("../../emails");
Object.defineProperty(exports, "getEmail", { enumerable: true, get: function () { return emails_1.getEmail; } });
// Get Firebase Auth from default app (initialized in email-handler.ts)
exports.auth = (0, auth_1.getAuth)();
// Helper function to create email data
function createEmailData(to, from, template, params) {
    return {
        to,
        from,
        subject: template.subject,
        html: template.html,
        text: template.text,
        ...params
    };
}
exports.createEmailData = createEmailData;
// Helper function to generate temporary password
async function generateTemporaryPassword() {
    try {
        // Use DinoPass API for strong password generation
        const fetch = (await Promise.resolve().then(() => __importStar(require('node-fetch')))).default;
        const response = await fetch('http://www.dinopass.com/password/strong');
        if (response.ok) {
            const password = await response.text();
            return password.trim();
        }
        else {
            throw new Error('DinoPass API request failed');
        }
    }
    catch (error) {
        console.error('DinoPass API failed, falling back to local generation:', error);
        // Fallback to Swedish-friendly local generation if DinoPass API fails
        const adjectives = ['Blå', 'Grön', 'Röd', 'Gul', 'Stark', 'Snabb', 'Smart', 'Stor'];
        const nouns = ['Fisk', 'Bete', 'Vatten', 'Sjö', 'Hav', 'Spö', 'Rulle', 'Krok'];
        const numbers = Math.floor(Math.random() * 9000) + 1000; // 4-digit number
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        return `${adjective}${noun}${numbers}`;
    }
}
exports.generateTemporaryPassword = generateTemporaryPassword;
// Error handling helper
function handleError(error) {
    const functions = require('firebase-functions');
    if (error instanceof Error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
    throw new functions.https.HttpsError('internal', 'An unknown error occurred');
}
exports.handleError = handleError;
//# sourceMappingURL=shared-utils.js.map