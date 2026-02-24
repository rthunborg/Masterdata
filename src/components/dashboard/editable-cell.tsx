"use client";

import { useState, useRef, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
import { executeSave, type SaveContext } from "./cell-editors/save-handler";
import { calculateBadge } from "./cell-editors/badge-logic";
import { TextEditor } from "./cell-editors/TextEditor";
import { NumberEditor } from "./cell-editors/NumberEditor";
import { LoneivaEditor } from "./cell-editors/LoneivaEditor";
import { BooleanEditor } from "./cell-editors/BooleanEditor";
import { DateEditor } from "./cell-editors/DateEditor";
import { SelectEditor } from "./cell-editors/SelectEditor";
import { canEditTalmundo } from "@/lib/services/talmundo-validation";
import { canEditCrewingDone, getIncompleteFields } from "@/lib/services/crewing-validation";
import { useTranslations } from "@/lib/i18n";
import type { Employee } from "@/lib/types/employee";
import { formatOMCDate, isOMCDate } from "@/lib/utils/omc-date-formatter";
import { formatDateForDisplay } from "@/lib/utils/format";
import { hasValueChanged } from "@/lib/utils/change-detection";

interface EditableCellProps {
  value: string | number | boolean | null;
  employeeId: string;

  field: string;
  type: "text" | "date" | "select" | "number" | "boolean";
  options?: string[]; // For select dropdowns (e.g., Gender)
  canEdit?: boolean; // Permission flag for edit access
  isChanged?: boolean; // Story 16.5: Flag for field highlighting
  isChecklistItem?: boolean; // Story 19.x: When true, boolean fields show "Klart/Nej", otherwise "Ja/Nej"
  /** When 'checkbox', boolean shows only a checkbox (no "Ja"/"Nej" text). Used for repayment fields. */
  booleanDisplay?: "checkbox" | "select";
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
  booleanDisplay = "select", // Repayment fields use "checkbox" for checkbox-only UI
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

  const saveCtx: SaveContext = {
    employeeId, field, onSave, onError,
    setIsLoading, setError, setIsEditing,
    tErrors,
  };
  
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
    const normalizedCurrent = editValue === "" ? null : (editValue ?? null);
    const normalizedOriginal = value ?? null;
    if (!hasValueChanged(normalizedOriginal, normalizedCurrent)) {
      setIsEditing(false);
      setError(null);
      return;
    }
    await executeSave(saveCtx, normalizedCurrent);
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
    if (!isEditing || showDatePicker || isLoading) {
      return;
    }

    async function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      // Check if click is outside this cell
      if (cellRef.current && !cellRef.current.contains(target)) {
        // Check if click is inside a Portal (Select, Popover, etc.)
        const isInsidePortal = (target as Element).closest?.('[data-radix-popper-content-wrapper]') ||
          (target as Element).closest?.('[role="listbox"]') ||
          (target as Element).closest?.('[role="dialog"]');

        if (isInsidePortal) {
          return;
        }

        const normalizedCurrent = editValue === "" ? null : (editValue ?? null);
        const normalizedOriginal = value ?? null;
        if (hasValueChanged(normalizedOriginal, normalizedCurrent)) {
          await executeSave(saveCtx, normalizedCurrent);
        } else {
          setIsEditing(false);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing, editValue, showDatePicker, isLoading, value, employeeId, field, onSave, onError, tErrors]);

  if (!isEditing) {
    // Read-only cell - show tooltip on click
    if (!effectiveCanEdit) {
      // Repayment-style: show only a disabled checkbox (no "Nej" text)
      if (type === "boolean" && booleanDisplay === "checkbox") {
        return (
          <div ref={cellRef} className={cn("flex items-center px-3 py-2 min-h-10", className)}>
            <Checkbox checked={value === true} disabled />
          </div>
        );
      }
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

      const { status: badgeStatus, tooltip: badgeTooltip } = calculateBadge(
        field, type, value, oneMarkedAt, isLoneivaField
      );

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
      
      // ÖMC date fields use type="text" in important-dates-table, so check independently of type
      if (field === "date_value" && category && isOMCDate(category) && value) {
        return formatOMCDate(String(value));
      }

      if (type === "date") {
        const lastSavedDate = lastSavedValueRef.current !== null && lastSavedValueRef.current !== undefined
          ? String(lastSavedValueRef.current) : null;
        const valueDate = value !== null && value !== undefined ? String(value) : "";

        if (lastSavedDate !== null && lastSavedDate === "" && valueDate !== "") {
          return null;
        }
        if (lastSavedDate !== null && lastSavedDate !== "" && lastSavedDate !== valueDate) {
          if (field === "date_value" && category && isOMCDate(category)) {
            return formatOMCDate(lastSavedDate);
          }
          return formatDateForDisplay(lastSavedDate, category);
        }

        if (value) {
          return formatDateForDisplay(String(value), category);
        }
        return null;
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

    const { status: badgeStatus, tooltip: badgeTooltip } = calculateBadge(
      field, type, value, oneMarkedAt, isLoneivaField
    );

    // Repayment-style: show only a checkbox (no "Ja"/"Nej"); click toggles and saves
    if (type === "boolean" && booleanDisplay === "checkbox") {
      return (
        <div ref={cellRef} className={cn("flex items-center px-3 py-2 min-h-10", className)}>
          <Checkbox
            checked={value === true}
            disabled={isLoading}
            onCheckedChange={async (checked) => {
              const newVal = checked === true ? true : null;
              if (!hasValueChanged(value, newVal)) return;
              setIsLoading(true);
              try {
                await onSave(employeeId, field, newVal);
              } catch (err) {
                onError?.(err instanceof Error ? err.message : "Update failed");
              } finally {
                setIsLoading(false);
              }
            }}
          />
        </div>
      );
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
        <LoneivaEditor
          value={value}
          editValue={editValue}
          setEditValue={setEditValue}
          isLoading={isLoading}
          error={error}
          isCompact={isCompact}
          saveCtx={saveCtx}
          tDashboard={tDashboard}
        />
      )}

      {!isLoneivaField && type === "text" && (
        <TextEditor
          inputRef={inputRef}
          editValue={editValue}
          setEditValue={setEditValue}
          handleKeyDown={handleKeyDown}
          isLoading={isLoading}
          error={error}
          isCompact={isCompact}
          field={field}
        />
      )}

      {!isLoneivaField && type === "number" && (
        <NumberEditor
          inputRef={inputRef}
          editValue={editValue}
          setEditValue={setEditValue}
          handleKeyDown={handleKeyDown}
          isLoading={isLoading}
          error={error}
          isCompact={isCompact}
        />
      )}

      {type === "boolean" && (
        <BooleanEditor
          value={value}
          editValue={editValue}
          setEditValue={setEditValue}
          selectOpen={selectOpen}
          setSelectOpen={setSelectOpen}
          isEditing={isEditing}
          isLoading={isLoading}
          error={error}
          isCompact={isCompact}
          saveCtx={saveCtx}
          lastSavedValueRef={lastSavedValueRef}
          getBooleanTrueLabel={getBooleanTrueLabel}
          tDashboard={tDashboard}
        />
      )}

      {type === "date" && (
        <DateEditor
          value={value}
          editValue={editValue}
          setEditValue={setEditValue}
          showDatePicker={showDatePicker}
          setShowDatePicker={setShowDatePicker}
          isLoading={isLoading}
          isCompact={isCompact}
          saveCtx={saveCtx}
          lastSavedValueRef={lastSavedValueRef}
          tDashboard={tDashboard}
        />
      )}

      {type === "select" && options && (
        <SelectEditor
          value={value}
          editValue={editValue}
          setEditValue={setEditValue}
          selectOpen={selectOpen}
          setSelectOpen={setSelectOpen}
          isEditing={isEditing}
          isLoading={isLoading}
          error={error}
          isCompact={isCompact}
          options={options}
          saveCtx={saveCtx}
          lastSavedValueRef={lastSavedValueRef}
        />
      )}
    </div>
  );
}
