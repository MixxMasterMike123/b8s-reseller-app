import * as nodemailer from 'nodemailer';
import { EmailData } from './types';
export declare const db: FirebaseFirestore.Firestore;
export declare const EMAIL_FROM: {
    readonly b2b: "\"B8Shield Återförsäljarportal\" <b8shield.reseller@gmail.com>";
    readonly affiliate: "\"B8Shield Affiliate Program\" <b8shield.reseller@gmail.com>";
    readonly b2c: "\"B8Shield Shop\" <b8shield.reseller@gmail.com>";
    readonly system: "\"B8Shield System\" <b8shield.reseller@gmail.com>";
    readonly support: "\"B8Shield Support\" <b8shield.reseller@gmail.com>";
};
export declare const ADMIN_EMAILS = "info@jphinnovation.se, micke.ohlen@gmail.com";
export declare const createTransporter: () => nodemailer.Transporter<import("nodemailer/lib/smtp-transport").SentMessageInfo, import("nodemailer/lib/smtp-transport").Options>;
export declare const sendEmail: (emailData: EmailData) => Promise<void>;
