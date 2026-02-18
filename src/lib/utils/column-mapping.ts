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
  "Social Security No.": "ssn", // Story 9.6: Fix SSN display
  "Email": "email",
  "Mobile": "mobile",
  "Town District": "town_district",
  "Rank": "rank",
  "Gender": "gender",
  "Hire Date": "hire_date",
  "Anställningsdatum": "hire_date", // Story 9.6: Fix Hire Date display
  "Termination Date": "termination_date",
  "Termination Reason": "termination_reason",
  "Status": "_computed_status", // Special case: computed from is_archived/is_terminated
  "Comments": "comments",
  "Stena Date": "stena_date",
  "ÖMC Date": "omc_date",
  "PE3 Date": "pe3_date",
  "Lönenivå": "loneiva", // Story 8.6: Fix Lönenivå display
  "Mail lön": "mail_lon",
  "Kvitto C17/18": "kvitto_c17_18",
  "Crewing/Done": "crewing_done",
  "Hotel Required?": "hotel_required",
  "Room Number (Shared)": "room_number_shared",
  // Story 8.17: Dietary Requirements - Map display names to DB field names
  "Specialkost": "special_diet",
  "Special Diet": "special_diet",
  "Diet": "diet_details",
  "Diet Details": "diet_details",
  // Story 19.14: Repayment tracking fields - UUID references to Important Dates
  "Återbetalningsskyldig ÖMC": "repayment_needed_omc",
  "Repayment Needed ÖMC": "repayment_needed_omc",
  "Återbetalningsskyldig PE3": "repayment_needed_pe3",
  "Repayment Needed PE3": "repayment_needed_pe3",
  // Stena ID / Origo number - display name may have hyphen (e.g. "Stena ID- Origo nummer")
  "Stena ID- Origo nummer": "stena_id_origo_nummer",
  "Stena ID-Origo nummer": "stena_id_origo_nummer",
};

/**
 * Maps a human-readable column name to the corresponding Employee object field name
 * @param columnName - The human-readable column name (e.g., "First Name")
 * @returns The Employee field name (e.g., "first_name")
 */
export function mapColumnToEmployeeField(columnName: string): string {
  const trimmedName = columnName.trim();
  return (
    COLUMN_TO_FIELD_MAP[trimmedName] ||
    trimmedName.toLowerCase().replace(/ /g, "_")
  );
}

/**
 * Gets the value of a field from an Employee object based on column name
 * Handles special cases like computed Status field and custom columns
 * @param employee - The Employee object
 * @param columnName - The human-readable column name
 * @param isMasterdata - Whether this is a masterdata column (vs custom column)
 * @param allImportantDates - Optional array of all important dates for resolving date UUIDs
 * @param dateDeletedText - Optional translated text for deleted dates (default: "Datum borttaget")
 * @returns The field value
 */
export function getEmployeeFieldValue(
  employee: Employee,
  columnName: string,
  isMasterdata = true,
  allImportantDates?: ImportantDate[],
  dateDeletedText: string = "Datum borttaget"
): string | number | boolean | null {
  // Handle custom columns from party-specific tables
  // For custom columns, columnName is expected to be the db_column_name (not the display name)
  if (!isMasterdata && employee.customData) {
    return employee.customData[columnName] ?? null;
  }

  // For masterdata columns, columnName is the display name (e.g., "First Name")
  const fieldName = mapColumnToEmployeeField(columnName);

  // Special case: Status is computed from is_archived and is_terminated
  if (fieldName === "_computed_status") {
    if (employee.is_archived) return "Archived";
    if (employee.is_terminated) return "Terminated";
    return "Active";
  }

  // Get the raw value from the employee object
  const rawValue = employee[fieldName as keyof Employee] as string | number | boolean | null;

  // Check if this is an Important Date field (by checking the actual field names)
  // Story 19.14: Include repayment fields which now store UUID references to Important Dates
  const isDateField = [
    "stena_date", 
    "omc_date", 
    "pe3_date",
    "repayment_needed_omc",
    "repayment_needed_pe3"
  ].includes(fieldName);

  // If it's a date field and we have Important Dates available, resolve the UUID to description
  if (isDateField && allImportantDates && typeof rawValue === "string") {
    return resolveImportantDateId(rawValue, allImportantDates, dateDeletedText);
  }

  return rawValue;
}
