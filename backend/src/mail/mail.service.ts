import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendMailResult {
  sent: boolean;
  error?: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  onModuleInit() {
    if (this.isSmtpConfigured()) {
      this.transporter = this.createTransporter();
      this.transporter
        .verify()
        .then(() => this.logger.log('SMTP connection verified successfully'))
        .catch((err) =>
          this.logger.error(`SMTP connection failed: ${err.message}`),
        );
    } else {
      this.logger.warn(
        'SMTP_PASS not set in backend/.env — reset links will be logged in this terminal only.',
      );
    }
  }

  private isPlaceholder(value?: string): boolean {
    if (!value) return true;
    const placeholders = [
      'your-email@gmail.com',
      'your-gmail-app-password',
      'REPLACE_WITH_APP_PASSWORD',
      'REPLACE_WITH_YOUR_GMAIL_APP_PASSWORD',
    ];
    return placeholders.includes(value.trim());
  }

  isSmtpConfigured(): boolean {
    return Boolean(
      process.env.SMTP_HOST &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS &&
        !this.isPlaceholder(process.env.SMTP_USER) &&
        !this.isPlaceholder(process.env.SMTP_PASS),
    );
  }

  private createTransporter(): Transporter {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const rejectUnauthorized =
      process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false';

    if (host === 'smtp.gmail.com') {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
        tls: { rejectUnauthorized },
      });
    }

    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === 'true';

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized,
      },
      requireTLS: !secure && port === 587,
    });
  }

  private resolveRecipient(originalTo: string): {
    to: string;
    forwarded: boolean;
  } {
    const smtpUser = process.env.SMTP_USER?.trim();
    const forwardDev =
      originalTo.endsWith('@trugosync.com') &&
      smtpUser &&
      originalTo !== smtpUser;

    if (forwardDev) {
      return { to: smtpUser, forwarded: true };
    }

    return { to: originalTo, forwarded: false };
  }

  async sendPasswordResetEmail(
    to: string,
    resetLink: string,
  ): Promise<SendMailResult> {
    if (!this.isSmtpConfigured()) {
      this.logger.warn(`[DEV] Password reset for ${to}: ${resetLink}`);
      return { sent: false };
    }

    const { to: deliverTo, forwarded } = this.resolveRecipient(to);
    const from =
      process.env.SMTP_FROM ||
      `Trugo Sync <${process.env.SMTP_USER || 'noreply@trugosync.com'}>`;

    const transporter = this.transporter || this.createTransporter();
    const forwardNote = forwarded
      ? `<p style="font-size:12px;color:#666;">Password reset requested for <strong>${to}</strong>.</p>`
      : '';

    try {
      await transporter.sendMail({
        from,
        to: deliverTo,
        subject: forwarded
          ? `Trugo Sync - Password Reset for ${to}`
          : 'Trugo Sync - Password Reset',
        text: `You requested a password reset.\n\nOpen this link to create a new password:\n${resetLink}\n\nThis link expires in 1 hour.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px;">
            <h2 style="color: #ff9800;">Trugo Sync</h2>
            ${forwardNote}
            <p>Click below to create your new password:</p>
            <p>
              <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#ff9800;color:#fff;text-decoration:none;border-radius:8px;">
                Create New Password
              </a>
            </p>
            <p style="font-size:12px;color:#666;">This link expires in 1 hour. Older reset emails will not work after you request a new one.</p>
          </div>
        `,
      });

      this.logger.log(
        forwarded
          ? `Reset email for ${to} delivered to ${deliverTo}`
          : `Reset email sent to ${deliverTo}`,
      );
      return { sent: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send email to ${to}: ${message}`);
      this.logger.warn(`[FALLBACK] Password reset for ${to}: ${resetLink}`);
      return { sent: false, error: message };
    }
  }
}
