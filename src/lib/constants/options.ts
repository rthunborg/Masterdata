export const TOWN_DISTRICTS = [
  "Göteborg",
  "Halmstad",
  "Trelleborg"
] as const;

export type TownDistrict = typeof TOWN_DISTRICTS[number];
