import { NextRequest, NextResponse } from "next/server";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import {
  requireHRAdminAPI,
  createErrorResponse,
} from "@/lib/server/auth";
import { createEmployeeSchema } from "@/lib/validation/employee-schema";
import { normalizeSSN } from "@/lib/utils/ssn-formatter";
import { canEditTalmundo } from "@/lib/services/talmundo-validation";
import { canEditCrewingDone, getIncompleteFields } from "@/lib/services/crewing-validation";
import { z } from "zod";
import type { EmployeeFormData } from "@/lib/types/employee";

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

    // Normalize SSN to standard format (YYMMDD-XXXX) and email (convert undefined to null)
    const normalizedData: EmployeeFormData = {
      ...validatedData,
      ssn: normalizeSSN(validatedData.ssn),
      email: validatedData.email ?? null,
      gender: validatedData.gender ?? null,
      // Handle One field timestamp logic (Story 8.3)
      // If One field is set to true during creation, record the timestamp
      one_marked_at: validatedData.one === true ? new Date().toISOString() : null,
    };

    // Story 8.4: Validate Talmundo on creation
    if (validatedData.talmundo === true) {
      const canEdit = canEditTalmundo(
        validatedData.one ?? false,
        validatedData.one_marked_at ?? null
      );

      if (!canEdit) {
        return NextResponse.json(
          {
            error: {
              code: "TALMUNDO_EDIT_NOT_ALLOWED",
              message: "Cannot set Talmundo to true - One field must be completed for 24 hours first",
              timestamp: new Date().toISOString(),
            },
          },
          { status: 400 }
        );
      }
    }

    // Story 8.5: Validate Crewing/Done on creation
    if (validatedData.crewing_done === true) {
      // Check if all prerequisites are met
      if (!canEditCrewingDone(validatedData)) {
        const incomplete = getIncompleteFields(validatedData);
        return NextResponse.json(
          {
            error: {
              code: "CREWING_DONE_PREREQUISITES_NOT_MET",
              message: `Cannot set Crewing/Done to true - prerequisites not met: ${incomplete.join(', ')}`,
              details: { incompleteFields: incomplete },
              timestamp: new Date().toISOString(),
            },
          },
          { status: 400 }
        );
      }
    }

    // Create employee via repository
    const employee = await employeeRepository.create(normalizedData);

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
