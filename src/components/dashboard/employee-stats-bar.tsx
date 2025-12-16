"use client";

import * as React from "react";
import { useTranslations } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
        if (!res.ok) throw new Error("Failed to load employee stats");
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

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">
              {tDashboard("statsActiveEmployeesLabel") || "Anställda (aktiva)"}
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {hasError ? "—" : isLoading ? "…" : total}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">
              {tDashboard("statsCrewedEmployeesLabel") || "Besättningsklara"}
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {hasError ? "—" : isLoading ? "…" : crewed}
              {!hasError && !isLoading && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {percent === null ? "" : `(${percent}%)`}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-xs text-muted-foreground">
        {tDashboard("statsHint") || "Arkiverade exkluderas. Uppsagda inkluderas."}
      </div>
    </div>
  );
}

