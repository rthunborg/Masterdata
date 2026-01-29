/**
 * Column Name Alias Mapping
 * 
 * Maps various column name variations to their canonical database column names.
 * Used by both import and export functionality to handle naming inconsistencies.
 * 
 * Story: 17.4 - HR Admin Impersonation Export
 */

/**
 * Mapping of column name aliases to their canonical database column names
 * 
 * @example
 * COLUMN_ALIAS_MAPPINGS["social_security_no"] // returns "ssn"
 * COLUMN_ALIAS_MAPPINGS["firstname"] // returns "first_name"
 */
export const COLUMN_ALIAS_MAPPINGS: Record<string, string> = {
  // First Name variations
  "first_name": "first_name",
  "firstname": "first_name",
  "given_name": "first_name",
  
  // Surname variations
  "surname": "surname",
  "last_name": "surname",
  "lastname": "surname",
  "family_name": "surname",
  
  // SSN variations
  "ssn": "ssn",
  "social_security_no": "ssn",
  "social_security_number": "ssn",
  "personal_number": "ssn",
  "personnummer": "ssn",
  
  // Email variations
  "email": "email",
  "e-mail": "email",
  "email_address": "email",
  
  // Mobile variations
  "mobile": "mobile",
  "phone": "mobile",
  "mobile_phone": "mobile",
  "telephone": "mobile",
  
  // Rank variations
  "rank": "rank",
  "position": "rank",
  "title": "rank",
  
  // Gender variations
  "gender": "gender",
  "sex": "gender",
  
  // Town District variations
  "town_district": "town_district",
  "town": "town_district",
  "district": "town_district",
  "location": "town_district",
  
  // Hire Date variations
  "hire_date": "hire_date",
  "start_date": "hire_date",
  "employment_date": "hire_date",
  "joining_date": "hire_date",
  
  // Termination Date variations
  "termination_date": "termination_date",
  "end_date": "termination_date",
  "leaving_date": "termination_date",
  "exit_date": "termination_date",
  
  // Termination Reason variations
  "termination_reason": "termination_reason",
  "reason": "termination_reason",
  "exit_reason": "termination_reason",
  
  // Comments variations
  "comments": "comments",
  "comment": "comments",
  "notes": "comments",
  "note": "comments",
  "remarks": "comments",
  
  // Special Diet variations
  "special_diet": "special_diet",
  "specialkost": "special_diet",
  
  // Diet Details variations
  "diet": "diet_details",
  "diet_details": "diet_details",
  
  // Repayment dates
  "repayment_needed_omc": "repayment_needed_omc",
  "repayment_needed_pe3": "repayment_needed_pe3",
  
  // Salary level
  "loneiva": "loneiva",
  "salary_level": "loneiva",
  "lönenivå": "loneiva",
};

/**
 * Normalizes a column name by converting to lowercase and replacing spaces with underscores
 */
export function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "_");
}

/**
 * Resolves a column name to its canonical database column name using the alias mapping
 * 
 * @param columnName - The column name to resolve (can be an alias)
 * @returns The canonical database column name, or the original name if no mapping exists
 * 
 * @example
 * resolveColumnAlias("social_security_no") // returns "ssn"
 * resolveColumnAlias("Social Security Number") // returns "ssn"
 * resolveColumnAlias("unknown_field") // returns "unknown_field"
 */
export function resolveColumnAlias(columnName: string): string {
  const normalized = normalizeColumnName(columnName);
  return COLUMN_ALIAS_MAPPINGS[normalized] || normalized;
}

/**
 * Checks if two column names match, accounting for aliases
 * 
 * @param name1 - First column name
 * @param name2 - Second column name
 * @returns true if the names match (directly or through aliases)
 * 
 * @example
 * columnNamesMatch("ssn", "social_security_no") // returns true
 * columnNamesMatch("first_name", "given_name") // returns true
 * columnNamesMatch("email", "mobile") // returns false
 */
export function columnNamesMatch(name1: string, name2: string): boolean {
  const resolved1 = resolveColumnAlias(name1);
  const resolved2 = resolveColumnAlias(name2);
  return resolved1 === resolved2;
}
