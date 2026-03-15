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
import type { StaffingNeedLastChange, StaffingLocation } from "@/lib/types/staffing-needs";
import { LOCATION_I18N_KEYS } from "@/lib/types/staffing-needs";

interface StaffingNeedsCardProps {
  location: StaffingLocation;
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
  const locationLabel = t(LOCATION_I18N_KEYS[location]);
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
    <div className="inline-flex items-center gap-1">
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
          </button>
        </TooltipTrigger>
        <TooltipContent sideOffset={6}>{tooltipText}</TooltipContent>
      </Tooltip>

      {canEdit && !isLoading && !hasError && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditClick?.();
              }}
              aria-label={`${t("editModalTitle")} ${locationLabel}`}
              data-testid="pencil-icon"
              className="inline-flex items-center justify-center rounded p-0.5 hover:bg-muted transition-colors"
            >
              <Pencil
                className="h-3 w-3 text-muted-foreground"
                aria-hidden="true"
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={4}>
            {t("editTooltip")}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
