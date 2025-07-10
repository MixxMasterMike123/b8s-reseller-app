import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as nodemailer from 'nodemailer';
import { defineString } from 'firebase-functions/params';
import { EmailData } from './types';

// Initialize Firebase Admin
initializeApp();

// Runtime configuration parameters
const smtpHost = defineString('SMTP_HOST', { default: 'send.one.com' });
const smtpPort = defineString('SMTP_PORT', { default: '587' });
const smtpUser = defineString('SMTP_USER', { default: 'info@jphinnovation.se' });
const smtpPass = defineString('SMTP_PASS');

// Initialize Firestore with named database
export const db = getFirestore('b8s-reseller-db');
db.settings({ ignoreUndefinedProperties: true });

// Email constants
export const EMAIL_FROM = {
  b2b: '"B8Shield Återförsäljarportal" <info@jphinnovation.se>',
  affiliate: '"B8Shield Affiliate Program" <info@jphinnovation.se>',
  b2c: '"B8Shield Shop" <info@jphinnovation.se>',
  system: '"B8Shield System" <info@jphinnovation.se>',
  support: '"B8Shield Support" <info@jphinnovation.se>'
} as const;

// Initialize nodemailer transporter
export const createTransporter = () => nodemailer.createTransport({
  host: smtpHost.value(),
  port: parseInt(smtpPort.value()),
  secure: false,
  auth: {
    user: smtpUser.value(),
    pass: smtpPass.value()
  }
});

// Core email sending function
export const sendEmail = async (emailData: EmailData): Promise<void> => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: emailData.from || EMAIL_FROM.system,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Failed to send email');
  }
}; 