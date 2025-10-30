import { describe, it, expect } from "vitest";
import enMessages from "../../../messages/en.json";
import svMessages from "../../../messages/sv.json";

/**
 * Flatten nested translation object into dot-notation keys
 * Example: { common: { save: "Save" } } => { "common.save": "Save" }
 */
function flattenObject(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  return Object.keys(obj).reduce((acc, key) => {
    const prefixedKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(acc, flattenObject(obj[key] as Record<string, unknown>, prefixedKey));
    } else {
      acc[prefixedKey] = obj[key] as string;
    }
    
    return acc;
  }, {} as Record<string, string>);
}

describe("Translation Completeness", () => {
  const flatEnglish = flattenObject(enMessages);
  const flatSwedish = flattenObject(svMessages);

  it("should have matching translation keys between English and Swedish", () => {
    const englishKeys = Object.keys(flatEnglish).sort();
    const swedishKeys = Object.keys(flatSwedish).sort();

    // Check for missing keys in Swedish
    const missingInSwedish = englishKeys.filter(key => !swedishKeys.includes(key));
    expect(missingInSwedish, `Missing Swedish translations for: ${missingInSwedish.join(", ")}`).toEqual([]);

    // Check for extra keys in Swedish
    const extraInSwedish = swedishKeys.filter(key => !englishKeys.includes(key));
    expect(extraInSwedish, `Extra Swedish translations not in English: ${extraInSwedish.join(", ")}`).toEqual([]);

    // Keys should be identical
    expect(swedishKeys).toEqual(englishKeys);
  });

  it("should not have empty translation values in English", () => {
    const emptyEnglishKeys = Object.entries(flatEnglish)
      .filter(([, value]) => !value || value.trim() === "")
      .map(([key]) => key);

    expect(emptyEnglishKeys, `Empty English translations: ${emptyEnglishKeys.join(", ")}`).toEqual([]);
  });

  it("should not have empty translation values in Swedish", () => {
    const emptySwedishKeys = Object.entries(flatSwedish)
      .filter(([, value]) => !value || value.trim() === "")
      .map(([key]) => key);

    expect(emptySwedishKeys, `Empty Swedish translations: ${emptySwedishKeys.join(", ")}`).toEqual([]);
  });

  it("should have all required translation keys for Story 5.13", () => {
    const requiredKeys = [
      "navigation.employees",
      "dashboard.noEmployeesMessage",
      "dates.pageDescription",
      "dates.pageSubtitle",
      "dates.weekNumber",
      "dates.year",
      "dates.category",
      "dates.filterByCategory",
      "dates.allCategories",
      "dates.noImportantDates",
      "admin.userManagementDescription",
      "admin.roleColumn",
      "admin.createdColumn",
      "admin.actionsColumn",
      "admin.deactivateButton",
      "forms.columnNameLabel",
    ];

    const missingEnglish = requiredKeys.filter(key => !(key in flatEnglish));
    const missingSwedish = requiredKeys.filter(key => !(key in flatSwedish));

    expect(missingEnglish, `Missing required English keys: ${missingEnglish.join(", ")}`).toEqual([]);
    expect(missingSwedish, `Missing required Swedish keys: ${missingSwedish.join(", ")}`).toEqual([]);
  });
});
