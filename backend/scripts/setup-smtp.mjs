/**
 * Interactive Gmail SMTP setup.
 * Run: npm run smtp:setup
 */
import { config } from 'dotenv';
import { resolve } from 'path';
import { createInterface } from 'readline';
import { writeFileSync } from 'fs';
import nodemailer from 'nodemailer';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local'), override: true });

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise((resolveAnswer) => rl.question(question, resolveAnswer));
}

async function main() {
  console.log('\n=== Trugo Sync - Gmail SMTP Setup ===\n');
  console.log('You need a Gmail App Password (not your login password).');
  console.log('Create one at: https://myaccount.google.com/apppasswords\n');

  const email =
    (await ask(`Gmail address [${process.env.SMTP_USER || 'your@gmail.com'}]: `)).trim() ||
    process.env.SMTP_USER ||
    '';

  const appPassword = (await ask('Gmail App Password (16 chars): ')).trim().replace(/\s/g, '');

  if (!email || !appPassword) {
    console.error('\nEmail and App Password are required.\n');
    rl.close();
    process.exit(1);
  }

  const rejectUnauthorized = process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false';
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: email, pass: appPassword },
    tls: { rejectUnauthorized },
  });

  console.log('\nVerifying SMTP connection...');
  try {
    await transporter.verify();
    console.log('SMTP connection verified successfully.\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('\nSMTP verification failed:', message);
    console.error('Double-check your App Password and try again.\n');
    rl.close();
    process.exit(1);
  }

  const secretPath = resolve(process.cwd(), 'smtp.secret');
  writeFileSync(secretPath, `${appPassword}\n`, 'utf8');
  console.log(`Saved App Password to ${secretPath}`);
  console.log('Restart the backend: npm run start:dev\n');

  rl.close();
}

main();
