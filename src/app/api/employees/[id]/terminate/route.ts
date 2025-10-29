import { NextRequest, NextResponse } from "next/server";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import {
  requireHRAdminAPI,
  createErrorResponse,
} from "@/lib/server/auth";
import { terminateEmployeeSchema } from "@/lib/validation/employee-schema";
import { z } from "zod";

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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = terminateEmployeeSchema.parse(body);

    // Terminate employee via repository
    const employee = await employeeRepository.terminate(
      id,
      validatedData.termination_date,
      validatedData.termination_reason
    );

    // Return successful response
    return NextResponse.json({
      data: employee,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
      },
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Termination date and reason are required",
            details: error.errors.reduce((acc, err) => {
              acc[err.path.join(".")] = err.message;
              return acc;
            }, {} as Record<string, string>),
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

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
