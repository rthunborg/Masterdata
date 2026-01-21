import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireHRAdminAPI, createErrorResponse } from "@/lib/server/auth";
import { updateColumnConfigSchema } from "@/lib/validation/column-validation";
import { ZodError } from "zod";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

/**
 * PATCH /api/admin/columns/[id]
 * Update column permissions
 * Authorization: HR Admin only
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Enforce HR Admin role
    await requireHRAdminAPI();

    // Await params (Next.js 15+ requirement)
    const { id } = await params;

    const supabase = await createClient();
    const body = await request.json();

    // Validate request body
    const validated = updateColumnConfigSchema.parse(body);

    // If updating permissions, validate constraints
    if (validated.role_permissions) {
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
    }

    // Build update object dynamically
    const updateData: { 
      role_permissions?: Record<string, { view: boolean; edit: boolean }>; 
      category?: string | null;
      category_color?: string | null;
      column_name?: string;
      is_checklist_item?: boolean;
    } = {};
    if (validated.role_permissions) {
      updateData.role_permissions = validated.role_permissions;
    }
    if (validated.category !== undefined) {
      updateData.category = validated.category;
      // AC 2: When category is set to null, automatically remove category_color
      if (validated.category === null) {
        updateData.category_color = null;
      }
    }
    if (validated.category_color !== undefined) {
      updateData.category_color = validated.category_color;
    }
    if (validated.column_name !== undefined) {
      updateData.column_name = validated.column_name.trim();
    }
    // Story 19.5: Handle is_checklist_item updates
    if (validated.is_checklist_item !== undefined) {
      // Validate that only boolean masterdata columns can be checklist items
      const { data: column } = await supabase
        .from("column_config")
        .select("column_type, is_masterdata")
        .eq("id", id)
        .single();
      
      if (validated.is_checklist_item) {
        if (column?.column_type !== 'boolean') {
          return NextResponse.json(
            {
              error: {
                code: "VALIDATION_ERROR",
                message: "Only boolean columns can be marked as checklist items",
              },
            },
            { status: 400 }
          );
        }
        if (!column?.is_masterdata) {
          return NextResponse.json(
            {
              error: {
                code: "VALIDATION_ERROR",
                message: "Only masterdata columns can be marked as checklist items",
              },
            },
            { status: 400 }
          );
        }
      }
      updateData.is_checklist_item = validated.is_checklist_item;
    }

    // Update column
    const { data: updatedColumn, error } = await supabase
      .from("column_config")
      .update(updateData)
      .eq("id", id)
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
    // Handle validation errors (expected, don't log)
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: error.issues[0]?.message || "Invalid input data",
          },
        },
        { status: 400 }
      );
    }

    // Log unexpected errors
    console.error("PATCH /api/admin/columns/[id] error:", error);
    return createErrorResponse(error);
  }
}

/**
 * DELETE /api/admin/columns/[id]
 * Delete a custom column definition
 * Updated for Story 9.3: Real table columns architecture
 * 
 * Authorization: HR Admin only
 * - Validates column exists and is not masterdata
 * - Deletes column definition from column_config
 * - Note: Database column itself requires migration to drop
 * - Column will remain in database until migration is deployed
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Enforce HR Admin role
    await requireHRAdminAPI();

    // Await params (Next.js 15+ requirement)
    const { id: columnId } = await params;

    const supabase = await createClient();

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

    // Delete column definition from column_config
    // Note: This only removes the UI/config definition
    // The actual database column remains until a migration drops it
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
            message: "Failed to delete column definition",
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        id: columnId,
        message: "Column definition deleted successfully",
        note: "Database column will be dropped after next deployment (requires migration)",
      },
    });
  } catch (error) {
    console.error("DELETE /api/admin/columns/[id] error:", error);
    return createErrorResponse(error);
  }
}
