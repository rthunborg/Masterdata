import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuthAPI, createErrorResponse } from "@/lib/server/auth";
import type { ImportantDate } from "@/lib/types/important-date";

// Force Node.js runtime for cookies() support
export const runtime = "nodejs";

export async function GET() {
  try {
    // Verify authentication (all authenticated users can view)
    await requireAuthAPI();

    const supabase = await createClient();

    // Query to get available PE3 dates (not assigned to any active employee)
    // Uses LEFT JOIN to find dates where no employee.pe3_date references them
    const { data, error } = await supabase
      .from("important_dates")
      .select(
        `
        *
      `
      )
      .eq("category", "PE3 Dates")
      .gte("date_value", new Date().toISOString().split("T")[0]) // Future dates only
      .order("date_value", { ascending: true });

    if (error) {
      console.error("Error fetching available PE3 dates:", error);
      throw new Error("Failed to fetch available PE3 dates");
    }

    // Filter out dates that are assigned to non-archived employees
    // We need to check employees table for pe3_date assignments
    const { data: assignedPE3Dates, error: assignedError } = await supabase
      .from("employees")
      .select("pe3_date")
      .not("pe3_date", "is", null)
      .eq("is_archived", false);

    if (assignedError) {
      console.error("Error checking assigned PE3 dates:", assignedError);
      throw new Error("Failed to check assigned PE3 dates");
    }

    // Create set of assigned PE3 date IDs for efficient lookup
    const assignedDateIds = new Set(
      assignedPE3Dates?.map((emp) => emp.pe3_date) || []
    );

    // Filter to only unassigned dates
    const availableDates = (data || []).filter(
      (date) => !assignedDateIds.has(date.id)
    ) as ImportantDate[];

    return NextResponse.json({
      data: availableDates,
      meta: {
        total: availableDates.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
