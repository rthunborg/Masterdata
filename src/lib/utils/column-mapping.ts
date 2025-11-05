import type { Employee } from "@/lib/types/employee";
import type { ImportantDate } from "@/lib/types/important-date";
import { resolveImportantDateId } from "./important-date-resolver";

/**
 * Map of human-readable column names to Employee object field names
 */
const COLUMN_TO_FIELD_MAP: Record<string, string> = {
  "First Name": "first_name",
  "Surname": "surname",
  "SSN": "ssn",
  "Email": "email",
  "Mobile": "mobile",
  "Town District": "town_district",
  "Rank": "rank",
  "Gender": "gender",
  "Hire Date": "hire_date",
  "Termination Date": "termination_date",
  "Termination Reason": "termination_reason",
  "Status": "_computed_status", // Special case: computed from is_archived/is_terminated
  "Comments": "comments",
  "Stena Date": "stena_date",
  "ÖMC Date": "omc_date",
  "PE3 Date": "pe3_date",
};

/**
 * Maps a human-readable column name to the corresponding Employee object field name
 * @param columnName - The human-readable column name (e.g., "First Name")
 * @returns The Employee field name (e.g., "first_name")
 */
export function mapColumnToEmployeeField(columnName: string): string {
  return (
    COLUMN_TO_FIELD_MAP[columnName] ||
    columnName.toLowerCase().replace(/ /g, "_")
  );
}

/**
 * Gets the value of a field from an Employee object based on column name
 * Handles special cases like computed Status field and custom columns
 * @param employee - The Employee object
 * @param columnName - The human-readable column name
 * @param isMasterdata - Whether this is a masterdata column (vs custom column)
 * @param allImportantDates - Optional array of all important dates for resolving date UUIDs
 * @returns The field value
 */
export function getEmployeeFieldValue(
  employee: Employee,
  columnName: string,
  isMasterdata = true,
  allImportantDates?: ImportantDate[]
): string | number | boolean | null {
  // Handle custom columns from party-specific tables
  if (!isMasterdata && employee.customData) {
    return employee.customData[columnName] ?? null;
  }

  const fieldName = mapColumnToEmployeeField(columnName);

  // Special case: Status is computed from is_archived and is_terminated
  if (fieldName === "_computed_status") {
    if (employee.is_archived) return "Archived";
    if (employee.is_terminated) return "Terminated";
    return "Active";
  }

  // Get the raw value from the employee object
  const rawValue = employee[fieldName as keyof Employee] as string | number | boolean | null;
  
  // Check if this is an Important Date field (Stena Date, ÖMC Date, PE3 Date)
  const isDateField = ["Stena Date", "ÖMC Date", "PE3 Date"].includes(columnName);
  
  // If it's a date field and we have Important Dates available, resolve the UUID to description
  if (isDateField && allImportantDates && typeof rawValue === "string") {
    return resolveImportantDateId(rawValue, allImportantDates);
  }

  return rawValue;
}
