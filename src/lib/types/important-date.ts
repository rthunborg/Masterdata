/**
 * Employee assigned to an important date
 * Stored in important_dates.assigned_employees JSONB array
 */
export interface AssignedEmployee {
  /** UUID reference to employees.id */
  id: string;
  /** Full name (first_name + surname) */
  name: string;
  /** Employee email address */
  email: string | null;
  /** Room number if hotel required (can be null) */
  room_number: number | null;
}

export interface ImportantDate {
  id: string;
  week_number: number | null;
  year: number;
  category: string;
  date_description: string;
  /**
   * Date value in flexible format.
   * - For ÖMC category: Stores start date as ISO string (YYYY-MM-DD), end date is implicit +1 day
   * - For other categories: Standard single-date value
   */
  date_value: string;
  notes: string | null;
  is_active: boolean;
  max_spots: number; // Maximum capacity for this date
  remaining_spots: number; // Remaining available spots
  /** Array of employees assigned to this date */
  assigned_employees: AssignedEmployee[];
  created_at: string;
  updated_at: string;
}

export type ImportantDateFormData = Omit<
  ImportantDate,
  "id" | "created_at" | "updated_at" | "is_active" | "assigned_employees"
>;

