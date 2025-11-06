import { NextRequest, NextResponse } from "next/server";
import { requireAuthAPI, createErrorResponse } from "@/lib/server/auth";
import { CustomDataRepository } from "@/lib/server/repositories/custom-data-repository";
import { updateCustomDataSchema } from "@/lib/validation/column-validation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { UserRole } from "@/lib/types/user";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

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

    // Await params (Next.js 15+ requirement)
    const { id: employeeId } = await params;

    // Create repository instance
    const supabase = await createClient();
    const repository = new CustomDataRepository(supabase);

    // For HR Admin, fetch and merge data from all party tables
    if (user.role === UserRole.HR_ADMIN) {
      const allCustomData = await repository.getAllCustomDataForEmployee(employeeId);
      return NextResponse.json({
        data: {
          employee_id: employeeId,
          columns: allCustomData,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: `req_${Date.now()}`,
        },
      });
    }

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

    // Await params (Next.js 15+ requirement)
    const { id: employeeId} = await params;

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

    // For HR Admin, update data in all relevant party tables
    if (user.role === UserRole.HR_ADMIN) {
      await repository.updateCustomDataForAllParties(employeeId, validatedData);
    } else {
      // For external parties, update their own table
      await repository.updateCustomData(employeeId, user.role, validatedData);
    }

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
