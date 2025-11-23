/**
 * PE3 Deadline Notifications Cron Job
 * Story: 14.2 - PE3 Deadline Notifications (Submit / Cancel)
 * 
 * Scheduled job that runs daily at 07:00 Europe/Stockholm to check for PE3 entries
 * with submission or cancellation deadlines matching today's date.
 * 
 * Note: Vercel Cron doesn't support timezone in schedule. The schedule is set to
 * 06:00 UTC (0 6 * * 1-5), which corresponds to:
 * - 07:00 Stockholm time in winter (UTC+1)
 * - 08:00 Stockholm time in summer (UTC+2, DST)
 * 
 * The timezone calculations in the code use explicit Europe/Stockholm timezone
 * to ensure correct date comparisons regardless of when the job actually runs.
 * 
 * Endpoint: GET /api/cron/pe3-deadline-notifications
 * 
 * Authentication: Should be protected by cron service secret (e.g., Vercel Cron secret)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getTodayStockholm,
  getPe3EntriesForSubmitDeadline,
  getPe3EntriesForCancelDeadline,
  sendPe3SubmitDeadlineNotification,
  sendPe3CancelDeadlineNotification,
} from '@/lib/services/pe3-deadline-notifications';

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
 * Process PE3 deadline notifications job
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const jobId = `pe3-deadline-${startTime}`;

  console.log(`[Cron ${jobId}] Starting PE3 deadline notifications job`);

  // Verify request is from authorized cron service
  if (!verifyCronRequest(request)) {
    console.error(`[Cron ${jobId}] Unauthorized request`);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Get today's date in Europe/Stockholm timezone
    const today = getTodayStockholm();
    console.log(`[Cron ${jobId}] Processing deadlines for date: ${today} (Europe/Stockholm)`);

    // Query PE3 entries for submit deadline
    const submitEntries = await getPe3EntriesForSubmitDeadline(today);
    console.log(`[Cron ${jobId}] Found ${submitEntries.length} PE3 entries with submit deadline = ${today}`);

    // Query PE3 entries for cancel deadline
    const cancelEntries = await getPe3EntriesForCancelDeadline(today);
    console.log(`[Cron ${jobId}] Found ${cancelEntries.length} PE3 entries with cancel deadline = ${today}`);

    let submitNotificationSent = false;
    let cancelNotificationSent = false;
    const errors: string[] = [];

    // Send submit deadline notification if entries exist
    if (submitEntries.length > 0) {
      try {
        const sent = await sendPe3SubmitDeadlineNotification(submitEntries, today);
        if (sent) {
          submitNotificationSent = true;
          console.log(`[Cron ${jobId}] Submit deadline notification sent successfully`);
        } else {
          errors.push('Failed to send submit deadline notification');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Error sending submit deadline notification: ${errorMessage}`);
        console.error(`[Cron ${jobId}] Error sending submit deadline notification:`, error);
      }
    } else {
      console.log(`[Cron ${jobId}] No PE3 entries with submit deadline = ${today}, skipping notification`);
    }

    // Send cancel deadline notification if entries exist
    if (cancelEntries.length > 0) {
      try {
        const sent = await sendPe3CancelDeadlineNotification(cancelEntries, today);
        if (sent) {
          cancelNotificationSent = true;
          console.log(`[Cron ${jobId}] Cancel deadline notification sent successfully`);
        } else {
          errors.push('Failed to send cancel deadline notification');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Error sending cancel deadline notification: ${errorMessage}`);
        console.error(`[Cron ${jobId}] Error sending cancel deadline notification:`, error);
      }
    } else {
      console.log(`[Cron ${jobId}] No PE3 entries with cancel deadline = ${today}, skipping notification`);
    }

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      jobId,
      date: today,
      duration: `${duration}ms`,
      stats: {
        submitEntriesFound: submitEntries.length,
        cancelEntriesFound: cancelEntries.length,
        submitNotificationSent,
        cancelNotificationSent,
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

