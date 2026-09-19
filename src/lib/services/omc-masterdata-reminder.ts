/**
 * ÖMC masterdata reminder service.
 *
 * Story 22.14 supersedes Story 14.1's unbounded reminder policy. All timing is
 * based on Europe/Stockholm calendar dates, and the existing timestamp remains
 * the assignment-scoped claim/audit marker.
 */

import { z } from 'zod';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { Employee } from '@/lib/types/employee';
import { sendEmailToMultiple } from './email-service';
import { getHrAdminEmailLookup } from './notification-helpers';

const STOCKHOLM_TZ = 'Europe/Stockholm';
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const CLAIM_SELECT_COLUMNS = 'id,omc_date,omc_masterdata_reminder_sent_at';

/**
 * Required boolean masterdata fields that must be true for completion.
 * `kvitto_c17_18` is intentionally optional for this reminder. Hotel and
 * Crewing fields remain outside the reminder policy.
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
  'c17',
] as const;

type RequiredBooleanField = (typeof REQUIRED_BOOLEAN_FIELDS)[number];

const FIELD_DISPLAY_NAMES: Record<RequiredBooleanField | 'loneiva', string> = {
  one: 'One',
  talmundo: 'Talmundo',
  isps: 'ISPS',
  photo: 'Photo',
  origo: 'Origo',
  mail_lon: 'Mail Lön',
  bankuppgifter: 'Bankuppgifter',
  li: 'LI',
  passport: 'Passport',
  c17: 'C17',
  loneiva: 'Lönenivå',
};

const nullableBoolean = z.boolean().nullable();

/** The deliberately small employee projection used by the reminder job. */
export const omcReminderEmployeeSchema = z.object({
  id: z.string().min(1),
  first_name: z.string(),
  surname: z.string(),
  omc_date: z.string().min(1).nullable(),
  is_terminated: z.boolean(),
  is_archived: z.boolean(),
  omc_masterdata_reminder_sent_at: z.string().datetime({ offset: true }).nullable().optional(),
  one: nullableBoolean,
  talmundo: nullableBoolean,
  isps: nullableBoolean,
  photo: nullableBoolean,
  origo: nullableBoolean,
  mail_lon: nullableBoolean,
  bankuppgifter: nullableBoolean,
  li: nullableBoolean,
  passport: nullableBoolean,
  kvitto_c17_18: nullableBoolean.optional(),
  c17: nullableBoolean,
  loneiva: z.number().nullable(),
});

export type OmcReminderEmployee = z.infer<typeof omcReminderEmployeeSchema>;

const importantDateValueSchema = z.object({
  date_value: z.string().regex(DATE_ONLY_PATTERN),
});

const reminderMutationRowSchema = z.object({
  id: z.string().min(1),
  omc_date: z.string().min(1),
  omc_masterdata_reminder_sent_at: z.string().datetime({ offset: true }).nullable(),
});

export interface OmcReminderTiming {
  eligible: boolean;
  elapsedDays: number;
  notificationDate: string;
  expiryDate: string;
  todayStockholm: string;
}

export interface MasterdataEvaluationResult {
  shouldNotify: boolean;
  missingFields: string[];
  omcDateValue: string | null;
  elapsedDays: number | null;
}

export interface OmcReminderCandidate {
  employee: OmcReminderEmployee;
  missingFields: string[];
  omcDateValue: string;
  elapsedDays: number;
}

export interface ClaimedOmcReminderCandidate extends OmcReminderCandidate {
  claimTimestamp: string;
}

export type OmcReminderClaimResult =
  | { status: 'claimed'; claimTimestamp: string }
  | { status: 'suppressed'; claimTimestamp: null }
  | { status: 'error'; claimTimestamp: null };

export interface OmcReminderDigest {
  subject: string;
  text: string;
  html: string;
}

export interface OmcReminderDeliveryResult {
  recipientCount: number;
  successfulRecipientDeliveries: number;
  failedRecipientDeliveries: number;
  outcome:
    | 'success'
    | 'partial-failure'
    | 'total-failure'
    | 'no-recipients'
    | 'recipient-lookup-failure';
}

export interface OmcReminderReleaseResult {
  releasedClaims: number;
  releaseErrors: number;
}

function parseCalendarDate(value: string): Date {
  if (!DATE_ONLY_PATTERN.test(value)) {
    throw new Error('Invalid calendar date');
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('Invalid calendar date');
  }

  return date;
}

function formatCalendarDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addCalendarDays(value: string, days: number): string {
  const date = parseCalendarDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatCalendarDate(date);
}

function differenceInCalendarDays(today: string, earlier: string): number {
  return Math.round(
    (parseCalendarDate(today).getTime() - parseCalendarDate(earlier).getTime()) / DAY_IN_MS
  );
}

function rollWeekendToMonday(value: string): string {
  const day = parseCalendarDate(value).getUTCDay();
  if (day === 6) return addCalendarDays(value, 2);
  if (day === 0) return addCalendarDays(value, 1);
  return value;
}

/** Resolve an instant to its Europe/Stockholm calendar date. */
export function getStockholmCalendarDate(now: Date = new Date()): string {
  return formatInTimeZone(now, STOCKHOLM_TZ, 'yyyy-MM-dd');
}

/**
 * Calculate the weekend-adjusted D+3 notification date and inclusive D+21
 * expiry using date-only arithmetic. No public-holiday or clock-time rules are
 * applied.
 */
export function calculateOmcReminderTiming(
  omcDateValue: string,
  todayStockholm: string = getStockholmCalendarDate()
): OmcReminderTiming {
  parseCalendarDate(omcDateValue);
  parseCalendarDate(todayStockholm);

  const notificationDate = rollWeekendToMonday(addCalendarDays(omcDateValue, 3));
  const expiryDate = addCalendarDays(omcDateValue, 21);
  const elapsedDays = differenceInCalendarDays(todayStockholm, omcDateValue);

  return {
    eligible: todayStockholm >= notificationDate && todayStockholm <= expiryDate,
    elapsedDays,
    notificationDate,
    expiryDate,
    todayStockholm,
  };
}

/** Check which reminder-required masterdata fields remain incomplete. */
export function checkRequiredMasterdataFields(
  employee: Pick<OmcReminderEmployee, RequiredBooleanField | 'loneiva'> | Employee
): string[] {
  const missingFields: string[] = [];

  for (const field of REQUIRED_BOOLEAN_FIELDS) {
    if (employee[field] !== true) {
      missingFields.push(field);
    }
  }

  if (employee.loneiva === null || employee.loneiva === undefined) {
    missingFields.push('loneiva');
  }

  return missingFields;
}

async function getOmcDateValue(omcDateUuid: string): Promise<string> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('important_dates')
    .select('date_value')
    .eq('id', omcDateUuid)
    .single();

  if (error) {
    throw new Error('ÖMC date lookup failed');
  }

  const parsed = importantDateValueSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error('ÖMC date lookup returned invalid data');
  }

  parseCalendarDate(parsed.data.date_value);
  return parsed.data.date_value;
}

function markerSuppressesAssignment(marker: string | null | undefined, omcDateValue: string): boolean {
  if (!marker) return false;
  const markerInstant = new Date(marker);
  if (Number.isNaN(markerInstant.getTime())) {
    throw new Error('Invalid reminder marker');
  }
  return getStockholmCalendarDate(markerInstant) >= omcDateValue;
}

function getStockholmDateStartInstant(value: string): string {
  parseCalendarDate(value);
  return fromZonedTime(`${value}T00:00:00`, STOCKHOLM_TZ).toISOString();
}

/** Evaluate one employee without hiding lookup/validation failures. */
export async function evaluateOmcMasterdataCompletion(
  employeeInput: OmcReminderEmployee | Employee,
  todayStockholm: string = getStockholmCalendarDate()
): Promise<MasterdataEvaluationResult> {
  const employee = omcReminderEmployeeSchema.parse(employeeInput);

  if (employee.is_terminated || employee.is_archived || !employee.omc_date) {
    return {
      shouldNotify: false,
      missingFields: [],
      omcDateValue: null,
      elapsedDays: null,
    };
  }

  const omcDateValue = await getOmcDateValue(employee.omc_date);
  const timing = calculateOmcReminderTiming(omcDateValue, todayStockholm);

  if (
    !timing.eligible ||
    markerSuppressesAssignment(employee.omc_masterdata_reminder_sent_at, omcDateValue)
  ) {
    return {
      shouldNotify: false,
      missingFields: [],
      omcDateValue,
      elapsedDays: timing.elapsedDays,
    };
  }

  const missingFields = checkRequiredMasterdataFields(employee);

  return {
    shouldNotify: missingFields.length > 0,
    missingFields,
    omcDateValue,
    elapsedDays: timing.elapsedDays,
  };
}

