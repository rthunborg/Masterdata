export interface Employee {
  id: string;
  first_name: string;
  surname: string;
  ssn: string;
  email: string | null;
  mobile: string | null;
  rank: string | null;
  gender: string | null;
  town_district: string | null;
  hire_date: string;
  termination_date: string | null;
  termination_reason: string | null;
  is_terminated: boolean;
  is_archived: boolean;
  comments: string | null;
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
  rank: string | null;
  hire_date: string;
  is_terminated: boolean;
  is_archived: boolean;
}
