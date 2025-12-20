"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parseOMCDateInput,
  formatOMCDate,
  validateOMCDateRange,
} from "@/lib/utils/omc-date-formatter";
import { format } from "date-fns";

interface OMCDatePickerProps {
  value: string; // ISO date string (start date)
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

/**
 * ÖMC Date Picker Component
 * 
 * Allows selecting two consecutive days for ÖMC training dates.
 * Supports both calendar selection and text input.
 * 
 * Supported text formats:
 * - "8-9/3" → 8th-9th of March
 * - "8-9 mars" → 8th-9th of March
 * - "8-9 mars 2025" → 8th-9th of March 2025
 * 
 * Story 8.9: ÖMC Two-Day Date Format
 */
export function OMCDatePicker({
  value,
  onChange,
  disabled = false,
  error,
}: OMCDatePickerProps) {
  const [textInput, setTextInput] = React.useState("");
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  // Parse value to start and end dates
  const startDate = React.useMemo(() => {
    return value ? new Date(value) : undefined;
  }, [value]);
  
  const endDate = React.useMemo(() => {
    if (!startDate) return undefined;
    const end = new Date(startDate);
    end.setDate(end.getDate() + 1);
    return end;
  }, [startDate]);

  // Display formatted value - memoized to ensure it updates when value changes
  const displayValue = React.useMemo(() => {
    return startDate ? formatOMCDate(startDate, 'sv-SE') : "";
  }, [startDate]);

  // Clear textInput when value changes externally (e.g., when year changes)
  // This ensures the displayValue is shown instead of stale textInput
  React.useEffect(() => {
    if (value && textInput && textInput !== displayValue) {
      // Clear textInput if it doesn't match the current displayValue
      // This happens when value changes externally (like when year changes)
      setTextInput("");
    }
  }, [value, displayValue, textInput]);

  // Handle calendar date selection
  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return;

    // Calculate end date
    const end = new Date(date);
    end.setDate(end.getDate() + 1);

    // Validate consecutive days
    const validation = validateOMCDateRange(date, end);
    if (!validation.valid) {
      setValidationError(validation.error || "Ogiltigt datumintervall");
      return;
    }

    // Convert to ISO string (YYYY-MM-DD) and update
    const isoDate = format(date, 'yyyy-MM-dd');
    onChange(isoDate);
    setValidationError(null);
    setCalendarOpen(false);
  };

  // Handle text input change
  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setTextInput(input);

    if (!input.trim()) {
      setValidationError(null);
      return;
    }

    // Try to parse input
    const parsed = parseOMCDateInput(input);
    if (parsed) {
      // Valid input - update value
      const isoDate = format(parsed.startDate, 'yyyy-MM-dd');
      onChange(isoDate);
      setValidationError(null);
    } else {
      // Invalid input - show error
      setValidationError('Ogiltigt format. Använd t.ex. "8-9/3" eller "8-9 mars 2025"');
    }
  };

  // Handle text input blur
  const handleTextInputBlur = () => {
    // Clear text input on blur (display will show formatted value)
    setTextInput("");
  };

  // Modifier for calendar to highlight consecutive days
  const modifiers = React.useMemo(() => {
    if (!startDate || !endDate) return {};
    
    return {
      selected: [startDate, endDate],
      range_start: startDate,
      range_end: endDate,
      range_middle: [],
    };
  }, [startDate, endDate]);

  return (
    <div className="space-y-2">
      {/* Text Input Field */}
      <div className="space-y-1">
        <Label htmlFor="omc-date-input">
          ÖMC-datum (två på varandra följande dagar)
        </Label>
        <Input
          id="omc-date-input"
          type="text"
          placeholder=""
          value={textInput || displayValue}
          onChange={handleTextInputChange}
          onBlur={handleTextInputBlur}
          disabled={disabled}
          className={cn(
            validationError || error ? "border-red-500" : ""
          )}
        />
        {(validationError || error) && (
          <p className="text-sm text-red-500">
            {validationError || error}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Format: &quot;8-9/3&quot; för 8-9 mars, eller &quot;8-9 mars 2025&quot;
        </p>
      </div>

      {/* Calendar Picker */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayValue || "Välj datum från kalender"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 space-y-2">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={handleCalendarSelect}
              modifiers={modifiers}
              disabled={disabled}
              initialFocus
            />
            {startDate && (
              <div className="text-sm text-center text-muted-foreground border-t pt-2">
                Valt: <span className="font-medium">{displayValue}</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground border-t pt-2">
              <p className="font-medium mb-1">Så här fungerar ÖMC-datum:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Välj startdatum från kalendern</li>
                <li>Slutdatum sätts automatiskt (+1 dag)</li>
                <li>ÖMC-utbildningen sträcker sig över två dagar</li>
              </ul>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Visual representation of selected range */}
      {startDate && endDate && !validationError && (
        <div className="flex items-center gap-2 text-sm p-2 bg-blue-50 border border-blue-200 rounded-md">
          <span className="text-blue-700 font-medium">
            ✓ Valt intervall:
          </span>
          <span className="text-blue-900">
            {formatOMCDate(startDate, 'sv-SE')}
          </span>
        </div>
      )}
    </div>
  );
}
