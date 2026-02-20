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

export interface EmployeeSystemStats {
  totalActive: number;
  crewedActive: number;
  /**
   * Percentage of crewedActive / totalActive, rounded to 1 decimal.
   * Null when totalActive is 0.
   */
  crewedPercent: number | null;
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
      
      // Story 8.13 AC 9: Filter by repayment needed (repayment fields are boolean)
      if (filters?.needsRepayment === true) {
        query = query.or("repayment_needed_omc.eq.true,repayment_needed_pe3.eq.true");
      }

      const { data, error } = await query;

      if (error || !data) {
        console.error("Misslyckades att hämta anställda:", error);
        return [];
      }

      return data;
    } catch (error) {
      console.error("Oväntat fel vid hämtning av anställda:", error);
      return [];
    }
  }

  /**
   * Whole-system tallies for dashboard stats.
   *
   * Requirements:
   * - Do NOT count archived employees
   * - Terminated employees should be included in the total tally
   * - "Crewed" means crewing_done === true
   *
   * Note: RLS still applies per user role.
   */
  async getSystemStats(): Promise<EmployeeSystemStats> {
    try {
      const supabase = await this.getSupabaseClient();

      const { count: totalActiveCount, error: totalError } = await supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("is_archived", false);

      if (totalError) {
        console.error("Misslyckades att räkna aktiva anställda:", totalError);
        throw new Error("Misslyckades att räkna aktiva anställda");
      }

      const { count: crewedActiveCount, error: crewedError } = await supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("is_archived", false)
        .eq("crewing_done", true);

      if (crewedError) {
        console.error("Misslyckades att räkna crewade anställda:", crewedError);
        throw new Error("Misslyckades att räkna crewade anställda");
      }

      const totalActive = totalActiveCount ?? 0;
      const crewedActive = crewedActiveCount ?? 0;
      const crewedPercent =
        totalActive > 0
          ? Math.round((crewedActive / totalActive) * 1000) / 10
          : null;

      return { totalActive, crewedActive, crewedPercent };
    } catch (error) {
      console.error("Oväntat fel vid hämtning av anställda statistik:", error);
      throw error instanceof Error ? error : new Error("Misslyckades att hämta anställda statistik");
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
        console.error("Misslyckades att hämta anställd by id:", id, error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Oväntat fel vid hämtning av anställd by id:", id, error);
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
        console.error("Misslyckades att skapa anställd:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          data: JSON.stringify(data, null, 2),
        });
        // Include error code and message in thrown error for better debugging
        throw new Error(`Misslyckades att skapa anställd: ${error.code} - ${error.message}`);
      }

      if (!employee) {
        throw new Error("Misslyckades att skapa anställd: Ingen data returnerad");
      }

      return employee;
    } catch (error) {
      // Re-throw our custom errors
      if (error instanceof Error) {
        throw error;
      }
      // Unexpected errors
      console.error("Unexpected error creating employee:", error);
      throw new Error("Misslyckades att skapa anställd");
    }
  }

  async update(id: string, data: Partial<Employee>): Promise<Employee> {
    try {
      // Validate at least one field provided
      if (Object.keys(data).length === 0) {
        throw new Error("Minst en fält måste vara angivet för uppdatering");
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
          throw new Error(`Anställd med ID ${id} hittades inte`);
        }

        // Check for duplicate SSN error
        if (error.code === "23505" && error.message.includes("ssn")) {
          throw new Error(`Employee with SSN ${data.ssn} already exists`);
        }

        console.error("Misslyckades att uppdatera anställd:", error);
        throw new Error("Misslyckades att uppdatera anställd");
      }

      if (!employee) {
        throw new Error(`Anställd med ID ${id} hittades inte`);
      }

      return employee;
    } catch (error) {
      // Re-throw our custom errors
      if (error instanceof Error) {
        throw error;  
      }
      // Unexpected errors
      console.error("Oväntat fel vid uppdatering av anställd:", error);
      throw new Error("Misslyckades att uppdatera anställd");
    }
  }

  async archive(id: string): Promise<Employee> {
    try {
      const supabase = await this.getSupabaseClient();

      const { data: employee, error } = await supabase
        .from("employees")
        .update({ 
          is_archived: true,
          archived_at: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        // Check for not found (PGRST116 is PostgREST error code for no rows)
        if (error.code === "PGRST116") {
          throw new Error(`Anställd med ID ${id} saknas`);
        }

        console.error("Misslyckades att arkivera anställd:", error);
        throw new Error("Misslyckades att arkivera anställd");
      }

      if (!employee) {
        throw new Error(`Anställd med ID ${id} saknas`);
      }

      return employee;
    } catch (error) {
      // Re-throw our custom errors
      if (error instanceof Error) {
        throw error;
      }
      // Unexpected errors
      console.error("Oväntat fel vid arkivering av anställd:", error);
      throw new Error("Misslyckades att arkivera anställd");
    }
  }

  async unarchive(id: string): Promise<Employee> {
    try {
      const supabase = await this.getSupabaseClient();

      const { data: employee, error } = await supabase
        .from("employees")
        .update({ 
          is_archived: false,
          archived_at: null
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        // Check for not found (PGRST116 is PostgREST error code for no rows)
        if (error.code === "PGRST116") {
          throw new Error(`Anställd med ID ${id} saknas`);
        }

        console.error("Error unarchiving employee:", error);
        throw new Error("Misslyckades att avarkivera anställd");
      }

      if (!employee) {
        throw new Error(`Anställd med ID ${id} saknas`);
      }

      return employee;
    } catch (error) {
      // Re-throw our custom errors
      if (error instanceof Error) {
        throw error;
      }
      // Unexpected errors
      console.error("Oväntat fel vid avarkivering av anställd:", error);
      throw new Error("Misslyckades att avarkivera anställd");
    }
  }

  async updateArchiveStatusMany(ids: string[], isArchived: boolean): Promise<void> {
    try {
      const supabase = await this.getSupabaseClient();
      
      const updateData = isArchived 
        ? { is_archived: true, archived_at: new Date().toISOString() }
        : { is_archived: false, archived_at: null };

      const { error } = await supabase
        .from("employees")
        .update(updateData)
        .in("id", ids);

      if (error) {
        console.error("Misslyckades att bulk uppdatera arkiveringsstatus:", error);
        throw new Error("Misslyckades att bulk uppdatera status");
      }
    } catch (error) {
      console.error("Oväntat fel vid bulk uppdatering av arkiveringsstatus:", error);
      throw error;
    }
  }

  async anonymizeOldArchivedEmployees(): Promise<number> {
    try {
      const supabase = await this.getSupabaseClient();
      
      // Calculate date 3 months ago
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 3);
      
      const { data, error } = await supabase
        .from("employees")
        .update({
          first_name: '*****',
          surname: '*****',
          ssn: '*****',
          mobile: '*****',
          diet_details: null, // Reset diet details
          special_diet: false, // Reset special diet flag
          comments: null,
          is_anonymized: true
        })
        .lt("archived_at", cutoffDate.toISOString())
        .eq("is_anonymized", false)
        .select("id");

      if (error) {
        console.error("Misslyckades att anonymisera anställda:", error);
        throw new Error("Misslyckades att anonymisera anställda");
      }

      return data?.length ?? 0;
    } catch (error) {
      console.error("Oväntat fel vid anonymisering av anställda:", error);
      throw error;
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
          throw new Error(`Anställd med ID ${id} saknas`);
        }

        console.error("Misslyckades att avsluta anställd:", error);
        throw new Error("Misslyckades att avsluta anställd");
      }

      if (!employee) {
        throw new Error(`Anställd med ID ${id} saknas`);
      }

      // Story 8.14 AC 10: Audit logging

      // Story 8.14 AC 6: Return termination summary for toast display
      return { employee, clearedDates, releasedSpots };
    } catch (error) {
      console.error("Misslyckades att avsluta anställd:", error);
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
        throw new Error(`Anställd med ID ${id} saknas`);
      }

      console.error("Misslyckades att återaktivera anställd:", error);
        throw new Error("Misslyckades att återaktivera anställd");
    }

    if (!employee) {
      throw new Error(`Anställd med ID ${id} saknas`);
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
          throw new Error(`Anställd med ID ${id} saknas`);
        }

        console.error("Misslyckades att ta bort anställd:", error);
        throw new Error("Misslyckades att ta bort anställd");
      }
    } catch (error) {
      // Re-throw known errors
      if (error instanceof Error && error.message.includes("saknas")) {
        throw error;
      }
      // Unexpected errors
      console.error("Oväntat fel vid borttagning av anställd:", error);
      throw new Error("Misslyckades att ta bort anställd");
    }
  }

  /**
   * Get detailed audit history for an employee including who made changes
   * 
   * Returns all column changes for an employee with user information.
   * Useful for displaying audit trails in the UI.
   * 
   * @param employeeId - Employee UUID to get changes for
   * @returns Array of changes with user information
   */
  async getEmployeeAuditHistory(
    employeeId: string
  ): Promise<Array<{
    columnName: string;
    changedAt: string;
    changedBy: string | null;
    changedByEmail: string | null;
  }>> {
    try {
      const supabase = await this.getSupabaseClient();

      // Query employee_column_changes with user information
      const { data: changes, error } = await supabase
        .from("employee_column_changes")
        .select(`
          column_name,
          changed_at,
          changed_by,
          users!employee_column_changes_changed_by_fkey (
            email
          )
        `)
        .eq("employee_id", employeeId)
        .order("changed_at", { ascending: false });

      if (error) {
        console.error("Misslyckades att hämta anställda granskningshistorik:", error);
        return [];
      }

      if (!changes || changes.length === 0) {
        return [];
      }

      // Transform the response
      return changes.map(change => ({
        columnName: change.column_name,
        changedAt: change.changed_at,
        changedBy: change.changed_by,
        changedByEmail: (change.users as { email?: string | null })?.email || null,
      }));
    } catch (error) {
      console.error("Oväntat fel vid hämtning av anställda granskningshistorik:", error);
      return [];
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
      // admin_limited inherits view permissions from hr_admin
      const roleForView = userRole === 'admin_limited' ? 'hr_admin' : userRole;
      const visibleMasterdataColumns = allColumns
        .filter(col => {
          // Only masterdata columns
          if (!col.is_masterdata) return false;
          
          // Check if user role has view permission
          const rolePerms = col.role_permissions[roleForView as keyof typeof col.role_permissions];
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
        console.error("Misslyckades att hämta anställda kolumnändringar:", error);
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
        console.error("Misslyckades att hämta anställda för ändringsfiltrering:", employeesError);
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
      console.error("Oväntat fel vid hämtning av ändringar sedan senast aktiv:", error);
      return [];
    }
  }
}

export const employeeRepository = new EmployeeRepository();
