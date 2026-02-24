import type { Employee, EmployeeFormData } from "@/lib/types/employee";
import { throwOnApiError } from "./api-client";

export interface EmployeeFilters {
  includeArchived?: boolean;
  includeTerminated?: boolean;
  needsRepayment?: boolean; // Story 8.13 AC 9
}

export interface EmployeeListResponse {
  data: Employee[];
  meta: {
    total: number;
    filtered: number;
  };
}

export const employeeService = {
  async getAll(filters?: EmployeeFilters): Promise<Employee[]> {
    const params = new URLSearchParams();
    
    if (filters?.includeArchived) {
      params.append("includeArchived", "true");
    }
    
    if (filters?.includeTerminated) {
      params.append("includeTerminated", "true");
    }
    
    // Story 8.13 AC 9: Add needsRepayment filter
    if (filters?.needsRepayment) {
      params.append("needsRepayment", "true");
    }

    const url = `/api/employees${params.toString() ? `?${params.toString()}` : ""}`;
    
    const response = await fetch(url);

    await throwOnApiError(response, "Failed to fetch employees");

    const json: EmployeeListResponse = await response.json();
    return json.data;
  },

  async create(data: EmployeeFormData): Promise<Employee> {
    const response = await fetch("/api/employees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    await throwOnApiError(response, "Failed to create employee");

    const json = await response.json();
    return json.data;
  },

  async update(id: string, data: Partial<Employee>): Promise<Employee> {
    const response = await fetch(`/api/employees/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    await throwOnApiError(response, "Failed to update employee");

    const json = await response.json();
    return json.data;
  },

  async archive(id: string): Promise<void> {
    const response = await fetch(`/api/employees/${id}/archive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    await throwOnApiError(response, "Misslyckades att arkivera anställd", {
      403: "Du saknar behörighet att arkivera anställda",
    });
  },

  async unarchive(id: string): Promise<void> {
    const response = await fetch(`/api/employees/${id}/unarchive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    await throwOnApiError(response, "Misslyckades att avarkivera anställd", {
      403: "Du saknar behörighet att avarkivera anställda",
    });
  },

  async terminate(
    id: string,
    terminationDate: string,
    terminationReason: string
  ): Promise<{ clearedDates: string[]; releasedSpots: number }> {
    const response = await fetch(`/api/employees/${id}/terminate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        termination_date: terminationDate,
        termination_reason: terminationReason,
      }),
    });

    await throwOnApiError(response, "Misslyckades att avsluta anställd", {
      403: "Du saknar behörighet att avsluta anställda",
    });

    // Story 8.14 AC 6: Return termination summary for toast display
    const result = await response.json();
    return {
      clearedDates: result.data.clearedDates,
      releasedSpots: result.data.releasedSpots,
    };
  },

  async reactivate(id: string): Promise<{ warnings: string[] }> {
    const response = await fetch(`/api/employees/${id}/reactivate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    await throwOnApiError(response, "Misslyckades att återaktivera anställd", {
      403: "Du saknar behörighet att återaktivera anställda",
    });
    
    // Story 8.13 AC 7: Return warnings from reactivation
    const result = await response.json();
    return { warnings: result.warnings || [] };
  },

  async getById(id: string): Promise<Employee> {
    const response = await fetch(`/api/employees/${id}`);

    await throwOnApiError(response, "Misslyckades att hämta anställd");

    const json = await response.json();
    return json.data;
  },

  async importCSV(file: File): Promise<{
    imported: number;
    skipped: number;
    errors: Array<{ row: number; error: string; data: Record<string, unknown> }>;
  }> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/employees/import", {
      method: "POST",
      body: formData,
    });

    await throwOnApiError(response, "Misslyckades att importera anställda", {
      403: "Du saknar behörighet att importera anställda",
    });

    const json = await response.json();
    return json.data;
  },
};

