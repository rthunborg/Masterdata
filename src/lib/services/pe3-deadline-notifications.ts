/**
 * PE3 Deadline Notifications Service
 * Story: 14.2 - PE3 Deadline Notifications (Submit / Cancel)
 * 
 * This service handles sending consolidated email notifications to HR admins
 * on PE3 submission and cancellation deadline dates.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { ImportantDate, AssignedEmployee } from '@/lib/types/important-date';
import { format, parseISO } from 'date-fns';
import { getTodayStockholm, getHrAdminEmails } from './notification-helpers';

/**
 * PE3 entry with employee assignment information
 */
export interface Pe3EntryWithEmployee {
  id: string;
  date_description: string;
  date_value: string;
  time_value: string | null;
  deadline_submit: string | null;
  deadline_cancel: string | null;
  assigned_employees: AssignedEmployee[];
}

// Re-export for backward compatibility with existing callers
export { getTodayStockholm } from './notification-helpers';

/**
 * Query PE3 entries with submit deadline matching today
 * 
 * @param today - Today's date in YYYY-MM-DD format (Europe/Stockholm timezone)
 * @returns Array of PE3 entries with employee assignments
 */
export async function getPe3EntriesForSubmitDeadline(
  today: string
): Promise<Pe3EntryWithEmployee[]> {
  const supabase = createServiceRoleClient();

  const { data: entries, error } = await supabase
    .from('important_dates')
    .select('id, date_description, date_value, time_value, deadline_submit, deadline_cancel, assigned_employees')
    .eq('category', 'PE3 Dates')
    .eq('deadline_submit', today)
    .eq('is_active', true);

  if (error) {
    console.error('[PE3 Notifications] Failed to query submit deadline entries:', error);
    return [];
  }

  return (entries || []) as Pe3EntryWithEmployee[];
}

/**
 * Query PE3 entries with cancel deadline matching today
 * 
 * @param today - Today's date in YYYY-MM-DD format (Europe/Stockholm timezone)
 * @returns Array of PE3 entries with employee assignments
 */
export async function getPe3EntriesForCancelDeadline(
  today: string
): Promise<Pe3EntryWithEmployee[]> {
  const supabase = createServiceRoleClient();

  const { data: entries, error } = await supabase
    .from('important_dates')
    .select('id, date_description, date_value, time_value, deadline_submit, deadline_cancel, assigned_employees')
    .eq('category', 'PE3 Dates')
    .eq('deadline_cancel', today)
    .eq('is_active', true);

  if (error) {
    console.error('[PE3 Notifications] Failed to query cancel deadline entries:', error);
    return [];
  }

  return (entries || []) as Pe3EntryWithEmployee[];
}

/**
 * Check if notification has already been sent for a deadline type and date
 * 
 * @param deadlineType - 'submit' or 'cancel'
 * @param deadlineDate - Deadline date in YYYY-MM-DD format
 * @returns true if notification already sent
 */
export async function hasPe3NotificationBeenSent(
  deadlineType: 'submit' | 'cancel',
  deadlineDate: string
): Promise<boolean> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('pe3_notifications_log')
    .select('id')
    .eq('deadline_type', deadlineType)
    .eq('deadline_date', deadlineDate)
    .limit(1)
    .single();

  if (error) {
    // If no record found, error is expected (notification not sent)
    if (error.code === 'PGRST116') {
      return false;
    }
    console.error('[PE3 Notifications] Error checking notification status:', error);
    // On error, assume not sent to allow retry
    return false;
  }

  return !!data;
}

/**
 * Atomically claim that a notification is being sent.
 *
 * The unique database constraint on deadline_type + deadline_date makes this
 * the duplicate-send guard for overlapping cron/manual invocations.
 * 
 * @param deadlineType - 'submit' or 'cancel'
 * @param deadlineDate - Deadline date in YYYY-MM-DD format
 * @returns 'claimed' if this invocation owns the send, 'already-claimed' if another invocation owns it, or 'failed'
 */
