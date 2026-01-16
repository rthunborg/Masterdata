import { NextRequest, NextResponse } from "next/server";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import {
  requireEmployeeManagerAPI,
  createErrorResponse,
} from "@/lib/server/auth";
import { z } from "zod";

// Force Node.js runtime
export const runtime = 'nodejs';

const bulkStatusSchema = z.object({
  employeeIds: z.array(z.string()),
  action: z.enum(["archive", "unarchive", "restore"]), // allow 'restore' as alias for unarchive
});

export async function POST(request: NextRequest) {
  try {
    // Verify HR Admin or Recruiter role
    await requireEmployeeManagerAPI();

    const body = await request.json();
    const result = bulkStatusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            details: result.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { employeeIds, action } = result.data;
    const isArchived = action === "archive";

    await employeeRepository.updateArchiveStatusMany(employeeIds, isArchived);

    return NextResponse.json({
      success: true,
      meta: {
        timestamp: new Date().toISOString(),
        count: employeeIds.length,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
