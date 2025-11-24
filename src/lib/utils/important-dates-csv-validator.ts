import type { ImportantDateFormData } from "@/lib/types/important-date";
import { parseOMCDateInput, isOMCDate } from "./omc-date-formatter";
import { parseTimeInput } from "./time-formatter";
import { validateDeadlines } from "./deadline-validator";
import { format } from "date-fns";
import { getDefaultMaxCapacity } from "@/lib/services/date-capacity";

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
  // Story 8.9: For ÖMC dates, validate and parse two-day format
  if (!row.date_value || String(row.date_value).trim() === "") {
    errors.push({ field: "date_value", message: "Date value is required" });
  } else {
    const category = String(row.category || "").trim();
    const dateValue = String(row.date_value).trim();
    
    // Story 8.9: Validate ÖMC date format if category is ÖMC Dates
    if (isOMCDate(category)) {
      const parsed = parseOMCDateInput(dateValue);
      if (!parsed) {
        errors.push({
          field: "date_value",
          message: 'ÖMC-datum måste vara giltiga två på varandra följande dagar (t.ex. "8-9/3", "8-9 mars 2025")',
        });
      }
    }
  }

  // Story 8.10: Validate time_value (optional, must be valid time format if provided)
  if (row.time_value !== null && row.time_value !== undefined && String(row.time_value).trim() !== "") {
    const timeValue = String(row.time_value).trim();
    const parsed = parseTimeInput(timeValue);
    if (!parsed) {
      errors.push({
        field: "time_value",
        message: 'Tid måste vara i format HH:MM (t.ex. "14:30")',
      });
    }
  }

  // Story 8.11: Validate deadline fields (optional, must be valid dates if provided)
  const deadlineSubmit = row.deadline_submit ? String(row.deadline_submit).trim() : null;
  const deadlineCancel = row.deadline_cancel ? String(row.deadline_cancel).trim() : null;
  const dateValue = row.date_value ? String(row.date_value).trim() : "";

  if (deadlineSubmit || deadlineCancel) {
    const result = validateDeadlines(deadlineSubmit, deadlineCancel, dateValue);
    if (!result.valid) {
      errors.push({
        field: "deadline_submit",
        message: result.error || "Ogiltiga deadlines",
      });
    }
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
      const category = String(row.category).trim();
      let dateValue = String(row.date_value).trim();
      
      // Story 8.9: Parse ÖMC dates to ISO format (start date only)
      if (isOMCDate(category)) {
        const parsed = parseOMCDateInput(dateValue);
        if (parsed) {
          // Convert start date to ISO string (YYYY-MM-DD)
          dateValue = format(parsed.startDate, 'yyyy-MM-dd');
        }
      }
      
      // Story 8.10: Parse time_value if provided
      let timeValue: string | null = null;
      if (row.time_value !== null && row.time_value !== undefined && String(row.time_value).trim() !== "") {
        const parsed = parseTimeInput(String(row.time_value).trim());
        if (parsed) {
          timeValue = parsed;
        }
      }
      
      // Story 8.11: Parse deadline fields if provided
      const deadlineSubmit = row.deadline_submit && String(row.deadline_submit).trim() !== "" 
        ? String(row.deadline_submit).trim() 
        : null;
      const deadlineCancel = row.deadline_cancel && String(row.deadline_cancel).trim() !== "" 
        ? String(row.deadline_cancel).trim() 
        : null;
      
      const formData: ImportantDateFormData = {
        week_number:
          row.week_number !== null &&
          row.week_number !== undefined &&
          row.week_number !== ""
            ? Number(row.week_number)
            : null,
        year: Number(row.year),
        category,
        date_description: String(row.date_description).trim(),
        date_value: dateValue,
        time_value: timeValue,
        deadline_submit: deadlineSubmit,
        deadline_cancel: deadlineCancel,
        notes:
          row.notes && String(row.notes).trim() !== ""
            ? String(row.notes).trim()
            : null,
        // Story 8.7: Default capacity values for CSV imports based on category
        max_spots: getDefaultMaxCapacity(category),
        remaining_spots: getDefaultMaxCapacity(category),
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
