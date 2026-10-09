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
export type HrAdminEmailLookupResult =
  | { status: "success"; emails: string[] }
  | { status: "error"; emails: [] };

/** Fetch recipients while preserving query failure versus valid-empty state. */
export async function getHrAdminEmailLookup(): Promise<HrAdminEmailLookupResult> {
  const supabase = createServiceRoleClient();

  const { data: recipients, error } = await supabase
    .from("users")
    .select("email")
    .in("role", ["hr_admin", "recruiter"])
    .not("email", "is", null)
    .eq("is_active", true);

  if (error) {
    console.error("[Notifications] Recipient lookup failed");
    return { status: "error", emails: [] };
  }

  const emails = (recipients || [])
    .map((user) => user.email)
    .filter((email): email is string => typeof email === "string" && email.length > 0);

  return { status: "success", emails };
}

/** Backward-compatible recipient-only helper for existing notifications. */
export async function getHrAdminEmails(): Promise<string[]> {
  const result = await getHrAdminEmailLookup();
  return result.emails;
}
