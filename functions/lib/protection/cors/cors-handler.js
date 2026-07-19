"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsHandler = void 0;
const app_urls_1 = require("../../config/app-urls");
const corsHandler = (request, response) => {
    const origin = request.headers.origin;
    // Allow requests from configured domains (static list + custom-domain regex)
    if (origin && app_urls_1.appUrls.isAllowedOrigin(origin)) {
        response.set('Access-Control-Allow-Origin', origin);
        response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        response.set('Access-Control-Allow-Credentials', 'true');
        return true;
    }
    response.status(403).json({ error: 'Unauthorized origin' });
    return false;
};
exports.corsHandler = corsHandler;
//# sourceMappingURL=cors-handler.js.map