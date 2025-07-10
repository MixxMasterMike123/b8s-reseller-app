import * as nodemailer from 'nodemailer';
import { EmailData } from './types';
export declare const db: FirebaseFirestore.Firestore;
export declare const EMAIL_FROM: {
    readonly b2b: "\"B8Shield Återförsäljarportal\" <info@jphinnovation.se>";
    readonly affiliate: "\"B8Shield Affiliate Program\" <info@jphinnovation.se>";
    readonly b2c: "\"B8Shield Shop\" <info@jphinnovation.se>";
    readonly system: "\"B8Shield System\" <info@jphinnovation.se>";
    readonly support: "\"B8Shield Support\" <info@jphinnovation.se>";
};
export declare const createTransporter: () => nodemailer.Transporter<import("nodemailer/lib/smtp-transport").SentMessageInfo, import("nodemailer/lib/smtp-transport").Options>;
export declare const sendEmail: (emailData: EmailData) => Promise<void>;
