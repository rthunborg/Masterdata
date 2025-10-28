import type { ColumnConfig } from "@/lib/types/column-config";

/**
 * Group columns by category for display in table
 * 
 * Masterdata columns are grouped under "Employee Information"
 * Custom columns are grouped by their category field
 * Custom columns without category are grouped under "Uncategorized"
 * 
 * @param columns - Array of column configurations
 * @returns Object with category names as keys and column arrays as values
 */
export function groupColumnsByCategory(
  columns: ColumnConfig[]
): Record<string, ColumnConfig[]> {
  const masterdata: ColumnConfig[] = [];
  const categorized: Record<string, ColumnConfig[]> = {};

  columns.forEach((col) => {
    if (col.is_masterdata) {
      masterdata.push(col);
    } else {
      const category = col.category || "Uncategorized";
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(col);
    }
  });

  // Return grouped columns with masterdata first
  return {
    "Employee Information": masterdata,
    ...categorized,
  };
}
