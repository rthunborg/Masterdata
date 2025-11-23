import { createClient } from "@/lib/supabase/server";
import type { Employee, EmployeeFormData } from "@/lib/types/employee";
import { 
  captureRepaymentDates, 
  applyRepaymentCapture, 
  restoreRepaymentDates, 
  clearEmployeeDatesAndReleaseSpots 
} from "@/lib/services/termination-workflow";

export interface EmployeeFilters {
  includeArchived?: boolean;
  includeTerminated?: boolean;
  needsRepayment?: boolean; // Story 8.13 AC 9
}

export class EmployeeRepository {
  private async getSupabaseClient() {
    return await createClient();
  }

  async findAll(filters?: EmployeeFilters): Promise<Employee[]> {
    try {
      const supabase = await this.getSupabaseClient();
      
      let query = supabase
        .from("employees")
        .select("*")
        .order("surname", { ascending: true })
        .order("first_name", { ascending: true });

      // Filter by archived status
      // When includeArchived is true: show only archived employees
      // When includeArchived is false/undefined: show only non-archived employees (default)
      if (filters?.includeArchived === true) {
        query = query.eq("is_archived", true);
      } else {
        query = query.eq("is_archived", false);
      }

      // Filter by termination status
      // When includeTerminated is true: show only terminated employees
      // When includeTerminated is false/undefined: show only non-terminated employees (default)
      if (filters?.includeTerminated === true) {
        query = query.eq("is_terminated", true);
      } else {
        query = query.eq("is_terminated", false);
      }
      
      // Story 8.13 AC 9: Filter by repayment needed
      // When needsRepayment is true: show only employees needing repayment
      if (filters?.needsRepayment === true) {
        query = query.or("repayment_needed_omc.not.is.null,repayment_needed_pe3.not.is.null");
      }

      const { data, error } = await query;

      if (error || !data) {
        console.error("Error fetching employees:", error);
        return [];
      }

      return data;
    } catch (error) {
      console.error("Unexpected error fetching employees:", error);
      return [];
    }
  }

  async findById(id: string): Promise<Employee | null> {
    try {
      const supabase = await this.getSupabaseClient();
      
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        console.error("Error fetching employee by id:", id, error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Unexpected error fetching employee by id:", id, error);
      return null;
    }
  }

  async create(data: EmployeeFormData): Promise<Employee> {
    try {
      const supabase = await this.getSupabaseClient();

      const { data: employee, error } = await supabase
        .from("employees")
        .insert([data])
        .select()
        .single();

      if (error) {
        // Check for duplicate SSN error (PostgreSQL unique constraint violation)
        if (error.code === "23505" && error.message.includes("ssn")) {
          throw new Error(`Employee with SSN ${data.ssn} already exists`);
        }
        // Log full error details for debugging
        console.error("Error creating employee:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          data: JSON.stringify(data, null, 2),
        });
        // Include error code and message in thrown error for better debugging
        throw new Error(`Failed to create employee: ${error.code} - ${error.message}`);
      }

      if (!employee) {
        throw new Error("Failed to create employee: No data returned");
      }

      return employee;
    } catch (error) {
      // Re-throw our custom errors
      if (error instanceof Error) {
        throw error;
      }
      // Unexpected errors
      console.error("Unexpected error creating employee:", error);
      throw new Error("Failed to create employee");
    }
  }