type MutationResultValidation = 'empty' | 'matched' | 'invalid';

function markerMatchesExpectedInstant(
  actual: string | null,
  expected: string | null
): boolean {
  if (actual === null || expected === null) return actual === expected;

  const actualTime = new Date(actual).getTime();
  const expectedTime = new Date(expected).getTime();
  return !Number.isNaN(actualTime) && !Number.isNaN(expectedTime) && actualTime === expectedTime;
}

function validateMutationResult(
  data: unknown,
  expected: {
    employeeId: string;
    omcAssignmentId: string;
    marker: string | null;
  }
): MutationResultValidation {
  if (!Array.isArray(data)) return 'invalid';
  if (data.length === 0) return 'empty';
  if (data.length !== 1) return 'invalid';

  const parsed = reminderMutationRowSchema.safeParse(data[0]);
  if (!parsed.success) return 'invalid';

  const row = parsed.data;
  return row.id === expected.employeeId &&
    row.omc_date === expected.omcAssignmentId &&
    markerMatchesExpectedInstant(row.omc_masterdata_reminder_sent_at, expected.marker)
    ? 'matched'
    : 'invalid';
}

function applyRequiredMasterdataSnapshotGuards(
  employee: OmcReminderEmployee,
  applyEqual: (field: string, value: boolean | number) => void,
  applyNull: (field: string) => void
): void {
  for (const field of REQUIRED_BOOLEAN_FIELDS) {
    const value = employee[field];
    if (value === null) {
      applyNull(field);
    } else {
      applyEqual(field, value);
    }
  }

  if (employee.loneiva === null) {
    applyNull('loneiva');
  } else {
    applyEqual('loneiva', employee.loneiva);
  }
}

/**
 * Atomically claim the current assignment using two PostgREST-compatible
 * conditional PATCHes. The stale-marker PATCH is attempted only after an
 * error-free zero-row null-marker PATCH.
 */
export async function claimOmcMasterdataReminder(
  candidate: OmcReminderCandidate,
  claimTimestamp: string
): Promise<OmcReminderClaimResult> {
  const employee = omcReminderEmployeeSchema.parse(candidate.employee);
  if (!employee.omc_date) {
    return { status: 'suppressed', claimTimestamp: null };
  }

  const supabase = createServiceRoleClient();
  const firstClaimQuery = supabase
    .from('employees')
    .update({ omc_masterdata_reminder_sent_at: claimTimestamp })
    .eq('id', employee.id)
    .eq('omc_date', employee.omc_date)
    .eq('is_terminated', false)
    .eq('is_archived', false);

  applyRequiredMasterdataSnapshotGuards(
    employee,
    (field, value) => {
      firstClaimQuery.eq(field, value);
    },
    (field) => {
      firstClaimQuery.is(field, null);
    }
  );

  const firstClaim = await firstClaimQuery
    .is('omc_masterdata_reminder_sent_at', null)
    .select(CLAIM_SELECT_COLUMNS);

  if (firstClaim.error) {
    console.error('[ÖMC Reminder] Claim operation failed', { operation: 'null-marker' });
    return { status: 'error', claimTimestamp: null };
  }

  const firstClaimValidation = validateMutationResult(firstClaim.data, {
    employeeId: employee.id,
    omcAssignmentId: employee.omc_date,
    marker: claimTimestamp,
  });

  if (firstClaimValidation === 'invalid') {
    console.error('[ÖMC Reminder] Claim operation returned invalid data', {
      operation: 'null-marker',
    });
    return { status: 'error', claimTimestamp: null };
  }

  if (firstClaimValidation === 'matched') {
    return { status: 'claimed', claimTimestamp };
  }

  const staleClaimQuery = supabase
    .from('employees')
    .update({ omc_masterdata_reminder_sent_at: claimTimestamp })
    .eq('id', employee.id)
    .eq('omc_date', employee.omc_date)
    .eq('is_terminated', false)
    .eq('is_archived', false);

  applyRequiredMasterdataSnapshotGuards(
    employee,
    (field, value) => {
      staleClaimQuery.eq(field, value);
    },
    (field) => {
      staleClaimQuery.is(field, null);
    }
  );

  const staleClaim = await staleClaimQuery
    // Compare against midnight at the start of D in Stockholm. Comparing the
    // timestamptz column with a bare date would re-claim a marker written on D
    // during the UTC hours that still belong to the previous UTC date.
    .lt(
      'omc_masterdata_reminder_sent_at',
      getStockholmDateStartInstant(candidate.omcDateValue)
    )
    .select(CLAIM_SELECT_COLUMNS);

  if (staleClaim.error) {
    console.error('[ÖMC Reminder] Claim operation failed', { operation: 'stale-marker' });
    return { status: 'error', claimTimestamp: null };
  }

  const staleClaimValidation = validateMutationResult(staleClaim.data, {
    employeeId: employee.id,
    omcAssignmentId: employee.omc_date,
    marker: claimTimestamp,
  });

  if (staleClaimValidation === 'invalid') {
    console.error('[ÖMC Reminder] Claim operation returned invalid data', {
      operation: 'stale-marker',
    });
    return { status: 'error', claimTimestamp: null };
  }

  return staleClaimValidation === 'matched'
    ? { status: 'claimed', claimTimestamp }
    : { status: 'suppressed', claimTimestamp: null };
}

