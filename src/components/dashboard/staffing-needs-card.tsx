"use client";

import * as React from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { StaffingNeedLastChange } from "@/lib/types/staffing-needs";
import { STAFFING_LOCATIONS } from "@/lib/types/staffing-needs";

interface StaffingNeedsCardProps {
  location: string;
  crewReadyCount: number;
  headcount_need: number;
  crewReadyPercentage: number;
  lastChange: StaffingNeedLastChange | null;
  canEdit: boolean;
  isLoading: boolean;
  hasError: boolean;
  onEditClick?: () => void;
  onCardClick?: () => void;
}

function getLocationLabel(location: string, t: (key: string) => string): string {
  const locationKeyMap: Record<string, string> = {};
  for (const loc of STAFFING_LOCATIONS) {
    // Map location name to i18n key: "Göteborg" -> "locationGoteborg", "Trelleborg" -> "locationTrelleborg"
    const key = `location${loc.replace(/[åäöÅÄÖ]/g, (c) => {
      const map: Record<string, string> = { 'ö': 'o', 'Ö': 'O', 'å': 'a', 'Å': 'A', 'ä': 'a', 'Ä': 'A' };
      return map[c] ?? c;
    }).replace(/^./, (c) => c.toUpperCase())}`;
    locationKeyMap[loc] = key;
  }
  const key = locationKeyMap[location];
  return key ? t(key) : location;
}

export function StaffingNeedsCard({
  location,
  crewReadyCount,
  headcount_need,
  crewReadyPercentage,
  lastChange,
  canEdit,
  isLoading,
  hasError,
  onEditClick,
  onCardClick,
}: StaffingNeedsCardProps) {
  const t = useTranslations("staffingNeeds");
  const locationLabel = getLocationLabel(location, t);
  const isNotSet = headcount_need === 0;
  const tooltipText = lastChange
    ? t("tooltipChangeFormat", {
        email: lastChange.changed_by_email,
        date: `${new Date(lastChange.changed_at).toLocaleDateString("sv-SE")} ${new Date(lastChange.changed_at).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}`,
        oldValue: String(lastChange.old_value),
        newValue: String(lastChange.new_value),
      })
    : t("noChangesMade");
  const percentage = Math.min(Math.round(crewReadyPercentage), 100);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`${locationLabel}: ${hasError ? "—" : isLoading ? "…" : isNotSet ? t("notSet") : `${crewReadyCount}/${headcount_need} (${percentage}%)`}`}
          onClick={onCardClick}
        >
          <span className="text-muted-foreground whitespace-nowrap">
            {locationLabel}
          </span>

          {hasError ? (
            <span className="font-semibold tabular-nums">—</span>
          ) : isLoading ? (
            <span className="font-semibold tabular-nums">…</span>
          ) : isNotSet ? (
            <span className="text-muted-foreground italic" data-testid="ej-angivet">
              {t("notSet")}
            </span>
          ) : (
            <>
              <span className="font-semibold tabular-nums">
                {crewReadyCount}/{headcount_need}
              </span>
              <span className="text-muted-foreground tabular-nums">
                ({percentage}%)
              </span>
              <div
                className="h-2 w-16 rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    percentage >= 100
                      ? "bg-green-600 dark:bg-green-500"
                      : percentage >= 50
                        ? "bg-primary"
                        : "bg-amber-500 dark:bg-amber-400"
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </>
          )}

          {canEdit && !isLoading && !hasError && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditClick?.();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      onEditClick?.();
                    }
                  }}
                  aria-label={`${t("editModalTitle")} ${locationLabel}`}
                  data-testid="pencil-icon"
                  className="inline-flex items-center justify-center rounded p-0.5 hover:bg-muted transition-colors"
                >
                  <Pencil
                    className="h-3 w-3 text-muted-foreground"
                    aria-hidden="true"
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={4}>
                {t("editTooltip")}
              </TooltipContent>
            </Tooltip>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
