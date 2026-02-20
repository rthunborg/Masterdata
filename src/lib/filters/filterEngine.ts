/**
 * Filter Engine for Epic 20 - Advanced Employee Filtering
 * 
 * Applies filters to employee list based on FilterState configuration.
 * Supports text, boolean, and date filtering with configurable operators.
 */

import type { Employee } from "@/lib/types/employee";
import type { FilterState } from "@/lib/types/filter";
import type { ImportantDate } from "@/lib/types/important-date";
import type { ColumnConfig } from "@/lib/types/column-config";

/**
 * Apply all active filters to employee list
 * @param employees - Array of employees to filter
 * @param filters - Array of active filter states
 * @param importantDates - Array of important dates for date filtering
 * @param columnConfigs - Array of column configurations to map columnId to db_column_name
 * @returns Filtered employee array (AND logic between filters)
 */
export function applyFilters(
  employees: Employee[],
  filters: FilterState[],
  importantDates: ImportantDate[],
  columnConfigs: ColumnConfig[]
): Employee[] {
  // No filters = return all employees
  if (filters.length === 0) return employees;

  // Apply AND logic: employee must match ALL filters
  return employees.filter((employee) => {
    return filters.every((filter) =>
      matchesFilter(employee, filter, importantDates, columnConfigs)
    );
  });
}

/**
 * Check if employee matches a single filter
 * @param employee - Employee to check
 * @param filter - Filter state to apply
 * @param importantDates - Array of important dates for date filtering
 * @param columnConfigs - Array of column configurations
 * @returns true if employee matches filter
 */
function matchesFilter(
  employee: Employee,
  filter: FilterState,
  importantDates: ImportantDate[],
  columnConfigs: ColumnConfig[]
): boolean {
  // Find column config to get db_column_name
  const columnConfig = columnConfigs.find((col) => col.id === filter.columnId);
  if (!columnConfig) return true; // Skip if column not found

  const fieldName = columnConfig.db_column_name;
  const fieldValue = employee[fieldName as keyof Employee];

  switch (filter.type) {
    case "text":
      return matchesTextFilter(fieldValue, filter.textValue);

    case "boolean":
      return matchesBooleanFilter(fieldValue, filter.boolValue);

    case "date":
      return matchesDateFilter(fieldValue, filter, importantDates);

    case "select":
      return matchesSelectFilter(fieldValue, filter.selectedValues);

    default:
      return true;
  }
}

/**
 * Text filter: case-insensitive contains search
 * @param value - Field value from employee record
 * @param searchText - Search text from filter
 * @returns true if value contains searchText (case-insensitive)
 */
function matchesTextFilter(
  value: unknown,
  searchText: string | undefined
): boolean {
  // No search text = no filtering
  if (!searchText || searchText.trim() === "") return true;

  // Null/undefined values don't match
  if (value === null || value === undefined) return false;

  // Convert to lowercase strings and check contains
  const valueStr = String(value).toLowerCase();
  const searchStr = searchText.toLowerCase().trim();

  return valueStr.includes(searchStr);
}

/**
 * Boolean filter: exact match.  Null/undefined field values are treated as
 * false so that unset booleans show up when the user filters for "No".
 */
function matchesBooleanFilter(
  value: unknown,
  filterValue: boolean | null | undefined
): boolean {
  if (filterValue === null || filterValue === undefined) return true;

  const normalised = value === null || value === undefined ? false : value;
  return normalised === filterValue;
}

/**
 * Select filter: value must be one of the selected options (case-insensitive).
 */
function matchesSelectFilter(
  value: unknown,
  selectedValues: string[] | undefined
): boolean {
  if (!selectedValues || selectedValues.length === 0) return true;
  if (value === null || value === undefined) return false;

  const valueStr = String(value).toLowerCase();
  return selectedValues.some((sv) => sv.toLowerCase() === valueStr);
}

/**
 * Date filter: range + specific dates with OR logic
 * @param value - UUID of important_date from employee record
 * @param filter - Filter state with dateRange and/or selectedDateIds
 * @param importantDates - Array of important dates
 * @returns true if value matches date filter criteria
 */
function matchesDateFilter(
  value: unknown,
  filter: FilterState,
  importantDates: ImportantDate[]
): boolean {
  // Value must be a string (UUID)
  if (typeof value !== "string") return false;

  const { dateRange, selectedDateIds } = filter;

  // Check if no date filter criteria set
  const hasRange = dateRange && (dateRange.from || dateRange.to);
  const hasSpecificDates = selectedDateIds && selectedDateIds.length > 0;

  // No criteria = no filtering
  if (!hasRange && !hasSpecificDates) return true;

  // Check if in specific dates list
  const matchesSpecific =
    hasSpecificDates && selectedDateIds!.includes(value);

  // Check if in date range
  let matchesRange = false;
  if (hasRange) {
    const dateRecord = importantDates.find((d) => d.id === value);
    if (dateRecord) {
      const date = new Date(dateRecord.date_value);
      const fromDate = dateRange!.from ? new Date(dateRange!.from) : null;
      const toDate = dateRange!.to ? new Date(dateRange!.to) : null;

      // Check range boundaries
      const afterFrom = !fromDate || date >= fromDate;
      const beforeTo = !toDate || date <= toDate;

      matchesRange = afterFrom && beforeTo;
    }
  }

  // OR logic: match if in specific dates OR in range
  return matchesSpecific || matchesRange;
}

/**
 * Get count of employees matching filters
 * @param employees - Array of employees
 * @param filters - Array of active filters
 * @param importantDates - Array of important dates
 * @param columnConfigs - Array of column configurations
 * @returns Count of filtered employees
 */
export function getFilteredCount(
  employees: Employee[],
  filters: FilterState[],
  importantDates: ImportantDate[],
  columnConfigs: ColumnConfig[]
): number {
  return applyFilters(employees, filters, importantDates, columnConfigs).length;
}

/**
 * Check if any filters are active
 * @param filters - Array of filter states
 * @returns true if at least one filter has criteria set
 */
export function hasActiveFilters(filters: FilterState[]): boolean {
  return filters.some((filter) => {
    switch (filter.type) {
      case "text":
        return !!filter.textValue && filter.textValue.trim() !== "";
      case "boolean":
        return filter.boolValue !== null && filter.boolValue !== undefined;
      case "date":
        return (
          (filter.dateRange &&
            (filter.dateRange.from || filter.dateRange.to)) ||
          (filter.selectedDateIds && filter.selectedDateIds.length > 0)
        );
      case "select":
        return !!filter.selectedValues && filter.selectedValues.length > 0;
      default:
        return false;
    }
  });
}
