 import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireHRAdminAPI, createErrorResponse } from "@/lib/server/auth";
import { z } from "zod";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

/**
 * Schema for updating category color
 */
const updateCategoryColorSchema = z.object({
  color: z
    .string()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Invalid hex color format (use #RGB or #RRGGBB)")
    .nullable(),
});

/**
 * PATCH /api/admin/categories/[categoryName]
 * Update category color for all columns in a category
 * Authorization: HR Admin only
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ categoryName: string }> }
) {
  try {
    // Enforce HR Admin role
    await requireHRAdminAPI(request);

    // Await params (Next.js 15+ requirement)
    const { categoryName } = await params;
    const decodedCategoryName = decodeURIComponent(categoryName);

    const supabase = await createClient();
    const body = await request.json();

    // Validate request body
    const validated = updateCategoryColorSchema.parse(body);

    // Update all columns with this category
    const { data: updatedColumns, error } = await supabase
      .from("column_config")
      .update({ category_color: validated.color })
      .eq("category", decodedCategoryName)
      .select();

    if (error) {
      console.error("PATCH /api/admin/categories/[categoryName] error:", error);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to update category color",
          },
        },
        { status: 500 }
      );
    }

    // If no columns found with this category, return 404
    if (!updatedColumns || updatedColumns.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "No columns found with this category",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        category: decodedCategoryName,
        color: validated.color,
        affected_columns: updatedColumns.map(col => col.id),
        updated_count: updatedColumns.length,
      },
    });
  } catch (error) {
    // Handle validation errors (expected, don't log)
    if (error instanceof z.ZodError) {
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
    console.error("PATCH /api/admin/categories/[categoryName] error:", error);
    return createErrorResponse(error);
  }
}
