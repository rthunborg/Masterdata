export interface Employee {
  id: string;
  first_name: string;
  surname: string;
  ssn: string;
  email: string | null;
  mobile: string | null;
  rank: 'SEV' | 'CHEF' | null;
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
   * Flag indicating if ÖMC repayment is needed after termination.
   * Auto-populated when employee is terminated.
   * Cleared when employee is reactivated and date is restored.
   * Read-only - managed by termination workflow.
   */
  repayment_needed_omc: boolean | null;
  
  /**
   * Flag indicating if PE3 repayment is needed after termination.
   * Auto-populated when employee is terminated.
   * Cleared when employee is reactivated and date is restored.
   * Read-only - managed by termination workflow.
   */
  repayment_needed_pe3: boolean | null;
  
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
  rank: 'SEV' | 'CHEF' | null;
  hire_date: string;
  is_terminated: boolean;
  is_archived: boolean;
}
