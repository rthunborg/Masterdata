/**
 * Filter type definitions for Epic 20 - Advanced Employee Filtering
 */

export interface FilterState {
  columnId: string;
  type: "text" | "boolean" | "date" | "select";
  operator?: "equals" | "contains" | "between" | "in";
  value?: string | boolean | Date[] | string[];
  
  // Text filter
  textValue?: string;
  
  // Boolean filter
  boolValue?: boolean | null; // null = "Either"
  
  // Date filter
  dateRange?: {
    from: Date | null;
    to: Date | null;
  };
  selectedDateIds?: string[]; // UUIDs of important_dates
}
