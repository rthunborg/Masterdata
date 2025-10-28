"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EditableCellProps {
  value: string | number | boolean | null;
  employeeId: string;
  field: string;
  type: "text" | "date" | "select" | "number" | "boolean";
  options?: string[]; // For select dropdowns (e.g., Gender)
  canEdit?: boolean; // Permission flag for edit access
  onSave: (id: string, field: string, value: string | number | boolean | null) => Promise<void>;
  onError?: (error: string) => void;
}

export function EditableCell({
  value,
  employeeId,
  field,
  type,
  options,
  canEdit = true, // Default to true for backward compatibility
  onSave,
  onError,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string | number | boolean>(
    value ?? (type === "boolean" ? false : type === "number" ? 0 : "")
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    // If value hasn't changed, just exit edit mode
    if (editValue === value) {
      setIsEditing(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave(employeeId, field, editValue || null);
      setIsEditing(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update";
      setError(message);
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value ?? (type === "boolean" ? false : type === "number" ? 0 : ""));
    setError(null);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  // Handle click outside to save
  useEffect(() => {
    if (!isEditing || showDatePicker) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (cellRef.current && !cellRef.current.contains(event.target as Node)) {
        // Create closure to avoid stale values
        const saveValue = editValue === value ? null : editValue;
        if (saveValue !== null) {
          setIsLoading(true);
          setError(null);
          onSave(employeeId, field, editValue || null)
            .then(() => {
              setIsEditing(false);
            })
            .catch((err: unknown) => {
              const message = err instanceof Error ? err.message : "Failed to update";
              setError(message);
              onError?.(message);
            })
            .finally(() => {
              setIsLoading(false);
            });
        } else {
          setIsEditing(false);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing, editValue, showDatePicker, value, employeeId, field, onSave, onError]);

  if (!isEditing) {
    // Read-only cell - show tooltip on click
    if (!canEdit) {
      const displayValue = type === "boolean" 
        ? (value ? "Yes" : "No")
        : value !== null && value !== undefined
        ? String(value)
        : null;

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
                "focus:outline-none focus:ring-2 focus:ring-ring"
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

    // Editable cell - can click to edit
    const displayValue = type === "boolean" 
      ? (value ? "Yes" : "No")
      : value !== null && value !== undefined
      ? String(value)
      : null;

    return (
      <div
        ref={cellRef}
        onClick={() => setIsEditing(true)}
        className={cn(
          "cursor-pointer px-3 py-2 rounded hover:bg-blue-50 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring min-h-10 flex items-center bg-white"
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
    );
  }

  return (
    <div ref={cellRef} className="relative">
      {type === "text" && (
        <>
          <Input
            ref={inputRef}
            value={String(editValue)}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className={error ? "border-destructive" : ""}
            aria-invalid={!!error}
            aria-describedby={error ? `${field}-error` : undefined}
          />
          {error && (
            <p id={`${field}-error`} className="text-xs text-destructive mt-1">
              {error}
            </p>
          )}
        </>
      )}

      {type === "number" && (
        <>
          <Input
            ref={inputRef}
            type="number"
            value={String(editValue)}
            onChange={(e) => {
              const val = e.target.value;
              // Allow empty string for clearing
              if (val === "") {
                setEditValue("");
              } else {
                const num = parseFloat(val);
                if (!isNaN(num)) {
                  setEditValue(num);
                }
              }
            }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className={error ? "border-destructive" : ""}
            aria-invalid={!!error}
            aria-describedby={error ? `${field}-error` : undefined}
          />
          {error && (
            <p id={`${field}-error`} className="text-xs text-destructive mt-1">
              {error}
            </p>
          )}
        </>
      )}

      {type === "boolean" && (
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="checkbox"
            checked={Boolean(editValue)}
            onChange={(e) => {
              const newValue = e.target.checked;
              setEditValue(newValue);
              // Auto-save boolean changes
              setTimeout(() => {
                onSave(employeeId, field, newValue)
                  .then(() => {
                    setIsEditing(false);
                  })
                  .catch((err) => {
                    const message = err instanceof Error ? err.message : "Failed to update";
                    setError(message);
                    onError?.(message);
                  });
              }, 0);
            }}
            disabled={isLoading}
            className="h-4 w-4"
          />
          <label className="text-sm">
            {Boolean(editValue) ? "Yes" : "No"}
          </label>
        </div>
      )}

      {type === "date" && (
        <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
              disabled={isLoading}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {editValue ? (
                format(new Date(editValue + "T00:00:00"), "PPP")
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={editValue ? new Date(editValue + "T00:00:00") : undefined}
              onSelect={(date) => {
                if (date) {
                  const dateStr = format(date, "yyyy-MM-dd");
                  setEditValue(dateStr);
                  setShowDatePicker(false);
                  // Trigger save after selecting date
                  setTimeout(() => {
                    onSave(employeeId, field, dateStr).catch((err) => {
                      const message = err instanceof Error ? err.message : "Failed to update";
                      setError(message);
                      onError?.(message);
                    });
                  }, 0);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )}

      {type === "select" && options && (
        <Select
          value={String(editValue)}
          onValueChange={(value) => {
            setEditValue(value);
            // Auto-save on select
            setTimeout(() => {
              onSave(employeeId, field, value).then(() => {
                setIsEditing(false);
              }).catch((err) => {
                const message = err instanceof Error ? err.message : "Failed to update";
                setError(message);
                onError?.(message);
              });
            }, 0);
          }}
          disabled={isLoading}
        >
          <SelectTrigger className={error ? "border-destructive" : ""}>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
