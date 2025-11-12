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
    
    // Store previous valid value to revert on invalid input
    const previousValueRef = React.useRef<string>(formatTimeDisplay(value) || "");

    // Sync local value when prop changes
    React.useEffect(() => {
      const formatted = formatTimeDisplay(value) || "";
      setLocalValue(formatted);
      previousValueRef.current = formatted;
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
        previousValueRef.current = "";
        return;
      }

      const parsed = parseTimeInput(localValue);
      if (parsed) {
        setLocalValue(parsed);
        onChange(parsed);
        previousValueRef.current = parsed;
      } else {
        // Invalid input - revert to previous valid value
        const revertValue = previousValueRef.current;
        setLocalValue(revertValue);
        // Do NOT call onChange - keep previous value
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
            type="text"
            inputMode="numeric"
            pattern="[0-9]{1,2}:[0-9]{2}"
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
