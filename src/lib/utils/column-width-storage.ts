/**
 * LocalStorage utility for persisting column widths across browser sessions
 * Story 9.4: Table UX Enhancements - Column Resizing
 * 
 * Column widths are stored per-user and per-table-view to allow different
 * width preferences for Dashboard, Important Dates, User Settings, etc.
 */

/**
 * Generate localStorage key for column widths
 * Format: columnWidths-{viewName}-{userId}
 * 
 * @param viewName - Name of the table view (e.g., 'dashboard', 'important-dates')
 * @param userId - User ID for per-user preferences
 * @returns Storage key string
 */
export function getColumnWidthsStorageKey(
  viewName: string,
  userId: string
): string {
  return `columnWidths-${viewName}-${userId}`;
}

/**
 * Save column widths to localStorage
 * 
 * @param viewName - Name of the table view
 * @param userId - User ID for per-user preferences
 * @param widths - Record of column IDs to width values in pixels
 */
export function saveColumnWidths(
  viewName: string,
  userId: string,
  widths: Record<string, number>
): void {
  try {
    const key = getColumnWidthsStorageKey(viewName, userId);
    localStorage.setItem(key, JSON.stringify(widths));
  } catch (error) {
    // Handle localStorage errors (e.g., QuotaExceededError, SecurityError in private mode)
    console.error('Failed to save column widths to localStorage:', error);
  }
}

/**
 * Load column widths from localStorage
 * 
 * @param viewName - Name of the table view
 * @param userId - User ID for per-user preferences
 * @returns Record of column IDs to width values, or null if not found/error
 */
export function loadColumnWidths(
  viewName: string,
  userId: string
): Record<string, number> | null {
  try {
    const key = getColumnWidthsStorageKey(viewName, userId);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    // Handle JSON parse errors or localStorage access errors
    console.error('Failed to load column widths from localStorage:', error);
    return null;
  }
}

/**
 * Clear saved column widths from localStorage (reset to defaults)
 * 
 * @param viewName - Name of the table view
 * @param userId - User ID for per-user preferences
 */
export function clearColumnWidths(viewName: string, userId: string): void {
  try {
    const key = getColumnWidthsStorageKey(viewName, userId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear column widths from localStorage:', error);
  }
}
