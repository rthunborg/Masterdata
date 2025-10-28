export interface ImportantDate {
  id: string;
  week_number: number | null;
  year: number;
  category: string;
  date_description: string;
  date_value: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ImportantDateFormData = Omit<
  ImportantDate,
  "id" | "created_at" | "updated_at"
>;
