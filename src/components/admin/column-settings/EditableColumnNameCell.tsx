"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface EditableColumnNameCellProps {
  value: string;
  columnId: string;
  onUpdate: (columnId: string, newName: string) => Promise<void>;
  isUpdating: boolean;
}

export function EditableColumnNameCell({
  value,
  columnId,
  onUpdate,
  isUpdating,
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
        className="h-8 pr-12"
        maxLength={50}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
        {inputValue.length}/50
      </div>
    </div>
  );
}
