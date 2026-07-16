/**
 * Verify Gmail SMTP settings. Run: npm run smtp:verify
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import nodemailer from 'nodemailer';

config({ path: resolve(process.cwd(), '.env') });

const placeholders = new Set([
  'your-email@gmail.com',
  'your-gmail-app-password',
  'REPLACE_WITH_APP_PASSWORD',
  'REPLACE_WITH_YOUR_GMAIL_APP_PASSWORD',
  '',
]);

async function main() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;

  if (
    !SMTP_HOST ||
    !SMTP_USER ||
    !SMTP_PASS ||
    placeholders.has(SMTP_USER.trim()) ||
    placeholders.has(SMTP_PASS.trim())
  ) {
    console.error('\nSet SMTP_PASS in backend/.env to your Gmail App Password.');
    console.error('https://myaccount.google.com/apppasswords\n');
    process.exit(1);
  }

  const rejectUnauthorized = process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false';
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized },
  });

  try {
    await transporter.verify();
    console.log('\nSMTP verified. Sender:', SMTP_USER, '\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('\nSMTP failed:', message, '\n');
    process.exit(1);
  }
}

main();
