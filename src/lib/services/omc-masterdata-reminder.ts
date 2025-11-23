/**
 * ÖMC Masterdata Reminder Service
 * Story: 14.1 - ÖMC + Masterdata Completion Follow-up
 * 
 * This service handles evaluation and notification of employees with incomplete
 * masterdata 3 days after their ÖMC completion date.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { Employee } from '@/lib/types/employee';
import { ImportantDate } from '@/lib/types/important-date';
import { format, parseISO, differenceInDays, isAfter } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';

/**
 * Required boolean masterdata fields that must be true for completion.
 * Excludes hotel_required and crewing_done as per business rules.
 * 
 * Note: This is an explicit allowlist to avoid silent failures when schema changes.
 */
export const REQUIRED_BOOLEAN_FIELDS = [
  'one',
  'talmundo',
  'isps',
  'photo',
  'origo',
  'mail_lon',
  'bankuppgifter',
  'li',
  'passport',
  'kvitto_c17_18',
  'c17',
] as const;

/**
 * Field display names for email notifications
 */
const FIELD_DISPLAY_NAMES: Record<string, string> = {
  one: 'One',
  talmundo: 'Talmundo',
  isps: 'ISPS',
  photo: 'Photo',
  origo: 'Origo',
  mail_lon: 'Mail Lön',
  bankuppgifter: 'Bankuppgifter',
  li: 'LI',
  passport: 'Passport',
  kvitto_c17_18: 'Kvitto C17/18',
  c17: 'C17',
  loneiva: 'Lönenivå',
};

/**
 * Result of evaluating an employee's masterdata completion status
 */
export interface MasterdataEvaluationResult {
  shouldNotify: boolean;
  missingFields: string[];
  omcDateValue: string | null;
}

/**
 * Check if all required masterdata fields are complete for an employee
 * 
 * @param employee - Employee record to evaluate
 * @returns List of missing/incomplete field names
 */
export function checkRequiredMasterdataFields(employee: Employee): string[] {
  const missingFields: string[] = [];

  // Check all required boolean fields
  for (const field of REQUIRED_BOOLEAN_FIELDS) {
    const value = employee[field];
    if (value !== true) {
      missingFields.push(field);
    }
  }

  // Check loneiva (must be non-null and non-empty)
  // Note: Story mentions "loneniva" but codebase uses "loneiva"
  if (employee.loneiva === null || employee.loneiva === undefined) {
    missingFields.push('loneiva');
  }

  return missingFields;
}

/**
 * Get the actual date value from an ÖMC date UUID reference
 * 
 * @param omcDateUuid - UUID reference to important_dates.id
 * @returns Date value string (YYYY-MM-DD) or null if not found
 */
async function getOmcDateValue(omcDateUuid: string | null): Promise<string | null> {
  if (!omcDateUuid) {
    return null;
  }

  const supabase = createServiceRoleClient();
  const { data: importantDate, error } = await supabase
    .from('important_dates')
    .select('date_value')
    .eq('id', omcDateUuid)
    .single();

  if (error || !importantDate) {
    console.error(`Failed to fetch ÖMC date value for UUID ${omcDateUuid}:`, error);
    return null;
  }

  return importantDate.date_value;
}

/**
 * Calculate if 3 calendar days have passed since ÖMC date in Europe/Stockholm timezone
 * 
 * The job runs at 07:00 Stockholm time. We compare calendar days:
 * - ÖMC date: 2025-01-01
 * - Today: 2025-01-04 (at 07:00)
 * - Result: 3 calendar days have passed (Jan 1, 2, 3 = 3 days)
 * 
 * Uses explicit timezone handling with date-fns-tz to ensure correct calculation
 * regardless of server timezone.
 * 
 * @param omcDateValue - Date value string (YYYY-MM-DD)
 * @returns true if 3+ calendar days have passed
 */
function hasThreeDaysPassed(omcDateValue: string): boolean {
  const STOCKHOLM_TZ = 'Europe/Stockholm';
  
  // Get current date/time in Stockholm timezone
  const now = new Date();
  const stockholmNow = toZonedTime(now, STOCKHOLM_TZ);
  
  // Format today's date in Stockholm timezone as YYYY-MM-DD
  const todayDateStr = formatTz(stockholmNow, 'yyyy-MM-dd', { timeZone: STOCKHOLM_TZ });
  
  // Parse the ÖMC date value (YYYY-MM-DD format)
  // We treat it as a date in Stockholm timezone
  const omcDateStr = omcDateValue; // Already in YYYY-MM-DD format
  
  // Calculate difference in calendar days
  // Parse both as dates and compare
  const todayDate = parseISO(todayDateStr);
  const omcDate = parseISO(omcDateStr);
  
  // Calculate difference in calendar days
  // differenceInDays calculates the number of full calendar days between dates
  const daysDiff = differenceInDays(todayDate, omcDate);
  
  return daysDiff >= 3;
}

/**
 * Check if notification should be sent for an employee
 * 
 * @param employee - Employee record to evaluate
 * @returns Evaluation result with notification decision and missing fields
 */
