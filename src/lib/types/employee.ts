export interface Employee {
  id: string;
  first_name: string;
  surname: string;
  ssn: string;
  email: string | null;
  mobile: string | null;
  rank: 'SEV' | 'CHEF';
  gender: 'Man' | 'Woman' | null;
  town_district: string | null;
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
  
  // Story 8.13: Repayment tracking fields (auto-managed by termination workflow)
  /**
   * ÖMC date requiring repayment after termination.
   * Auto-populated when employee is terminated.
   * Cleared when employee is reactivated and date is restored.
   * Read-only - managed by termination workflow.
   */
  repayment_needed_omc: string | null;
  
  /**
   * PE3 date requiring repayment after termination.
   * Auto-populated when employee is terminated.
   * Cleared when employee is reactivated and date is restored.
   * Read-only - managed by termination workflow.
   */
  repayment_needed_pe3: string | null;
  
  comments: string | null;
  // New masterdata columns (Story 7.1) - Converted to boolean for completion tracking (Story 8.2)
  one: boolean | null;
  one_marked_at: string | null; // Timestamp when One field was set to true (ISO 8601 format) - Story 8.3
  talmundo: boolean | null; // Talmundo completion (editable only when One is green) - Story 8.4
  isps: boolean | null;
  photo: boolean | null;
  origo: boolean | null;
  /** Salary level (0-7 inclusive, or null if not set) */
  loneiva: number | null;
  mail_lon: boolean | null;
  bankuppgifter: boolean | null;
  li: boolean | null;
  passport: boolean | null;
  kvitto_c17_18: boolean | null;
  c17: boolean | null;
  crewing_done: boolean | null;
  // Story 8.20: ÖMC Room Assignment fields
  /** Hotel accommodation required for ÖMC training */
  hotel_required?: boolean | null;
  /** Room number assigned for shared accommodation (FR40 algorithm) */
  room_number_shared?: number | null;
  created_at: string;
  updated_at: string;
  customData?: Record<string, string | number | boolean | null>; // Custom column data from party tables
}

export type EmployeeFormData = Omit<
  Employee,
  "id" | "created_at" | "updated_at"
>;

export interface EmployeeListItem {
  id: string;
  first_name: string;
  surname: string;
  email: string | null;
  mobile: string | null;
  rank: 'SEV' | 'CHEF';
  hire_date: string;
  is_terminated: boolean;
  is_archived: boolean;
}
