import { createClient } from "@/lib/supabase/server";
import type {
  StaffingLocation,
  StaffingNeedWithProgress,
  StaffingNeedsChangelogEntry,
  StaffingNeedLastChange,
} from "@/lib/types/staffing-needs";
import { getTodayStockholm } from "@/lib/services/notification-helpers";

export class StaffingNeedsRepository {
  private async getSupabaseClient() {
    return await createClient();
  }

  async getAll(): Promise<StaffingNeedWithProgress[]> {
    const supabase = await this.getSupabaseClient();

    // 1. Fetch all staffing_needs rows with updated_by user email
    const { data: needs, error: needsError } = await supabase
      .from("staffing_needs")
      .select("*, users!updated_by(email)")
      .order("location");

    if (needsError) {
      throw new Error(`Failed to fetch staffing needs: ${needsError.message}`);
    }

    if (!needs || needs.length === 0) {
      return [];
    }

    const locations = needs.map((n) => n.location as string);

    // 2. Batch: count crew-ready employees per location
    const { data: employeeRows, error: empError } = await supabase
      .from("employees")
      .select("town_district")
      .in("town_district", locations)
      .eq("crewing_done", true)
      .eq("is_archived", false);

    if (empError) {
      throw new Error(
        `Failed to count crew-ready employees: ${empError.message}`
      );
    }

    const crewReadyCounts = new Map<string, number>();
    for (const row of employeeRows ?? []) {
      const loc = row.town_district as string;
      crewReadyCounts.set(loc, (crewReadyCounts.get(loc) ?? 0) + 1);
    }

    // 3. Batch: fetch latest changelog entry per location (get recent entries, dedupe client-side)
    const { data: changelogData, error: changelogError } = await supabase
      .from("staffing_needs_changelog")
      .select("*, users!changed_by(email)")
      .in("location", locations)
      .order("changed_at", { ascending: false });

    if (changelogError) {
      throw new Error(
        `Failed to fetch changelog: ${changelogError.message}`
      );
    }

    // Get latest entry per location
    const latestChanges = new Map<string, StaffingNeedLastChange>();
    for (const entry of changelogData ?? []) {
      if (!latestChanges.has(entry.location)) {
        const userRecord = entry.users as unknown as { email: string } | null;
        latestChanges.set(entry.location, {
          old_value: entry.old_value,
          new_value: entry.new_value,
          changed_at: entry.changed_at,
          changed_by_email: userRecord?.email ?? "unknown",
        });
      }
    }

    // 4. Assemble results
    return needs.map((need) => {
      const crewReadyCount = crewReadyCounts.get(need.location) ?? 0;
      const crewReadyPercentage =
        need.headcount_need > 0
          ? Math.round((crewReadyCount / need.headcount_need) * 100)
          : 0;
      const updatedByUser = need.users as unknown as { email: string } | null;

      return {
        id: need.id,
        location: need.location,
        headcount_need: need.headcount_need,
        updated_at: need.updated_at,
        updated_by: updatedByUser?.email ?? need.updated_by,
        crewReadyCount,
        crewReadyPercentage,
        last_change: latestChanges.get(need.location) ?? null,
      };
    });
  }

  async updateNeed(
    location: StaffingLocation,
    newValue: number,
    userId: string
  ): Promise<{ oldValue: number; newValue: number }> {
    const supabase = await this.getSupabaseClient();

    // Atomic update via RPC — SELECT FOR UPDATE prevents race conditions
    const { data, error } = await supabase.rpc("update_staffing_need", {
      p_location: location,
      p_new_value: newValue,
      p_user_id: userId,
    });

    if (error) {
      throw new Error(
        `Failed to update staffing need for ${location}: ${error.message}`
      );
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (!result) {
      throw new Error(`Staffing need not found for location: ${location}`);
    }

    return { oldValue: result.old_value, newValue: result.new_value };
  }

  async getHistory(
    location: StaffingLocation
  ): Promise<StaffingNeedsChangelogEntry[]> {
    const supabase = await this.getSupabaseClient();

    const currentYear = getTodayStockholm().slice(0, 4);
    const yearStart = `${currentYear}-01-01T00:00:00+01:00`;

    const { data, error } = await supabase
      .from("staffing_needs_changelog")
      .select("*, users!changed_by(email)")
      .eq("location", location)
      .gte("changed_at", yearStart)
      .order("changed_at", { ascending: false });

    if (error) {
      throw new Error(
        `Failed to fetch changelog history for ${location}: ${error.message}`
      );
    }

    if (!data) {
      return [];
    }

    return data.map((entry) => {
      const userRecord = entry.users as unknown as { email: string } | null;
      const email = userRecord?.email ?? "unknown";
      return {
        id: entry.id,
        location: entry.location,
        old_value: entry.old_value,
        new_value: entry.new_value,
        changed_by: entry.changed_by,
        changed_by_email: email,
        changed_at: entry.changed_at,
      };
    });
  }
}

export const staffingNeedsRepository = new StaffingNeedsRepository();
