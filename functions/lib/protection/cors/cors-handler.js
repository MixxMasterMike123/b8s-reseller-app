"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsHandler = void 0;
const app_urls_1 = require("../../config/app-urls");
const corsHandler = (request, response) => {
    const origin = request.headers.origin;
    // Allow requests from configured domains
    if (origin && isAllowedOrigin(origin)) {
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
function isAllowedOrigin(origin) {
    return app_urls_1.appUrls.CORS_ORIGINS.includes(origin);
}
//# sourceMappingURL=cors-handler.js.map