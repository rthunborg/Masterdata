/**
 * Shared save handler that deduplicates error handling across all editor types.
 */

export interface SaveContext {
  employeeId: string;
  field: string;
  onSave: (id: string, field: string, value: string | number | boolean | null) => Promise<void>;
  onError?: (error: string) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setIsEditing: (editing: boolean) => void;
  tErrors: (key: string) => string;
}

function localizeError(message: string, tErrors: (key: string) => string): string {
  if (
    message === "Invalid input data" ||
    message.includes("Invalid value") ||
    message.includes("VALIDATION_ERROR")
  ) {
    return tErrors("validation.invalidValue");
  }
  return message;
}

/**
 * Execute a save and handle errors uniformly.
 * Returns true on success, false on error.
 */
export async function executeSave(
  ctx: SaveContext,
  value: string | number | boolean | null,
  options?: { exitEditMode?: boolean }
): Promise<boolean> {
  const exitOnSuccess = options?.exitEditMode ?? true;
  ctx.setIsLoading(true);
  ctx.setError(null);

  try {
    await ctx.onSave(ctx.employeeId, ctx.field, value);
    if (exitOnSuccess) ctx.setIsEditing(false);
    return true;
  } catch (err) {
    const raw = err instanceof Error ? err.message : ctx.tErrors("updateFailed");
    const localized = localizeError(raw, ctx.tErrors);
    ctx.setError(localized);
    ctx.onError?.(localized);
    return false;
  } finally {
    ctx.setIsLoading(false);
  }
}
