/**
 * ÖMC Masterdata Reminder Cron Job
 * Story: 14.1 - ÖMC + Masterdata Completion Follow-up
 * 
 * Scheduled job that runs daily at 07:00 Europe/Stockholm to check for employees
 * with incomplete masterdata 3 days after their ÖMC completion date.
 * 
 * Note: Vercel Cron doesn't support timezone in schedule. The schedule is set to
 * 06:00 UTC (0 6 * * 1-5), which corresponds to:
 * - 07:00 Stockholm time in winter (UTC+1)
 * - 08:00 Stockholm time in summer (UTC+2, DST)
 * 
 * The timezone calculations in the code use explicit Europe/Stockholm timezone
 * to ensure correct date comparisons regardless of when the job actually runs.
 * 
 * Endpoint: GET /api/cron/omc-masterdata-reminder
 * 
 * Authentication: Should be protected by cron service secret (e.g., Vercel Cron secret)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import {
  evaluateOmcMasterdataCompletion,
  sendOmcMasterdataReminder,
} from '@/lib/services/omc-masterdata-reminder';
import { Employee } from '@/lib/types/employee';

// Force Node.js runtime for better compatibility with cron jobs
export const runtime = 'nodejs';

/**
 * Verify cron request is authentic (from Vercel Cron or other authorized source)
 * 
 * In production, this verifies:
 * - Vercel Cron secret header (Authorization: Bearer <secret>)
 * - Fails closed if CRON_SECRET is not configured in production
 */
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, CRON_SECRET must be configured
  if (isProduction && !cronSecret) {
    console.error('[Cron] CRON_SECRET not configured in production - rejecting request');
    return false;
  }

  // If secret is configured, verify the request
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

  // For development/testing only, allow if no secret is configured
  // This is a safety measure - in production, secret should always be set
  if (!isProduction) {
    console.warn('[Cron] CRON_SECRET not configured, allowing request (development mode only)');
    return true;
  }

  // Fail closed in production if we reach here
  return false;
}

/**
 * Query employees eligible for ÖMC reminder evaluation
 * 
 * Criteria:
 * - omc_date IS NOT NULL
 * - omc_date <= today - 3 days (calculated in application, not SQL due to timezone)
 * - omc_masterdata_reminder_sent_at IS NULL OR omc_date > omc_masterdata_reminder_sent_at::date
 */
async function getEligibleEmployees(): Promise<Employee[]> {
  const supabase = createServiceRoleClient();

  // Query employees with omc_date set
  // We'll filter by date in application code to handle timezone correctly
  const { data: employees, error } = await supabase
    .from('employees')
    .select('*')
    .not('omc_date', 'is', null)
    .eq('is_terminated', false) // Only active employees
    .eq('is_archived', false);

  if (error) {
    console.error('[Cron] Failed to query employees:', error);
    return [];
  }

  return (employees || []) as Employee[];
}

/**
 * Process ÖMC masterdata reminder job
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const jobId = `omc-reminder-${startTime}`;

  console.log(`[Cron ${jobId}] Starting ÖMC masterdata reminder job`);

  // Verify request is from authorized cron service
  if (!verifyCronRequest(request)) {
    console.error(`[Cron ${jobId}] Unauthorized request`);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Get eligible employees
    const employees = await getEligibleEmployees();
    console.log(`[Cron ${jobId}] Found ${employees.length} employees with omc_date set`);

    let processedCount = 0;
    let notifiedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each employee
    for (const employee of employees) {
      try {
        // Evaluate if notification should be sent
        const evaluation = await evaluateOmcMasterdataCompletion(employee);

        if (!evaluation.shouldNotify) {
          continue; // Skip if no notification needed
        }

        // Send notification
        const sent = await sendOmcMasterdataReminder(
          employee,
          evaluation.missingFields,
          evaluation.omcDateValue!
        );

        if (sent) {
          notifiedCount++;
        } else {
          errorCount++;
          errors.push(`Failed to send notification for employee ${employee.id}`);
        }

        processedCount++;
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Error processing employee ${employee.id}: ${errorMessage}`);
        console.error(`[Cron ${jobId}] Error processing employee ${employee.id}:`, error);
        // Continue processing remaining employees
      }
    }

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      jobId,
      duration: `${duration}ms`,
      stats: {
        totalEmployees: employees.length,
        processed: processedCount,
        notified: notifiedCount,
        errors: errorCount,
      },
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log(`[Cron ${jobId}] Job completed:`, result);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(`[Cron ${jobId}] Job failed:`, error);

    return NextResponse.json(
      {
        success: false,
        jobId,
        duration: `${duration}ms`,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

