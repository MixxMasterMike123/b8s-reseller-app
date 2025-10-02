"use strict";
// EmailService - Unified SMTP Service
// Extracted from V3 EmailService with Gmail SMTP configuration
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.EmailService = void 0;
var nodemailer = require("nodemailer");
var config_1 = require("../core/config");
var EmailService = /** @class */ (function () {
    function EmailService() {
        // Gmail SMTP Configuration (V3 Working Configuration)
        this.transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: 'b8shield.reseller@gmail.com',
                pass: 'rcfaridkvgluhzom' // Gmail App Password
            }
        });
        console.log('📧 EmailService: Initialized with Gmail SMTP');
    }
    /**
     * Send email using unified SMTP service
     */
    EmailService.prototype.sendEmail = function (template, options) {
        return __awaiter(this, void 0, void 0, function () {
            var textContent, mailOptions, result, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.log('📧 EmailService: Preparing to send email');
                        console.log('📧 EmailService: To:', options.to);
                        console.log('📧 EmailService: Subject:', template.subject);
                        // Validate template
                        if (!template.subject || !template.html) {
                            throw new Error('Email template missing required fields (subject or html)');
                        }
                        // Validate recipient
                        if (!options.to || !this.isValidEmail(options.to)) {
                            throw new Error('Invalid recipient email address');
                        }
                        textContent = template.text || this.htmlToText(template.html);
                        mailOptions = {
                            from: options.from || config_1.EMAIL_CONFIG.SMTP.FROM_EMAIL,
                            to: options.to,
                            subject: template.subject,
                            html: template.html,
                            text: textContent,
                            replyTo: options.replyTo || config_1.EMAIL_CONFIG.SMTP.REPLY_TO,
                            cc: options.cc,
                            bcc: options.bcc
                        };
                        console.log('📧 EmailService: Sending email via Gmail SMTP...');
                        return [4 /*yield*/, this.transporter.sendMail(mailOptions)];
                    case 1:
                        result = _a.sent();
                        console.log('✅ EmailService: Email sent successfully');
                        console.log('📧 EmailService: Message ID:', result.messageId);
                        return [2 /*return*/, {
                                success: true,
                                messageId: result.messageId
                            }];
                    case 2:
                        error_1 = _a.sent();
                        console.error('❌ EmailService: Failed to send email:', error_1);
                        return [2 /*return*/, {
                                success: false,
                                error: error_1 instanceof Error ? error_1.message : 'Unknown email error'
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Send email to admin addresses
     */
    EmailService.prototype.sendAdminEmail = function (template, options) {
        return __awaiter(this, void 0, void 0, function () {
            var adminEmails;
            return __generator(this, function (_a) {
                adminEmails = ['info@jphinnovation.se', 'micke.ohlen@gmail.com'];
                return [2 /*return*/, this.sendEmail(template, __assign(__assign({}, options), { to: adminEmails.join(', ') }))];
            });
        });
    };
    /**
     * Validate email address format (supports single email or comma-separated multiple emails)
     */
    EmailService.prototype.isValidEmail = function (email) {
        if (!email || email.trim() === '') {
            return false;
        }
        // Handle comma-separated emails
        var emails = email.split(',').map(function (e) { return e.trim(); });
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        // All emails must be valid
        return emails.every(function (e) { return emailRegex.test(e); });
    };
    /**
     * Convert HTML to plain text
     */
    EmailService.prototype.htmlToText = function (html) {
        // Handle undefined or null HTML
        if (!html || typeof html !== 'string') {
            console.warn('⚠️ EmailService: htmlToText received invalid HTML:', typeof html);
            return '';
        }
        // Simple HTML to text conversion
        return html
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    };
    /**
     * Test SMTP connection
     */
    EmailService.prototype.testConnection = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.log('🧪 EmailService: Testing SMTP connection...');
                        return [4 /*yield*/, this.transporter.verify()];
                    case 1:
                        _a.sent();
                        console.log('✅ EmailService: SMTP connection successful');
                        return [2 /*return*/, { success: true }];
                    case 2:
                        error_2 = _a.sent();
                        console.error('❌ EmailService: SMTP connection failed:', error_2);
                        return [2 /*return*/, {
                                success: false,
                                error: error_2 instanceof Error ? error_2.message : 'Connection test failed'
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return EmailService;
}());
exports.EmailService = EmailService;
