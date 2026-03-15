export const STAFFING_LOCATIONS = ['Göteborg', 'Trelleborg'] as const;
export type StaffingLocation = (typeof STAFFING_LOCATIONS)[number];

export interface StaffingNeed {
  id: string;
  location: StaffingLocation;
  headcount_need: number;
  updated_at: string;
  updated_by: string | null;
}

export interface StaffingNeedLastChange {
  old_value: number;
  new_value: number;
  changed_at: string;
  changed_by_email: string;
}

export interface StaffingNeedWithProgress extends StaffingNeed {
  crewReadyCount: number;
  crewReadyPercentage: number;
  last_change: StaffingNeedLastChange | null;
}

export interface StaffingNeedsChangelogEntry {
  id: string;
  location: StaffingLocation;
  old_value: number;
  new_value: number;
  changed_by: string;
  changed_by_email: string;
  changed_at: string;
}