function formatFieldName(field: string): string {
  return FIELD_DISPLAY_NAMES[field as keyof typeof FIELD_DISPLAY_NAMES] ?? field;
}

function elapsedDayLabel(days: number): string {
  return days === 1 ? 'dag' : 'dagar';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeDigestName(employee: OmcReminderEmployee): string {
  return `${employee.first_name} ${employee.surname}`
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, ' ')
    .replace(/ +/g, ' ')
    .trim();
}

/** Generate the durable count-based digest subject. */
export function generateOmcReminderEmailSubject(candidateCount: number): string {
  return `Stena Season: ÖMC genomförd – ofullständig masterdata för ${candidateCount} medarbetare`;
}

/** Generate one Swedish text digest containing every claimed candidate once. */
export function generateOmcReminderEmailBody(candidates: OmcReminderCandidate[]): string {
  const rows = candidates.map((candidate) => {
    const employeeName = normalizeDigestName(candidate.employee);
    const missingFields = candidate.missingFields
      .map((field) => {
        const suffix = field === 'loneiva' ? 'tom' : 'saknas';
        return `${formatFieldName(field)} (${suffix})`;
      })
      .join(', ');

    return `${employeeName}\nÖMC ${candidate.omcDateValue}, ${candidate.elapsedDays} ${elapsedDayLabel(candidate.elapsedDays)} sedan\nSaknas: ${missingFields}`;
  });

  return `Följande medarbetare har genomfört ÖMC men har fortfarande ofullständig obligatorisk masterdata:\n\n${rows.join('\n\n')}\n\nVänligen följ upp för att säkerställa att masterdata kompletteras.\n\n---\nDetta är ett automatiskt genererat meddelande, vänligen svara inte på detta mail.`;
}

/** Generate the matching HTML digest with escaped employee content. */
export function generateOmcReminderEmailHtml(candidates: OmcReminderCandidate[]): string {
  const rows = candidates.map((candidate) => {
    const employeeName = escapeHtml(normalizeDigestName(candidate.employee));
    const missingFields = candidate.missingFields
      .map((field) => {
        const suffix = field === 'loneiva' ? 'tom' : 'saknas';
        return `${escapeHtml(formatFieldName(field))} (${suffix})`;
      })
      .join(', ');

    return `<li><strong>${employeeName}</strong><br />ÖMC ${escapeHtml(candidate.omcDateValue)}, ${candidate.elapsedDays} ${elapsedDayLabel(candidate.elapsedDays)} sedan<br />Saknas: ${missingFields}</li>`;
  });

  return `<html><body><p>Följande medarbetare har genomfört ÖMC men har fortfarande ofullständig obligatorisk masterdata:</p><ul>${rows.join('')}</ul><p>Vänligen följ upp för att säkerställa att masterdata kompletteras.</p><hr /><p style="color: #666; font-size: 12px;">Detta är ett automatiskt genererat meddelande, vänligen svara inte på detta mail.</p></body></html>`;
}

export function generateOmcReminderDigest(candidates: OmcReminderCandidate[]): OmcReminderDigest {
  if (candidates.length === 0) {
    throw new Error('Cannot generate an empty ÖMC reminder digest');
  }

  return {
    subject: generateOmcReminderEmailSubject(candidates.length),
    text: generateOmcReminderEmailBody(candidates),
    html: generateOmcReminderEmailHtml(candidates),
  };
}

