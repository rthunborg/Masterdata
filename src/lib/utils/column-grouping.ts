import type { ColumnConfig } from "@/lib/types/column-config";

/**
 * Category metadata extracted from columns
 */
export interface CategoryMetadata {
  name: string;
  color: string | null;
  columnCount: number;
}

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

/**
 * Extract category metadata (name, color, column count) from columns
 * 
 * This is useful for displaying category information in UI elements like
 * category selectors, legends, or admin panels.
 * 
 * @param columns - Array of column configurations
 * @returns Array of category metadata objects
 */
export function extractCategoryMetadata(
  columns: ColumnConfig[]
): CategoryMetadata[] {
  const categoryMap = new Map<string, { color: string | null; count: number }>();

  columns.forEach((col) => {
    if (!col.is_masterdata && col.category) {
      const existing = categoryMap.get(col.category);
      if (existing) {
        existing.count++;
        // Use the first non-null color found for this category
        if (!existing.color && col.category_color) {
          existing.color = col.category_color;
        }
      } else {
        categoryMap.set(col.category, {
          color: col.category_color || null,
          count: 1,
        });
      }
    }
  });

  return Array.from(categoryMap.entries()).map(([name, { color, count }]) => ({
    name,
    color,
    columnCount: count,
  }));
}

