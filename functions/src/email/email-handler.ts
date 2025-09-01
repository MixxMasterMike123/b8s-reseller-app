import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as nodemailer from 'nodemailer';
import { defineString } from 'firebase-functions/params';
import { EmailData } from './types';

// Initialize Firebase Admin
initializeApp();

// Runtime configuration parameters (Gmail SMTP)
const smtpHost = defineString('SMTP_HOST', { default: 'smtp.gmail.com' });
const smtpPort = defineString('SMTP_PORT', { default: '587' });
const smtpUser = defineString('SMTP_USER', { default: 'b8shield.reseller@gmail.com' });
const smtpPass = defineString('SMTP_PASS'); // Gmail App Password required

// Initialize Firestore with named database
export const db = getFirestore('b8s-reseller-db');
db.settings({ ignoreUndefinedProperties: true });

// Email constants
export const EMAIL_FROM = {
  b2b: '"B8Shield Återförsäljarportal" <b8shield.reseller@gmail.com>',
  affiliate: '"B8Shield Affiliate Program" <b8shield.reseller@gmail.com>',
  b2c: '"B8Shield Shop" <b8shield.reseller@gmail.com>',
  system: '"B8Shield System" <b8shield.reseller@gmail.com>',
  support: '"B8Shield Support" <b8shield.reseller@gmail.com>'
} as const;

// Admin notification recipients
export const ADMIN_EMAILS = 'info@jphinnovation.se, micke.ohlen@gmail.com';

// Initialize nodemailer transporter
export const createTransporter = () => nodemailer.createTransport({
  host: smtpHost.value(),
  port: parseInt(smtpPort.value()),
  secure: false, // Use TLS (STARTTLS) for port 587
  auth: {
    user: smtpUser.value(),
    pass: smtpPass.value()
  },
  tls: {
    rejectUnauthorized: false // Allow Gmail's certificate
  }
});

// Core email sending function
export const sendEmail = async (emailData: EmailData): Promise<void> => {
  try {
    console.log(`🔧 SMTP Config - Host: ${smtpHost.value()}, Port: ${smtpPort.value()}, User: ${smtpUser.value()}`);
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