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
import { useTranslations } from "@/lib/i18n";
import { CapacityBadge } from "./capacity-badge";

interface EditableDateCellProps {
  value: string | null; // UUID of the selected Important Date
  displayValue: string; // Human-readable date description
  employeeId: string;
  field: string; // "stena_date", "omc_date", or "pe3_date"
  dateCategory: string; // "Stena Dates", "ÖMC Dates", or "PE3 Dates"
  allDates: ImportantDate[];
  canEdit?: boolean;
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
  onSave,
  onError,
}: EditableDateCellProps) {
  const t = useTranslations("dashboard");
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>(value || "__NONE__");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);

  // For PE3 dates, use the hook to get only available dates - only when editing
  // Pass enabled flag to prevent fetching when not in edit mode
  const isPE3Date = dateCategory === "PE3 Dates";
  const { availableDates: pe3AvailableDates, isLoading: pe3Loading } = useAvailablePE3Dates(
    isPE3Date ? value : null,
    isPE3Date && isEditing // Only fetch when it's a PE3 date AND we're editing
  );

  // Filter dates by category and future dates
  const filteredDates = useMemo(() => {
    if (dateCategory === "PE3 Dates") {
      // Use available PE3 dates from the hook (handles uniqueness)
      return pe3AvailableDates;
    }

    // For Stena and ÖMC dates, filter by category, future dates, and active status
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allDates.filter((date) => {
      // Filter by category
      if (date.category !== dateCategory) return false;

      // Filter out archived dates
      if (!date.is_active) return false;

      // Filter out past dates
      const dateValue = new Date(date.date_value);
      dateValue.setHours(0, 0, 0, 0);
      return dateValue >= today;
    });
  }, [dateCategory, pe3AvailableDates, allDates]);

  // Auto-open dropdown when entering edit mode
  useEffect(() => {
    if (isEditing && !dropdownOpen) {
      // Small delay to ensure the Select is rendered
      const timer = setTimeout(() => {
        setDropdownOpen(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isEditing, dropdownOpen]);

  // Handle click outside to cancel
  useEffect(() => {
    if (!isEditing) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      // Check if click is inside the cell
      if (cellRef.current && cellRef.current.contains(target)) {
        return;
      }
      
      // Check if click is inside a Select portal (SelectContent is rendered in a portal)
      // The portal has a data-radix-popper-content-wrapper attribute
      const isInsideSelectPortal = (target as Element).closest?.('[role="listbox"]') || 
                                    (target as Element).closest?.('[data-radix-popper-content-wrapper]');
      
      if (isInsideSelectPortal) {
        return; // Don't cancel if clicking in the dropdown
      }
      
      // Cancel editing
      setEditValue(value || "__NONE__");
      setError(null);
      setIsEditing(false);
      setDropdownOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing, value]);

  // Get tooltip text for the current date
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
    // Read-only cell - show tooltip on hover
    if (!canEdit) {
      return (
        <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
          <TooltipTrigger asChild>
            <div
              ref={cellRef}
              onClick={() => {
                setShowTooltip(true);
                setTimeout(() => setShowTooltip(false), 2000);
              }}
              className={cn(
                "px-3 py-2 rounded min-h-10 flex items-center select-text cursor-default bg-gray-50",
                "focus:outline-none focus:ring-2 focus:ring-ring",
                displayValue === t("dateDeleted") && "text-amber-600"
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
            <p>This field is read-only. Contact HR to update.</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    // Editable cell - can click to edit, show tooltip with date details
    const tooltipText = getTooltipText();

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={cellRef}
            onClick={() => {
              setEditValue(value || "__NONE__"); // Sync before editing
              setIsEditing(true);
            }}
            className={cn(
              "cursor-pointer px-3 py-2 rounded hover:bg-blue-50 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-ring min-h-10 flex items-center bg-white",
              displayValue === t("dateDeleted") && "text-amber-600"
            )}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setEditValue(value || "__NONE__"); // Sync before editing
                setIsEditing(true);
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

  // Editing mode - show dropdown
  return (
    <div ref={cellRef} className="relative">
      <Select
        value={editValue}
        open={dropdownOpen}
        onOpenChange={(open) => {
          setDropdownOpen(open);
          // If dropdown closes without changing value, exit edit mode
          if (!open) {
            setTimeout(() => {
              setIsEditing(false);
            }, 100);
          }
        }}
        onValueChange={(newValue) => {
          setEditValue(newValue);
          setDropdownOpen(false);
          // Auto-save on select
          setTimeout(() => {
            setIsLoading(true);
            setError(null);
            // Convert "__NONE__" placeholder to null for clearing the date
            const valueToSave = newValue === "__NONE__" ? null : newValue || null;
            onSave(employeeId, field, valueToSave)
              .then(() => {
                setIsEditing(false);
              })
              .catch((err) => {
                console.error("[EditableDateCell] Save failed:", err);
                const message = err instanceof Error ? err.message : "Failed to update date";
                setError(message);
                onError?.(message);
              })
              .finally(() => {
                setIsLoading(false);
              });
          }, 0);
        }}
        disabled={isLoading || (dateCategory === "PE3 Dates" && pe3Loading)}
      >
        <SelectTrigger className={cn(error ? "border-destructive" : "", "min-h-10")}>
          <SelectValue placeholder="Select a date..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__NONE__">(None)</SelectItem>
          {filteredDates.map((date) => {
            const remainingSpots = date.remaining_spots ?? 0;
            const maxSpots = date.max_spots ?? 99;
            const isFull = remainingSpots === 0;
            const isAlmostFull = remainingSpots < 5 && remainingSpots > 0;
            
            return (
              <SelectItem 
                key={date.id} 
                value={date.id}
                disabled={isFull}
                className={cn(
                  isFull && "opacity-50 cursor-not-allowed",
                )}
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className={cn(isFull && "text-muted-foreground")}>
                    {date.date_description} (Week {date.week_number}, {date.year})
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={cn(
                      "text-xs font-medium",
                      isFull ? "text-red-600" : isAlmostFull ? "text-yellow-600" : "text-muted-foreground"
                    )}>
                      {remainingSpots} left
                    </span>
                    <CapacityBadge
                      remainingSpots={remainingSpots}
                      maxSpots={maxSpots}
                    />
                  </div>
                </div>
              </SelectItem>
            );
          })}
          {filteredDates.length === 0 && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No available dates
            </div>
          )}
        </SelectContent>
      </Select>
      {error && (
        <p id={`${field}-error`} className="text-xs text-destructive mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
