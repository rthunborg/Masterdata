import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { executeSave } from "./save-handler";
import { hasValueChanged } from "@/lib/utils/change-detection";
import type { SelectEditorProps } from "./types";

export function SelectEditor({
  value,
  editValue,
  setEditValue,
  selectOpen,
  setSelectOpen,
  isEditing,
  isLoading,
  error,
  isCompact,
  options,
  saveCtx,
  lastSavedValueRef,
}: SelectEditorProps) {
  const pendingSaveRef = useRef(false);

  return (
    <Select
      value={editValue !== null && editValue !== undefined ? String(editValue) : ""}
      open={selectOpen}
      onOpenChange={(open) => {
        setSelectOpen(open);
        if (!open && !isLoading && isEditing && !pendingSaveRef.current) {
          const normalizedCurrent = editValue !== null && editValue !== undefined ? String(editValue) : null;
          const normalizedOriginal = (value !== null && value !== undefined) ? String(value) : null;
          if (!hasValueChanged(normalizedOriginal, normalizedCurrent)) {
            saveCtx.setIsEditing(false);
          }
        }
      }}
      onValueChange={async (selectedValue) => {
        const normalizedOriginal = (value !== null && value !== undefined) ? String(value) : null;
        if (!hasValueChanged(normalizedOriginal, selectedValue)) {
          setSelectOpen(false);
          saveCtx.setIsEditing(false);
          return;
        }
        setSelectOpen(false);
        pendingSaveRef.current = true;
        const success = await executeSave(saveCtx, selectedValue);
        if (success) {
          setEditValue(selectedValue);
        } else {
          setEditValue(value !== null && value !== undefined ? String(value) : "");
          saveCtx.setIsEditing(false);
        }
        pendingSaveRef.current = false;
        lastSavedValueRef.current = null;
      }}
      disabled={isLoading}
    >
      <SelectTrigger className={cn(error ? "border-destructive" : "", isLoading && "pr-8", isCompact && "h-8 text-xs")}>
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
  );
}
