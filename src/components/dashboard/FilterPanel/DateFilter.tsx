"use client";

import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ColumnConfig } from "@/lib/types/column-config";

export interface ImportantDate {
  id: string;
  date_value: string; // ISO date string
  category: "OMC" | "STENA" | "PE3";
  capacity?: number;
  booked?: number;
  available?: number;
  is_active?: boolean;
}

interface DateFilterProps {
  column: ColumnConfig;
  dateRange: { from: Date | null; to: Date | null };
  selectedDateIds: string[];
  availableDates: ImportantDate[];
  onDateRangeChange: (range: { from: Date | null; to: Date | null }) => void;
  onDateSelectionChange: (dateIds: string[]) => void;
}

export function DateFilter({
  column,
  dateRange,
  selectedDateIds,
  availableDates,
  onDateRangeChange,
  onDateSelectionChange,
}: DateFilterProps) {
  const [isFromOpen, setIsFromOpen] = useState(false);
  const [isToOpen, setIsToOpen] = useState(false);

  const handleFromDateSelect = (date: Date | undefined) => {
    onDateRangeChange({ from: date || null, to: dateRange.to });
    setIsFromOpen(false);
  };

  const handleToDateSelect = (date: Date | undefined) => {
    onDateRangeChange({ from: dateRange.from, to: date || null });
    setIsToOpen(false);
  };

  const handleClearRange = () => {
    onDateRangeChange({ from: null, to: null });
  };

  const handleDateCheckboxChange = (dateId: string, checked: boolean) => {
    if (checked) {
      onDateSelectionChange([...selectedDateIds, dateId]);
    } else {
      onDateSelectionChange(selectedDateIds.filter((id) => id !== dateId));
    }
  };

  const hasDateRange = dateRange.from || dateRange.to;
  const hasError =
    dateRange.from &&
    dateRange.to &&
    new Date(dateRange.from) > new Date(dateRange.to);

  return (
    <div
      className="space-y-4"
      data-testid={`date-filter-${column.db_column_name}`}
    >
      {/* Date Range Picker */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Date Range</Label>
          {hasDateRange && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearRange}
              className="h-auto p-1 text-xs"
              data-testid={`date-filter-clear-range-${column.db_column_name}`}
            >
              Clear
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {/* From Date */}
          <div>
            <Label className="text-xs text-muted-foreground">From</Label>
            <Popover open={isFromOpen} onOpenChange={setIsFromOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange.from && "text-muted-foreground"
                  )}
                  data-testid={`date-filter-from-${column.db_column_name}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    format(dateRange.from, "MMM d, yyyy")
                  ) : (
                    <span>Pick date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.from || undefined}
                  onSelect={handleFromDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* To Date */}
          <div>
            <Label className="text-xs text-muted-foreground">To</Label>
            <Popover open={isToOpen} onOpenChange={setIsToOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange.to && "text-muted-foreground"
                  )}
                  data-testid={`date-filter-to-${column.db_column_name}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.to ? (
                    format(dateRange.to, "MMM d, yyyy")
                  ) : (
                    <span>Pick date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.to || undefined}
                  onSelect={handleToDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        {hasError && (
          <p
            className="text-xs text-red-500"
            data-testid={`date-filter-error-${column.db_column_name}`}
          >
            &quot;From&quot; date must be before &quot;To&quot; date
          </p>
        )}
      </div>

      {/* Specific Dates Checkboxes */}
      {availableDates.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Or select specific dates:</Label>
          <div
            className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-2"
            data-testid={`date-filter-checkboxes-${column.db_column_name}`}
          >
            {availableDates.map((date) => (
              <div key={date.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`${column.id}-${date.id}`}
                  checked={selectedDateIds.includes(date.id)}
                  onCheckedChange={(checked) =>
                    handleDateCheckboxChange(date.id, checked as boolean)
                  }
                  data-testid={`date-filter-checkbox-${date.id}`}
                />
                <Label
                  htmlFor={`${column.id}-${date.id}`}
                  className="text-xs cursor-pointer flex-1"
                >
                  {format(new Date(date.date_value), "MMM d, yyyy")} -{" "}
                  {date.category}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
