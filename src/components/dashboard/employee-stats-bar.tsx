"use client";

import * as React from "react";
import { useTranslations } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StaffingNeedsTracker } from "@/components/dashboard/staffing-needs-tracker";

type EmployeeStats = {
  totalActive: number;
  crewedActive: number;
  crewedPercent: number | null;
};

interface EmployeeStatsBarProps {
  refreshToken?: number;
  className?: string;
  /** When true, only render the staffing needs row (skip employee stats) */
  staffingOnly?: boolean;
}

export function EmployeeStatsBar({ refreshToken = 0, className, staffingOnly = false }: EmployeeStatsBarProps) {
  const tDashboard = useTranslations("dashboard");
  const tStaffing = useTranslations("staffingNeeds");
  const [stats, setStats] = React.useState<EmployeeStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    if (staffingOnly) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        const res = await fetch("/api/employees/stats");
        if (!res.ok) throw new Error("Misslyckades att ladda anställda statistik");
        const json = (await res.json()) as { data: EmployeeStats };
        if (!cancelled) setStats(json.data);
      } catch (err) {
        console.error("[EmployeeStatsBar] Failed to load stats:", err);
        if (!cancelled) setHasError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshToken, staffingOnly]);

  const total = stats?.totalActive ?? 0;
  const crewed = stats?.crewedActive ?? 0;
  const percent =
    stats?.crewedPercent === null || stats?.crewedPercent === undefined
      ? null
      : stats.crewedPercent;
  const hintText = tDashboard("statsHint") || "Arkiverade exkluderas. Uppsagda inkluderas.";
  const totalLabel = tDashboard("statsActiveEmployeesLabel") || "Anställda (aktiva)";
  const crewedLabel = tDashboard("statsCrewedEmployeesLabel") || "Besättningsklara";

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {/* Row 1: Employee stats */}
      {!staffingOnly && (
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`${totalLabel}: ${hasError ? "—" : isLoading ? "…" : total}`}
              >
                <span className="text-muted-foreground whitespace-nowrap">{totalLabel}</span>
                <span className="font-semibold tabular-nums text-right min-w-[4ch]">
                  {hasError ? "—" : isLoading ? "…" : total}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>{hintText}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`${crewedLabel}: ${hasError ? "—" : isLoading ? "…" : crewed}${!hasError && !isLoading && percent !== null ? ` (${percent}%)` : ""}`}
              >
                <span className="text-muted-foreground whitespace-nowrap">{crewedLabel}</span>
                <span className="font-semibold tabular-nums text-right min-w-[4ch]">
                  {hasError ? "—" : isLoading ? "…" : crewed}
                </span>
                {!hasError && !isLoading && percent !== null && (
                  <span className="text-muted-foreground tabular-nums text-right min-w-[6ch]">
                    ({percent}%)
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>{hintText}</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Row 2: Staffing needs (Behov) */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 justify-end">
        <span className="text-xs font-medium text-muted-foreground">{tStaffing("sectionLabel")}</span>
        <StaffingNeedsTracker refreshToken={refreshToken} />
      </div>
    </div>
  );
}
