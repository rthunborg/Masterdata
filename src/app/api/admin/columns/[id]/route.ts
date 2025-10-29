import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireHRAdminAPI, createErrorResponse } from "@/lib/server/auth";
import { updateColumnPermissionsSchema } from "@/lib/validation/column-validation";
import { ZodError } from "zod";

/**
 * PATCH /api/admin/columns/[id]
 * Update column permissions
 * Authorization: HR Admin only
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Enforce HR Admin role
    await requireHRAdminAPI();

    const supabase = await createClient();
    const body = await request.json();

    // Validate request body
    const validated = updateColumnPermissionsSchema.parse(body);

    // Validate edit→view constraint for each role
    for (const [role, perms] of Object.entries(validated.role_permissions)) {
      if (perms.edit && !perms.view) {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: `Role ${role}: Edit permission requires View permission`,
            },
          },
          { status: 400 }
        );
      }
    }

    // Update column permissions
    const { data: updatedColumn, error } = await supabase
      .from("column_config")
      .update({ role_permissions: validated.role_permissions })
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      // Handle not found error
      if (error.code === "PGRST116") {
        return NextResponse.json(
          {
            error: {
              code: "NOT_FOUND",
              message: "Column not found",
            },
          },
          { status: 404 }
        );
      }

      console.error("PATCH /api/admin/columns/[id] error:", error);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to update column permissions",
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedColumn });
  } catch (error) {
    console.error("PATCH /api/admin/columns/[id] error:", error);

    // Handle validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: error.errors[0]?.message || "Invalid input data",
          },
        },
        { status: 400 }
      );
    }

    return createErrorResponse(error);
  }
}

/**
 * DELETE /api/admin/columns/[id]
 * Delete a custom column
 * Authorization: HR Admin only
 * - Validates column exists and is not masterdata
 * - Removes JSONB keys from all party data tables
 * - Deletes column from column_config
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Enforce HR Admin role
    const user = await requireHRAdminAPI();

    const supabase = await createClient();
    const columnId = params.id;

    // Fetch column to verify it exists and is not masterdata
    const { data: column, error: fetchError } = await supabase
      .from("column_config")
      .select("*")
      .eq("id", columnId)
      .single();

    if (fetchError || !column) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Column not found",
          },
        },
        { status: 404 }
      );
    }

    // Prevent deletion of masterdata columns
    if (column.is_masterdata) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Masterdata columns cannot be deleted",
          },
        },
        { status: 403 }
      );
    }

    // Remove JSONB keys from all party data tables
    const columnName = column.column_name;
    const partyTables = ["sodexo_data", "omc_data", "payroll_data", "toplux_data"];

    let totalAffectedRows = 0;

    // Use service role client for RPC calls (function no longer grants execute to authenticated)
    const serviceClient = createServiceRoleClient();

    for (const table of partyTables) {
      try {
        const { data: affectedRows, error: removeError } = await serviceClient.rpc(
          "remove_jsonb_key",
          {
            table_name: table,
            key_name: columnName,
          }
        );

        if (removeError) {
          console.error(`Failed to remove key from ${table}:`, removeError);
          // Continue anyway - data inconsistency is acceptable for MVP
        } else {
          totalAffectedRows += affectedRows || 0;
        }
      } catch (rpcError) {
        console.error(`RPC error for ${table}:`, rpcError);
        // Continue with deletion even if JSONB cleanup fails
      }
    }

    // Delete column from column_config
    const { error: deleteError } = await supabase
      .from("column_config")
      .delete()
      .eq("id", columnId);

    if (deleteError) {
      console.error("Failed to delete column:", deleteError);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to delete column",
          },
        },
        { status: 500 }
      );
    }

    // Audit log
    console.log("[AUDIT] Column deleted:", {
      timestamp: new Date().toISOString(),
      user_id: user.id,
      column_id: columnId,
      column_name: columnName,
      affected_records: totalAffectedRows,
    });

    return NextResponse.json({
      data: {
        id: columnId,
        message: "Column deleted successfully",
        affected_records: totalAffectedRows,
      },
    });
  } catch (error) {
    console.error("DELETE /api/admin/columns/[id] error:", error);
    return createErrorResponse(error);
  }
}
