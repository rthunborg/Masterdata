import { NextResponse } from "next/server";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import { requireAuthAPI, createErrorResponse } from "@/lib/server/auth";

// Force Node.js runtime for cookies() support
export const runtime = "nodejs";

/**
 * GET /api/employees/stats
 *
 * Whole-system tallies (DB-sourced):
 * - Excludes archived employees
 * - Includes terminated employees
 * - "Crewed" means crewing_done === true
 */
export async function GET() {
  try {
    // All authenticated roles can view system-wide stats (RLS still applies)
    await requireAuthAPI();

    const stats = await employeeRepository.getSystemStats();

    return NextResponse.json({
      data: stats,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

