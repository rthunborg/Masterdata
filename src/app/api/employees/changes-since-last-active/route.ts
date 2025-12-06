import { NextRequest, NextResponse } from "next/server";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import {
  requireAuthAPI,
  createErrorResponse,
} from "@/lib/server/auth";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

/**
 * GET /api/employees/changes-since-last-active
 * 
 * Story: 16.2 - API Endpoint for Change Detection
 * 
 * Returns employee column changes since the user's last active timestamp.
 * Only returns changes for:
 * - Masterdata columns
 * - Columns the user has view permission for
 * - Non-archived employees
 * 
 * Query Parameters:
 * - baseline (optional): Override timestamp (defaults to user.last_active_at)
 * 
 * Response:
 * {
 *   changedEmployees: [
 *     {
 *       employeeId: "uuid",
 *       changedColumns: ["first_name", "email"],
 *       lastChangeAt: "2025-01-15T10:00:00Z"
 *     }
 *   ],
 *   totalCount: 3,
 *   userLastActive: "2025-01-10T08:00:00Z"
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await requireAuthAPI();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const baselineParam = searchParams.get("baseline");
    
    // Validate baseline parameter if provided
    let baseline: string | null = null;
    if (baselineParam) {
      const baselineDate = new Date(baselineParam);
      if (isNaN(baselineDate.getTime())) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_PARAMETER",
              message: "Invalid baseline timestamp format. Expected ISO 8601 format (e.g., 2025-01-10T08:00:00Z)",
            },
          },
          { status: 400 }
        );
      }
      baseline = baselineDate.toISOString();
    } else {
      // Use provided baseline or user's last_active_at
      // If user has no last_active_at (first-time user), use null
      baseline = user.last_active_at || null;
    }

    // Get changes since last active
    const changedEmployees = await employeeRepository.getChangesSinceLastActive(
      user.id,
      user.role,
      baseline
    );

    // Return response
    return NextResponse.json({
      changedEmployees,
      totalCount: changedEmployees.length,
      userLastActive: baseline,
    });
  } catch (error) {
    console.error('[GET /api/employees/changes-since-last-active] Error:', error);
    return createErrorResponse(error);
  }
}

