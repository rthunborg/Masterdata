import { createServiceRoleClient } from "@/lib/supabase/server";
import { toZonedTime, format as formatTz } from "date-fns-tz";

const STOCKHOLM_TZ = "Europe/Stockholm";

/** Get today's date in Europe/Stockholm timezone as YYYY-MM-DD. */
export function getTodayStockholm(): string {
  const now = new Date();
  const stockholmNow = toZonedTime(now, STOCKHOLM_TZ);
  return formatTz(stockholmNow, "yyyy-MM-dd", { timeZone: STOCKHOLM_TZ });
}

/** Fetch active HR admin and recruiter email addresses. */
export async function getHrAdminEmails(): Promise<string[]> {
  const supabase = createServiceRoleClient();

  const { data: recipients, error } = await supabase
    .from("users")
    .select("email")
    .in("role", ["hr_admin", "recruiter"])
    .not("email", "is", null)
    .eq("is_active", true);

  if (error) {
    console.error("[Notifications] Failed to fetch HR admin/recruiter emails:", error);
    return [];
  }

  return (recipients || []).map((user) => user.email).filter(Boolean);
}
