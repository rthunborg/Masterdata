import { describe, expect, it, vi } from "vitest";
import { executeSave, type SaveContext } from "@/components/dashboard/cell-editors/save-handler";

function createSaveContext(overrides: Partial<SaveContext> = {}): SaveContext {
  return {
    employeeId: "emp-1",
    field: "seably_prm",
    onSave: vi.fn(),
    onError: vi.fn(),
    setIsLoading: vi.fn(),
    setError: vi.fn(),
    setIsEditing: vi.fn(),
    tErrors: (key: string) => {
      const translations: Record<string, string> = {
        "validation.invalidValue": "Ogiltigt värde",
        updateFailed: "Kunde inte uppdatera",
      };
      return translations[key] ?? key;
    },
    ...overrides,
  };
}

describe("executeSave", () => {
  it("localizes legacy empty-update API errors before showing them in a snackbar", async () => {
    const ctx = createSaveContext({
      onSave: vi.fn().mockRejectedValue(
        new Error("At least one field must be provided for update")
      ),
    });

    const result = await executeSave(ctx, true);

    expect(result).toBe(false);
    expect(ctx.setError).toHaveBeenCalledWith("Minst ett fält måste anges för uppdatering");
    expect(ctx.onError).toHaveBeenCalledWith("Minst ett fält måste anges för uppdatering");
  });

  it("localizes dynamic masterdata validation errors before showing them in a snackbar", async () => {
    const ctx = createSaveContext({
      onSave: vi.fn().mockRejectedValue(new Error("Boolean value expected")),
    });

    await executeSave(ctx, "true");

    expect(ctx.setError).toHaveBeenCalledWith("Värdet måste vara sant eller falskt");
    expect(ctx.onError).toHaveBeenCalledWith("Värdet måste vara sant eller falskt");
  });
});
