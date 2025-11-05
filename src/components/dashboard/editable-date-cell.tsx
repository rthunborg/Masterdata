"use client";

import { useState, useRef, useEffect } from "react";
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
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>(value || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);

  // For PE3 dates, use the hook to get only available dates
  const { availableDates: pe3AvailableDates, isLoading: pe3Loading } = useAvailablePE3Dates(
    dateCategory === "PE3 Dates" ? value : null
  );

  // Filter dates by category and future dates
  const filteredDates = (() => {
    if (dateCategory === "PE3 Dates") {
      // Use available PE3 dates from the hook (handles uniqueness)
      return pe3AvailableDates;
    }

    // For Stena and ÖMC dates, filter by category and future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allDates.filter((date) => {
      // Filter by category
      if (date.category !== dateCategory) return false;

      // Filter out past dates
      const dateValue = new Date(date.date_value);
      dateValue.setHours(0, 0, 0, 0);
      return dateValue >= today;
    });
  })();

  // Handle click outside to cancel
  useEffect(() => {
    if (!isEditing) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (cellRef.current && !cellRef.current.contains(event.target as Node)) {
        // Cancel editing
        setEditValue(value || "");
        setError(null);
        setIsEditing(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing, value]);

  // Get tooltip text for the current date
  const getTooltipText = () => {
    if (!value) return null;

    const date = allDates.find((d) => d.id === value);
    if (!date) return "(Date not found)";

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
                displayValue === "(Date not found)" && "text-amber-600"
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
            onClick={() => setIsEditing(true)}
            className={cn(
              "cursor-pointer px-3 py-2 rounded hover:bg-blue-50 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-ring min-h-10 flex items-center bg-white",
              displayValue === "(Date not found)" && "text-amber-600"
            )}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
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
        onValueChange={(newValue) => {
          setEditValue(newValue);
          // Auto-save on select
          setTimeout(() => {
            setIsLoading(true);
            setError(null);
            onSave(employeeId, field, newValue || null)
              .then(() => {
                setIsEditing(false);
              })
              .catch((err) => {
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
          <SelectItem value="">(None)</SelectItem>
          {filteredDates.map((date) => (
            <SelectItem key={date.id} value={date.id}>
              {date.date_description} (Week {date.week_number}, {date.year})
            </SelectItem>
          ))}
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