async function claimPe3NotificationSent(
  deadlineType: 'submit' | 'cancel',
  deadlineDate: string
): Promise<'claimed' | 'already-claimed' | 'failed'> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from('pe3_notifications_log')
    .insert({
      deadline_type: deadlineType,
      deadline_date: deadlineDate,
      sent_at: new Date().toISOString(),
    });

  if (error) {
    if (error.code === '23505') {
      return 'already-claimed';
    }

    console.error('[PE3 Notifications] Failed to claim notification:', error);
    return 'failed';
  }

  return 'claimed';
}

/**
 * Clear an unsent claim when every attempted email send failed.
 * If any recipient received the email, keep the marker to avoid duplicate blasts.
 */
async function clearPe3NotificationClaim(
  deadlineType: 'submit' | 'cancel',
  deadlineDate: string
): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from('pe3_notifications_log')
    .delete()
    .eq('deadline_type', deadlineType)
    .eq('deadline_date', deadlineDate);

  if (error) {
    console.error('[PE3 Notifications] Failed to clear notification claim:', error);
  }
}

/**
 * Format PE3 date identifier for display in email
 * 
 * @param entry - PE3 entry
 * @returns Formatted date identifier string
 */
export function formatPe3DateIdentifier(entry: Pe3EntryWithEmployee): string {
  const parts: string[] = [];

  // Add date description (e.g., "Fredag 14/2")
  if (entry.date_description) {
    parts.push(entry.date_description);
  }

  // Add date value (e.g., "2025-02-14")
  if (entry.date_value) {
    try {
      const date = parseISO(entry.date_value);
      const formattedDate = format(date, 'yyyy-MM-dd');
      if (!parts.includes(formattedDate)) {
        parts.push(formattedDate);
      }
    } catch (e) {
      // If parsing fails, use raw value
      parts.push(entry.date_value);
    }
  }

  // Add time value if present (e.g., "14:30")
  if (entry.time_value) {
    parts.push(entry.time_value);
  }

  return parts.join(' – ') || entry.id;
}

/**
 * Get employee name for PE3 entry
 * 
 * @param entry - PE3 entry with assigned employees
 * @returns Employee name or "Unassigned"
 */
export function getEmployeeNameForPe3Entry(entry: Pe3EntryWithEmployee): string {
  if (!entry.assigned_employees || entry.assigned_employees.length === 0) {
    return 'Ej tilldelad';
  }

  // If multiple employees assigned, list them all
  const names = entry.assigned_employees
    .map(emp => emp.name || 'Okänd')
    .filter(Boolean);

  return names.length > 0 ? names.join(', ') : 'Ej tilldelad';
}

/**
 * Generate email subject for PE3 submit deadline
 */
export function generatePe3SubmitDeadlineEmailSubject(): string {
  return 'Stena Season: PE3 deadline idag – sista dagen att skicka in platser';
}

/**
 * Generate email body for PE3 submit deadline
 * 
 * @param entries - Array of PE3 entries with submit deadline today
 * @param today - Today's date in YYYY-MM-DD format
 */
export function generatePe3SubmitDeadlineEmailBody(
  entries: Pe3EntryWithEmployee[],
  today: string
): string {
  const formattedDate = format(parseISO(today), 'yyyy-MM-dd');
  
  let body = `Idag (${formattedDate}) är sista dagen att skicka in PE3-platser.\n\n`;
  body += 'Berörda PE3-datum:\n';

  for (const entry of entries) {
    const dateIdentifier = formatPe3DateIdentifier(entry);
    const employeeName = getEmployeeNameForPe3Entry(entry);
    body += `- ${dateIdentifier} – Tilldelad: ${employeeName}\n`;
  }

  body += '\n---\nDetta är ett automatiskt genererat meddelande, vänligen svara inte på detta mail.';

  return body;
}

/**
 * Generate email HTML for PE3 submit deadline
 */
