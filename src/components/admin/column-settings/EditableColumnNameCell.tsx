"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface EditableColumnNameCellProps {
  value: string;
  columnId: string;
  onUpdate: (columnId: string, newName: string) => Promise<void>;
  isUpdating: boolean;
  isSaving?: boolean;
}

export function EditableColumnNameCell({
  value,
  columnId,
  onUpdate,
  isUpdating,
  isSaving = false,
}: EditableColumnNameCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) {
      setInputValue(value);
      setIsEditing(false);
      return;
    }
    
    if (trimmedValue !== value) {
      await onUpdate(columnId, trimmedValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setInputValue(value);
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

  if (!isEditing) {
    return (
      <div
        onClick={() => !isUpdating && setIsEditing(true)}
        className={cn(
          "cursor-pointer px-2 py-1 rounded hover:bg-blue-50 transition-colors",
          "min-h-8 font-medium min-w-0 truncate",
          isUpdating && "cursor-not-allowed opacity-50"
        )}
        title={value || "Click to edit display name"}
      >
        {value}
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isUpdating}
        className={cn("h-8", isSaving ? "pr-16" : "pr-12")}
        maxLength={50}
      />
      {isSaving && (
        <Loader2
          className="absolute right-10 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-blue-600"
          role="status"
          aria-label="Sparar"
        />
      )}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
        {inputValue.length}/50
      </div>
    </div>
  );
}
