export interface ImportantDate {
  id: string;
  week_number: number | null;
  year: number;
  category: string;
  date_description: string;
  date_value: string;
  notes: string | null;
  is_active: boolean;
  max_spots: number; // Maximum capacity for this date
  remaining_spots: number; // Remaining available spots
  created_at: string;
  updated_at: string;
}

export type ImportantDateFormData = Omit<
  ImportantDate,
  "id" | "created_at" | "updated_at" | "is_active"
>;
