import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, XIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { executeSave } from "./save-handler";
import { hasValueChanged } from "@/lib/utils/change-detection";
import dynamic from "next/dynamic";
import type { DateEditorProps } from "./types";

const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((mod) => ({ default: mod.Calendar })),
  { ssr: false }
);

export function DateEditor({
  value,
  editValue,
  setEditValue,
  showDatePicker,
  setShowDatePicker,
  isLoading,
  isCompact,
  saveCtx,
  lastSavedValueRef,
  tDashboard,
}: DateEditorProps) {
  return (
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
            <span className="text-muted-foreground">{tDashboard("pickDate")}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={editValue ? new Date(editValue + "T00:00:00") : undefined}
          onSelect={async (date) => {
            if (date) {
              const dateStr = format(date, "yyyy-MM-dd");
              if (!hasValueChanged(value ?? null, dateStr)) {
                setShowDatePicker(false);
                saveCtx.setIsEditing(false);
                return;
              }
              setEditValue(dateStr);
              setShowDatePicker(false);
              lastSavedValueRef.current = dateStr;
              const success = await executeSave(saveCtx, dateStr);
              if (!success) {
                setEditValue(value ? String(value) : "");
                lastSavedValueRef.current = null;
              }
            }
          }}
          autoFocus
        />
        {editValue && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center text-muted-foreground"
              onClick={async () => {
                setEditValue("");
                setShowDatePicker(false);
                lastSavedValueRef.current = "";
                const success = await executeSave(saveCtx, null);
                if (!success) {
                  setEditValue(value ? String(value) : "");
                  lastSavedValueRef.current = null;
                }
              }}
            >
              <XIcon className="mr-1.5 h-3.5 w-3.5" />
              {tDashboard("clearDate")}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
