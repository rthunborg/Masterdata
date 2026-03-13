import { useState, useRef, useEffect, useCallback } from "react";
import { hasValueChanged } from "@/lib/utils/change-detection";

interface UseDateCellEditingOptions {
  value: string | null;
  employeeId: string;
  field: string;
  onSave: (id: string, field: string, value: string | null) => Promise<void>;
  onError?: (error: string) => void;
}

export function useDateCellEditing({
  value,
  employeeId,
  field,
  onSave,
  onError,
}: UseDateCellEditingOptions) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>(value || "__NONE__");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && !dropdownOpen) {
      const timer = setTimeout(() => {
        setDropdownOpen(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isEditing, dropdownOpen]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (cellRef.current && cellRef.current.contains(target)) {
        return;
      }

      const isInsideSelectPortal = (target as Element).closest?.('[role="listbox"]') ||
        (target as Element).closest?.('[data-radix-popper-content-wrapper]');

      if (isInsideSelectPortal) {
        return;
      }

      setEditValue(value || "__NONE__");
      setError(null);
      setIsEditing(false);
      setDropdownOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing, value]);

  const startEditing = useCallback(() => {
    setEditValue(value || "__NONE__");
    setIsEditing(true);
  }, [value]);

  const handleDropdownClose = useCallback(() => {
    setTimeout(() => {
      const normalizedCurrent = editValue === "__NONE__" ? null : editValue || null;
      const normalizedOriginal = value ?? null;

      if (!hasValueChanged(normalizedOriginal, normalizedCurrent)) {
        setIsEditing(false);
      }
    }, 100);
  }, [editValue, value]);

  const handleValueChange = useCallback((newValue: string) => {
    if (isSaving) {
      return;
    }

    setEditValue(newValue);
    setDropdownOpen(false);

    const valueToSave = newValue === "__NONE__" ? null : newValue || null;
    const normalizedOriginal = value ?? null;

    if (!hasValueChanged(normalizedOriginal, valueToSave)) {
      setIsEditing(false);
      return;
    }

    setTimeout(() => {
      setIsSaving(true);
      setIsLoading(true);
      setError(null);
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
          setIsSaving(false);
        });
    }, 0);
  }, [isSaving, value, employeeId, field, onSave, onError]);

  return {
    isEditing,
    editValue,
    isLoading,
    error,
    dropdownOpen,
    cellRef,

    startEditing,
    setDropdownOpen,
    handleDropdownClose,
    handleValueChange,
  };
}
