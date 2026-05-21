import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { NumberEditorProps } from "./types";

export function NumberEditor({
  inputRef,
  editValue,
  setEditValue,
  handleKeyDown,
  isLoading,
  error,
  isCompact,
}: NumberEditorProps) {
  return (
    <>
      <Input
        ref={inputRef}
        type="number"
        value={String(editValue)}
        onChange={(e) => {
          const val = e.target.value;
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
        className={cn(error ? "border-destructive" : "", isLoading && "pr-8", isCompact && "h-8 text-xs")}
      />
      {error && (
        <p className="text-xs text-destructive mt-1">
          {error}
        </p>
      )}
    </>
  );
}
