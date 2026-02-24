import type { Employee } from "@/lib/types/employee";
import { hasValueChanged } from "@/lib/utils/change-detection";

/**
 * Deep-compare two employee objects, ignoring timestamp metadata.
 * Used by real-time sync to decide if a re-render is actually needed
 * (Story 13.10: Prevent unnecessary view refreshes).
 */
export function hasEmployeeChanged(
  oldEmployee: Employee,
  newEmployee: Employee
): boolean {
  const allKeys = new Set([
    ...Object.keys(oldEmployee),
    ...Object.keys(newEmployee),
  ]);

  for (const key of allKeys) {
    if (key === "updated_at" || key === "created_at") {
      continue;
    }

    const oldValue = oldEmployee[key as keyof Employee];
    const newValue = newEmployee[key as keyof Employee];

    if (key === "customData") {
      const oldCustomData = oldValue as Record<string, unknown> | undefined;
      const newCustomData = newValue as Record<string, unknown> | undefined;

      if (!oldCustomData && !newCustomData) continue;
      if (!oldCustomData || !newCustomData) return true;

      const customDataKeys = new Set([
        ...Object.keys(oldCustomData),
        ...Object.keys(newCustomData),
      ]);

      for (const customKey of customDataKeys) {
        if (hasValueChanged(oldCustomData[customKey], newCustomData[customKey])) {
          return true;
        }
      }
      continue;
    }

    if (hasValueChanged(oldValue, newValue)) {
      return true;
    }
  }

  return false;
}
