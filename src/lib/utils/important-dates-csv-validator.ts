import type { ImportantDateFormData } from "@/lib/types/important-date";

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
}

export interface RowError {
  row: number;
  field?: string;
  message: string;
}

export function validateImportantDateRow(
  row: Record<string, unknown>
): ValidationResult {
  const errors: Array<{ field: string; message: string }> = [];

  // Validate year (required, 4 digits)
  if (!row.year) {
    errors.push({ field: "year", message: "Year is required" });
  } else {
    const year = Number(row.year);
    if (isNaN(year) || !Number.isInteger(year)) {
      errors.push({ field: "year", message: "Year must be a number" });
    } else if (year < 1900 || year > 2100) {
      errors.push({
        field: "year",
        message: "Year must be between 1900 and 2100",
      });
    }
  }

  // Validate week_number (optional, 1-53 if provided)
  if (row.week_number !== null && row.week_number !== undefined && row.week_number !== "") {
    const weekNumber = Number(row.week_number);
    if (isNaN(weekNumber) || !Number.isInteger(weekNumber)) {
      errors.push({
        field: "week_number",
        message: "Week number must be a number",
      });
    } else if (weekNumber < 1 || weekNumber > 53) {
      errors.push({
        field: "week_number",
        message: "Week number must be between 1 and 53",
      });
    }
  }

  // Validate category (required, non-empty text)
  if (!row.category || String(row.category).trim() === "") {
    errors.push({ field: "category", message: "Category is required" });
  }

  // Validate date_description (required, non-empty text)
  if (!row.date_description || String(row.date_description).trim() === "") {
    errors.push({
      field: "date_description",
      message: "Date description is required",
    });
  }

  // Validate date_value (required, non-empty text)
  if (!row.date_value || String(row.date_value).trim() === "") {
    errors.push({ field: "date_value", message: "Date value is required" });
  }

  // Notes is optional, no validation needed

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function detectDuplicates(
  rows: ImportantDateFormData[]
): Map<string, number[]> {
  const duplicateMap = new Map<string, number[]>();
  const seenKeys = new Map<string, number[]>();

  rows.forEach((row, index) => {
    const weekNum = row.week_number === null ? "null" : String(row.week_number);
    const category = String(row.category).toLowerCase().trim();
    const key = `${weekNum}-${row.year}-${category}`;

    if (seenKeys.has(key)) {
      // Already seen this key, so it's a duplicate
      if (!duplicateMap.has(key)) {
        // First time seeing duplicate - add both original and current row
        const originalRows = seenKeys.get(key)!;
        duplicateMap.set(key, [...originalRows, index + 2]);
      } else {
        // Already marked as duplicate, just add current row
        duplicateMap.get(key)!.push(index + 2);
      }
      seenKeys.get(key)!.push(index + 2);
    } else {
      seenKeys.set(key, [index + 2]);
    }
  });

  return duplicateMap;
}

export function validateImportantDatesCSV(rows: Record<string, unknown>[]): {
  valid: ImportantDateFormData[];
  invalid: RowError[];
} {
  const valid: ImportantDateFormData[] = [];
  const invalid: RowError[] = [];

  // First pass: validate each row
  const potentiallyValid: Array<{
    data: ImportantDateFormData;
    rowNumber: number;
  }> = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +2 for header row and 1-indexed
    const result = validateImportantDateRow(row);

    if (result.valid) {
      // Transform to ImportantDateFormData
      const formData: ImportantDateFormData = {
        week_number:
          row.week_number !== null &&
          row.week_number !== undefined &&
          row.week_number !== ""
            ? Number(row.week_number)
            : null,
        year: Number(row.year),
        category: String(row.category).trim(),
        date_description: String(row.date_description).trim(),
        date_value: String(row.date_value).trim(),
        notes:
          row.notes && String(row.notes).trim() !== ""
            ? String(row.notes).trim()
            : null,
      };

      potentiallyValid.push({ data: formData, rowNumber });
    } else {
      // Add all validation errors for this row
      result.errors.forEach((error) => {
        invalid.push({
          row: rowNumber,
          field: error.field,
          message: error.message,
        });
      });
    }
  });

  // Second pass: check for duplicates within CSV
  // Use a map to track which row numbers have which keys
  const keyToRows = new Map<string, number[]>();
  
  potentiallyValid.forEach((pv) => {
    const weekNum = pv.data.week_number === null ? "null" : String(pv.data.week_number);
    const category = pv.data.category.toLowerCase().trim();
    const key = `${weekNum}-${pv.data.year}-${category}`;

    if (!keyToRows.has(key)) {
      keyToRows.set(key, []);
    }
    keyToRows.get(key)!.push(pv.rowNumber);
  });

  // Find keys with duplicates
  const duplicateRowNumbers = new Set<number>();
  keyToRows.forEach((rowNumbers, key) => {
    if (rowNumbers.length > 1) {
      // Mark all rows with this key as duplicates
      const [weekNum, year, category] = key.split("-");
      const weekDisplay = weekNum === "null" ? "null" : weekNum;
      
      rowNumbers.forEach((rowNumber) => {
        duplicateRowNumbers.add(rowNumber);
        invalid.push({
          row: rowNumber,
          message: `Duplicate date entry (Week ${weekDisplay}, Year ${year}, Category ${category})`,
        });
      });
    }
  });

  // Add non-duplicate rows to valid
  potentiallyValid.forEach((pv) => {
    if (!duplicateRowNumbers.has(pv.rowNumber)) {
      valid.push(pv.data);
    }
  });

  return { valid, invalid };
}
