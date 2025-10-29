import { NextRequest, NextResponse } from "next/server";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import {
  requireHRAdminAPI,
  createErrorResponse,
} from "@/lib/server/auth";
import { createEmployeeSchema } from "@/lib/validation/employee-schema";
import { z } from "zod";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Verify HR Admin role
    await requireHRAdminAPI();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const includeArchived = searchParams.get("includeArchived") === "true";
    const includeTerminated = searchParams.get("includeTerminated") === "true";

    // Fetch employees
    const employees = await employeeRepository.findAll({
      includeArchived,
      includeTerminated,
    });

    // Return response with data and metadata
    return NextResponse.json({
      data: employees,
      meta: {
        total: employees.length,
        filtered: employees.length,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify HR Admin role
    await requireHRAdminAPI();

    // Parse and validate request body
    const body = await request.json();
    
    let validatedData;
    try {
      validatedData = createEmployeeSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid input data",
              details: validationError.errors.reduce((acc, err) => {
                const field = err.path.join(".");
                if (!acc[field]) acc[field] = [];
                acc[field].push(err.message);
                return acc;
              }, {} as Record<string, string[]>),
              timestamp: new Date().toISOString(),
            },
          },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Create employee via repository
    const employee = await employeeRepository.create(validatedData);

    // Return successful response
    return NextResponse.json(
      {
        data: employee,
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle duplicate SSN error
    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json(
        {
          error: {
            code: "DUPLICATE_ENTRY",
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 409 }
      );
    }

    // Handle other errors
    return createErrorResponse(error);
  }
}
