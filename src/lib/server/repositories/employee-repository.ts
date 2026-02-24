import { createClient } from "@/lib/supabase/server";
import type { Employee, EmployeeFormData } from "@/lib/types/employee";
import { employeeLifecycleRepository } from "./employee-lifecycle-repository";
import { employeeAuditRepository } from "./employee-audit-repository";
import { employeeBulkRepository } from "./employee-bulk-repository";

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

/**
 * Core employee CRUD + stats.
 *
 * Lifecycle operations (archive, terminate, etc.) are in EmployeeLifecycleRepository.
 * Audit/change-tracking queries are in EmployeeAuditRepository.
 * Bulk operations (CSV import) are in EmployeeBulkRepository.
 *
 * All sub-repository methods are re-exposed here so existing callers
 * that use `employeeRepository.xxx()` keep working unchanged.
 */
export class EmployeeRepository {
  private async getSupabaseClient() {
    return await createClient();
  }

  // ── Core CRUD ─────────────────────────────────────────────────────

  async findAll(filters?: EmployeeFilters): Promise<Employee[]> {
    try {
      const supabase = await this.getSupabaseClient();

      let query = supabase.from("employees").select("*");

      if (filters?.needsRepayment === true) {
        query = query.or("repayment_needed_omc.eq.true,repayment_needed_pe3.eq.true");
      } else {
        if (filters?.includeArchived === true) {
          query = query.eq("is_archived", true);
        } else {
          query = query.eq("is_archived", false);
        }

        if (filters?.includeTerminated === true) {
          query = query.eq("is_terminated", true);
        } else {
          query = query.eq("is_terminated", false);
        }
      }

      const { data, error } = await query.order("id");

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
      throw error instanceof Error
        ? error
        : new Error("Misslyckades att hämta anställda statistik");
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
      if (data.special_diet === false) {
        data.diet_details = null;
      }

      const supabase = await this.getSupabaseClient();

      const { data: employee, error } = await supabase
        .from("employees")
        .insert([data])
        .select()
        .single();

      if (error) {
        if (error.code === "23505" && error.message.includes("ssn")) {
          throw new Error(`Employee with SSN ${data.ssn} already exists`);
        }
        console.error("Misslyckades att skapa anställd:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          data: JSON.stringify(data, null, 2),
        });
        throw new Error(
          `Misslyckades att skapa anställd: ${error.code} - ${error.message}`
        );
      }

      if (!employee) {
        throw new Error("Misslyckades att skapa anställd: Ingen data returnerad");
      }

      return employee;
    } catch (error) {
      if (error instanceof Error) throw error;
      console.error("Unexpected error creating employee:", error);
      throw new Error("Misslyckades att skapa anställd");
    }
  }

  async update(id: string, data: Partial<Employee>): Promise<Employee> {
    try {
      if (Object.keys(data).length === 0) {
        throw new Error("Minst en fält måste vara angivet för uppdatering");
      }

      if (data.special_diet === false) {
        data.diet_details = null;
      }

      const supabase = await this.getSupabaseClient();

      const { data: employee, error } = await supabase
        .from("employees")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new Error(`Anställd med ID ${id} hittades inte`);
        }
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
      if (error instanceof Error) throw error;
      console.error("Oväntat fel vid uppdatering av anställd:", error);
      throw new Error("Misslyckades att uppdatera anställd");
    }
  }

  async delete(id: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    try {
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", id);

      if (error) {
        if (error.code === "PGRST116") {
          throw new Error(`Anställd med ID ${id} saknas`);
        }
        console.error("Misslyckades att ta bort anställd:", error);
        throw new Error("Misslyckades att ta bort anställd");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("saknas")) {
        throw error;
      }
      console.error("Oväntat fel vid borttagning av anställd:", error);
      throw new Error("Misslyckades att ta bort anställd");
    }
  }

  // ── Delegated: Lifecycle ──────────────────────────────────────────

  archive = employeeLifecycleRepository.archive.bind(employeeLifecycleRepository);
  unarchive = employeeLifecycleRepository.unarchive.bind(employeeLifecycleRepository);
  updateArchiveStatusMany = employeeLifecycleRepository.updateArchiveStatusMany.bind(employeeLifecycleRepository);
  anonymizeOldArchivedEmployees = employeeLifecycleRepository.anonymizeOldArchivedEmployees.bind(employeeLifecycleRepository);
  terminate = employeeLifecycleRepository.terminate.bind(employeeLifecycleRepository);
  reactivate = employeeLifecycleRepository.reactivate.bind(employeeLifecycleRepository);

  // ── Delegated: Audit ──────────────────────────────────────────────

  getEmployeeAuditHistory = employeeAuditRepository.getEmployeeAuditHistory.bind(employeeAuditRepository);
  getChangesSinceLastActive = employeeAuditRepository.getChangesSinceLastActive.bind(employeeAuditRepository);

  // ── Delegated: Bulk ───────────────────────────────────────────────

  createMany = employeeBulkRepository.createMany.bind(employeeBulkRepository);
}

export const employeeRepository = new EmployeeRepository();
