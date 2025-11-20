/**
 * Export Service
 * Story: 8.8 - Important Dates Assigned Employees List
 * Story: 8.9 - ÖMC Two-Day Date Format
 * Story: 8.10 - PE3 Date Time Selection
 * Story: 8.11 - Important Dates Deadline Columns
 * 
 * Handles CSV export functionality for important dates and employees.
 */

import type { ImportantDate } from '@/lib/types/important-date';
import type { ExportField } from '@/lib/constants/export-fields';
import { 
  generateCSV, 
  downloadCSV, 
  formatDateForCSV,
  formatAssignedEmployeesForCSV 
} from '@/lib/utils/csv-export';
import { formatOMCDate, isOMCDate } from '@/lib/utils/omc-date-formatter';
import { formatTimeDisplay } from '@/lib/utils/time-formatter';
import { createClient } from '@/lib/supabase/client';

/**
 * Export important dates with assigned employees (AC 7)
 * Story 8.9: ÖMC dates exported with two-day format (e.g., "8-9 mars 2025")
 * Story 8.10: PE3 dates exported with time column (e.g., "14:30")
 * Story 8.11: Deadline columns exported
 */
export function exportImportantDates(dates: ImportantDate[]): void {
  const headers = [
    'Week Number',
    'Year',
    'Category',
    'Description',
    'Date Value',
    'Time',
    'Deadline Submit',
    'Deadline Cancel',
    'Max Capacity',
    'Remaining Spots',
    'Assigned Employees',
    'Notes',
  ];

  const rows = dates.map(date => {
    // Story 8.9: Format ÖMC dates with two-day range for export
    const dateValue = isOMCDate(date.category)
      ? formatOMCDate(date.date_value, 'sv-SE')
      : date.date_value;

    // Story 8.10: Format time for PE3 dates
    const timeValue = formatTimeDisplay(date.time_value);

    return [
      date.week_number ?? '',
      date.year,
      date.category,
      date.date_description,
      dateValue,
      timeValue,
      date.deadline_submit ?? '',
      date.deadline_cancel ?? '',
      date.max_spots ?? 99,
      date.remaining_spots ?? 99,
      formatAssignedEmployeesForCSV(date.assigned_employees || []),
      date.notes ?? '',
    ];
  });

  const csvContent = generateCSV(headers, rows);
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `important_dates_${timestamp}.csv`;

  downloadCSV(csvContent, filename);
}

/**
 * Options for category-based employee export
 * Story 13.4: Added selectedEmployeeIds to support exporting only selected employees
 */
export interface CategoryExportOptions {
  category: 'Stena Dates' | 'ÖMC Dates' | 'PE3 Dates';
  dateFrom?: string;
  dateTo?: string;
  selectedFields: string[];
  fieldDefinitions: ExportField[];
  selectedEmployeeIds?: string[]; // Story 13.4: Optional - filter by selected employee IDs
}

/**
 * Map category to employee date field
 */
const CATEGORY_TO_FIELD_MAP = {
  'Stena Dates': 'stena_date',
  'ÖMC Dates': 'omc_date',
  'PE3 Dates': 'pe3_date',
} as const;

/**
 * Export employees assigned to dates within a specific category (AC 13-19)
 * Includes date range filtering and custom field selection
 * Story 13.4: Added support for filtering by selected employee IDs
 */
export async function exportEmployeesByCategory(
  options: CategoryExportOptions
): Promise<void> {
  const { category, dateFrom, dateTo, selectedFields, fieldDefinitions, selectedEmployeeIds } = options;

  const supabase = createClient();
  const dateField = CATEGORY_TO_FIELD_MAP[category];

  // Build select clause with only selected fields
  const selectFields = [
    'id',
    ...selectedFields,
    `${dateField}:important_dates(date_description, date_value, category)`
  ].join(', ');

  // Build query
  let query = supabase
    .from('employees')
    .select(selectFields)
    .not(dateField, 'is', null);

  // Story 13.4: Filter by selected employee IDs if provided
  if (selectedEmployeeIds && selectedEmployeeIds.length > 0) {
    query = query.in('id', selectedEmployeeIds);
  }

  // Apply date range filter if provided
  if (dateFrom && dateTo) {
    query = query
      .gte(`${dateField}.date_value`, dateFrom)
      .lte(`${dateField}.date_value`, dateTo);
  }

  // Execute query with ordering
  const { data: employees, error } = await query
    .order('surname', { ascending: true })
    .order('first_name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch employees: ${error.message}`);
  }

  // Story 13.4: Ensure error handling for empty selection
  if (!employees || employees.length === 0) {
    if (selectedEmployeeIds && selectedEmployeeIds.length > 0) {
      throw new Error('No selected employees found for the selected criteria');
    }
    throw new Error('No employees found for the selected criteria');
  }

  // Build dynamic headers
  const fieldLabels = selectedFields.map(fieldKey => {
    const field = fieldDefinitions.find(f => f.key === fieldKey);
    return field?.label || fieldKey;
  });

  const headers = [
    ...fieldLabels,
    'Assigned Date Description',
    'Assigned Date Value',
  ];

  // Build dynamic rows
  const rows = employees.map(emp => {
    // Get dynamic field values
    const fieldValues = selectedFields.map(fieldKey => {
      const field = fieldDefinitions.find(f => f.key === fieldKey);
      const value = emp[fieldKey as keyof typeof emp];

      // Format based on field type
      if (field?.type === 'date' && value) {
        return formatDateForCSV(value as string);
      }
      if (field?.type === 'number' && value !== null && value !== undefined) {
        return String(value);
      }
      return value ? String(value) : '';
    });

    // Add date information
    const dateInfo = emp[dateField as keyof typeof emp] as { date_description?: string; date_value?: string } | null;
    const dateDescription = dateInfo?.date_description || '';
    const dateValue = dateInfo?.date_value || '';

    return [
      ...fieldValues,
      dateDescription,
      dateValue,
    ] as (string | number | null)[];
  });

  const csvContent = generateCSV(headers, rows);
  const filename = getCategoryExportFilename(category, dateFrom, dateTo);

  downloadCSV(csvContent, filename);
}

/**
 * Generate filename for category export
 */
function getCategoryExportFilename(
  category: string,
  dateFrom?: string,
  dateTo?: string
): string {
  const categorySlug = category.toLowerCase().replace(/\s+/g, '_');
  const timestamp = new Date().toISOString().split('T')[0];

  if (dateFrom && dateTo) {
    return `employees_${categorySlug}_${dateFrom}_to_${dateTo}_${timestamp}.csv`;
  }

  return `employees_${categorySlug}_all_${timestamp}.csv`;
}
