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
import { formatOMCDate, isOMCDate } from "@/lib/utils/omc-date-formatter";
import { formatDateForDisplay } from "@/lib/utils/format";
import { hasValueChanged } from "@/lib/utils/change-detection";
import dynamic from "next/dynamic";

// Lazy load Calendar component (react-day-picker is heavy) - Story 12.5: Performance optimization
const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((mod) => ({ default: mod.Calendar })),
  { ssr: false }
);

interface EditableCellProps {
  value: string | number | boolean | null;
  employeeId: string;

  field: string;
  type: "text" | "date" | "select" | "number" | "boolean";
  options?: string[]; // For select dropdowns (e.g., Gender)
  canEdit?: boolean; // Permission flag for edit access
  isChanged?: boolean; // Story 16.5: Flag for field highlighting
  isChecklistItem?: boolean; // Story 19.x: When true, boolean fields show "Klart/Nej", otherwise "Ja/Nej"
  oneMarkedAt?: string | null; // Timestamp for One field (Story 8.3)
  oneValue?: boolean | null; // One field value for Talmundo conditional editability (Story 8.4)
  employeeData?: Partial<Employee>; // For Crewing/Done field conditional editability (Story 8.5)
  category?: string; // For formatting ÖMC dates (Story 8.9)
  className?: string;
  isCompact?: boolean;
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
  isChanged = false, // Story 16.5: Default to false for backward compatibility
  isChecklistItem = true, // Story 19.x: Default to true for backward compatibility (existing boolean fields use "Klart")
  oneMarkedAt, // Timestamp for One field (Story 8.3)
  oneValue, // One field value for Talmundo conditional editability (Story 8.4)
  employeeData, // Employee data for Crewing/Done conditional editability (Story 8.5)
  category, // Category for formatting ÖMC dates (Story 8.9)
  className,
  isCompact,
  onSave,
  onError,
}: EditableCellProps) {
  const tDashboard = useTranslations("dashboard");
  const tErrors = useTranslations("errors");

  // Story 19.x: Helper to get the correct true label based on isChecklistItem flag
  // Checklist items show "Klart" (Done), non-checklist items show "Ja" (Yes)
  const getBooleanTrueLabel = () => isChecklistItem ? tDashboard("booleanTrue") : tDashboard("booleanYes");

  const [isEditing, setIsEditing] = useState(false);

  const [editValue, setEditValue] = useState<string | number | boolean>(
    value ?? (type === "boolean" ? false : type === "number" ? 0 : "")
  );
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Sync editValue when value prop changes (important for controlled Select component)
  // Story 9.10: Don't reset editValue immediately after save - keep it until value prop updates
  useEffect(() => {

    if (!isEditing) {
      // When not editing, sync editValue with value prop only if they match
      // This allows editValue to persist after save until value prop catches up
      const newEditValue = value ?? (type === "boolean" ? false : type === "number" ? 0 : "");
      const currentEditValue = editValue;
      
      // Compare values based on type
      let valuesMatch = false;
      if (type === "boolean") {
        valuesMatch = Boolean(newEditValue) === Boolean(currentEditValue);
      } else if (type === "select" || type === "text") {
        const newString = String(newEditValue);
        const currentString = String(currentEditValue ?? "");
        valuesMatch = newString === currentString;
      } else {
        valuesMatch = newEditValue === currentEditValue;
      }
      
      
      // Only sync if values match (save confirmed)
      // This prevents resetting editValue immediately after save before value prop updates
      // CRITICAL: If values don't match, keep editValue to show the updated value
      if (valuesMatch) {
        // Values match (save confirmed) - sync and clear the saved value ref
        setEditValue(newEditValue);
        // Only clear lastSavedValueRef if the value prop matches what we saved
        // IMPORTANT: Don't clear if we're still waiting for the server to process our update
        if (lastSavedValueRef.current !== null) {
          const savedString = String(lastSavedValueRef.current);
          const propString = String(newEditValue);
          if (savedString === propString) {
            lastSavedValueRef.current = null;
          } else {
            // If value prop doesn't match what we saved, it's likely a stale update
            // Keep lastSavedValueRef so displayValue continues to show the correct value
          }
        }
      } else {
        // Values don't match - keep editValue as-is to show the updated value until parent catches up
        // But if editValue was reset somehow, restore it from lastSavedValueRef

        if (lastSavedValueRef.current !== null && String(editValue) === String(value)) {
          setEditValue(lastSavedValueRef.current);
        } else {
        }
      }
    } else {
      // When editing, sync editValue if value prop updates (e.g., from real-time)
      const newEditValue = value ?? (type === "boolean" ? false : type === "number" ? 0 : "");
      if (type === "select" && String(newEditValue) !== String(editValue) && !isLoading) {
        // Value prop updated during edit (real-time sync) - update editValue
        setEditValue(newEditValue);
      }
    }
  }, [value, type, isEditing, isLoading, field, editValue]);
  
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  
  // Track the last saved value to ensure displayValue shows it until value prop updates
  const lastSavedValueRef = useRef<string | number | boolean | null>(null);
  
  // Track the previous employeeId to detect row changes (e.g., when filtering)
  const prevEmployeeIdRef = useRef<string>(employeeId);
  
  // Story 19.x: Reset internal state when row identity changes (e.g., filtering)
  // This prevents showing stale values from a previous row when React reuses component instances
  useEffect(() => {
    if (prevEmployeeIdRef.current !== employeeId) {
      // Row has changed - reset internal state
      lastSavedValueRef.current = null;
      setEditValue(value ?? (type === "boolean" ? false : type === "number" ? 0 : ""));
      setIsEditing(false);
      setError(null);
      prevEmployeeIdRef.current = employeeId;
    }
  }, [employeeId, value, type]);

  // Determine if this is the Talmundo field (Story 8.4)
  const isTalmundoField = field.toLowerCase() === 'talmundo';

  // Determine if this is the Crewing/Done field (Story 8.5)
  const isCrewingField = field.toLowerCase() === 'crewing_done';

  // Determine if this is the Lönenivå field (Story 8.6)
  const isLoneivaField = field.toLowerCase() === 'loneiva' || field.toLowerCase() === 'lönenivå';

  // Calculate conditional editability for Talmundo field (Story 8.4)
  // Talmundo can only be edited when One field is green (past 00:01 AM the following day)
  let effectiveCanEdit = canEdit;
  let tooltipMessage = '';

  if (isTalmundoField) {
    effectiveCanEdit = canEditTalmundo(oneValue ?? false, oneMarkedAt ?? null);
    if (!effectiveCanEdit) {
      tooltipMessage = tDashboard("talmundoEditBlocked");
    }
  } else if (isCrewingField) {
    // Story 8.5: Crewing/Done can only be edited when all 10 prerequisites are met
    if (employeeData) {
      effectiveCanEdit = canEditCrewingDone(employeeData as Employee);
      if (!effectiveCanEdit) {
        const incomplete = getIncompleteFields(employeeData as Employee);
        tooltipMessage = tDashboard("missingPrerequisites", { fields: incomplete.join(', ') });
      }
    }
  } else if (!canEdit) {
    tooltipMessage = tDashboard("readOnlyFieldTooltip");
  }

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Auto-open Select dropdown when entering edit mode for boolean/select types
  useEffect(() => {
    if (isEditing && (type === "boolean" || type === "select") && !selectOpen) {
      // Delay to ensure the Select component is fully rendered before opening
      // Use a longer delay to ensure React has finished rendering
      const timer = setTimeout(() => {
        setSelectOpen(true);
      }, 150);
      
      // Also try again after a short delay in case the first attempt didn't work
      const retryTimer = setTimeout(() => {
        if (isEditing && !selectOpen) {
          setSelectOpen(true);
        }
      }, 300);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(retryTimer);
      };
    }
  }, [isEditing, type, selectOpen, field]);

  const handleSave = async () => {
    // Check if value actually changed using proper change detection
    // Story 13.10: Prevent unnecessary view refreshes
    // Story 9.8: Normalize empty string to null to prevent no-op updates on empty fields
    const normalizedCurrent = editValue === "" ? null : (editValue ?? null);
    const normalizedOriginal = value ?? null;

    if (!hasValueChanged(normalizedOriginal, normalizedCurrent)) {
      // Value hasn't changed, just exit edit mode without API call
      setIsEditing(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave(employeeId, field, normalizedCurrent);
      setIsEditing(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tErrors("updateFailed");
      // Story 9.8: Localize validation errors
      if (message === "Invalid input data" || message.includes("Invalid value") || message.includes("VALIDATION_ERROR")) {
        const localizedMessage = tErrors("validation.invalidValue");
        setError(localizedMessage);
        onError?.(localizedMessage);
      } else {
        setError(message);
        onError?.(message);
      }
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
      const target = event.target as Node;

      // Check if click is outside this cell
      if (cellRef.current && !cellRef.current.contains(target)) {
        // Check if click is inside a Portal (Select, Popover, etc.)
        const isInsidePortal = (target as Element).closest?.('[data-radix-popper-content-wrapper]') ||
          (target as Element).closest?.('[role="listbox"]') ||
          (target as Element).closest?.('[role="dialog"]');

        if (isInsidePortal) {
          return; // Don't trigger click outside logic if clicking inside a portal
        }

        // Story 13.10: Use proper change detection to prevent unnecessary saves
        // Story 9.8: Normalize empty string to null
        const normalizedCurrent = editValue === "" ? null : (editValue ?? null);
        const normalizedOriginal = value ?? null;

        if (hasValueChanged(normalizedOriginal, normalizedCurrent)) {
          // Value changed, save it
          setIsLoading(true);
          setError(null);
          onSave(employeeId, field, normalizedCurrent)
            .then(() => {
              setIsEditing(false);
            })
            .catch((err: unknown) => {
              const message = err instanceof Error ? err.message : tErrors("updateFailed");
              // Story 9.8: Localize validation errors
              if (message === "Invalid input data" || message.includes("Invalid value") || message.includes("VALIDATION_ERROR")) {
                const localizedMessage = tErrors("validation.invalidValue");
                setError(localizedMessage);
                onError?.(localizedMessage);
              } else {
                setError(message);
                onError?.(message);
              }
            })
            .finally(() => {
              setIsLoading(false);
            });
        } else {
          // Value hasn't changed, just exit edit mode without API call
          setIsEditing(false);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing, editValue, showDatePicker, value, employeeId, field, onSave, onError, tErrors]);

  if (!isEditing) {
    // Read-only cell - show tooltip on click
    if (!effectiveCanEdit) {
      // Story 8.9: Format ÖMC dates as two-day range in display mode
      // Story 9.9: Show Swedish labels for boolean fields
      // Story 19.3: Format all date type fields in Swedish format
      const getReadOnlyDisplayValue = () => {
        if (type === "boolean") {
          return value ? getBooleanTrueLabel() : tDashboard("booleanFalse");
        }
        // ÖMC date field with category
        if (field === "date_value" && category && isOMCDate(category) && value) {
          return formatOMCDate(String(value));
        }
        // Story 19.3: Format date type fields in Swedish format
        if (type === "date" && value) {
          return formatDateForDisplay(String(value), category);
        }
        return value !== null && value !== undefined ? String(value) : null;
      };
      const displayValue = getReadOnlyDisplayValue();

      // Calculate One field status for visual indicator (Story 8.3)
      let badgeStatus: 'green' | 'yellow' | null = null;
      let badgeTooltip: string | null = null;

      if (type === "boolean" && field.toLowerCase() === 'one' && value === true) {
        badgeStatus = getOneFieldStatus(value as boolean, oneMarkedAt ? new Date(oneMarkedAt) : null);
        if (badgeStatus === 'yellow' && oneMarkedAt) {
          badgeTooltip = `Pending - Will be ready in ${getRemainingTime(new Date(oneMarkedAt))}`;
        } else if (badgeStatus === 'green') {
          badgeTooltip = 'Complete - Ready for editing';
        }
      } else if (type === "boolean" && value === true) {
        badgeStatus = 'green';
      } else if (isLoneivaField && value !== null && value !== undefined) {
        // Story 8.6: Show green badge for Lönenivå when value is set (0-7)
        badgeStatus = 'green';
      }

      // Use the calculated tooltipMessage or fallback to default (Story 8.4, 8.5)
      const disabledTooltip = tooltipMessage || tDashboard("readOnlyFieldTooltip");

      return (
        <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
          <TooltipTrigger asChild>
            <div
              ref={cellRef}
              onClick={(e) => {
                e.stopPropagation(); // Prevent row selection when clicking read-only cell
                setShowTooltip(true);
                setTimeout(() => setShowTooltip(false), 2000);
              }}
              className={cn(
                "px-3 py-2 rounded min-h-10 flex items-center gap-2 select-text",
                "focus:outline-none focus:ring-2 focus:ring-ring",
                // Story 16.5: Apply highlight styling for changed fields in read-only mode too
                (isTalmundoField || isCrewingField) 
                  ? "cursor-not-allowed opacity-50 bg-gray-100" 
                  : isChanged 
                    ? "cursor-default bg-amber-50 dark:bg-amber-950/20" 
                    : "cursor-default bg-gray-50",
                className
              )}
              tabIndex={0}
              role="gridcell"
              aria-readonly="true"
              aria-label={`${field} (read-only)`}
              aria-disabled={(isTalmundoField || isCrewingField) ? "true" : undefined}
            >
              {/* Story 19.4: Truncate text with ellipsis at end, show full value on hover */}
              <span 
                className="truncate min-w-0 flex-1 text-left overflow-hidden whitespace-nowrap"
                dir="ltr"
                style={{ textOverflow: 'ellipsis' }}
                title={displayValue || undefined}
              >
                {displayValue || <span className="text-muted-foreground">—</span>}
              </span>
              {badgeStatus && (
                badgeTooltip ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="shrink-0"><StatusBadge status={badgeStatus} /></span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{badgeTooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="shrink-0"><StatusBadge status={badgeStatus} /></span>
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
    // Story 8.9: Format ÖMC dates as two-day range in display mode
    // Story 9.9: Show Swedish labels for boolean fields
    // Story 9.10: Use editValue for display when it differs from value prop (shows updated value immediately after save)
    // Story 19.3: Format all date type fields in Swedish format
    const getDisplayValue = () => {
      
      // For boolean fields, compare boolean values
      if (type === "boolean") {
        const editBool = Boolean(editValue);
        const valueBool = Boolean(value);
        const lastSavedBool = lastSavedValueRef.current !== null && lastSavedValueRef.current !== undefined ? Boolean(lastSavedValueRef.current) : null;
        
        // Priority: If we have a saved value that differs from the prop, show it (save in progress)
        // Otherwise, if editValue differs from value, show editValue (transitioning state)
        if (lastSavedBool !== null && lastSavedBool !== valueBool) {
          return lastSavedBool ? getBooleanTrueLabel() : tDashboard("booleanFalse");
        }
        if (editBool !== valueBool) {
          return editBool ? getBooleanTrueLabel() : tDashboard("booleanFalse");
        }
        return valueBool ? getBooleanTrueLabel() : tDashboard("booleanFalse");
      }
      
      // For date fields with ÖMC formatting
      if (field === "date_value" && category && isOMCDate(category) && value) {
        return formatOMCDate(String(value));
      }
      
      // Story 19.3: Format date type fields in Swedish format
      if (type === "date" && value) {
        return formatDateForDisplay(String(value), category);
      }
      
      // For select/text fields, compare string values
      const editString = editValue !== null && editValue !== undefined ? String(editValue) : "";
      const valueString = value !== null && value !== undefined ? String(value) : "";
      const lastSavedString = lastSavedValueRef.current !== null && lastSavedValueRef.current !== undefined ? String(lastSavedValueRef.current) : "";
      
      // Priority: If we have a saved value that differs from the prop, show it (save in progress)
      // Otherwise, if editValue differs from value, show editValue (transitioning state)
      // This ensures we always show the most recent saved value until the prop updates
      if (lastSavedString !== "" && lastSavedString !== valueString) {
        return lastSavedString;
      }
      if (editString !== "" && editString !== valueString) {
        return editString;
      }
      return valueString || null;
    };
    
    const displayValue = getDisplayValue();

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
        badgeTooltip = 'Complete - Ready for editing';
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
        onClick={(e) => {
          // Stop propagation to prevent row selection
          e.stopPropagation();
          setIsEditing(true);
          // Auto-open dropdown immediately for select/boolean types
          if (type === "select" || type === "boolean") {
            setSelectOpen(true);
          }
        }}
        className={cn(
          "cursor-pointer px-3 py-2 rounded hover:bg-blue-50 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring min-h-10 flex items-center gap-2",
          // Story 16.5: Apply highlight styling for changed fields
          // Use highlight background when changed, otherwise use white background
          isChanged ? "bg-amber-50 dark:bg-amber-950/20" : "bg-white",
          className
        )}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation(); // Prevent row selection when using keyboard
            setIsEditing(true);
            // Auto-open dropdown immediately for select/boolean types
            if (type === "select" || type === "boolean") {
              setSelectOpen(true);
            }
          }
        }}
        role="gridcell"
        aria-readonly="false"
        aria-label={`Edit ${field}`}
      >
        {/* Story 19.4: Truncate text with ellipsis at end, show full value on hover */}
        <span 
          className="truncate min-w-0 flex-1 text-left overflow-hidden whitespace-nowrap"
          dir="ltr"
          style={{ textOverflow: 'ellipsis' }}
          title={displayValue || undefined}
        >
          {displayValue || <span className="text-muted-foreground">—</span>}
        </span>
        {badgeStatus && (
          badgeTooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="shrink-0"><StatusBadge status={badgeStatus} /></span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{badgeTooltip}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="shrink-0"><StatusBadge status={badgeStatus} /></span>
          )
        )}
      </div>
    );
  }

  return (
    <div ref={cellRef} className="relative">
      {isLoneivaField && (
        <Select
          value={editValue !== null && editValue !== undefined ? String(editValue) : "null"}
          onValueChange={(selectedValue) => {
            const parsedValue = selectedValue === "null" ? null : parseInt(selectedValue, 10);
            // Story 13.10: Check if value actually changed before saving
            const normalizedCurrent = parsedValue;
            const normalizedOriginal = (value !== null && value !== undefined) ? (typeof value === 'number' ? value : parseInt(String(value), 10)) : null;

            if (!hasValueChanged(normalizedOriginal, normalizedCurrent)) {
              // Value hasn't changed, just exit edit mode without API call
              setIsEditing(false);
              return;
            }

            setEditValue(parsedValue ?? "");
            // Auto-save on select (only if value changed)
            setTimeout(() => {
              onSave(employeeId, field, parsedValue).then(() => {
                setIsEditing(false);
              }).catch((err) => {
                const message = err instanceof Error ? err.message : tErrors("updateFailed");
                // Story 9.8: Localize validation errors
                if (message === "Invalid input data" || message.includes("Invalid value") || message.includes("VALIDATION_ERROR")) {
                  const localizedMessage = tErrors("validation.invalidValue");
                  setError(localizedMessage);
                  onError?.(localizedMessage);
                } else {
                  setError(message);
                  onError?.(message);
                }
              });
            }, 0);
          }}
          disabled={isLoading}
        >
          <SelectTrigger className={cn(error ? "border-destructive" : "", isCompact && "h-8 text-xs")}>
            <SelectValue placeholder={tDashboard('selectSalaryLevel') || 'Select salary level'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="null">{tDashboard('notSet') || 'Not Set'}</SelectItem>
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
            inputMode="text"
            className={cn(error ? "border-destructive" : "", isCompact && "h-8 text-xs")}
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
            inputMode="numeric"
            className={cn(error ? "border-destructive" : "", isCompact && "h-8 text-xs")}
          />
          {error && (
            <p className="text-xs text-destructive mt-1">
              {error}
            </p>
          )}
        </>
      )}

      {type === "boolean" && (
        <Select
          value={editValue !== null && editValue !== undefined ? String(editValue) : "false"}
          open={selectOpen}
          onOpenChange={(open) => {
            setSelectOpen(open);
            // If dropdown is closed and we're not loading, exit edit mode
            // This handles the case where user clicks outside without selecting
            if (!open && !isLoading && isEditing) {
              // Check if value changed
              const normalizedCurrent = Boolean(editValue);
              const normalizedOriginal = value !== null && value !== undefined ? Boolean(value) : false;
              if (!hasValueChanged(normalizedOriginal, normalizedCurrent)) {
                setIsEditing(false);
              }
            }
          }}
          onValueChange={async (selectedValue) => {

            const newValue = selectedValue === "true";
            // Story 9.9 & 13.10: Check if value actually changed before saving
            const normalizedCurrent = newValue;
            const normalizedOriginal = value !== null && value !== undefined ? Boolean(value) : false;

            const changed = hasValueChanged(normalizedOriginal, normalizedCurrent);

            if (!changed) {
              // Value hasn't changed, just exit edit mode without API call
              setSelectOpen(false);
              setIsEditing(false);
              return;
            }

            // CRITICAL: Update local state FIRST, before any async operations
            // This ensures displayValue shows the new value immediately
            setEditValue(newValue);
            setSelectOpen(false);
            
            // Track saved value immediately for display
            lastSavedValueRef.current = newValue;
            
            // Auto-save on select (only if value changed)
            setIsLoading(true);
            setError(null);
            
            try {
              await onSave(employeeId, field, newValue);
              // After successful save, ensure values are set
              lastSavedValueRef.current = newValue;
              setEditValue(newValue);
              
              // Exit edit mode - displayValue will show editValue/lastSavedValueRef until value prop updates
              setIsEditing(false);
            } catch (err) {
              const message = err instanceof Error ? err.message : tErrors("updateFailed");
              // Story 9.8: Localize validation errors
              if (message === "Invalid input data" || message.includes("Invalid value") || message.includes("VALIDATION_ERROR")) {
                const localizedMessage = tErrors("validation.invalidValue");
                setError(localizedMessage);
                onError?.(localizedMessage);
              } else {
                setError(message);
                onError?.(message);
              }
              // Revert editValue on error - restore original value
              setEditValue(value !== null && value !== undefined ? Boolean(value) : false);
              lastSavedValueRef.current = null;
              // Keep edit mode open on error so user can retry
            } finally {
              setIsLoading(false);
            }
          }}
          disabled={isLoading}
        >
          <SelectTrigger className={cn(error ? "border-destructive" : "", isCompact && "h-8 text-xs")}>
            <SelectValue placeholder={tDashboard("booleanFalse")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">{getBooleanTrueLabel()}</SelectItem>
            <SelectItem value="false">{tDashboard("booleanFalse")}</SelectItem>
          </SelectContent>
        </Select>
      )}

      {type === "date" && (
        <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("w-full justify-start text-left font-normal", isCompact && "h-8 text-xs")}
              disabled={isLoading}
            >
              <CalendarIcon className={cn("mr-2", isCompact ? "h-3 w-3" : "h-4 w-4")} />
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
                  // Story 13.10: Check if value actually changed before saving
                  const normalizedCurrent = dateStr;
                  const normalizedOriginal = value ?? null;

                  if (!hasValueChanged(normalizedOriginal, normalizedCurrent)) {
                    // Value hasn't changed, just exit edit mode without API call
                    setShowDatePicker(false);
                    setIsEditing(false);
                    return;
                  }

                  setEditValue(dateStr);
                  setShowDatePicker(false);
                  // Trigger save after selecting date (only if value changed)
                  setTimeout(() => {
                    onSave(employeeId, field, dateStr).catch((err) => {
                      const message = err instanceof Error ? err.message : tErrors("updateFailed");
                      // Story 9.8: Localize validation errors
                      if (message === "Invalid input data" || message.includes("Invalid value") || message.includes("VALIDATION_ERROR")) {
                        const localizedMessage = tErrors("validation.invalidValue");
                        setError(localizedMessage);
                        onError?.(localizedMessage);
                      } else {
                        setError(message);
                        onError?.(message);
                      }
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
          value={editValue !== null && editValue !== undefined ? String(editValue) : ""}
          open={selectOpen}
          onOpenChange={(open) => {
            setSelectOpen(open);
            // If dropdown is closed and we're not loading, exit edit mode
            // This handles the case where user clicks outside without selecting
            if (!open && !isLoading && isEditing) {
              // Check if value changed
              const normalizedCurrent = editValue !== null && editValue !== undefined ? String(editValue) : null;
              const normalizedOriginal = (value !== null && value !== undefined) ? String(value) : null;
              if (!hasValueChanged(normalizedOriginal, normalizedCurrent)) {
                setIsEditing(false);
              }
            }
          }}
          onValueChange={async (selectedValue) => {

            // Story 13.10: Check if value actually changed before saving
            const normalizedCurrent = selectedValue;
            const normalizedOriginal = (value !== null && value !== undefined) ? String(value) : null;

            const changed = hasValueChanged(normalizedOriginal, normalizedCurrent);

            if (!changed) {
              // Value hasn't changed, just exit edit mode without API call
              setSelectOpen(false);
              setIsEditing(false);
              return;
            }

            // CRITICAL: Update local state FIRST, before any async operations
            // This ensures displayValue shows the new value immediately
            setEditValue(selectedValue);
            setSelectOpen(false);
            
            // Track saved value immediately for display
            lastSavedValueRef.current = selectedValue;
            
            // Auto-save on select (only if value changed)
            setIsLoading(true);
            setError(null);
            
            try {

              await onSave(employeeId, field, selectedValue);
              
              // After successful save, ensure values are set
              lastSavedValueRef.current = selectedValue;
              setEditValue(selectedValue);
              
              // Exit edit mode - displayValue will show editValue/lastSavedValueRef until value prop updates
              setIsEditing(false);
            } catch (err) {
              const message = err instanceof Error ? err.message : tErrors("updateFailed");
              // Story 9.8: Localize validation errors
              if (message === "Invalid input data" || message.includes("Invalid value") || message.includes("VALIDATION_ERROR")) {
                const localizedMessage = tErrors("validation.invalidValue");
                setError(localizedMessage);
                onError?.(localizedMessage);
              } else {
                setError(message);
                onError?.(message);
              }
              // Revert editValue on error - restore original value
              setEditValue(value !== null && value !== undefined ? String(value) : "");
              lastSavedValueRef.current = null;
              // Keep edit mode open on error so user can retry
            } finally {
              setIsLoading(false);
            }
          }}
          disabled={isLoading}
        >
          <SelectTrigger className={cn(error ? "border-destructive" : "", isCompact && "h-8 text-xs")}>
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
