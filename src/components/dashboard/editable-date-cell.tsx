"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ImportantDate } from "@/lib/types/important-date";
import { useAvailablePE3Dates } from "@/lib/hooks/use-available-pe3-dates";
import { useAvailableOMCDates } from "@/lib/hooks/use-available-omc-dates";
import { useTranslations } from "@/lib/i18n";
import { CapacityBadge } from "./capacity-badge";
import { isJan1ExceptionDate, formatDateDropdownOption } from "@/lib/utils/format";
import { useDateCellEditing } from "@/lib/hooks/use-date-cell-editing";
import { Loader2 } from "lucide-react";

interface EditableDateCellProps {
  value: string | null;
  displayValue: string;
  employeeId: string;
  field: string;
  dateCategory: string;
  allDates: ImportantDate[];
  canEdit?: boolean;
  isChanged?: boolean;
  isRepaymentMode?: boolean;
  className?: string;
  isCompact?: boolean;
  onSave: (id: string, field: string, value: string | null) => Promise<void>;
  onError?: (error: string) => void;
}

export function EditableDateCell({
  value,
  displayValue,
  employeeId,
  field,
  dateCategory,
  allDates,
  canEdit = true,
  isChanged = false,
  isRepaymentMode = false,
  className,
  isCompact,
  onSave,
  onError,
}: EditableDateCellProps) {
  const t = useTranslations("dashboard");
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    isEditing,
    editValue,
    isLoading,
    error,
    dropdownOpen,
    cellRef,
    startEditing,
    setDropdownOpen,
    handleDropdownClose,
    handleValueChange,
  } = useDateCellEditing({ value, employeeId, field, onSave, onError });

  const isPE3Date = dateCategory === "PE3 Dates";
  const { availableDates: pe3AvailableDates, isLoading: pe3Loading } = useAvailablePE3Dates(
    isPE3Date ? value : null,
    isPE3Date && isEditing
  );

  const isOMCDate = dateCategory === "ÖMC Dates";
  const { availableDates: omcAvailableDates, isLoading: omcLoading } = useAvailableOMCDates(
    isOMCDate ? value : null,
    isOMCDate && isEditing
  );

  const filteredDates = useMemo(() => {
    if (isRepaymentMode) {
      const currentYear = new Date().getFullYear();
      return allDates.filter((date) => {
        if (date.category !== dateCategory) return false;
        if (date.year !== currentYear) return false;
        if (!date.is_active) return false;
        return true;
      }).sort((a, b) => a.date_value.localeCompare(b.date_value));
    }

    if (dateCategory === "PE3 Dates") {
      return pe3AvailableDates;
    }

    if (dateCategory === "ÖMC Dates") {
      return omcAvailableDates;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allDates.filter((date) => {
      if (date.category !== dateCategory) return false;
      if (!date.is_active) return false;
      const dateValue = new Date(date.date_value);
      dateValue.setHours(0, 0, 0, 0);
      return dateValue >= today;
    });
  }, [dateCategory, pe3AvailableDates, omcAvailableDates, allDates, isRepaymentMode]);

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
        tooltipTimeoutRef.current = null;
      }
    };
  }, []);

  const getTooltipText = () => {
    if (!value) return null;

    const date = allDates.find((d) => d.id === value);
    if (!date) return t("dateDeleted");

    const parts: string[] = [];

    if (date.week_number !== null) {
      parts.push(`Week ${date.week_number}`);
    }

    parts.push(`${date.year}`);
    parts.push(date.category);

    if (date.date_value) {
      parts.push(date.date_value);
    }

    return parts.join(", ");
  };

  if (!isEditing) {
    if (!canEdit) {
      return (
        <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
          <TooltipTrigger asChild>
            <div
              ref={cellRef}
              onClick={(e) => {
                e.stopPropagation();
                if (tooltipTimeoutRef.current) {
                  clearTimeout(tooltipTimeoutRef.current);
                }
                setShowTooltip(true);
                tooltipTimeoutRef.current = setTimeout(() => {
                  setShowTooltip(false);
                  tooltipTimeoutRef.current = null;
                }, 2000);
              }}
              className={cn(
                "px-3 py-2 rounded min-h-10 flex items-center select-text cursor-default",
                "focus:outline-none focus:ring-2 focus:ring-ring",
                displayValue === t("dateDeleted") && "text-amber-600",
                isChanged ? "bg-amber-50 dark:bg-amber-950/20" : "bg-gray-50",
                className
              )}
              tabIndex={0}
              role="gridcell"
              aria-readonly="true"
              aria-label={`${field} (read-only)`}
            >
              {displayValue || <span className="text-muted-foreground">—</span>}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("readOnlyFieldTooltip")}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    const tooltipText = getTooltipText();

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={cellRef}
            onClick={(e) => {
              startEditing();
              e.stopPropagation();
            }}
            className={cn(
              "cursor-pointer px-3 py-2 rounded hover:bg-blue-50 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-ring min-h-10 flex items-center",
              displayValue === t("dateDeleted") && "text-amber-600",
              isChanged ? "bg-amber-50 dark:bg-amber-950/20" : "bg-white",
              className
            )}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                startEditing();
              }
            }}
            role="gridcell"
            aria-readonly="false"
            aria-label={`Edit ${field}`}
          >
            {displayValue || <span className="text-muted-foreground">—</span>}
          </div>
        </TooltipTrigger>
        {tooltipText && (
          <TooltipContent>
            <p className="whitespace-pre-line">{tooltipText}</p>
          </TooltipContent>
        )}
      </Tooltip>
    );
  }

  return (
    <div ref={cellRef} className="relative" aria-busy={isLoading}>
      <Select
        value={editValue}
        open={dropdownOpen}
        onOpenChange={(open) => {
          setDropdownOpen(open);
          if (!open) {
            handleDropdownClose();
          }
        }}
        onValueChange={handleValueChange}
        disabled={isLoading || (dateCategory === "PE3 Dates" && pe3Loading) || (dateCategory === "ÖMC Dates" && omcLoading)}
      >
        <SelectTrigger className={cn(error ? "border-destructive" : "", "min-h-11 touch-manipulation", isLoading && "pr-8", isCompact && "min-h-8 h-8 text-xs")}>
          <SelectValue placeholder="Select a date..." />
        </SelectTrigger>
        <SelectContent>
          {((dateCategory === "PE3 Dates" && pe3Loading) || (dateCategory === "ÖMC Dates" && omcLoading)) ? (
            <div className="flex items-center justify-center gap-2 px-2 py-4 text-sm text-muted-foreground">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {t("loadingDates")}
            </div>
          ) : (
            <>
              <SelectItem value="__NONE__">(None)</SelectItem>
              {filteredDates.map((date) => {
                const remainingSpots = date.remaining_spots ?? 0;
                const maxSpots = date.max_spots ?? 99;
                const isFull = remainingSpots === 0;
                const isExceptionDate = isJan1ExceptionDate(date);
                const shouldDisable = !isRepaymentMode && isFull && !isExceptionDate;
                const showCapacity = !isRepaymentMode && !isExceptionDate;

                return (
                  <SelectItem
                    key={date.id}
                    value={date.id}
                    disabled={shouldDisable}
                    className={cn(
                      "min-h-11 touch-manipulation",
                      shouldDisable && "opacity-50 cursor-not-allowed",
                      isCompact && "min-h-8 h-8 text-xs"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className={cn(shouldDisable && "text-muted-foreground")}>
                        {formatDateDropdownOption(date, showCapacity)}
                      </span>
                      {showCapacity && (
                        <div className="flex items-center gap-1.5">
                          <CapacityBadge
                            remainingSpots={remainingSpots}
                            maxSpots={maxSpots}
                          />
                        </div>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
              {filteredDates.length === 0 && (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No available dates
                </div>
              )}
            </>
          )}
        </SelectContent>
      </Select>
      {isLoading && (
        <span
          role="status"
          aria-label="Sparar"
          data-testid="date-cell-save-spinner"
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 text-blue-600"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        </span>
      )}
      {error && (
        <p id={`${field}-error`} className="text-xs text-destructive mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
