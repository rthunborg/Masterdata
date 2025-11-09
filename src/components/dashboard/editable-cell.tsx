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
import { StatusBadge } from "./status-badge";
import { getOneFieldStatus, getRemainingTime } from "@/lib/services/one-field-status";
import { canEditTalmundo } from "@/lib/services/talmundo-validation";
import { canEditCrewingDone, getIncompleteFields } from "@/lib/services/crewing-validation";
import { useTranslations } from "@/lib/i18n";
import type { Employee } from "@/lib/types/employee";

interface EditableCellProps {
  value: string | number | boolean | null;
  employeeId: string;
  field: string;
  type: "text" | "date" | "select" | "number" | "boolean";
  options?: string[]; // For select dropdowns (e.g., Gender)
  canEdit?: boolean; // Permission flag for edit access
  oneMarkedAt?: string | null; // Timestamp for One field (Story 8.3)
  oneValue?: boolean | null; // One field value for Talmundo conditional editability (Story 8.4)
  employeeData?: Partial<Employee>; // For Crewing/Done field conditional editability (Story 8.5)
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
  oneMarkedAt, // Timestamp for One field (Story 8.3)
  oneValue, // One field value for Talmundo conditional editability (Story 8.4)
  employeeData, // Employee data for Crewing/Done conditional editability (Story 8.5)
  onSave,
  onError,
}: EditableCellProps) {
  const tDashboard = useTranslations("dashboard");
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

  // Determine if this is the Talmundo field (Story 8.4)
  const isTalmundoField = field.toLowerCase() === 'talmundo';

  // Determine if this is the Crewing/Done field (Story 8.5)
  const isCrewingField = field.toLowerCase() === 'crewing_done';

  // Determine if this is the Lönenivå field (Story 8.6)
  const isLoneivaField = field.toLowerCase() === 'loneiva' || field.toLowerCase() === 'lönenivå';

  // Calculate conditional editability for Talmundo field (Story 8.4)
  // Talmundo can only be edited when One field is green (>= 24 hours elapsed)
  let effectiveCanEdit = canEdit;
  let tooltipMessage = '';

  if (isTalmundoField) {
    effectiveCanEdit = canEditTalmundo(oneValue ?? false, oneMarkedAt ?? null);
    if (!effectiveCanEdit) {
      tooltipMessage = "Can only be edited after One field completes 24-hour sync to Talmundo system";
    }
  } else if (isCrewingField && employeeData) {
    // Calculate conditional editability for Crewing/Done field (Story 8.5)
    effectiveCanEdit = canEditCrewingDone(employeeData);
    if (!effectiveCanEdit) {
      const incomplete = getIncompleteFields(employeeData);
      tooltipMessage = tDashboard("missingPrerequisites", { fields: incomplete.join(', ') });
    }
  }

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
    if (!effectiveCanEdit) {
      const displayValue = type === "boolean" 
        ? (value ? "Yes" : "No")
        : value !== null && value !== undefined
        ? String(value)
        : null;

    // Calculate One field status for visual indicator (Story 8.3)
    let badgeStatus: 'green' | 'yellow' | null = null;
    let badgeTooltip: string | null = null;
    
    if (type === "boolean" && field.toLowerCase() === 'one' && value === true) {
      badgeStatus = getOneFieldStatus(value as boolean, oneMarkedAt ? new Date(oneMarkedAt) : null);
      if (badgeStatus === 'yellow' && oneMarkedAt) {
        badgeTooltip = `Pending - Will be ready in ${getRemainingTime(new Date(oneMarkedAt))}`;
      } else if (badgeStatus === 'green') {
        badgeTooltip = 'Complete - 24-hour waiting period elapsed';
      }
    } else if (type === "boolean" && value === true) {
      badgeStatus = 'green';
    } else if (isLoneivaField && value !== null && value !== undefined) {
      // Story 8.6: Show green badge for Lönenivå when value is set (0-7)
      badgeStatus = 'green';
    }      // Use the calculated tooltipMessage or fallback to default (Story 8.4, 8.5)
      const disabledTooltip = tooltipMessage || "This field is read-only. Contact HR to update.";

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
                "px-3 py-2 rounded min-h-10 flex items-center gap-2 select-text",
                "focus:outline-none focus:ring-2 focus:ring-ring",
                (isTalmundoField || isCrewingField) ? "cursor-not-allowed opacity-50 bg-gray-100" : "cursor-default bg-gray-50"
              )}
              tabIndex={0}
              role="gridcell"
              aria-readonly="true"
              aria-label={`${field} (read-only)`}
              aria-disabled={(isTalmundoField || isCrewingField) ? "true" : undefined}
            >
              {displayValue || <span className="text-muted-foreground">—</span>}
              {badgeStatus && (
                badgeTooltip ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span><StatusBadge status={badgeStatus} /></span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{badgeTooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <StatusBadge status={badgeStatus} />
                )
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{disabledTooltip}</p>
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

    // Calculate One field status for visual indicator (Story 8.3)
    // Show green badge for Talmundo when true and enabled (Story 8.4)
    // Show green badge for Crewing/Done when true and enabled (Story 8.5)
    // Show green badge for Lönenivå when value is set (Story 8.6)
    let badgeStatus: 'green' | 'yellow' | null = null;
    let badgeTooltip: string | null = null;
    
    if (type === "boolean" && field.toLowerCase() === 'one' && value === true) {
      badgeStatus = getOneFieldStatus(value as boolean, oneMarkedAt ? new Date(oneMarkedAt) : null);
      if (badgeStatus === 'yellow' && oneMarkedAt) {
        badgeTooltip = `Pending - Will be ready in ${getRemainingTime(new Date(oneMarkedAt))}`;
      } else if (badgeStatus === 'green') {
        badgeTooltip = 'Complete - 24-hour waiting period elapsed';
      }
    } else if (type === "boolean" && value === true && effectiveCanEdit) {
      // Story 8.4: Show green badge for Talmundo when true and enabled
      // Story 8.5: Show green badge for Crewing/Done when true and enabled
      badgeStatus = 'green';
    } else if (isLoneivaField && value !== null && value !== undefined) {
      // Story 8.6: Show green badge for Lönenivå when value is set (0-7)
      badgeStatus = 'green';
    }

    return (
      <div
        ref={cellRef}
        onClick={() => setIsEditing(true)}
        className={cn(
          "cursor-pointer px-3 py-2 rounded hover:bg-blue-50 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring min-h-10 flex items-center gap-2 bg-white"
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
        {badgeStatus && (
          badgeTooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span><StatusBadge status={badgeStatus} /></span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{badgeTooltip}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <StatusBadge status={badgeStatus} />
          )
        )}
      </div>
    );
  }

  return (
    <div ref={cellRef} className="relative">
      {isLoneivaField && (
        <Select
          value={editValue !== null && editValue !== undefined ? String(editValue) : ""}
          onValueChange={(value) => {
            const parsedValue = value === "" ? null : parseInt(value, 10);
            setEditValue(parsedValue ?? "");
            // Auto-save on select
            setTimeout(() => {
              onSave(employeeId, field, parsedValue).then(() => {
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
            <SelectValue placeholder={tDashboard('selectSalaryLevel') || 'Select salary level'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{tDashboard('notSet') || 'Not Set'}</SelectItem>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((level) => (
              <SelectItem key={level} value={level.toString()}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      
      {!isLoneivaField && type === "text" && (
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

      {!isLoneivaField && type === "number" && (
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
