/**
 * Client-side validation utilities for custom column values
 */

/**
 * Validate text value
 * @param value - The text value to validate
 * @param maxLength - Maximum allowed length (default: 500)
 * @returns true if valid, false otherwise
 */
export function validateTextValue(value: string, maxLength: number = 500): boolean {
  if (typeof value !== "string") return false;
  return value.length <= maxLength;
}

/**
 * Validate and parse number value
 * @param value - The value to validate (can be string or number)
 * @returns Parsed number if valid, null if invalid
 */
export function validateNumberValue(value: string | number): number | null {
  if (typeof value === "number") {
    return isNaN(value) ? null : value;
  }
  
  if (typeof value === "string") {
    if (value.trim() === "") return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  
  return null;
}

/**
 * Validate date value
 * @param value - The date value to validate (ISO format string expected)
 * @returns ISO date string if valid, null if invalid
 */
export function validateDateValue(value: string): string | null {
  if (typeof value !== "string") return null;
  
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    
    // Return ISO format (YYYY-MM-DD)
    return date.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

/**
 * Validate boolean value
 * @param value - The boolean value to validate
 * @returns The boolean value (always valid as true/false)
 */
export function validateBooleanValue(value: boolean): boolean {
  return Boolean(value);
}

/**
 * Get validation error message for a given value and type
 * @param value - The value that failed validation
 * @param type - The column type
 * @returns Error message string
 */
export function getValidationError(
  value: string | number | boolean | null,
  type: "text" | "number" | "date" | "boolean"
): string | null {
  if (value === null || value === undefined) return null;
  
  switch (type) {
    case "text":
      if (typeof value === "string" && !validateTextValue(value)) {
        return "Text exceeds maximum length of 500 characters";
      }
      break;
      
    case "number":
      if (typeof value === "boolean") return "Expected a number, not a boolean";
      if (validateNumberValue(value) === null) {
        return "Invalid number format";
      }
      break;
      
    case "date":
      if (typeof value === "string" && validateDateValue(value) === null) {
        return "Invalid date format";
      }
      break;
      
    case "boolean":
      // Boolean is always valid
      break;
  }
  
  return null;
}
