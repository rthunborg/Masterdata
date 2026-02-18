/**
 * Filter Serializer for Epic 20 - Advanced Employee Filtering
 * 
 * Serializes/deserializes filter state to/from URL-safe base64 encoded JSON.
 * Enables sharing filtered views via URL.
 */

import type { FilterState } from "@/lib/types/filter";

/**
 * Serialize filter state array to base64 encoded JSON string
 * @param filters - Array of filter states
 * @returns Base64 encoded JSON string (empty string if no filters)
 */
export function serializeFilters(filters: FilterState[]): string {
  if (filters.length === 0) return "";

  try {
    // Convert to JSON
    const json = JSON.stringify(filters);

    // Base64 encode for URL safety
    // Use btoa() for browser, Buffer for Node.js
    if (typeof window !== "undefined") {
      return btoa(json);
    } else {
      return Buffer.from(json).toString("base64");
    }
  } catch (error) {
    console.error("Failed to serialize filters:", error);
    return "";
  }
}

/**
 * Deserialize base64 encoded JSON string to filter state array
 * @param encoded - Base64 encoded JSON string
 * @returns Array of filter states (empty array if invalid)
 */
export function deserializeFilters(encoded: string): FilterState[] {
  if (!encoded || encoded.trim() === "") return [];

  try {
    // Base64 decode
    let json: string;
    if (typeof window !== "undefined") {
      json = atob(encoded);
    } else {
      json = Buffer.from(encoded, "base64").toString("utf-8");
    }

    // Parse JSON
    const parsed = JSON.parse(json);

    // Validate structure
    if (!Array.isArray(parsed)) {
      console.warn("Deserialized filters is not an array");
      return [];
    }

    // Validate each filter state
    const validFilters = parsed.filter(isValidFilterState);

    if (validFilters.length !== parsed.length) {
      console.warn(
        `${parsed.length - validFilters.length} invalid filter(s) removed`
      );
    }

    return validFilters;
  } catch (error) {
    console.error("Failed to deserialize filters:", error);
    return [];
  }
}

/**
 * Validate filter state object structure
 * @param obj - Object to validate
 * @returns true if valid FilterState
 */
function isValidFilterState(obj: unknown): obj is FilterState {
  if (typeof obj !== "object" || obj === null) return false;

  const filter = obj as Record<string, unknown>;

  // Required fields
  if (typeof filter.columnId !== "string") return false;
  if (
    filter.type !== "text" &&
    filter.type !== "boolean" &&
    filter.type !== "date" &&
    filter.type !== "select"
  ) {
    return false;
  }

  // Type-specific validation
  switch (filter.type) {
    case "text":
      if (filter.textValue !== undefined && typeof filter.textValue !== "string") {
        return false;
      }
      break;

    case "boolean":
      if (
        filter.boolValue !== undefined &&
        filter.boolValue !== null &&
        typeof filter.boolValue !== "boolean"
      ) {
        return false;
      }
      break;

    case "date":
      // Validate dateRange if present
      if (filter.dateRange !== undefined) {
        if (typeof filter.dateRange !== "object" || filter.dateRange === null) {
          return false;
        }
        const range = filter.dateRange as Record<string, unknown>;
        if (
          range.from !== null &&
          range.from !== undefined &&
          typeof range.from !== "string" &&
          !(range.from instanceof Date)
        ) {
          return false;
        }
        if (
          range.to !== null &&
          range.to !== undefined &&
          typeof range.to !== "string" &&
          !(range.to instanceof Date)
        ) {
          return false;
        }
      }

      // Validate selectedDateIds if present
      if (filter.selectedDateIds !== undefined) {
        if (
          !Array.isArray(filter.selectedDateIds) ||
          !filter.selectedDateIds.every((id) => typeof id === "string")
        ) {
          return false;
        }
      }
      break;
  }

  return true;
}

/**
 * Create a shareable URL with filters
 * @param baseUrl - Base URL (without query params)
 * @param filters - Array of filter states
 * @returns Full URL with filters encoded in query param
 */
export function createFilteredUrl(
  baseUrl: string,
  filters: FilterState[]
): string {
  const encoded = serializeFilters(filters);
  if (!encoded) return baseUrl;

  const url = new URL(baseUrl);
  url.searchParams.set("filters", encoded);
  return url.toString();
}

/**
 * Extract filters from URL query params
 * @param url - Full URL or query string
 * @returns Array of filter states
 */
export function extractFiltersFromUrl(url: string): FilterState[] {
  try {
    const urlObj = new URL(url);
    const encoded = urlObj.searchParams.get("filters");
    return encoded ? deserializeFilters(encoded) : [];
  } catch (_error) {
    // Not a valid URL, try as query string
    const params = new URLSearchParams(url);
    const encoded = params.get("filters");
    return encoded ? deserializeFilters(encoded) : [];
  }
}
