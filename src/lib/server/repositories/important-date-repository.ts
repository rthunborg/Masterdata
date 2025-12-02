import { createClient } from "@/lib/supabase/server";
import type { ImportantDate, ImportantDateFormData } from "@/lib/types/important-date";

export class ImportantDateRepository {
  private async getSupabaseClient() {
    return await createClient();
  }

  async findAll(category?: string): Promise<ImportantDate[]> {
    try {
      const supabase = await this.getSupabaseClient();
      
      let query = supabase
        .from("important_dates")
        .select("*")
        .order("week_number", { ascending: true, nullsFirst: false })
        .order("year", { ascending: true });

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query;

      if (error || !data) {
        console.error("Error fetching important dates:", error);
        return [];
      }

      return data;
    } catch (error) {
      console.error("Unexpected error fetching important dates:", error);
      return [];
    }
  }

  async findById(id: string): Promise<ImportantDate | null> {
    try {
      const supabase = await this.getSupabaseClient();
      
      const { data, error } = await supabase
        .from("important_dates")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        console.error("Error fetching important date by id:", id, error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Unexpected error fetching important date by id:", id, error);
      return null;
    }
  }

  async create(data: ImportantDateFormData): Promise<ImportantDate> {
    try {
      const supabase = await this.getSupabaseClient();

      const { data: importantDate, error } = await supabase
        .from("important_dates")
        .insert([data])
        .select()
        .single();

      if (error) {
        console.error("Error creating important date:", error);
        throw new Error("Failed to create important date");
      }

      if (!importantDate) {
        throw new Error("Failed to create important date: No data returned");
      }

      return importantDate;
    } catch (error) {
      // Re-throw our custom errors
      if (error instanceof Error) {
        throw error;
      }
      // Unexpected errors
      console.error("Unexpected error creating important date:", error);
      throw new Error("Failed to create important date");
    }
  }

  async update(id: string, data: Partial<ImportantDate>): Promise<ImportantDate> {
    try {
      // Validate at least one field provided
      if (Object.keys(data).length === 0) {
        throw new Error("At least one field must be provided for update");
      }

      const supabase = await this.getSupabaseClient();

      const { data: importantDate, error } = await supabase
        .from("important_dates")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        // Check for not found (PGRST116 is PostgREST error code for no rows)
        if (error.code === "PGRST116") {
          throw new Error(`Important date with ID ${id} not found`);
        }

        console.error("Error updating important date:", error);
        throw new Error("Failed to update important date");
      }

      if (!importantDate) {
        throw new Error(`Important date with ID ${id} not found`);
      }

      return importantDate;
    } catch (error) {
      // Re-throw our custom errors
      if (error instanceof Error) {
        throw error;
      }
      // Unexpected errors
      console.error("Unexpected error updating important date:", error);
      throw new Error("Failed to update important date");
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const supabase = await this.getSupabaseClient();

      // Story 8.7: Before deleting date, clear any employee assignments
      // Check how many employees are assigned to this date
      const { data: assignedEmployees, error: checkError } = await supabase
        .from("employees")
        .select("id")
        .or(`omc_date.eq.${id},stena_date.eq.${id},pe3_date.eq.${id}`);

      if (checkError) {
        console.error("Error checking employee assignments:", checkError);
        throw new Error("Failed to check employee assignments for date");
      }

      const assignmentCount = assignedEmployees?.length || 0;

      // Clear employee assignments before deletion
      // Update all employees that reference this date (set date fields to NULL)
      if (assignmentCount > 0) {
        // Clear omc_date assignments
        await supabase
          .from("employees")
          .update({ omc_date: null })
          .eq("omc_date", id);

        // Clear stena_date assignments
        await supabase
          .from("employees")
          .update({ stena_date: null })
          .eq("stena_date", id);

        // Clear pe3_date assignments
        await supabase
          .from("employees")
          .update({ pe3_date: null })
          .eq("pe3_date", id);

      }

      // Now delete the date
      const { error } = await supabase
        .from("important_dates")
        .delete()
        .eq("id", id);

      if (error) {
        // Check for not found (PGRST116 is PostgREST error code for no rows)
        if (error.code === "PGRST116") {
          throw new Error(`Important date with ID ${id} not found`);
        }

        console.error("Error deleting important date:", error);
        throw new Error("Failed to delete important date");
      }
    } catch (error) {
      // Re-throw our custom errors
      if (error instanceof Error) {
        throw error;
      }
      // Unexpected errors
      console.error("Unexpected error deleting important date:", error);
      throw new Error("Failed to delete important date");
    }
  }

  async createMany(dates: ImportantDateFormData[]): Promise<{
    imported: number;
    skipped: number;
    errors: Array<{ row: number; field?: string; message: string }>;
  }> {
    try {
      const supabase = await this.getSupabaseClient();

      // Batch insert all dates
      const { data: insertedDates, error } = await supabase
        .from("important_dates")
        .insert(dates)
        .select();

      if (error) {
        console.error("Error batch inserting important dates:", error);
        
        // If it's a duplicate error (PostgreSQL code 23505), handle gracefully
        if (error.code === "23505") {
          return {
            imported: 0,
            skipped: dates.length,
            errors: dates.map((_, index) => ({
              row: index + 2,
              message: "Duplicate entry",
            })),
          };
        }

        throw new Error("Failed to batch insert important dates");
      }

      return {
        imported: insertedDates?.length || 0,
        skipped: 0,
        errors: [],
      };
    } catch (error) {
      // Re-throw our custom errors
      if (error instanceof Error) {
        throw error;
      }
      // Unexpected errors
      console.error("Unexpected error batch inserting important dates:", error);
      throw new Error("Failed to batch insert important dates");
    }
  }
}

export const importantDateRepository = new ImportantDateRepository();
