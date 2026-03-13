import { createClient } from "@/lib/supabase/server";
import type { Employee } from "@/lib/types/employee";
import {
  captureRepaymentDates,
  applyRepaymentCapture,
  restoreRepaymentDates,
  clearEmployeeDatesAndReleaseSpots,
} from "@/lib/services/termination-workflow";

/**
 * Handles archive/unarchive, termination/reactivation, and anonymization.
 * Split out from the monolithic EmployeeRepository for maintainability.
 */
export class EmployeeLifecycleRepository {
  private async getSupabaseClient() {
    return await createClient();
  }

  async archive(id: string): Promise<Employee> {
    try {
      const supabase = await this.getSupabaseClient();

      const { data: employee, error } = await supabase
        .from("employees")
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
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
      if (error instanceof Error) throw error;
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
          archived_at: null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
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
      if (error instanceof Error) throw error;
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

      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 3);

      const { data, error } = await supabase
        .from("employees")
        .update({
          first_name: "*****",
          surname: "*****",
          ssn: "*****",
          mobile: "*****",
          diet_details: null,
          special_diet: false,
          comments: null,
          is_anonymized: true,
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
      const repaymentDates = await captureRepaymentDates(id);
      await applyRepaymentCapture(id, repaymentDates);

      const { clearedDates, releasedSpots } = await clearEmployeeDatesAndReleaseSpots(id);

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
        if (error.code === "PGRST116") {
          throw new Error(`Anställd med ID ${id} saknas`);
        }
        console.error("Misslyckades att avsluta anställd:", error);
        throw new Error("Misslyckades att avsluta anställd");
      }

      if (!employee) {
        throw new Error(`Anställd med ID ${id} saknas`);
      }

      return { employee, clearedDates, releasedSpots };
    } catch (error) {
      console.error("Misslyckades att avsluta anställd:", error);
      throw error;
    }
  }

  async reactivate(id: string): Promise<{ employee: Employee; warnings: string[] }> {
    const supabase = await this.getSupabaseClient();

    const { warnings } = await restoreRepaymentDates(id);

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
}

export const employeeLifecycleRepository = new EmployeeLifecycleRepository();
