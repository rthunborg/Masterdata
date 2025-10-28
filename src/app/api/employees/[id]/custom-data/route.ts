import { NextRequest, NextResponse } from "next/server";
import { requireAuthAPI, createErrorResponse } from "@/lib/server/auth";
import { CustomDataRepository } from "@/lib/server/repositories/custom-data-repository";
import { updateCustomDataSchema } from "@/lib/validation/column-validation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { UserRole } from "@/lib/types/user";

/**
 * GET /api/employees/[id]/custom-data
 * Get custom column data for a specific employee
 * Returns JSONB data from the party-specific table for the authenticated user's role
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication and get user
    const user = await requireAuthAPI();

    // Only external parties can access custom data
    if (user.role === UserRole.HR_ADMIN) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "HR Admin cannot access custom data directly",
            timestamp: new Date().toISOString(),
          },
        },
        { status: 403 }
      );
    }

    // Await params (Next.js 15+ requirement)
    const { id: employeeId } = await params;

    // Create repository instance
    const supabase = await createClient();
    const repository = new CustomDataRepository(supabase);

    // Get custom data for this employee and role
    const customData = await repository.getCustomData(employeeId, user.role);

    // Return successful response
    return NextResponse.json({
      data: {
        employee_id: employeeId,
        columns: customData,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * PATCH /api/employees/[id]/custom-data
 * Update custom column values for a specific employee
 * Creates new record if none exists, otherwise updates existing JSONB data
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication and get user
    const user = await requireAuthAPI();

    // Only external parties can update custom data
    if (user.role === UserRole.HR_ADMIN) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "HR Admin cannot update custom data",
            timestamp: new Date().toISOString(),
          },
        },
        { status: 403 }
      );
    }

    // Await params (Next.js 15+ requirement)
    const { id: employeeId } = await params;

    // Parse and validate request body
    const body = await request.json();

    let validatedData;
    try {
      validatedData = updateCustomDataSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid custom data format",
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

    // Create repository instance
    const supabase = await createClient();
    const repository = new CustomDataRepository(supabase);

    // Update custom data
    await repository.updateCustomData(employeeId, user.role, validatedData);

    // Return successful response
    return NextResponse.json({
      data: {
        employee_id: employeeId,
        updated: Object.keys(validatedData),
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
      },
    });
  } catch (error) {
    // Handle specific errors
    if (error instanceof Error) {
      // Handle "no table found" errors as forbidden
      if (error.message.includes("No custom data table found")) {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: error.message,
              timestamp: new Date().toISOString(),
            },
          },
          { status: 403 }
        );
      }
    }

    return createErrorResponse(error);
  }
}
