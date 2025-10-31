import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireHRAdminAPI, createErrorResponse } from "@/lib/server/auth";
import { columnConfigRepository } from "@/lib/server/repositories/column-config-repository";
import { createColumnSchema } from "@/lib/validation/column-validation";

/**
 * GET /api/admin/columns
 * List all column configurations with permissions
 * Authorization: HR Admin only
 */

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Enforce HR Admin role
    await requireHRAdminAPI();

    const supabase = await createClient();

    // Fetch all columns ordered by display_order
    const { data: columns, error } = await supabase
      .from("column_config")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      console.error("GET /api/admin/columns error:", error);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to fetch columns",
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: columns });
  } catch (error) {
    console.error("GET /api/admin/columns error:", error);
    return createErrorResponse(error);
  }
}

/**
 * POST /api/admin/columns
 * Create a new custom column
 * Authorization: HR Admin only
 */
export async function POST(request: Request) {
  try {
    // Enforce HR Admin role
    await requireHRAdminAPI();

    // Parse and validate request body
    const body = await request.json();
    const validation = createColumnSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid column data",
            details: validation.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { column_name, column_type, category, display_order } = validation.data;

    // Create column via repository
    const newColumn = await columnConfigRepository.create({
      column_name,
      column_type,
      category: category || null,
      display_order,
    });

    return NextResponse.json({ data: newColumn }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/columns error:", error);
    
    // Handle duplicate column name error
    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json(
        {
          error: {
            code: "DUPLICATE_COLUMN",
            message: error.message,
          },
        },
        { status: 409 }
      );
    }
    
    return createErrorResponse(error);
  }
}