export async function evaluateOmcMasterdataCompletion(
  employee: Employee
): Promise<MasterdataEvaluationResult> {
  // Check if omc_date is set
  if (!employee.omc_date) {
    return {
      shouldNotify: false,
      missingFields: [],
      omcDateValue: null,
    };
  }

  // Get the actual date value from important_dates
  const omcDateValue = await getOmcDateValue(employee.omc_date);
  if (!omcDateValue) {
    return {
      shouldNotify: false,
      missingFields: [],
      omcDateValue: null,
    };
  }

  // Check if 3 days have passed (Europe/Stockholm timezone)
  if (!hasThreeDaysPassed(omcDateValue)) {
    return {
      shouldNotify: false,
      missingFields: [],
      omcDateValue,
    };
  }

  // Check if notification already sent (compare omc_date with reminder_sent_at date)
  if (employee.omc_masterdata_reminder_sent_at) {
    const reminderSentDate = parseISO(employee.omc_masterdata_reminder_sent_at);
    const omcDate = parseISO(omcDateValue);
    
    // If reminder was sent on or after the ÖMC date, don't resend
    // (unless omc_date changed, which would require a new evaluation)
    if (isAfter(reminderSentDate, omcDate) || 
        format(reminderSentDate, 'yyyy-MM-dd') === format(omcDate, 'yyyy-MM-dd')) {
      return {
        shouldNotify: false,
        missingFields: [],
        omcDateValue,
      };
    }
  }

  // Check required fields
  const missingFields = checkRequiredMasterdataFields(employee);

  return {
    shouldNotify: missingFields.length > 0,
    missingFields,
    omcDateValue,
  };
}

/**
 * Get HR admin email addresses
 * 
 * @returns Array of email addresses for hr_admin users
 */
export async function getHrAdminEmails(): Promise<string[]> {
  const supabase = createServiceRoleClient();
  
  const { data: hrAdmins, error } = await supabase
    .from('users')
    .select('email')
    .eq('role', 'hr_admin')
    .not('email', 'is', null)
    .eq('is_active', true);

  if (error) {
    console.error('Failed to fetch HR admin emails:', error);
    return [];
  }

  return (hrAdmins || []).map(user => user.email).filter(Boolean);
}

/**
 * Format field name for display in email
 */
function formatFieldName(field: string): string {
  return FIELD_DISPLAY_NAMES[field] || field;
}

/**
 * Generate email subject for ÖMC reminder
 */
export function generateOmcReminderEmailSubject(employeeName: string): string {
  return `ÖMC completed 3 days ago – masterdata still incomplete for ${employeeName}`;
}

/**
 * Generate email body for ÖMC reminder
 */
export function generateOmcReminderEmailBody(
  employee: Employee,
  omcDateValue: string,
  missingFields: string[]
): string {
  const employeeName = `${employee.first_name} ${employee.surname}`;
  const employeeId = employee.id;
  const formattedDate = format(parseISO(omcDateValue), 'yyyy-MM-dd');
  
  const missingFieldsList = missingFields
    .map(field => {
      const displayName = formatFieldName(field);
      if (field === 'loneiva') {
        return `- ${displayName} (empty)`;
      }
      return `- ${displayName} (false)`;
    })
    .join('\n');

  return `3 days have passed since ${employeeName} completed ÖMC on ${formattedDate}.

The following required fields are still incomplete:
${missingFieldsList}

Employee ID: ${employeeId}

Please follow up to ensure masterdata completion.`;
}

/**
 * Send ÖMC masterdata reminder notification
 * 
 * @param employee - Employee record
 * @param missingFields - List of missing/incomplete field names
 * @param omcDateValue - ÖMC date value (YYYY-MM-DD)
 * @returns true if notification was sent successfully
 */
export async function sendOmcMasterdataReminder(
  employee: Employee,
  missingFields: string[],
  omcDateValue: string
): Promise<boolean> {
  try {
    // Get HR admin email addresses
    const hrAdminEmails = await getHrAdminEmails();
    
    if (hrAdminEmails.length === 0) {
      console.warn('[ÖMC Reminder] No HR admin emails found, skipping notification');
      return false;
    }

    // Generate email content
    const subject = generateOmcReminderEmailSubject(`${employee.first_name} ${employee.surname}`);
    const text = generateOmcReminderEmailBody(employee, omcDateValue, missingFields);
    
    // Generate HTML version (simple formatting)
    const html = `
      <html>
        <body>
          <p>3 days have passed since <strong>${employee.first_name} ${employee.surname}</strong> completed ÖMC on <strong>${format(parseISO(omcDateValue), 'yyyy-MM-dd')}</strong>.</p>
          <p>The following required fields are still incomplete:</p>
          <ul>
            ${missingFields.map(field => {
              const displayName = formatFieldName(field);
              const status = field === 'loneiva' ? 'empty' : 'false';
              return `<li><strong>${displayName}</strong> (${status})</li>`;
            }).join('\n')}
          </ul>
          <p>Employee ID: ${employee.id}</p>
          <p>Please follow up to ensure masterdata completion.</p>
        </body>
      </html>
    `;

    // Send email
    const { sendEmailToMultiple } = await import('./email-service');
    const results = await sendEmailToMultiple(hrAdminEmails, subject, text, html);

    // Check if all emails were sent successfully
    const allSuccessful = results.every(result => result.success);
    
    if (!allSuccessful) {
      const failedCount = results.filter(r => !r.success).length;
      console.error(`[ÖMC Reminder] Failed to send ${failedCount} of ${results.length} emails`);
      return false;
    }

    // Update notification marker in database
    const supabase = createServiceRoleClient();
    const { error: updateError } = await supabase
      .from('employees')
      .update({ omc_masterdata_reminder_sent_at: new Date().toISOString() })
      .eq('id', employee.id);

    if (updateError) {
      console.error('[ÖMC Reminder] Failed to update notification marker:', updateError);
      // Don't fail the entire operation if marker update fails
      // The email was sent, we just couldn't record it
    }

    console.log(`[ÖMC Reminder] Notification sent for employee ${employee.id} to ${hrAdminEmails.length} HR admin(s)`);
    return true;
  } catch (error) {
    console.error('[ÖMC Reminder] Error sending notification:', error);
    return false;
  }
}

