export const TOWN_DISTRICTS = [
  "Göteborg",
  "Halmstad",
  "Trelleborg"
] as const;

export type TownDistrict = typeof TOWN_DISTRICTS[number];

/**
 * Maps db_column_name to the fixed set of selectable options for that column.
 * Used by both the editable cells and the filter panel to stay in sync.
 */
export const COLUMN_SELECT_OPTIONS: Record<string, string[]> = {
  gender: ["Man", "Woman"],
  rank: ["SEV", "CHEF"],
  town_district: [...TOWN_DISTRICTS],
};
