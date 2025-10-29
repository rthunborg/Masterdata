import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireHRAdminAPI, createErrorResponse } from "@/lib/server/auth";

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

    // Fetch all columns ordered by masterdata first, then alphabetically
    const { data: columns, error } = await supabase
      .from("column_config")
      .select("*")
      .order("is_masterdata", { ascending: false })
      .order("column_name", { ascending: true });

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
