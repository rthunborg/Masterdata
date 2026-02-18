import { TownDistrict } from "@/lib/constants/options";

export interface Employee {
  id: string;
  first_name: string;
  surname: string;
  ssn: string;
  email: string | null;
  mobile: string | null;
  rank: 'SEV' | 'CHEF' | null;
  gender: 'Man' | 'Woman' | null;
  town_district: TownDistrict | null;
  hire_date: string;
  /** UUID reference to Stena Dates (important_dates.id) */
  stena_date: string | null;
  /** UUID reference to ÖMC Dates (important_dates.id) */
  omc_date: string | null;
  /** UUID reference to PE3 Dates (important_dates.id) */
  pe3_date: string | null;
  termination_date: string | null;
  termination_reason: string | null;
  is_terminated: boolean;
  is_archived: boolean;
  archived_at: string | null;
  is_anonymized: boolean;
  
  // Story 8.13: Repayment tracking fields (checkbox: null/false = unchecked, true = checked)
  /**
   * True if employee owes repayment for ÖMC date. Set on termination when omc_date was assigned; editable as checkbox.
   */
  repayment_needed_omc: boolean | null;
  /**
   * True if employee owes repayment for PE3 date. Set on termination when pe3_date was assigned; editable as checkbox.
   */
  repayment_needed_pe3: boolean | null;

  // Story 8.17: Dietary Requirements
  special_diet: boolean;
  diet_details: string | null;
  
  comments: string | null;
  // New masterdata columns (Story 7.1) - Converted to boolean for completion tracking (Story 8.2)
  // All boolean fields are non-nullable and default to false
  one: boolean;
  one_marked_at: string | null; // Timestamp when One field was set to true (ISO 8601 format) - Story 8.3
  talmundo: boolean; // Talmundo completion (editable only when One is green) - Story 8.4
  isps: boolean;
  photo: boolean;
  origo: boolean;
  /** Salary level (0-7 inclusive, or null if not set) */
  loneiva: number | null;
  mail_lon: boolean;
  bankuppgifter: boolean;
  li: boolean;
  passport: boolean;
  kvitto_c17_18: boolean;
  c17: boolean;
  crewing_done: boolean;
  // Story 8.20: ÖMC Room Assignment fields
  /** Hotel accommodation required for ÖMC training */
  hotel_required: boolean;
  /** Room number assigned for shared accommodation (FR40 algorithm) */
  room_number_shared?: number | null;
  // Story 14.1: ÖMC Masterdata Reminder Notification
  /** Timestamp when reminder notification was sent for incomplete masterdata after ÖMC completion */
  omc_masterdata_reminder_sent_at?: string | null;
  /** Stena ID / Origo number - free-text, any string value allowed */
  stena_id_origo_nummer?: string | null;
  created_at: string;
  updated_at: string;
  customData?: Record<string, string | number | boolean | null>; // Custom column data from party tables
}

export type EmployeeFormData = Omit<
  Employee,
  "id" | "created_at" | "updated_at" | "archived_at" | "is_anonymized"
> & {
  /**
   * DB-managed: set by archive/restore workflow. Not required on create.
   */
  archived_at?: string | null;
  /**
   * DB-managed: set by anonymization workflow. Not required on create.
   */
  is_anonymized?: boolean;
};

export interface EmployeeListItem {
  id: string;
  first_name: string;
  surname: string;
  email: string | null;
  mobile: string | null;
  rank: 'SEV' | 'CHEF' | null;
  hire_date: string;
  is_terminated: boolean;
  is_archived: boolean;
}
