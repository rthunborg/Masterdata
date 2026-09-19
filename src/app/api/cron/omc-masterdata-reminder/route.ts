/**
 * Daily ÖMC masterdata reminder cron.
 *
 * Story 22.14 evaluates the bounded Stockholm-calendar retry window, claims
 * each current assignment atomically, and sends one digest per recipient.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  claimOmcMasterdataReminder,
  evaluateOmcMasterdataCompletion,
  getStockholmCalendarDate,
  omcReminderEmployeeSchema,
  releaseOmcMasterdataReminderClaims,
  sendOmcMasterdataReminderDigest,
  type ClaimedOmcReminderCandidate,
  type OmcReminderCandidate,
} from '@/lib/services/omc-masterdata-reminder';

export const runtime = 'nodejs';

const REMINDER_EMPLOYEE_PAGE_SIZE = 1000;

const REMINDER_EMPLOYEE_COLUMNS = [
  'id',
  'first_name',
  'surname',
  'omc_date',
  'is_terminated',
  'is_archived',
  'omc_masterdata_reminder_sent_at',
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
  'loneiva',
].join(',');

type ErrorStage =
  | 'employee-query'
  | 'evaluation'
  | 'claim'
  | 'recipient-configuration'
  | 'recipient-lookup'
  | 'delivery'
  | 'claim-release';

interface ReminderStats {
  totalEmployees: number | null;
  fetchedEmployees: number;
  evaluated: number;
  eligible: number;
  claimed: number;
  suppressedClaims: number;
  digestCandidates: number;
  successfulRecipientDeliveries: number;
  failedRecipientDeliveries: number;
  releasedClaims: number;
  processingErrors: number;
}

function emptyStats(): ReminderStats {
  return {
    totalEmployees: null,
    fetchedEmployees: 0,
    evaluated: 0,
    eligible: 0,
    claimed: 0,
    suppressedClaims: 0,
    digestCandidates: 0,
    successfulRecipientDeliveries: 0,
    failedRecipientDeliveries: 0,
    releasedClaims: 0,
    processingErrors: 0,
  };
}

class EmployeeQueryFailure extends Error {
  readonly fetchedEmployees: number;

  constructor(message: string, fetchedEmployees: number) {
    super(message);
    this.name = 'EmployeeQueryFailure';
    this.fetchedEmployees = fetchedEmployees;
  }
}

function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && !cronSecret) {
    console.error('[Cron] CRON_SECRET not configured in production - rejecting request');
    return false;
  }

  if (cronSecret) {
    if (!authHeader) {
      console.error('[Cron] Authorization header missing');
      return false;
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== cronSecret) {
      console.error('[Cron] Invalid authorization token');
      return false;
    }

    return true;
  }

  if (!isProduction) {
    console.warn('[Cron] CRON_SECRET not configured, allowing request (development mode only)');
    return true;
  }

  return false;
}

async function getReminderEmployees(): Promise<unknown[]> {
  const supabase = createServiceRoleClient();
  const employees: unknown[] = [];
  let afterEmployeeId: string | null = null;

  for (;;) {
    let query = supabase
      .from('employees')
      .select(REMINDER_EMPLOYEE_COLUMNS)
      .not('omc_date', 'is', null)
      .eq('is_terminated', false)
      .eq('is_archived', false);

    if (afterEmployeeId !== null) {
      query = query.gt('id', afterEmployeeId);
    }

    const { data, error } = await query
      .order('id', { ascending: true })
      .limit(REMINDER_EMPLOYEE_PAGE_SIZE);

    if (error) {
      throw new EmployeeQueryFailure('Employee query failed', employees.length);
    }

    if (!Array.isArray(data)) {
      throw new EmployeeQueryFailure(
        'Employee query returned invalid data',
        employees.length
      );
    }

    if (data.length === 0) break;

    const nextCursor = (data[data.length - 1] as { id?: unknown } | null)?.id;
    if (
      typeof nextCursor !== 'string' ||
      nextCursor.length === 0 ||
      (afterEmployeeId !== null && nextCursor <= afterEmployeeId)
    ) {
      throw new EmployeeQueryFailure(
        'Employee query returned a non-monotonic cursor',
        employees.length
      );
    }

    employees.push(...data);
    // Keyset pagination remains complete when PostgREST returns fewer rows than
    // requested because of a hosted max-rows cap, and does not skip rows when
    // the filtered set changes between page requests.
    afterEmployeeId = nextCursor;
  }

  return employees;
}

function toErrorDetails(errorCounts: Map<ErrorStage, number>) {
  return [...errorCounts.entries()].map(([stage, count]) => ({ stage, count }));
}

export async function GET(request: NextRequest) {
  const invocationStartedAt = new Date();
  const startTime = invocationStartedAt.getTime();
  const todayStockholm = getStockholmCalendarDate(invocationStartedAt);
  const jobId = `omc-reminder-${startTime}`;

  console.log(`[Cron ${jobId}] Starting ÖMC masterdata reminder job`);

  if (!verifyCronRequest(request)) {
    console.error(`[Cron ${jobId}] Unauthorized request`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stats = emptyStats();
  const errorCounts = new Map<ErrorStage, number>();
  const recordError = (stage: ErrorStage, count = 1, processingError = true) => {
    errorCounts.set(stage, (errorCounts.get(stage) ?? 0) + count);
    if (processingError) stats.processingErrors += count;
  };

  let employeeInputs: unknown[];
  try {
    employeeInputs = await getReminderEmployees();
    stats.totalEmployees = employeeInputs.length;
    stats.fetchedEmployees = employeeInputs.length;
  } catch (error) {
    stats.totalEmployees = null;
    stats.fetchedEmployees =
      error instanceof EmployeeQueryFailure ? error.fetchedEmployees : 0;
    recordError('employee-query');
    const result = {
      success: false,
      jobId,
      duration: `${Date.now() - startTime}ms`,
      stats,
      errorDetails: toErrorDetails(errorCounts),
    };
    console.error(`[Cron ${jobId}] Employee query failed`, { stats });
    return NextResponse.json(result, { status: 500 });
  }

  const eligibleCandidates: OmcReminderCandidate[] = [];

  for (const employeeInput of employeeInputs) {
    try {
      const employee = omcReminderEmployeeSchema.parse(employeeInput);
      const evaluation = await evaluateOmcMasterdataCompletion(employee, todayStockholm);
      stats.evaluated += 1;
      if (
        evaluation.shouldNotify &&
        evaluation.omcDateValue &&
        evaluation.elapsedDays !== null
      ) {
        stats.eligible += 1;
        eligibleCandidates.push({
          employee,
          missingFields: evaluation.missingFields,
          omcDateValue: evaluation.omcDateValue,
          elapsedDays: evaluation.elapsedDays,
        });
      }
    } catch {
      recordError('evaluation');
    }
  }

  const claimTimestamp = new Date().toISOString();
  const claimedCandidates: ClaimedOmcReminderCandidate[] = [];

  for (const candidate of eligibleCandidates) {
    try {
      const claim = await claimOmcMasterdataReminder(candidate, claimTimestamp);
      if (claim.status === 'claimed') {
        claimedCandidates.push({ ...candidate, claimTimestamp: claim.claimTimestamp });
      } else if (claim.status === 'suppressed') {
        stats.suppressedClaims += 1;
      } else {
        recordError('claim');
      }
    } catch {
      recordError('claim');
    }
  }

  stats.claimed = claimedCandidates.length;
  stats.digestCandidates = claimedCandidates.length;

  let deliveryFailed = false;

  if (claimedCandidates.length > 0) {
    let shouldReleaseClaims = false;

    try {
      const delivery = await sendOmcMasterdataReminderDigest(claimedCandidates);
      stats.successfulRecipientDeliveries = delivery.successfulRecipientDeliveries;
      stats.failedRecipientDeliveries = delivery.failedRecipientDeliveries;

      if (delivery.outcome === 'no-recipients') {
        recordError('recipient-configuration');
        deliveryFailed = true;
      } else if (delivery.outcome === 'recipient-lookup-failure') {
        recordError('recipient-lookup');
        deliveryFailed = true;
      } else if (delivery.outcome !== 'success') {
        recordError('delivery', Math.max(1, delivery.failedRecipientDeliveries));
        deliveryFailed = true;
      }

      if (
        delivery.outcome === 'total-failure' ||
        delivery.outcome === 'no-recipients' ||
        delivery.outcome === 'recipient-lookup-failure'
      ) {
        shouldReleaseClaims = true;
      }
    } catch {
      recordError('delivery');
      deliveryFailed = true;
      shouldReleaseClaims = true;
    }

    if (shouldReleaseClaims) {
      try {
        const release = await releaseOmcMasterdataReminderClaims(claimedCandidates);
        stats.releasedClaims = release.releasedClaims;
        if (release.releaseErrors > 0) {
          recordError('claim-release', release.releaseErrors);
        }
      } catch {
        recordError('claim-release');
      }
    }
  }

  const success = stats.processingErrors === 0 && !deliveryFailed;
  const result = {
    success,
    jobId,
    duration: `${Date.now() - startTime}ms`,
    stats,
    errorDetails: errorCounts.size > 0 ? toErrorDetails(errorCounts) : undefined,
  };

  if (success) {
    console.log(`[Cron ${jobId}] Job completed`, { stats });
    return NextResponse.json(result, { status: 200 });
  }

  console.error(`[Cron ${jobId}] Job completed with failures`, {
    stats,
    errorDetails: result.errorDetails,
  });
  return NextResponse.json(result, { status: deliveryFailed ? 502 : 500 });
}
