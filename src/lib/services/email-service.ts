/**
 * Email Service
 * Story: 14.1 - ÖMC + Masterdata Completion Follow-up
 * 
 * Handles sending email notifications via SMTP.
 * 
 * CRITICAL: Contact rasmus.thunborg@enhancior.se for mail server credentials
 * before using this service in production.
 */

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

function isEmailDeliveryDisabled() {
  return process.env.DISABLE_EMAIL_DELIVERY === 'true';
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
  if (isEmailDeliveryDisabled()) {
    console.log('[Email Service] Email delivery disabled; skipping SMTP send:', {
      to: options.to,
      subject: options.subject,
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

    console.log('[Email Service] Email sent successfully:', {
      messageId: info.messageId,
      to: recipients,
      subject: options.subject,
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

  for (const recipient of recipients) {
    const result = await sendEmail({
      to: recipient,
      subject,
      text,
      html,
    });
    results.push(result);
    
    // Add a small delay between emails to avoid rate limiting (especially with Gmail)
    if (!isEmailDeliveryDisabled()) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