  async update(id: string, data: Partial<Employee>): Promise<Employee> {
    try {
      // Validate at least one field provided
      if (Object.keys(data).length === 0) {
        throw new Error("At least one field must be provided for update");
      }

      const supabase = await this.getSupabaseClient();

      const { data: employee, error } = await supabase
        .from("employees")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        // Check for not found (PGRST116 is PostgREST error code for no rows)
        if (error.code === "PGRST116") {
          throw new Error(`Employee with ID ${id} not found`);
        }

        // Check for duplicate SSN error
        if (error.code === "23505" && error.message.includes("ssn")) {
          throw new Error(`Employee with SSN ${data.ssn} already exists`);
        }

        console.error("Error updating employee:", error);
        throw new Error("Failed to update employee");
      }

      if (!employee) {
        throw new Error(`Employee with ID ${id} not found`);
      }

      return employee;
    } catch (error) {
      // Re-throw our custom errors
      if (error instanceof Error) {
        throw error;
      }
      // Unexpected errors
      console.error("Unexpected error updating employee:", error);
      throw new Error("Failed to update employee");
    }
  }

  async archive(id: string): Promise<Employee> {
    try {
      const supabase = await this.getSupabaseClient();

      const { data: employee, error } = await supabase
        .from("employees")
        .update({ is_archived: true })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        // Check for not found (PGRST116 is PostgREST error code for no rows)
        if (error.code === "PGRST116") {
          throw new Error(`Employee with ID ${id} not found`);
        }

        console.error("Error archiving employee:", error);
        throw new Error("Failed to archive employee");
      }

      if (!employee) {
        throw new Error(`Employee with ID ${id} not found`);
      }

      return employee;
    } catch (error) {
      // Re-throw our custom errors
      if (error instanceof Error) {
        throw error;
      }
      // Unexpected errors
      console.error("Unexpected error archiving employee:", error);
      throw new Error("Failed to archive employee");
    }
  }

  async unarchive(id: string): Promise<Employee> {
    try {
      const supabase = await this.getSupabaseClient();

      const { data: employee, error } = await supabase
        .from("employees")
        .update({ is_archived: false })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        // Check for not found (PGRST116 is PostgREST error code for no rows)
        if (error.code === "PGRST116") {
          throw new Error(`Employee with ID ${id} not found`);
        }

        console.error("Error unarchiving employee:", error);
        throw new Error("Failed to unarchive employee");
      }

      if (!employee) {
        throw new Error(`Employee with ID ${id} not found`);
      }

      return employee;
    } catch (error) {
      // Re-throw our custom errors
      if (error instanceof Error) {
        throw error;
      }
      // Unexpected errors
      console.error("Unexpected error unarchiving employee:", error);
      throw new Error("Failed to unarchive employee");
    }
  }

  async terminate(
    id: string,
    terminationDate: string,
    terminationReason: string
  ): Promise<{ employee: Employee; clearedDates: string[]; releasedSpots: number }> {
    const supabase = await this.getSupabaseClient();

    try {
      // Story 8.14 AC 4: Transaction workflow for atomicity
      // Step 1: Capture repayment dates (Story 8.13)
      const repaymentDates = await captureRepaymentDates(id);
      await applyRepaymentCapture(id, repaymentDates);

      // Step 2: Clear dates and release spots (Story 8.14)
      const { clearedDates, releasedSpots } = await clearEmployeeDatesAndReleaseSpots(id);

      // Step 3: Update termination fields
      const { data: employee, error } = await supabase
        .from("employees")
        .update({
          is_terminated: true,
          termination_date: terminationDate,
          termination_reason: terminationReason,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        // Check for not found (PGRST116 is PostgREST error code for no rows)
        if (error.code === "PGRST116") {
          throw new Error(`Employee with ID ${id} not found`);
        }

        console.error("Error terminating employee:", error);
        throw new Error("Failed to terminate employee");
      }

      if (!employee) {
        throw new Error(`Employee with ID ${id} not found`);
      }

      // Story 8.14 AC 10: Audit logging
      console.log(
        `[Termination] Employee ${id}: Repayment captured (ÖMC=${repaymentDates.omc}, PE3=${repaymentDates.pe3}), ` +
        `Cleared ${clearedDates.length} dates, Released ${releasedSpots} spots at ${new Date().toISOString()}`
      );

      // Story 8.14 AC 6: Return termination summary for toast display
      return { employee, clearedDates, releasedSpots };
    } catch (error) {
      console.error("Termination workflow failed:", error);
      // Re-throw to ensure proper error handling
      throw error;
    }
  }

  async reactivate(id: string): Promise<{ employee: Employee; warnings: string[] }> {
    const supabase = await this.getSupabaseClient();

    // Story 8.13: Restore repayment dates if spots available
    const { restored, warnings } = await restoreRepaymentDates(id);
    
    // Log restoration results
    if (restored.omc || restored.pe3) {
      console.log(`[Reactivation] Restored dates for employee ${id}: ÖMC=${restored.omc}, PE3=${restored.pe3}`);
    }

    const { data: employee, error } = await supabase
      .from("employees")
      .update({
        is_terminated: false,
        termination_date: null,
        termination_reason: null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      // Check for not found (PGRST116 is PostgREST error code for no rows)
      if (error.code === "PGRST116") {
        throw new Error(`Employee with ID ${id} not found`);
      }

      console.error("Error reactivating employee:", error);
      throw new Error("Failed to reactivate employee");
    }

    if (!employee) {
      throw new Error(`Employee with ID ${id} not found`);
    }

    return { employee, warnings };
  }

  /**
   * Batch import employees from CSV data
   * Processes each row individually to handle partial failures
   * Returns detailed results for successful imports and errors
   */
  async createMany(employees: EmployeeFormData[]): Promise<{
    inserted: Employee[];
    errors: Array<{ row: number; error: string; data: EmployeeFormData }>;
  }> {
    const inserted: Employee[] = [];
    const errors: Array<{
      row: number;
      error: string;
      data: EmployeeFormData;
    }> = [];

    const supabase = await this.getSupabaseClient();

    // Process each employee individually to handle partial failures
    for (let i = 0; i < employees.length; i++) {
      try {
        const { data: employee, error } = await supabase
          .from("employees")
          .insert(employees[i])
          .select()
          .single();

        if (error) {
          // Check for duplicate SSN (PostgreSQL unique constraint violation)
          if (error.code === "23505" && error.message.includes("ssn")) {
            errors.push({
              row: i + 2, // +2 because row 1 is header, array is 0-indexed
              error: `Duplicate SSN: ${employees[i].ssn}`,
              data: employees[i],
            });
            continue;
          }

          errors.push({
            row: i + 2,
            error: error.message || "Database error",
            data: employees[i],
          });
          continue;
        }

        if (!employee) {
          errors.push({
            row: i + 2,
            error: "No data returned from database",
            data: employees[i],
          });
          continue;
        }

        inserted.push(employee);
      } catch (err: unknown) {
        errors.push({
          row: i + 2,
          error: err instanceof Error ? err.message : "Unknown error",
          data: employees[i],
        });
      }
    }

    return { inserted, errors };
  }

  /**
   * Delete an employee permanently (hard delete)
   * 
   * Story: 8.20 - Used for room recalculation on deletion
   * Note: This is a hard delete. For soft delete, use archive() instead.
   * 
   * @param id - Employee UUID
   * @returns Promise that resolves when employee is deleted
   */
  async delete(id: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    try {
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", id);

      if (error) {
        // Check for not found (PGRST116 is PostgREST error code for no rows)
        if (error.code === "PGRST116") {
          throw new Error(`Employee with ID ${id} not found`);
        }

        console.error("Error deleting employee:", error);
        throw new Error("Failed to delete employee");
      }
    } catch (error) {
      // Re-throw known errors
      if (error instanceof Error && error.message.includes("not found")) {
        throw error;
      }
      // Unexpected errors
      console.error("Unexpected error deleting employee:", error);
      throw new Error("Failed to delete employee");
    }
  }
}

export const employeeRepository = new EmployeeRepository();
