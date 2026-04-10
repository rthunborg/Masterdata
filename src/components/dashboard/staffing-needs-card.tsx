"use client";

import * as React from "react";
import { Pencil, MapPin } from "lucide-react";
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

  return (
    <div className="inline-flex items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-lg bg-sky-50 px-3.5 py-2 text-sm shadow-sm border border-sky-200/60 transition-colors hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`${locationLabel}: ${hasError ? "—" : isLoading ? "…" : isNotSet ? t("notSet") : `${crewReadyCount}/${headcount_need}`}`}
            onClick={onCardClick}
          >
            <MapPin className="h-4 w-4 text-sky-500" />
            <span className="text-sky-700 whitespace-nowrap">
              {locationLabel}
            </span>

            {hasError ? (
              <span className="font-semibold tabular-nums text-sky-900">—</span>
            ) : isLoading ? (
              <span className="font-semibold tabular-nums text-sky-900">…</span>
            ) : isNotSet ? (
              <span className="text-sky-400 italic" data-testid="ej-angivet">
                {t("notSet")}
              </span>
            ) : (
              <span className="font-semibold tabular-nums text-sky-900">
                {crewReadyCount}/{headcount_need}
              </span>
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
              className="inline-flex items-center justify-center rounded p-1 hover:bg-sky-100 transition-colors"
            >
              <Pencil
                className="h-3 w-3 text-sky-400"
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
