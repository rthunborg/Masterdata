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

  /**
   * Get employee column changes since a specific timestamp
   * 
   * Story: 16.2 - API Endpoint for Change Detection
   * 
   * Returns changes grouped by employee, filtered by:
   * - changed_at > lastActiveAt
   * - Only masterdata columns
   * - Only columns the user has view permission for
   * - Only non-archived employees
   * 
   * @param userId - User ID making the request
   * @param userRole - User role for permission filtering
   * @param lastActiveAt - Timestamp to compare against (null for first-time users)
   * @returns Array of changed employees with their changed columns
   */
  async getChangesSinceLastActive(
    userId: string,
    userRole: string,
    lastActiveAt: string | null
  ): Promise<Array<{
    employeeId: string;
    changedColumns: string[];
    lastChangeAt: string;
  }>> {
    try {
      const supabase = await this.getSupabaseClient();

      // First-time users: return empty results (no changes to highlight)
      if (!lastActiveAt) {
        return [];
      }

      // Get masterdata columns that the user has view permission for
      const { columnConfigRepository } = await import("./column-config-repository");
      const allColumns = await columnConfigRepository.findAll();
      const visibleMasterdataColumns = allColumns
        .filter(col => {
          // Only masterdata columns
          if (!col.is_masterdata) return false;
          
          // Check if user role has view permission
          const rolePerms = col.role_permissions[userRole as keyof typeof col.role_permissions];
          return rolePerms?.view === true;
        })
        .map(col => col.db_column_name.toLowerCase().trim()); // Normalize to lowercase for consistent matching

      // If user has no visible masterdata columns, return empty
      if (visibleMasterdataColumns.length === 0) {
        return [];
      }

      // Query employee_column_changes for changes after lastActiveAt
      // Filter by visible masterdata columns
      const { data: changes, error } = await supabase
        .from("employee_column_changes")
        .select("employee_id, column_name, changed_at")
        .gt("changed_at", lastActiveAt)
        .in("column_name", visibleMasterdataColumns)
        .order("changed_at", { ascending: false });

      if (error) {
        console.error("Error fetching employee column changes:", error);
        return [];
      }

      if (!changes || changes.length === 0) {
        return [];
      }

      // Get unique employee IDs from changes
      const employeeIds = Array.from(new Set(changes.map(c => c.employee_id)));

      // Query employees to filter out archived ones
      const { data: employees, error: employeesError } = await supabase
        .from("employees")
        .select("id, is_archived")
        .in("id", employeeIds)
        .eq("is_archived", false);

      if (employeesError) {
        console.error("Error fetching employees for change filtering:", employeesError);
        return [];
      }

      // Create set of non-archived employee IDs for fast lookup
      const nonArchivedEmployeeIds = new Set(
        (employees || []).map(emp => emp.id)
      );

      // Group changes by employee_id, filtering out archived employees
      const changesByEmployee = new Map<string, {
        changedColumns: Set<string>;
        lastChangeAt: Date;
      }>();

      for (const change of changes) {
        const employeeId = change.employee_id;
        
        // Skip archived employees
        if (!nonArchivedEmployeeIds.has(employeeId)) {
          continue;
        }

        // Normalize column name to lowercase for consistent matching
        // This ensures case-insensitive matching between trigger and column_config
        const columnName = change.column_name.toLowerCase().trim();
        const changedAt = new Date(change.changed_at);

        if (!changesByEmployee.has(employeeId)) {
          changesByEmployee.set(employeeId, {
            changedColumns: new Set(),
            lastChangeAt: changedAt,
          });
        }

        const employeeChanges = changesByEmployee.get(employeeId)!;
        employeeChanges.changedColumns.add(columnName);
        
        // Track most recent change timestamp
        if (changedAt > employeeChanges.lastChangeAt) {
          employeeChanges.lastChangeAt = changedAt;
        }
      }

      // Convert to response format
      return Array.from(changesByEmployee.entries()).map(([employeeId, data]) => ({
        employeeId,
        changedColumns: Array.from(data.changedColumns),
        lastChangeAt: data.lastChangeAt.toISOString(),
      }));
    } catch (error) {
      console.error("Unexpected error fetching changes since last active:", error);
      return [];
    }
  }
}

export const employeeRepository = new EmployeeRepository();
