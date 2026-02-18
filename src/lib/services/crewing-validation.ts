/**
 * Crewing/Done Field Validation Service
 * 
 * Business Rule: The Crewing/Done field represents the final checkpoint in employee 
 * onboarding. When marked true, it indicates the employee has completed all mandatory 
 * requirements and is ready for crew assignment and operational deployment.
 * 
 * All 8 prerequisite masterdata fields must be true before an employee can be marked 
 * as crew-ready (Crewing/Done = true). kvitto_c17_18 and loneiva (Lönenivå) are not required:
 * loneiva defaults to Lönenivå 0 and any value 0–7 is acceptable.
 * 
 * The 8 prerequisite fields represent critical onboarding steps:
 * - ISP: International Safety Passport certification
 * - Photo: Employee photo on file
 * - Origo: Origo system registration
 * - Mail: Email setup complete
 * - Bankuppgifter: Bank account details verified
 * - LI: Life Insurance enrollment
 * - Passport: Passport verification complete
 * - C17: Mandatory certification
 * 
 * Dependencies:
 * - Story 7.1: Comprehensive masterdata column migration (added all 10 prerequisite fields)
 * - Story 8.2: Boolean completion tracking (converted fields to boolean type)
 */

import type { Employee } from '@/lib/types/employee';

/**
 * Prerequisite fields required for Crewing/Done editability.
 * All 8 fields must be true before Crewing/Done can be edited.
 * kvitto_c17_18 and loneiva (Lönenivå) are not required; loneiva defaults to 0 and any 0–7 is fine.
 */
const REQUIRED_FIELDS = [
  'isps',
  'photo',
  'origo',
  'mail_lon',
  'bankuppgifter',
  'li',
  'passport',
  'c17',
] as const;

/**
 * Field name to display name mapping for user-friendly messages.
 * These display names match the labels shown in the UI and documentation.
 */
const FIELD_LABELS: Record<string, string> = {
  isps: 'ISP',
  photo: 'Photo',
  origo: 'Origo',
  mail_lon: 'Mail',
  bankuppgifter: 'Bankuppgifter',
  li: 'LI',
  passport: 'Passport',
  c17: 'C17',
};

/**
 * Determine if Crewing/Done field can be edited based on prerequisite completion.
 * 
 * Business Rule: All 8 prerequisite masterdata fields must be true before
 * an employee can be marked as crew-ready (Crewing/Done = true). loneiva and kvitto_c17_18 are not required.
 * 
 * @param employee - Employee object with prerequisite fields
 * @returns true if all prerequisites are met, false otherwise
 * 
 * @example
 * // All prerequisites complete - can edit Crewing/Done
 * const completeEmployee = {
 *   isps: true,
 *   photo: true,
 *   origo: true,
 *   mail_lon: true,
 *   bankuppgifter: true,
 *   li: true,
 *   passport: true,
 *   c17: true,
 * };
 * canEditCrewingDone(completeEmployee) // Returns true
 * 
 * @example
 * // One prerequisite incomplete - cannot edit
 * const incompleteEmployee = {
 *   isps: false, // Missing ISP
 *   photo: true,
 *   origo: true,
 *   mail_lon: true,
 *   bankuppgifter: true,
 *   li: true,
 *   passport: true,
 *   c17: true,
 * };
 * canEditCrewingDone(incompleteEmployee) // Returns false
 * 
 * @example
 * // Null prerequisite - cannot edit
 * const nullEmployee = {
 *   isps: true,
 *   photo: null, // Null value
 *   origo: true,
 *   mail_lon: true,
 *   bankuppgifter: true,
 *   li: true,
 *   passport: true,
 *   c17: true,
 * };
 * canEditCrewingDone(nullEmployee) // Returns false
 */
export function canEditCrewingDone(employee: Partial<Employee>): boolean {
  return REQUIRED_FIELDS.every((field) => employee[field] === true);
}

/**
 * Get list of incomplete prerequisite fields for display in tooltips/errors.
 * 
 * Used to provide user-friendly feedback about which prerequisites are still
 * needed before Crewing/Done can be edited.
 * 
 * @param employee - Employee object with prerequisite fields
 * @returns Array of display names for incomplete fields (e.g., ["ISP", "Photo", "Origo"])
 * 
 * @example
 * // All prerequisites complete - returns empty array
 * const completeEmployee = {
 *   isps: true,
 *   photo: true,
 *   origo: true,
 *   mail_lon: true,
 *   bankuppgifter: true,
 *   li: true,
 *   passport: true,
 *   c17: true,
 * };
 * getIncompleteFields(completeEmployee) // Returns []
 * 
 * @example
 * // Two prerequisites incomplete
 * const incompleteEmployee = {
 *   isps: false,
 *   photo: null,
 *   origo: true,
 *   mail_lon: true,
 *   bankuppgifter: true,
 *   li: true,
 *   passport: true,
 *   c17: true,
 * };
 * getIncompleteFields(incompleteEmployee) // Returns ["ISP", "Photo"]
 */
export function getIncompleteFields(employee: Partial<Employee>): string[] {
  return REQUIRED_FIELDS
    .filter((field) => employee[field] !== true)
    .map((field) => FIELD_LABELS[field]);
}