export function generatePe3SubmitDeadlineEmailHtml(
  entries: Pe3EntryWithEmployee[],
  today: string
): string {
  const formattedDate = format(parseISO(today), 'yyyy-MM-dd');
  
  let html = `<html><body>`;
  html += `<p>Idag (<strong>${formattedDate}</strong>) är sista dagen att skicka in PE3-platser.</p>`;
  html += `<p>Berörda PE3-datum:</p>`;
  html += `<ul>`;

  for (const entry of entries) {
    const dateIdentifier = formatPe3DateIdentifier(entry);
    const employeeName = getEmployeeNameForPe3Entry(entry);
    html += `<li><strong>${dateIdentifier}</strong> – Tilldelad: ${employeeName}</li>`;
  }

  html += `</ul>`;
  html += `<hr />`;
  html += `<p style="color: #666; font-size: 12px;">Detta är ett automatiskt genererat meddelande, vänligen svara inte på detta mail.</p>`;
  html += `</body></html>`;
  return html;
}

/**
 * Generate email subject for PE3 cancel deadline
 */
export function generatePe3CancelDeadlineEmailSubject(): string {
  return 'Stena Season: PE3 deadline idag – sista dagen att avboka platser';
}

/**
 * Generate email body for PE3 cancel deadline
 * 
 * @param entries - Array of PE3 entries with cancel deadline today
 * @param today - Today's date in YYYY-MM-DD format
 */
export function generatePe3CancelDeadlineEmailBody(
  entries: Pe3EntryWithEmployee[],
  today: string
): string {
  const formattedDate = format(parseISO(today), 'yyyy-MM-dd');
  
  let body = `Idag (${formattedDate}) är sista dagen att avboka PE3-platser.\n\n`;
  body += 'Berörda PE3-datum:\n';

  for (const entry of entries) {
    const dateIdentifier = formatPe3DateIdentifier(entry);
    const employeeName = getEmployeeNameForPe3Entry(entry);
    body += `- ${dateIdentifier} – Tilldelad: ${employeeName}\n`;
  }

  body += '\n---\nDetta är ett automatiskt genererat meddelande, vänligen svara inte på detta mail.';

  return body;
}

/**
 * Generate email HTML for PE3 cancel deadline
 */
export function generatePe3CancelDeadlineEmailHtml(
  entries: Pe3EntryWithEmployee[],
  today: string
): string {
  const formattedDate = format(parseISO(today), 'yyyy-MM-dd');
  
  let html = `<html><body>`;
  html += `<p>Idag (<strong>${formattedDate}</strong>) är sista dagen att avboka PE3-platser.</p>`;
  html += `<p>Berörda PE3-datum:</p>`;
  html += `<ul>`;

  for (const entry of entries) {
    const dateIdentifier = formatPe3DateIdentifier(entry);
    const employeeName = getEmployeeNameForPe3Entry(entry);
    html += `<li><strong>${dateIdentifier}</strong> – Tilldelad: ${employeeName}</li>`;
  }

  html += `</ul>`;
  html += `<hr />`;
  html += `<p style="color: #666; font-size: 12px;">Detta är ett automatiskt genererat meddelande, vänligen svara inte på detta mail.</p>`;
  html += `</body></html>`;
  return html;
}

// getHrAdminEmails is now imported from notification-helpers

/**
 * Send PE3 submit deadline notification
 * 
 * @param entries - Array of PE3 entries with submit deadline today
 * @param today - Today's date in YYYY-MM-DD format
 * @returns true if notification was sent successfully
 */
