/**
 * Column Visibility Storage Utilities
 * 
 * Manages localStorage persistence of column visibility preferences for HR Admin users.
 * Each user's preferences are stored separately using their user ID as a key.
 */

const STORAGE_KEY_PREFIX = "hr_masterdata_column_visibility_";

/**
 * Save column visibility preferences to localStorage
 * 
 * @param userId - The user's unique ID
 * @param preferences - Map of column IDs to visibility booleans
 */
export function saveColumnVisibility(
  userId: string,
  preferences: Record<string, boolean>
): void {
  if (typeof window === "undefined") return;
  
  try {
    const key = `${STORAGE_KEY_PREFIX}${userId}`;
    localStorage.setItem(key, JSON.stringify(preferences));
  } catch (error) {
    console.error("Failed to save column visibility preferences:", error);
  }
}

/**
 * Load column visibility preferences from localStorage
 * 
 * @param userId - The user's unique ID
 * @returns Map of column IDs to visibility booleans, or null if no preferences found
 */
export function loadColumnVisibility(
  userId: string
): Record<string, boolean> | null {
  if (typeof window === "undefined") return null;
  
  try {
    const key = `${STORAGE_KEY_PREFIX}${userId}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) return null;
    
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to load column visibility preferences:", error);
    return null;
  }
}

/**
 * Clear column visibility preferences from localStorage
 * 
 * @param userId - The user's unique ID
 */
export function clearColumnVisibility(userId: string): void {
  if (typeof window === "undefined") return;
  
  try {
    const key = `${STORAGE_KEY_PREFIX}${userId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to clear column visibility preferences:", error);
  }
}
