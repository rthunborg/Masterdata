import { NextRequest, NextResponse } from "next/server";
import { requireAuthAPI, createErrorResponse } from "@/lib/server/auth";
import { CustomDataRepository } from "@/lib/server/repositories/custom-data-repository";
import { updateCustomDataSchema } from "@/lib/validation/column-validation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

/**
 * GET /api/employees/[id]/custom-data
 * Get custom column data for a specific employee from employees.custom_data JSONB
 * Permission filtering is handled by column_config.role_permissions in the application layer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    await requireAuthAPI();

    // Await params (Next.js 15+ requirement)
    const { id: employeeId } = await params;

    // Create repository instance
    const supabase = await createClient();
    const repository = new CustomDataRepository(supabase);

    // Get custom data for this employee (simplified - no role-based table selection)
    const customData = await repository.getCustomData(employeeId);

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
 * Update custom column values for a specific employee in employees.custom_data JSONB
 * Permission filtering is handled by column_config.role_permissions in the application layer
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    await requireAuthAPI();

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

    // Update custom data (simplified - no role-based branching)
    await repository.updateCustomData(employeeId, validatedData);

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
    return createErrorResponse(error);
  }
}
