import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TextEditorProps } from "./types";

export function TextEditor({
  inputRef,
  editValue,
  setEditValue,
  handleKeyDown,
  isLoading,
  error,
  isCompact,
  field,
}: TextEditorProps) {
  return (
    <>
      <Input
        ref={inputRef}
        value={String(editValue)}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        inputMode="text"
        className={cn(error ? "border-destructive" : "", isLoading && "pr-8", isCompact && "h-8 text-xs")}
        aria-invalid={!!error}
        aria-describedby={error ? `${field}-error` : undefined}
      />
      {error && (
        <p id={`${field}-error`} className="text-xs text-destructive mt-1">
          {error}
        </p>
      )}
    </>
  );
}
