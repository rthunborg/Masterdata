import { createClient } from "@/lib/supabase/server";
import type { Employee, EmployeeFormData } from "@/lib/types/employee";

/**
 * Handles batch/bulk employee operations (CSV import).
 * Split out from the monolithic EmployeeRepository for maintainability.
 */
export class EmployeeBulkRepository {
  private async getSupabaseClient() {
    return await createClient();
  }

  async createMany(
    employees: EmployeeFormData[]
  ): Promise<{
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

    for (let i = 0; i < employees.length; i++) {
      try {
        const { data: employee, error } = await supabase
          .from("employees")
          .insert(employees[i])
          .select()
          .single();

        if (error) {
          if (error.code === "23505" && error.message.includes("ssn")) {
            errors.push({
              row: i + 2,
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
}

export const employeeBulkRepository = new EmployeeBulkRepository();
