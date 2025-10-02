"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORS_OPTIONS = void 0;
const app_urls_1 = require("./app-urls");
exports.CORS_OPTIONS = {
    origin: app_urls_1.appUrls,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
};
//# sourceMappingURL=cors-config.js.map