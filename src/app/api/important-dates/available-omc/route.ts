import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuthAPI, createErrorResponse } from "@/lib/server/auth";
import type { ImportantDate } from "@/lib/types/important-date";

// Force Node.js runtime for cookies() support
export const runtime = "nodejs";

/**
 * Helper to get Jan 1 of current year in YYYY-MM-DD format.
 * Used for the ÖMC date exception rule: Jan 1 current-year is always
 * available even if in the past.
 */
function getJan1CurrentYear(): string {
  const currentYear = new Date().getFullYear();
  return `${currentYear}-01-01`;
}

export async function GET() {
  try {
    // Verify authentication (all authenticated users can view)
    await requireAuthAPI();

    const supabase = await createClient();

    const today = new Date().toISOString().split("T")[0];
    const jan1CurrentYear = getJan1CurrentYear();

    // Query to get available ÖMC dates (not assigned to any active employee)
    // Include: future dates OR Jan 1 of current year (even if past)
    // Uses LEFT JOIN to find dates where no employee.omc_date references them
    const { data, error } = await supabase
      .from("important_dates")
      .select(
        `
        *
      `
      )
      .eq("category", "ÖMC Dates")
      .eq("is_active", true) // Only active (non-archived) dates
      .or(`date_value.gte.${today},date_value.eq.${jan1CurrentYear}`) // Future dates OR Jan 1 current year
      .order("date_value", { ascending: true });

    if (error) {
      console.error("Error fetching available ÖMC dates:", error);
      throw new Error("Failed to fetch available ÖMC dates");
    }

    // Filter out dates that are assigned to non-archived employees
    // We need to check employees table for omc_date assignments
    const { data: assignedOMCDates, error: assignedError } = await supabase
      .from("employees")
      .select("omc_date")
      .not("omc_date", "is", null)
      .eq("is_archived", false);

    if (assignedError) {
      console.error("Error checking assigned ÖMC dates:", assignedError);
      throw new Error("Failed to check assigned ÖMC dates");
    }

    // Create set of assigned ÖMC date IDs for efficient lookup
    const assignedDateIds = new Set(
      assignedOMCDates?.map((emp) => emp.omc_date) || []
    );

    // Filter to only unassigned dates with available capacity
    const filteredDates = (data || []).filter(
      (date) => !assignedDateIds.has(date.id) && date.remaining_spots > 0
    ) as ImportantDate[];

    // Sort with Jan 1 current year pinned to top, then by date ascending
    // This ensures the Jan 1 exception date appears first when present
    const availableDates = filteredDates.sort((a, b) => {
      const aIsJan1 = a.date_value === jan1CurrentYear;
      const bIsJan1 = b.date_value === jan1CurrentYear;

      // Pin Jan 1 current year to top
      if (aIsJan1 && !bIsJan1) return -1;
      if (!aIsJan1 && bIsJan1) return 1;

      // Otherwise sort by date ascending
      return a.date_value.localeCompare(b.date_value);
    });

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
