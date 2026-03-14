import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { getHrAdminEmails } from './notification-helpers';
import { sendEmail } from './email-service';
import { t as translations } from '@/lib/i18n';
import type { StaffingLocation } from '@/lib/types/staffing-needs';

const STOCKHOLM_TZ = 'Europe/Stockholm';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sends email notification to HR users when a staffing need is updated.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function sendStaffingNeedsUpdateEmail(
  location: StaffingLocation,
  oldValue: number,
  newValue: number,
  changedByEmail: string
): Promise<void> {
  try {
    if (oldValue === newValue) return;

    const allRecipients = await getHrAdminEmails();
    const recipients = allRecipients.filter(
      (email) => email.toLowerCase() !== changedByEmail.toLowerCase()
    );

    if (recipients.length === 0) return;

    const now = new Date();
    const stockholmNow = toZonedTime(now, STOCKHOLM_TZ);
    const formattedTimestamp = formatTz(stockholmNow, 'yyyy-MM-dd HH:mm', {
      timeZone: STOCKHOLM_TZ,
    });

    const i18n = translations.staffingNeeds;

    const subject = `${i18n.emailSubject.replace('{location}', location)}`;

    const text = `${i18n.emailHeading}

${i18n.emailLocation}: ${location}
${i18n.emailOldValue}: ${oldValue}
${i18n.emailNewValue}: ${newValue}
${i18n.emailChangedBy}: ${changedByEmail}
${i18n.emailTimestamp}: ${formattedTimestamp}`;

    const safeLocation = escapeHtml(location);
    const safeEmail = escapeHtml(changedByEmail);

    const html = `
<div style="font-family: sans-serif; max-width: 600px;">
  <h2 style="color: #1a1a1a;">${escapeHtml(i18n.emailHeading)}</h2>
  <table style="border-collapse: collapse; width: 100%;">
    <tr><td style="padding: 8px; font-weight: bold;">${escapeHtml(i18n.emailLocation)}:</td><td style="padding: 8px;">${safeLocation}</td></tr>
    <tr><td style="padding: 8px; font-weight: bold;">${escapeHtml(i18n.emailOldValue)}:</td><td style="padding: 8px;">${oldValue}</td></tr>
    <tr><td style="padding: 8px; font-weight: bold;">${escapeHtml(i18n.emailNewValue)}:</td><td style="padding: 8px;">${newValue}</td></tr>
    <tr><td style="padding: 8px; font-weight: bold;">${escapeHtml(i18n.emailChangedBy)}:</td><td style="padding: 8px;">${safeEmail}</td></tr>
    <tr><td style="padding: 8px; font-weight: bold;">${escapeHtml(i18n.emailTimestamp)}:</td><td style="padding: 8px;">${escapeHtml(formattedTimestamp)}</td></tr>
  </table>
</div>`.trim();

    await sendEmail({ to: recipients, subject, text, html });
  } catch (error) {
    console.error(
      `[Staffing Notification] Failed to send email for ${location}:`,
      error
    );
  }
}
