import { NextRequest, NextResponse } from "next/server";
import { createAPIClient } from "@/lib/supabase/server-api";
import { requireAuthAPI } from "@/lib/server/auth";

export const dynamic = 'force-dynamic';

/**
 * GET /api/important-dates
 * Get important dates with optional filters
 * Query params:
 *   - category: Optional category filter (e.g., "Stena Dates", "ÖMC Dates", "PE3 Dates")
 *   - id: Optional ID filter to fetch a single date
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuthAPI(request);

    const supabase = createAPIClient(request);
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const id = searchParams.get("id");

    // Build query
    let query = supabase
      .from("important_dates")
      .select("*");

    // Apply ID filter if provided (single record lookup)
    if (id) {
      query = query.eq("id", id);
    } else {
      // Apply sorting only for list queries
      query = query
        .order("year", { ascending: true })
        .order("week_number", { ascending: true, nullsFirst: false });
    }

    // Apply category filter if provided
    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[API /important-dates] Query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch important dates" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("[API /important-dates] Unexpected error:", error);
    
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
