import { NextRequest, NextResponse } from "next/server";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import {
  requireHRAdminAPI,
  createErrorResponse,
} from "@/lib/server/auth";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify HR Admin role
    await requireHRAdminAPI();

    // Await params (Next.js 15+ requirement)
    const { id } = await params;

    // Unarchive employee via repository
    const employee = await employeeRepository.unarchive(id);

    // Return successful response
    return NextResponse.json({
      data: employee,
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
