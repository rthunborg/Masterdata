import type { ImportantDate, ImportantDateFormData } from "@/lib/types/important-date";

export const importantDateService = {
  async getAll(category?: string): Promise<ImportantDate[]> {
    const params = new URLSearchParams();
    if (category && category !== "All") {
      params.append("category", category);
    }

    const url = `/api/important-dates${params.toString() ? `?${params.toString()}` : ""}`;
    
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to fetch important dates");
    }

    const json = await response.json();
    return json.data;
  },

  async create(data: ImportantDateFormData): Promise<ImportantDate> {
    const response = await fetch("/api/important-dates", {
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

      // Generic error
      throw new Error(error.error?.message || "Failed to create important date");
    }

    const json = await response.json();
    return json.data;
  },

  async update(id: string, data: Partial<ImportantDate>): Promise<ImportantDate> {
    const response = await fetch(`/api/important-dates/${id}`, {
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

      // Generic error
      throw new Error(error.error?.message || "Failed to update important date");
    }

    const json = await response.json();
    return json.data;
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`/api/important-dates/${id}`, {
      method: "DELETE",
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
        throw new Error("You do not have permission to delete important dates");
      }

      // Generic error
      throw new Error(error.error?.message || "Failed to delete important date");
    }
  },
};
