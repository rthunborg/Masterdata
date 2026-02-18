/**
 * Saved Filter type definitions for Story 20.6
 */

import type { FilterState } from "./filter";

export interface SavedFilter {
  id: string;
  user_id: string;
  name: string;
  filters: FilterState[];
  created_at: string;
  updated_at: string;
}

export interface CreateSavedFilterRequest {
  name: string;
  filters: FilterState[];
}

export interface CreateSavedFilterResponse {
  data: SavedFilter;
}

export interface GetSavedFiltersResponse {
  data: SavedFilter[];
}

export interface DeleteSavedFilterResponse {
  success: boolean;
}
