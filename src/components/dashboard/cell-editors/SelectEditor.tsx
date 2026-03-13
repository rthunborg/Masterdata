import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  return (
    <Select
      value={editValue !== null && editValue !== undefined ? String(editValue) : ""}
      open={selectOpen}
      onOpenChange={(open) => {
        setSelectOpen(open);
        if (!open && !isLoading && isEditing) {
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
        setEditValue(selectedValue);
        setSelectOpen(false);
        lastSavedValueRef.current = selectedValue;
        const success = await executeSave(saveCtx, selectedValue);
        if (success) {
          lastSavedValueRef.current = selectedValue;
          setEditValue(selectedValue);
        } else {
          setEditValue(value !== null && value !== undefined ? String(value) : "");
          lastSavedValueRef.current = null;
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
  );
}
