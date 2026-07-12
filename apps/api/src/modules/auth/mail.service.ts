import nodemailer, { type Transporter } from 'nodemailer';
import { env, isProd } from '../../config/env.js';
import { logger } from '../../core/logger.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

/**
 * Transactional email. In development the reset link is logged so the flow is
 * testable without a real inbox (pair with MailHog on :1025). Delivery failures
 * are logged, never thrown — the caller must not learn whether an address exists.
 */
export const mailService = {
  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    if (!isProd) {
      logger.info({ to, resetUrl }, '📧 [dev] Password reset link');
    }
    try {
      await getTransporter().sendMail({
        from: env.MAIL_FROM,
        to,
        subject: 'Reset your AssetFlow password',
        text: `You requested a password reset.\n\nReset it here (valid for 30 minutes):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
        html: `<p>You requested a password reset.</p>
<p><a href="${resetUrl}">Reset your password</a> (valid for 30 minutes).</p>
<p>If you didn't request this, you can safely ignore this email.</p>`,
      });
    } catch (err) {
      logger.error({ err, to }, 'Failed to send password reset email');
    }
  },
};
