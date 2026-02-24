import { NextRequest, NextResponse } from "next/server";
import { requireAuthAPI, createErrorResponse, createForbiddenResponse } from "@/lib/server/auth";
import { CustomDataRepository } from "@/lib/server/repositories/custom-data-repository";
import { updateCustomDataSchema } from "@/lib/validation/column-validation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { parseOrError } from "@/lib/server/api-helpers";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

/**
 * GET /api/employees/[id]/custom-data
 * Get custom column data for a specific employee from real table columns
 * Updated for Story 9.3: Real table columns architecture
 * 
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
 * Update custom column values for a specific employee (real table columns)
 * Updated for Story 9.3: Real table columns architecture
 * 
 * Permission filtering is handled by column_config.role_permissions in the application layer
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication and get user role
    const user = await requireAuthAPI();
    const userRole = user.role;

    // Await params (Next.js 15+ requirement)
    const { id: employeeId} = await params;

    // Parse and validate request body
    const body = await request.json();

    const parsed = parseOrError(updateCustomDataSchema, body);
    if (parsed instanceof NextResponse) return parsed;
    const validatedData = parsed;

    // Authorize: verify the user has edit permission for each column being updated.
    // Read column_config with the user-scoped client (RLS allows SELECT for everyone).
    const userSupabase = await createClient();
    const { data: columnConfigs, error: configError } = await userSupabase
      .from("column_config")
      .select("db_column_name, role_permissions")
      .eq("is_masterdata", false);

    if (configError) {
      throw new Error(`Misslyckades att hämta kolumnkonfiguration: ${configError.message}`);
    }

    const permsByDbColumn = new Map(
      (columnConfigs ?? []).map((c: { db_column_name: string; role_permissions: Record<string, { view: boolean; edit: boolean }> }) => [c.db_column_name, c.role_permissions])
    );

    if (userRole !== "hr_admin") {
      const forbiddenColumns = Object.keys(validatedData).filter((dbCol) => {
        const perms = permsByDbColumn.get(dbCol);
        return !perms || !perms[userRole]?.edit;
      });

      if (forbiddenColumns.length > 0) {
        return createForbiddenResponse(
          `Du har inte skrivbehörighet för kolumn(er): ${forbiddenColumns.join(", ")}`
        );
      }
    }

    // Use service role client for the actual update to bypass RLS.
    // Authorization has already been verified above.
    const serviceSupabase = createServiceRoleClient();
    const repository = new CustomDataRepository(serviceSupabase);

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
    // Log the actual error for debugging
    console.error("Misslyckades att uppdatera anpassad data:", error);
    if (error instanceof Error) {
      console.error("Felmeddelande:", error.message);
      console.error("Felstack:", error.stack);
    }
    return createErrorResponse(error);
  }
}