export async function sendPe3SubmitDeadlineNotification(
  entries: Pe3EntryWithEmployee[],
  today: string
): Promise<boolean> {
  let claimAcquired = false;
  let hadSuccessfulSend = false;

  try {
    // Check if notification already sent
    const alreadySent = await hasPe3NotificationBeenSent('submit', today);
    if (alreadySent) {
      console.log(`[PE3 Notifications] Submit deadline notification already sent for ${today}`);
      return true; // Consider it successful if already sent
    }

    // Get HR admin email addresses
    const hrAdminEmails = await getHrAdminEmails();
    
    if (hrAdminEmails.length === 0) {
      console.warn('[PE3 Notifications] No HR admin emails found, skipping notification');
      return false;
    }

    const claimStatus = await claimPe3NotificationSent('submit', today);
    if (claimStatus === 'already-claimed') {
      console.log(`[PE3 Notifications] Submit deadline notification already claimed or sent for ${today}`);
      return true;
    }
    if (claimStatus === 'failed') {
      return false;
    }
    claimAcquired = true;

    // Generate email content
    const subject = generatePe3SubmitDeadlineEmailSubject();
    const text = generatePe3SubmitDeadlineEmailBody(entries, today);
    const html = generatePe3SubmitDeadlineEmailHtml(entries, today);

    // Send email
    const { sendEmailToMultiple } = await import('./email-service');
    const results = await sendEmailToMultiple(hrAdminEmails, subject, text, html);

    // Check if all emails were sent successfully
    const allSuccessful = results.every(result => result.success);
    const successCount = results.filter(result => result.success).length;
    hadSuccessfulSend = successCount > 0;
    
    if (!allSuccessful) {
      const failedCount = results.filter(r => !r.success).length;
      console.error(`[PE3 Notifications] Failed to send ${failedCount} of ${results.length} submit deadline emails`);

      if (successCount === 0) {
        await clearPe3NotificationClaim('submit', today);
      }

      return false;
    }

    console.log(`[PE3 Notifications] Submit deadline notification sent for ${today} to ${hrAdminEmails.length} HR admin(s)`);
    return true;
  } catch (error) {
    console.error('[PE3 Notifications] Error sending submit deadline notification:', error);

    if (claimAcquired && !hadSuccessfulSend) {
      await clearPe3NotificationClaim('submit', today);
    }

    return false;
  }
}

/**
 * Send PE3 cancel deadline notification
 * 
 * @param entries - Array of PE3 entries with cancel deadline today
 * @param today - Today's date in YYYY-MM-DD format
 * @returns true if notification was sent successfully
 */
export async function sendPe3CancelDeadlineNotification(
  entries: Pe3EntryWithEmployee[],
  today: string
): Promise<boolean> {
  let claimAcquired = false;
  let hadSuccessfulSend = false;

  try {
    // Check if notification already sent
    const alreadySent = await hasPe3NotificationBeenSent('cancel', today);
    if (alreadySent) {
      console.log(`[PE3 Notifications] Cancel deadline notification already sent for ${today}`);
      return true; // Consider it successful if already sent
    }

    // Get HR admin email addresses
    const hrAdminEmails = await getHrAdminEmails();
    
    if (hrAdminEmails.length === 0) {
      console.warn('[PE3 Notifications] No HR admin emails found, skipping notification');
      return false;
    }

    const claimStatus = await claimPe3NotificationSent('cancel', today);
    if (claimStatus === 'already-claimed') {
      console.log(`[PE3 Notifications] Cancel deadline notification already claimed or sent for ${today}`);
      return true;
    }
    if (claimStatus === 'failed') {
      return false;
    }
    claimAcquired = true;

    // Generate email content
    const subject = generatePe3CancelDeadlineEmailSubject();
    const text = generatePe3CancelDeadlineEmailBody(entries, today);
    const html = generatePe3CancelDeadlineEmailHtml(entries, today);

    // Send email
    const { sendEmailToMultiple } = await import('./email-service');
    const results = await sendEmailToMultiple(hrAdminEmails, subject, text, html);

    // Check if all emails were sent successfully
    const allSuccessful = results.every(result => result.success);
    const successCount = results.filter(result => result.success).length;
    hadSuccessfulSend = successCount > 0;
    
    if (!allSuccessful) {
      const failedCount = results.filter(r => !r.success).length;
      console.error(`[PE3 Notifications] Failed to send ${failedCount} of ${results.length} cancel deadline emails`);

      if (successCount === 0) {
        await clearPe3NotificationClaim('cancel', today);
      }

      return false;
    }

    console.log(`[PE3 Notifications] Cancel deadline notification sent for ${today} to ${hrAdminEmails.length} HR admin(s)`);
    return true;
  } catch (error) {
    console.error('[PE3 Notifications] Error sending cancel deadline notification:', error);

    if (claimAcquired && !hadSuccessfulSend) {
      await clearPe3NotificationClaim('cancel', today);
    }

    return false;
  }
}

