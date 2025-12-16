import { NextRequest, NextResponse } from "next/server";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";

// Force Node.js runtime
export const runtime = "nodejs";

/**
 * Verify cron request is authentic (from Vercel Cron or other authorized source)
 *
 * In production, this verifies:
 * - Vercel Cron secret header (Authorization: Bearer <secret>)
 * - Fails closed if CRON_SECRET is not configured in production
 */
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  // In production, CRON_SECRET must be configured
  if (isProduction && !cronSecret) {
    console.error("[Cron] CRON_SECRET not configured in production - rejecting request");
    return false;
  }

  // If secret is configured, verify the request
  if (cronSecret) {
    if (!authHeader) {
      console.error("[Cron] Authorization header missing");
      return false;
    }

    const token = authHeader.replace("Bearer ", "");
    if (token !== cronSecret) {
      console.error("[Cron] Invalid authorization token");
      return false;
    }

    return true;
  }

  // For development/testing only, allow if no secret is configured
  // This is a safety measure - in production, secret should always be set
  if (!isProduction) {
    console.warn("[Cron] CRON_SECRET not configured, allowing request (development mode only)");
    return true;
  }

  // Fail closed in production if we reach here
  return false;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const jobId = `gdpr-anonymize-${startTime}`;

  try {
    console.log(`[Cron ${jobId}] Starting GDPR anonymization job`);

    // Verify request is from authorized cron service
    if (!verifyCronRequest(request)) {
      console.error(`[Cron ${jobId}] Unauthorized request`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const count = await employeeRepository.anonymizeOldArchivedEmployees();

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: `Anonymized ${count} employees`,
      meta: {
        timestamp: new Date().toISOString(),
        anonymizedCount: count,
        jobId,
        duration: `${duration}ms`,
      },
    });
  } catch (error) {
    console.error(`[Cron ${jobId}] Job failed:`, error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