/** Send one digest to each configured recipient. */
export async function sendOmcMasterdataReminderDigest(
  candidates: OmcReminderCandidate[]
): Promise<OmcReminderDeliveryResult> {
  if (candidates.length === 0) {
    return {
      recipientCount: 0,
      successfulRecipientDeliveries: 0,
      failedRecipientDeliveries: 0,
      outcome: 'success',
    };
  }

  let recipientLookup: Awaited<ReturnType<typeof getHrAdminEmailLookup>>;
  try {
    recipientLookup = await getHrAdminEmailLookup();
  } catch {
    console.error('[ÖMC Reminder] Recipient lookup failed');
    return {
      recipientCount: 0,
      successfulRecipientDeliveries: 0,
      failedRecipientDeliveries: 0,
      outcome: 'recipient-lookup-failure',
    };
  }

  if (recipientLookup.status === 'error') {
    console.error('[ÖMC Reminder] Recipient lookup failed');
    return {
      recipientCount: 0,
      successfulRecipientDeliveries: 0,
      failedRecipientDeliveries: 0,
      outcome: 'recipient-lookup-failure',
    };
  }

  const recipients = recipientLookup.emails;

  if (recipients.length === 0) {
    console.error('[ÖMC Reminder] No active reminder recipients configured');
    return {
      recipientCount: 0,
      successfulRecipientDeliveries: 0,
      failedRecipientDeliveries: 0,
      outcome: 'no-recipients',
    };
  }

  const digest = generateOmcReminderDigest(candidates);

  try {
    const results = await sendEmailToMultiple(
      recipients,
      digest.subject,
      digest.text,
      digest.html
    );
    const successfulRecipientDeliveries = Math.min(
      recipients.length,
      results.filter((result) => result.success).length
    );
    const failedRecipientDeliveries = recipients.length - successfulRecipientDeliveries;

    if (failedRecipientDeliveries === 0) {
      return {
        recipientCount: recipients.length,
        successfulRecipientDeliveries,
        failedRecipientDeliveries,
        outcome: 'success',
      };
    }

    console.error('[ÖMC Reminder] Digest delivery had failures', {
      recipientCount: recipients.length,
      successfulRecipientDeliveries,
      failedRecipientDeliveries,
    });

    return {
      recipientCount: recipients.length,
      successfulRecipientDeliveries,
      failedRecipientDeliveries,
      outcome: successfulRecipientDeliveries > 0 ? 'partial-failure' : 'total-failure',
    };
  } catch {
    console.error('[ÖMC Reminder] Digest delivery failed', { recipientCount: recipients.length });
    return {
      recipientCount: recipients.length,
      successfulRecipientDeliveries: 0,
      failedRecipientDeliveries: recipients.length,
      outcome: 'total-failure',
    };
  }
}

/** Clear only markers claimed by this invocation for these exact assignments. */
export async function releaseOmcMasterdataReminderClaims(
  candidates: ClaimedOmcReminderCandidate[]
): Promise<OmcReminderReleaseResult> {
  let releasedClaims = 0;
  let releaseErrors = 0;

  for (const candidate of candidates) {
    try {
      const employee = omcReminderEmployeeSchema.parse(candidate.employee);
      if (!employee.omc_date) continue;

      const supabase = createServiceRoleClient();
      const { data, error } = await supabase
        .from('employees')
        .update({ omc_masterdata_reminder_sent_at: null })
        .eq('id', employee.id)
        .eq('omc_date', employee.omc_date)
        .eq('omc_masterdata_reminder_sent_at', candidate.claimTimestamp)
        .select(CLAIM_SELECT_COLUMNS);

      if (error) {
        releaseErrors += 1;
        continue;
      }

      const validation = validateMutationResult(data, {
        employeeId: employee.id,
        omcAssignmentId: employee.omc_date,
        marker: null,
      });

      if (validation === 'invalid') {
        releaseErrors += 1;
      } else if (validation === 'matched') {
        releasedClaims += 1;
      }
    } catch {
      releaseErrors += 1;
    }
  }

  if (releaseErrors > 0) {
    console.error('[ÖMC Reminder] Exact claim release had failures', { releaseErrors });
  }

  return { releasedClaims, releaseErrors };
}

// Preserve shared recipient helpers as public service exports.
export { getHrAdminEmailLookup, getHrAdminEmails } from './notification-helpers';
