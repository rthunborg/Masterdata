/**
 * Email Service
 * Story: 14.1 - ÖMC + Masterdata Completion Follow-up
 *
 * Handles sending email notifications via SMTP.
 *
 * CRITICAL: Contact rasmus.thunborg@enhancior.se for mail server credentials
 * before using this service in production.
 */

import { isNonProductionExecution, isTruthyFlag } from '@/lib/env/is-non-production';

type EmailEnv = Record<string, string | undefined>;

/**
 * Email sending options
 */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

/**
 * Email sending result
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Decide whether outbound email delivery must be suppressed.
 *
 * Fail-safe by design (Story 22.11): non-production runtimes suppress delivery
 * by default so restored/test data can never trigger real notification emails.
 * Pure and env-injectable for hermetic unit testing.
 *
 * Precedence:
 *   1. DISABLE_EMAIL_DELIVERY truthy -> suppress (kill-switch, ANY environment,
 *      including production — preserves the existing manual kill-switch).
 *   2. non-production runtime:
 *        - EMAIL_DELIVERY_OVERRIDE truthy -> deliver (local Mailpit capture).
 *        - otherwise               -> suppress (fail-safe default).
 *   3. production -> deliver.
 */
export function shouldSuppressEmailDelivery(
  env: EmailEnv = process.env
): { suppress: boolean; reason: string } {
  if (isTruthyFlag(env.DISABLE_EMAIL_DELIVERY)) {
    return { suppress: true, reason: 'kill-switch' };
  }

  if (isNonProductionExecution(env)) {
    if (isTruthyFlag(env.EMAIL_DELIVERY_OVERRIDE)) {
      return { suppress: false, reason: 'non-production-override' };
    }
    return { suppress: true, reason: 'non-production-failsafe' };
  }

  return { suppress: false, reason: 'production' };
}

/**
 * Count recipient addresses for PII-free logging.
 *
 * Accepts the same shapes nodemailer does — a single address, a
 * comma-separated string, or an array (whose elements may themselves be
 * comma-separated) — and returns the number of non-empty addresses without
 * exposing any address.
 */
function countRecipients(to: string | string[]): number {
  const parts = Array.isArray(to) ? to : [to];
  return parts
    .flatMap((part) => part.split(','))
    .map((address) => address.trim())
    .filter((address) => address.length > 0).length;
}

/**
 * Send email via SMTP
 * 
 * Uses environment variables for SMTP configuration:
 * - SMTP_HOST: SMTP server hostname
 * - SMTP_PORT: SMTP server port (default: 587)
 * - SMTP_USER: SMTP username
 * - SMTP_PASSWORD: SMTP password
 * - SMTP_FROM: Sender email address (default: noreply@enhancior.se)
 * - SMTP_SECURE: Use TLS (default: false, uses STARTTLS on port 587)
 * 
 * @param options - Email options
 * @returns Email sending result
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const { suppress, reason } = shouldSuppressEmailDelivery();
  if (suppress) {
    // PII-free: log recipient COUNT and suppression reason only — never the
    // recipient addresses, subject, or body (AC2).
    const recipientCount = countRecipients(options.to);
    console.log('[Email Service] Email delivery suppressed; skipping SMTP send:', {
      recipientCount,
      reason,
    });
    return {
      success: true,
      messageId: 'email-delivery-disabled',
    };
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpFrom = process.env.SMTP_FROM || 'noreply@enhancior.se';
  const smtpSecure = process.env.SMTP_SECURE === 'true';

  // Validate required configuration
  if (!smtpHost || !smtpUser || !smtpPassword) {
    const error = 'SMTP configuration missing. Required: SMTP_HOST, SMTP_USER, SMTP_PASSWORD';
    console.error('[Email Service]', error);
    return {
      success: false,
      error,
    };
  }

  // Convert to array if single email
  const recipients = Array.isArray(options.to) ? options.to : [options.to];

  try {
    // Import nodemailer dynamically to avoid issues if not available
    const nodemailer = await import('nodemailer');
    
    // Create SMTP transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      // For port 587, use STARTTLS (secure: false)
      // For port 465, use SSL/TLS (secure: true)
    });

    // Send email to all recipients
    const mailOptions = {
      from: smtpFrom,
      to: recipients.join(', '),
      subject: options.subject,
      text: options.text,
      html: options.html || options.text,
    };

    const info = await transporter.sendMail(mailOptions);

    // PII-free: log messageId and recipient COUNT only (not addresses/subject).
    console.log('[Email Service] Email sent successfully:', {
      messageId: info.messageId,
      recipientCount: countRecipients(options.to),
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email Service] Failed to send email:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send email to multiple recipients
 * 
 * @param recipients - Array of email addresses
 * @param subject - Email subject
 * @param text - Email text content
 * @param html - Optional HTML content
 * @returns Array of email results (one per recipient)
 */
export async function sendEmailToMultiple(
  recipients: string[],
  subject: string,
  text: string,
  html?: string
): Promise<EmailResult[]> {
  const results: EmailResult[] = [];

  // When delivery is suppressed there is no real SMTP send, so skip the
  // inter-send rate-limit delay (otherwise a suppressed batch would sleep 1s
  // per recipient for no reason).
  const deliveryActive = !shouldSuppressEmailDelivery().suppress;

  for (const recipient of recipients) {
    const result = await sendEmail({
      to: recipient,
      subject,
      text,
      html,
    });
    results.push(result);

    // Add a small delay between emails to avoid rate limiting (especially with Gmail)
    if (deliveryActive) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

