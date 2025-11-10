/**
 * TimePicker Component
 * 
 * Time input component for selecting appointment times in HH:MM format (24-hour clock).
 * Uses HTML5 time input for native time picker support.
 * 
 * Story: 8.10 PE3 Date Time Selection
 */

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseTimeInput, formatTimeDisplay } from "@/lib/utils/time-formatter";

export interface TimePickerProps {
  /** Time value in HH:MM format */
  value: string | null;
  /** Callback when time changes */
  onChange: (value: string | null) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
  /** Additional CSS classes */
  className?: string;
  /** Input placeholder */
  placeholder?: string;
}

export const TimePicker = React.forwardRef<HTMLInputElement, TimePickerProps>(
  (
    {
      value,
      onChange,
      disabled = false,
      error,
      className,
      placeholder = "HH:MM (t.ex. 14:30)",
      ...props
    },
    ref
  ) => {
    const [localValue, setLocalValue] = React.useState<string>(
      formatTimeDisplay(value) || ""
    );

    // Sync local value when prop changes
    React.useEffect(() => {
      setLocalValue(formatTimeDisplay(value) || "");
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      setLocalValue(inputValue);
    };

    const handleBlur = () => {
      // Parse and validate on blur
      if (localValue.trim() === "") {
        onChange(null);
        setLocalValue("");
        return;
      }

      const parsed = parseTimeInput(localValue);
      if (parsed) {
        setLocalValue(parsed);
        onChange(parsed);
      } else {
        // Invalid input - revert to previous valid value
        setLocalValue(formatTimeDisplay(value) || "");
      }
    };

    const handleClear = () => {
      setLocalValue("");
      onChange(null);
    };

    return (
      <div className={cn("relative", className)}>
        <div className="relative">
          <Input
            ref={ref}
            type="time"
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            className={cn(
              "pr-10",
              error && "border-destructive focus-visible:ring-destructive"
            )}
            {...props}
          />
          {localValue && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0 hover:bg-transparent"
              onClick={handleClear}
              tabIndex={-1}
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              <span className="sr-only">Rensa tid</span>
            </Button>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

TimePicker.displayName = "TimePicker";
