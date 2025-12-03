/**
 * Crewing/Done Field Validation Service
 * 
 * Business Rule: The Crewing/Done field represents the final checkpoint in employee 
 * onboarding. When marked true, it indicates the employee has completed all mandatory 
 * requirements and is ready for crew assignment and operational deployment.
 * 
 * All 10 prerequisite masterdata fields must be true before an employee can be marked 
 * as crew-ready (Crewing/Done = true).
 * 
 * The 10 prerequisite fields represent critical onboarding steps:
 * - ISP: International Safety Passport certification
 * - Photo: Employee photo on file
 * - Origo: Origo system registration
 * - Mail: Email setup complete
 * - lön: Payroll setup complete
 * - Bankuppgifter: Bank account details verified
 * - LI: Life Insurance enrollment
 * - Passport: Passport verification complete
 * - Kvitto C17/18: Mandatory certification receipt
 * - C17: Mandatory certification
 * 
 * Dependencies:
 * - Story 7.1: Comprehensive masterdata column migration (added all 10 prerequisite fields)
 * - Story 8.2: Boolean completion tracking (converted fields to boolean type)
 */

import type { Employee } from '@/lib/types/employee';

/**
 * Prerequisite fields required for Crewing/Done editability.
 * All 10 fields must be true before Crewing/Done can be edited.
 */
const REQUIRED_FIELDS = [
  'isps',
  'photo',
  'origo',
  'mail_lon',
  'loneiva', // "lön" in Swedish (payroll)
  'bankuppgifter',
  'li',
  'passport',
  'kvitto_c17_18',
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
  loneiva: 'lön',
  bankuppgifter: 'Bankuppgifter',
  li: 'LI',
  passport: 'Passport',
  kvitto_c17_18: 'Kvitto C17/18',
  c17: 'C17',
};

/**
 * Determine if Crewing/Done field can be edited based on prerequisite completion.
 * 
 * Business Rule: All 10 prerequisite masterdata fields must be true before
 * an employee can be marked as crew-ready (Crewing/Done = true).
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
 *   loneiva: true,
 *   bankuppgifter: true,
 *   li: true,
 *   passport: true,
 *   kvitto_c17_18: true,
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
 *   loneiva: true,
 *   bankuppgifter: true,
 *   li: true,
 *   passport: true,
 *   kvitto_c17_18: true,
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
 *   loneiva: true,
 *   bankuppgifter: true,
 *   li: true,
 *   passport: true,
 *   kvitto_c17_18: true,
 *   c17: true,
 * };
 * canEditCrewingDone(nullEmployee) // Returns false
 */
export function canEditCrewingDone(employee: Partial<Employee>): boolean {
  return REQUIRED_FIELDS.every((field) => {
    const value = employee[field];
    // loneiva is a number field - truthy number means complete (non-zero, non-null)
    if (field === 'loneiva') {
      return typeof value === 'number' && value !== 0;
    }
    // All other fields are booleans - must be explicitly true
    return value === true;
  });
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
 *   loneiva: true,
 *   bankuppgifter: true,
 *   li: true,
 *   passport: true,
 *   kvitto_c17_18: true,
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
 *   loneiva: true,
 *   bankuppgifter: true,
 *   li: true,
 *   passport: true,
 *   kvitto_c17_18: true,
 *   c17: true,
 * };
 * getIncompleteFields(incompleteEmployee) // Returns ["ISP", "Photo"]
 */
export function getIncompleteFields(employee: Partial<Employee>): string[] {
  return REQUIRED_FIELDS
    .filter((field) => {
      const value = employee[field];
      // loneiva is a number field - truthy number means complete
      if (field === 'loneiva') {
        return !(typeof value === 'number' && value !== 0);
      }
      // All other fields are booleans - must be explicitly true
      return value !== true;
    })
    .map((field) => FIELD_LABELS[field]);
}

