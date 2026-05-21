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
import type { LoneivaEditorProps } from "./types";

const SALARY_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7];

export function LoneivaEditor({
  value,
  editValue,
  setEditValue,
  isLoading,
  error,
  isCompact,
  saveCtx,
  tDashboard,
}: LoneivaEditorProps) {
  return (
    <Select
      value={editValue !== null && editValue !== undefined ? String(editValue) : "null"}
      onValueChange={(selectedValue) => {
        const parsedValue = selectedValue === "null" ? null : parseInt(selectedValue, 10);
        const normalizedOriginal = (value !== null && value !== undefined)
          ? (typeof value === 'number' ? value : parseInt(String(value), 10))
          : null;
        if (!hasValueChanged(normalizedOriginal, parsedValue)) {
          saveCtx.setIsEditing(false);
          return;
        }
        executeSave(saveCtx, parsedValue).then((success) => {
          setEditValue(
            success
              ? (parsedValue ?? "")
              : (value !== null && value !== undefined ? value : "")
          );
          if (!success) {
            saveCtx.setIsEditing(false);
          }
        });
      }}
      disabled={isLoading}
    >
      <SelectTrigger className={cn(error ? "border-destructive" : "", isLoading && "pr-8", isCompact && "h-8 text-xs")}>
        <SelectValue placeholder={tDashboard('selectSalaryLevel') || 'Select salary level'} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="null">{tDashboard('notSet') || 'Not Set'}</SelectItem>
        {SALARY_LEVELS.map((level) => (
          <SelectItem key={level} value={level.toString()}>
            {level}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
