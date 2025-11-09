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
  stena_date: string | null;
  omc_date: string | null;
  pe3_date: string | null;
  termination_date: string | null;
  termination_reason: string | null;
  is_terminated: boolean;
  is_archived: boolean;
  comments: string | null;
  // New masterdata columns (Story 7.1) - Converted to boolean for completion tracking (Story 8.2)
  one: boolean | null;
  one_marked_at: string | null; // Timestamp when One field was set to true (ISO 8601 format) - Story 8.3
  talmundo: boolean | null; // Talmundo completion (editable only when One is green) - Story 8.4
  isps: boolean | null;
  photo: boolean | null;
  origo: boolean | null;
  loneiva: boolean | null;
  mail_lon: boolean | null;
  bankuppgifter: boolean | null;
  li: boolean | null;
  passport: boolean | null;
  kvitto_c17_18: boolean | null;
  c17: boolean | null;
  crewing_done: boolean | null;
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
