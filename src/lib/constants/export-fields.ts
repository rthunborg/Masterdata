/**
 * Export field definitions for category-based employee export
 * Story: 8.8 - Important Dates Assigned Employees List
 * 
 * Only includes non-boolean masterdata fields for export.
 * Boolean fields (ISP, Photo, Origo, Mail, Talmundo, etc.) are explicitly excluded.
 */

export interface ExportField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date';
}

/**
 * All available non-boolean employee fields for export
 */
export const EXPORTABLE_EMPLOYEE_FIELDS: ExportField[] = [
  { key: 'first_name', label: 'First Name', type: 'text' },
  { key: 'surname', label: 'Surname', type: 'text' },
  { key: 'ssn', label: 'SSN', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'mobile', label: 'Mobile', type: 'text' },
  { key: 'rank', label: 'Rank', type: 'text' },
  { key: 'gender', label: 'Gender', type: 'text' },
  { key: 'town_district', label: 'Town District', type: 'text' },
  { key: 'hire_date', label: 'Hire Date', type: 'date' },
  { key: 'termination_date', label: 'Termination Date', type: 'date' },
  { key: 'termination_reason', label: 'Termination Reason', type: 'text' },
  { key: 'comments', label: 'Comments', type: 'text' },
  { key: 'loneiva', label: 'Lönenivå', type: 'number' },
];

/**
 * Default fields selected for export
 * AC 19: Default includes First Name, Surname, Email, SSN (unmasked), Room Number
 * Note: Room Number will be added when the column exists
 */
export const DEFAULT_EXPORT_FIELDS: string[] = [
  'first_name',
  'surname',
  'email',
  'ssn',
];
