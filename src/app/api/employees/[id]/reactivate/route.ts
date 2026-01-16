import { NextRequest, NextResponse } from "next/server";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import {
  requireEmployeeManagerAPI,
  createErrorResponse,
} from "@/lib/server/auth";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify HR Admin or Recruiter role
    await requireEmployeeManagerAPI();

    // Await params (Next.js 15+ requirement)
    const { id } = await params;

    // Story 8.13: Reactivate employee via repository (now returns warnings)
    const { employee, warnings } = await employeeRepository.reactivate(id);

    // Return successful response with warnings if any
    return NextResponse.json({
      data: employee,
      warnings,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
      },
    });
  } catch (error) {
    // Handle not found error
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    // Handle other errors
    return createErrorResponse(error);
  }
}
