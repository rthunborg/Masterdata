import { describe, it, expect } from "vitest";
import {
  validateImportantDateRow,
  detectDuplicates,
  validateImportantDatesCSV,
} from "@/lib/utils/important-dates-csv-validator";
import type { ImportantDateFormData } from "@/lib/types/important-date";

describe("validateImportantDateRow", () => {
  it("validates required fields are present", () => {
    const row = {
      year: 2025,
      category: "Stena Dates",
      date_description: "Fredag 14/2",
      date_value: "15-16/2",
    };

    const result = validateImportantDateRow(row);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("validates row with all fields including optional ones", () => {
    const row = {
      week_number: 7,
      year: 2025,
      category: "Stena Dates",
      date_description: "Fredag 14/2",
      date_value: "15-16/2",
      notes: "Test note",
    };

    const result = validateImportantDateRow(row);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns error for missing year", () => {
    const row = {
      category: "Stena Dates",
      date_description: "Fredag 14/2",
      date_value: "15-16/2",
    };

    const result = validateImportantDateRow(row);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: "year",
      message: "Year is required",
    });
  });

  it("returns error for invalid year format (non-numeric)", () => {
    const row = {
      year: "twenty twenty-five",
      category: "Stena Dates",
      date_description: "Fredag 14/2",
      date_value: "15-16/2",
    };

    const result = validateImportantDateRow(row);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: "year",
      message: "Year must be a number",
    });
  });

  it("returns error for year out of range", () => {
    const row = {
      year: 1800,
      category: "Stena Dates",
      date_description: "Fredag 14/2",
      date_value: "15-16/2",
    };

    const result = validateImportantDateRow(row);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: "year",
      message: "Year must be between 1900 and 2100",
    });
  });

  it("returns error for invalid week_number (54)", () => {
    const row = {
      week_number: 54,
      year: 2025,
      category: "Stena Dates",
      date_description: "Invalid",
      date_value: "Invalid",
    };

    const result = validateImportantDateRow(row);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: "week_number",
      message: "Week number must be between 1 and 53",
    });
  });

  it("returns error for invalid week_number (0)", () => {
    const row = {
      week_number: 0,
      year: 2025,
      category: "Stena Dates",
      date_description: "Invalid",
      date_value: "Invalid",
    };

    const result = validateImportantDateRow(row);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: "week_number",
      message: "Week number must be between 1 and 53",
    });
  });

  it("allows null/empty week_number (optional field)", () => {
    const row = {
      week_number: null,
      year: 2025,
      category: "Other",
      date_description: "Special Date",
      date_value: "2025-03-15",
    };

    const result = validateImportantDateRow(row);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("allows empty string week_number", () => {
    const row = {
      week_number: "",
      year: 2025,
      category: "Other",
      date_description: "Special Date",
      date_value: "2025-03-15",
    };

    const result = validateImportantDateRow(row);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns error for missing category", () => {
    const row = {
      year: 2025,
      date_description: "Fredag 14/2",
      date_value: "15-16/2",
    };

    const result = validateImportantDateRow(row);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: "category",
      message: "Category is required",
    });
  });

  it("returns error for empty category", () => {
    const row = {
      year: 2025,
      category: "  ",
      date_description: "Fredag 14/2",
      date_value: "15-16/2",
    };

    const result = validateImportantDateRow(row);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: "category",
      message: "Category is required",
    });
  });

  it("returns error for missing date_description", () => {
    const row = {
      year: 2025,
      category: "Stena Dates",
      date_value: "15-16/2",
    };

    const result = validateImportantDateRow(row);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: "date_description",
      message: "Date description is required",
    });
  });

  it("returns error for missing date_value", () => {
    const row = {
      year: 2025,
      category: "Stena Dates",
      date_description: "Fredag 14/2",
    };

    const result = validateImportantDateRow(row);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: "date_value",
      message: "Date value is required",
    });
  });

  it("allows null/empty notes field", () => {
    const row = {
      year: 2025,
      category: "Stena Dates",
      date_description: "Fredag 14/2",
      date_value: "15-16/2",
      notes: null,
    };

    const result = validateImportantDateRow(row);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("allows empty string notes field", () => {
    const row = {
      year: 2025,
      category: "Stena Dates",
      date_description: "Fredag 14/2",
      date_value: "15-16/2",
      notes: "",
    };

    const result = validateImportantDateRow(row);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("allows whitespace-only notes field", () => {
    const row = {
      year: 2025,
      category: "Stena Dates",
      date_description: "Fredag 14/2",
      date_value: "15-16/2",
      notes: "   ",
    };

    const result = validateImportantDateRow(row);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("detectDuplicates", () => {
  it("identifies duplicate rows with same week_number, year, and category", () => {
    const rows: ImportantDateFormData[] = [
      {
        week_number: 7,
        year: 2025,
        category: "Stena Dates",
        date_description: "Fredag 14/2",
        date_value: "15-16/2",
        notes: null,
      },
      {
        week_number: 10,
        year: 2025,
        category: "ÖMC Dates",
        date_description: "Fredag 7/3",
        date_value: "8-9/3",
        notes: null,
      },
      {
        week_number: 7,
        year: 2025,
        category: "Stena Dates",
        date_description: "Duplicate",
        date_value: "Duplicate",
        notes: null,
      },
    ];

    const duplicates = detectDuplicates(rows);
    expect(duplicates.size).toBe(1);
    expect(duplicates.get("7-2025-stena dates")).toEqual([2, 4]);
  });

  it("detects duplicates with case-insensitive category", () => {
    const rows: ImportantDateFormData[] = [
      {
        week_number: 7,
        year: 2025,
        category: "Stena Dates",
        date_description: "First",
        date_value: "First",
        notes: null,
      },
      {
        week_number: 7,
        year: 2025,
        category: "STENA DATES",
        date_description: "Second",
        date_value: "Second",
        notes: null,
      },
    ];

    const duplicates = detectDuplicates(rows);
    expect(duplicates.size).toBe(1);
  });

  it("handles null week_number in duplicate detection", () => {
    const rows: ImportantDateFormData[] = [
      {
        week_number: null,
        year: 2025,
        category: "Other",
        date_description: "First",
        date_value: "First",
        notes: null,
      },
      {
        week_number: null,
        year: 2025,
        category: "Other",
        date_description: "Second",
        date_value: "Second",
        notes: null,
      },
    ];

    const duplicates = detectDuplicates(rows);
    expect(duplicates.size).toBe(1);
    expect(duplicates.get("null-2025-other")).toEqual([2, 3]);
  });

  it("returns empty map when no duplicates", () => {
    const rows: ImportantDateFormData[] = [
      {
        week_number: 7,
        year: 2025,
        category: "Stena Dates",
        date_description: "Fredag 14/2",
        date_value: "15-16/2",
        notes: null,
      },
      {
        week_number: 10,
        year: 2025,
        category: "ÖMC Dates",
        date_description: "Fredag 7/3",
        date_value: "8-9/3",
        notes: null,
      },
    ];

    const duplicates = detectDuplicates(rows);
    expect(duplicates.size).toBe(0);
  });
});

describe("validateImportantDatesCSV", () => {
  it("validates all valid rows", () => {
    const rows = [
      {
        week_number: 7,
        year: 2025,
        category: "Stena Dates",
        date_description: "Fredag 14/2",
        date_value: "15-16/2",
        notes: "Note 1",
      },
      {
        week_number: 10,
        year: 2025,
        category: "ÖMC Dates",
        date_description: "Fredag 7/3",
        date_value: "8-9/3",
        notes: null,
      },
    ];

    const result = validateImportantDatesCSV(rows);
    expect(result.valid).toHaveLength(2);
    expect(result.invalid).toHaveLength(0);
  });

  it("separates valid and invalid rows", () => {
    const rows = [
      {
        week_number: 7,
        year: 2025,
        category: "Stena Dates",
        date_description: "Fredag 14/2",
        date_value: "15-16/2",
        notes: null,
      },
      {
        // Missing year
        week_number: 10,
        category: "ÖMC Dates",
        date_description: "Fredag 7/3",
        date_value: "8-9/3",
      },
      {
        week_number: 12,
        year: 2025,
        category: "Other",
        date_description: "Valid",
        date_value: "Valid",
        notes: null,
      },
    ];

    const result = validateImportantDatesCSV(rows);
    expect(result.valid).toHaveLength(2);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].row).toBe(3);
    expect(result.invalid[0].field).toBe("year");
  });

  it("detects duplicates within CSV", () => {
    const rows = [
      {
        week_number: 7,
        year: 2025,
        category: "Stena Dates",
        date_description: "Fredag 14/2",
        date_value: "15-16/2",
        notes: null,
      },
      {
        week_number: 7,
        year: 2025,
        category: "Stena Dates",
        date_description: "Duplicate",
        date_value: "Duplicate",
        notes: null,
      },
    ];

    const result = validateImportantDatesCSV(rows);
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(2);
    expect(result.invalid[0].message).toContain("Duplicate date entry");
    expect(result.invalid[1].message).toContain("Duplicate date entry");
  });

  it("handles mixed validation errors and duplicates", () => {
    const rows = [
      {
        week_number: 7,
        year: 2025,
        category: "Stena Dates",
        date_description: "Valid",
        date_value: "Valid",
        notes: null,
      },
      {
        // Missing year
        week_number: 10,
        category: "ÖMC Dates",
        date_description: "Invalid",
        date_value: "Invalid",
      },
      {
        week_number: 7,
        year: 2025,
        category: "Stena Dates",
        date_description: "Duplicate",
        date_value: "Duplicate",
        notes: null,
      },
    ];

    const result = validateImportantDatesCSV(rows);
    // Row 1 and Row 3 are valid individually but duplicates of each other
    // Row 2 has validation error (missing year)
    // Expected: 0 valid (both duplicates excluded), 3 invalid (1 validation + 2 duplicate)
    expect(result.valid).toHaveLength(0); // No valid rows because duplicates are excluded
    expect(result.invalid.length).toBe(3); // 1 validation error + 2 duplicate errors
  });
});
