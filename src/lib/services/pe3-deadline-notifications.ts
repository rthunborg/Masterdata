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
import { toZonedTime, format as formatTz } from 'date-fns-tz';

const STOCKHOLM_TZ = 'Europe/Stockholm';

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

/**
 * Get today's date in Europe/Stockholm timezone as YYYY-MM-DD
 */
export function getTodayStockholm(): string {
  const now = new Date();
  const stockholmNow = toZonedTime(now, STOCKHOLM_TZ);
  return formatTz(stockholmNow, 'yyyy-MM-dd', { timeZone: STOCKHOLM_TZ });
}

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
 * Log that a notification was sent
 * 
 * @param deadlineType - 'submit' or 'cancel'
 * @param deadlineDate - Deadline date in YYYY-MM-DD format
 * @returns true if logged successfully
 */
async function logPe3NotificationSent(
  deadlineType: 'submit' | 'cancel',
  deadlineDate: string
): Promise<boolean> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from('pe3_notifications_log')
    .insert({
      deadline_type: deadlineType,
      deadline_date: deadlineDate,
      sent_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[PE3 Notifications] Failed to log notification:', error);
    return false;
  }

  return true;
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
    return 'Unassigned';
  }

  // If multiple employees assigned, list them all
  const names = entry.assigned_employees
    .map(emp => emp.name || 'Unknown')
    .filter(Boolean);

  return names.length > 0 ? names.join(', ') : 'Unassigned';
}

/**
 * Generate email subject for PE3 submit deadline
 */
export function generatePe3SubmitDeadlineEmailSubject(): string {
  return 'PE3 deadline today – last date to submit spots';
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
  
  let body = `Today (${formattedDate}) is the last date to submit PE3 spots.\n\n`;
  body += 'Affected PE3 dates:\n';

  for (const entry of entries) {
    const dateIdentifier = formatPe3DateIdentifier(entry);
    const employeeName = getEmployeeNameForPe3Entry(entry);
    body += `- ${dateIdentifier} – Assigned: ${employeeName}\n`;
  }

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
  html += `<p>Today (<strong>${formattedDate}</strong>) is the last date to submit PE3 spots.</p>`;
  html += `<p>Affected PE3 dates:</p>`;
  html += `<ul>`;

  for (const entry of entries) {
    const dateIdentifier = formatPe3DateIdentifier(entry);
    const employeeName = getEmployeeNameForPe3Entry(entry);
    html += `<li><strong>${dateIdentifier}</strong> – Assigned: ${employeeName}</li>`;
  }

  html += `</ul></body></html>`;
  return html;
}

/**
 * Generate email subject for PE3 cancel deadline
 */
export function generatePe3CancelDeadlineEmailSubject(): string {
  return 'PE3 deadline today – last date to cancel spots';
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
  
  let body = `Today (${formattedDate}) is the last date to cancel PE3 spots.\n\n`;
  body += 'Affected PE3 dates:\n';

  for (const entry of entries) {
    const dateIdentifier = formatPe3DateIdentifier(entry);
    const employeeName = getEmployeeNameForPe3Entry(entry);
    body += `- ${dateIdentifier} – Assigned: ${employeeName}\n`;
  }

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
  html += `<p>Today (<strong>${formattedDate}</strong>) is the last date to cancel PE3 spots.</p>`;
  html += `<p>Affected PE3 dates:</p>`;
  html += `<ul>`;

  for (const entry of entries) {
    const dateIdentifier = formatPe3DateIdentifier(entry);
    const employeeName = getEmployeeNameForPe3Entry(entry);
    html += `<li><strong>${dateIdentifier}</strong> – Assigned: ${employeeName}</li>`;
  }

  html += `</ul></body></html>`;
  return html;
}

/**
 * Get HR admin and Recruiter email addresses
 * Reuses function from omc-masterdata-reminder service
 */
async function getHrAdminEmails(): Promise<string[]> {
  const supabase = createServiceRoleClient();
  
  const { data: recipients, error } = await supabase
    .from('users')
    .select('email')
    .in('role', ['hr_admin', 'recruiter'])
    .not('email', 'is', null)
    .eq('is_active', true);

  if (error) {
    console.error('[PE3 Notifications] Failed to fetch HR admin/recruiter emails:', error);
    return [];
  }

  return (recipients || []).map(user => user.email).filter(Boolean);
}

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

    // Generate email content
    const subject = generatePe3SubmitDeadlineEmailSubject();
    const text = generatePe3SubmitDeadlineEmailBody(entries, today);
    const html = generatePe3SubmitDeadlineEmailHtml(entries, today);

    // Send email
    const { sendEmailToMultiple } = await import('./email-service');
    const results = await sendEmailToMultiple(hrAdminEmails, subject, text, html);

    // Check if all emails were sent successfully
    const allSuccessful = results.every(result => result.success);
    
    if (!allSuccessful) {
      const failedCount = results.filter(r => !r.success).length;
      console.error(`[PE3 Notifications] Failed to send ${failedCount} of ${results.length} submit deadline emails`);
      return false;
    }

    // Log notification in database
    const logged = await logPe3NotificationSent('submit', today);
    if (!logged) {
      console.warn('[PE3 Notifications] Failed to log submit deadline notification, but email was sent');
      // Don't fail the entire operation if logging fails
    }

    console.log(`[PE3 Notifications] Submit deadline notification sent for ${today} to ${hrAdminEmails.length} HR admin(s)`);
    return true;
  } catch (error) {
    console.error('[PE3 Notifications] Error sending submit deadline notification:', error);
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

    // Generate email content
    const subject = generatePe3CancelDeadlineEmailSubject();
    const text = generatePe3CancelDeadlineEmailBody(entries, today);
    const html = generatePe3CancelDeadlineEmailHtml(entries, today);

    // Send email
    const { sendEmailToMultiple } = await import('./email-service');
    const results = await sendEmailToMultiple(hrAdminEmails, subject, text, html);

    // Check if all emails were sent successfully
    const allSuccessful = results.every(result => result.success);
    
    if (!allSuccessful) {
      const failedCount = results.filter(r => !r.success).length;
      console.error(`[PE3 Notifications] Failed to send ${failedCount} of ${results.length} cancel deadline emails`);
      return false;
    }

    // Log notification in database
    const logged = await logPe3NotificationSent('cancel', today);
    if (!logged) {
      console.warn('[PE3 Notifications] Failed to log cancel deadline notification, but email was sent');
      // Don't fail the entire operation if logging fails
    }

    console.log(`[PE3 Notifications] Cancel deadline notification sent for ${today} to ${hrAdminEmails.length} HR admin(s)`);
    return true;
  } catch (error) {
    console.error('[PE3 Notifications] Error sending cancel deadline notification:', error);
    return false;
  }
}

