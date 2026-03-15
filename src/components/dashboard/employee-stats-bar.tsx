"use client";

import * as React from "react";
import { useTranslations } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, UserCheck } from "lucide-react";

type EmployeeStats = {
  totalActive: number;
  crewedActive: number;
  crewedPercent: number | null;
};

interface EmployeeStatsBarProps {
  refreshToken?: number;
  className?: string;
}

export function EmployeeStatsBar({ refreshToken = 0, className }: EmployeeStatsBarProps) {
  const tDashboard = useTranslations("dashboard");
  const [stats, setStats] = React.useState<EmployeeStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        const res = await fetch("/api/employees/stats");
        if (!res.ok) throw new Error("Misslyckades att ladda anställda statistik");
        const json = (await res.json()) as { data: EmployeeStats };
        if (!cancelled) setStats(json.data);
      } catch {
        if (!cancelled) setHasError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

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
    <div className={cn("flex flex-wrap sm:flex-nowrap items-center gap-3", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3.5 py-2 text-sm shadow-sm border border-slate-200/60 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`${totalLabel}: ${hasError ? "—" : isLoading ? "…" : total}`}
          >
            <Users className="h-4 w-4 text-slate-500" />
            <span className="text-slate-600 whitespace-nowrap">{totalLabel}</span>
            <span className="font-semibold tabular-nums text-slate-900 min-w-[3ch]">
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
            className="flex items-center gap-2.5 rounded-lg bg-emerald-50 px-3.5 py-2 text-sm shadow-sm border border-emerald-200/60 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`${crewedLabel}: ${hasError ? "—" : isLoading ? "…" : crewed}${!hasError && !isLoading && percent !== null ? ` (${percent}%)` : ""}`}
          >
            <UserCheck className="h-4 w-4 text-emerald-600" />
            <span className="text-emerald-700 whitespace-nowrap">{crewedLabel}</span>
            <span className="font-semibold tabular-nums text-emerald-900 min-w-[3ch]">
              {hasError ? "—" : isLoading ? "…" : crewed}
            </span>
            {!hasError && !isLoading && percent !== null && (
              <span className="text-emerald-600/70 tabular-nums text-xs">
                ({percent}%)
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent sideOffset={6}>{hintText}</TooltipContent>
      </Tooltip>
    </div>
  );
}
