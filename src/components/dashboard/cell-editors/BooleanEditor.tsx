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
import type { BooleanEditorProps } from "./types";

export function BooleanEditor({
  value,
  editValue,
  setEditValue,
  selectOpen,
  setSelectOpen,
  isEditing,
  isLoading,
  error,
  isCompact,
  saveCtx,
  lastSavedValueRef,
  getBooleanTrueLabel,
  tDashboard,
}: BooleanEditorProps) {
  return (
    <Select
      value={editValue !== null && editValue !== undefined ? String(editValue) : "false"}
      open={selectOpen}
      onOpenChange={(open) => {
        setSelectOpen(open);
        if (!open && !isLoading && isEditing) {
          const normalizedCurrent = Boolean(editValue);
          const normalizedOriginal = value !== null && value !== undefined ? Boolean(value) : false;
          if (!hasValueChanged(normalizedOriginal, normalizedCurrent)) {
            saveCtx.setIsEditing(false);
          }
        }
      }}
      onValueChange={async (selectedValue) => {
        const newValue = selectedValue === "true";
        const normalizedOriginal = value !== null && value !== undefined ? Boolean(value) : false;
        if (!hasValueChanged(normalizedOriginal, newValue)) {
          setSelectOpen(false);
          saveCtx.setIsEditing(false);
          return;
        }
        setEditValue(newValue);
        setSelectOpen(false);
        lastSavedValueRef.current = newValue;
        const success = await executeSave(saveCtx, newValue);
        if (success) {
          lastSavedValueRef.current = newValue;
          setEditValue(newValue);
        } else {
          setEditValue(value !== null && value !== undefined ? Boolean(value) : false);
          lastSavedValueRef.current = null;
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
  );
}
