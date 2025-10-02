"use strict";
exports.__esModule = true;
exports.corsHandler = void 0;
var app_urls_1 = require("../../config/app-urls");
var corsHandler = function (request, response) {
    var origin = request.headers.origin;
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
