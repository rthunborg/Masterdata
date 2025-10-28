import type { Employee, EmployeeFormData } from "@/lib/types/employee";

export interface EmployeeFilters {
  includeArchived?: boolean;
  includeTerminated?: boolean;
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

    const url = `/api/employees${params.toString() ? `?${params.toString()}` : ""}`;
    
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to fetch employees");
    }

    const json: EmployeeListResponse = await response.json();
    return json.data;
  },

  async getById(id: string): Promise<Employee | null> {
    const response = await fetch(`/api/employees/${id}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to fetch employee");
    }

    const json = await response.json();
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

    if (!response.ok) {
      const error = await response.json();
      
      // Handle validation errors
      if (response.status === 400 && error.error?.code === "VALIDATION_ERROR") {
        const validationError = new Error(error.error.message);
        // Attach validation details to error for form handling
        (validationError as Error & { details?: Record<string, string[]> }).details = error.error.details;
        throw validationError;
      }

      // Handle duplicate SSN error
      if (response.status === 409 && error.error?.code === "DUPLICATE_ENTRY") {
        throw new Error(error.error.message);
      }

      // Generic error
      throw new Error(error.error?.message || "Failed to create employee");
    }

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

    if (!response.ok) {
      const error = await response.json();
      
      // Handle validation errors
      if (response.status === 400 && error.error?.code === "VALIDATION_ERROR") {
        const validationError = new Error(error.error.message);
        // Attach validation details to error for form handling
        (validationError as Error & { details?: Record<string, string[]> }).details = error.error.details;
        throw validationError;
      }

      // Handle not found error
      if (response.status === 404 && error.error?.code === "NOT_FOUND") {
        throw new Error(error.error.message);
      }

      // Handle duplicate SSN error
      if (response.status === 409 && error.error?.code === "DUPLICATE_ENTRY") {
        throw new Error(error.error.message);
      }

      // Generic error
      throw new Error(error.error?.message || "Failed to update employee");
    }

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

    if (!response.ok) {
      const error = await response.json();
      
      // Handle not found error
      if (response.status === 404 && error.error?.code === "NOT_FOUND") {
        throw new Error(error.error.message);
      }

      // Handle forbidden error
      if (response.status === 403) {
        throw new Error("You do not have permission to archive employees");
      }

      // Generic error
      throw new Error(error.error?.message || "Failed to archive employee");
    }
  },

  async unarchive(id: string): Promise<void> {
    const response = await fetch(`/api/employees/${id}/unarchive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Handle not found error
      if (response.status === 404 && error.error?.code === "NOT_FOUND") {
        throw new Error(error.error.message);
      }

      // Handle forbidden error
      if (response.status === 403) {
        throw new Error("You do not have permission to unarchive employees");
      }

      // Generic error
      throw new Error(error.error?.message || "Failed to unarchive employee");
    }
  },

  async terminate(
    id: string,
    terminationDate: string,
    terminationReason: string
  ): Promise<void> {
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

    if (!response.ok) {
      const error = await response.json();
      
      // Handle validation errors
      if (response.status === 400 && error.error?.code === "VALIDATION_ERROR") {
        throw new Error(error.error.message);
      }

      // Handle not found error
      if (response.status === 404 && error.error?.code === "NOT_FOUND") {
        throw new Error(error.error.message);
      }

      // Handle forbidden error
      if (response.status === 403) {
        throw new Error("You do not have permission to terminate employees");
      }

      // Generic error
      throw new Error(error.error?.message || "Failed to terminate employee");
    }
  },

  async reactivate(id: string): Promise<void> {
    const response = await fetch(`/api/employees/${id}/reactivate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      
      // Handle not found error
      if (response.status === 404 && error.error?.code === "NOT_FOUND") {
        throw new Error(error.error.message);
      }

      // Handle forbidden error
      if (response.status === 403) {
        throw new Error("You do not have permission to reactivate employees");
      }

      // Generic error
      throw new Error(error.error?.message || "Failed to reactivate employee");
    }
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

    if (!response.ok) {
      const error = await response.json();
      
      // Handle validation errors
      if (response.status === 400 && error.error?.code === "VALIDATION_ERROR") {
        throw new Error(error.error.message);
      }

      // Handle forbidden error
      if (response.status === 403) {
        throw new Error("You do not have permission to import employees");
      }

      // Generic error
      throw new Error(error.error?.message || "Failed to import employees");
    }

    const json = await response.json();
    return json.data;
  },
};

