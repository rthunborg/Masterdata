import type { ImportantDate, ImportantDateFormData } from "@/lib/types/important-date";
import { throwOnApiError } from "./api-client";

export const importantDateService = {
  async getAll(category?: string): Promise<ImportantDate[]> {
    const params = new URLSearchParams();
    if (category && category !== "All") {
      params.append("category", category);
    }

    const url = `/api/important-dates${params.toString() ? `?${params.toString()}` : ""}`;
    
    const response = await fetch(url);

    await throwOnApiError(response, "Failed to fetch important dates");

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

    await throwOnApiError(response, "Failed to create important date");

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

    await throwOnApiError(response, "Failed to update important date");

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

    await throwOnApiError(response, "Misslyckades att ta bort viktigt datum", {
      403: "Du saknar behörighet att ta bort viktiga datum",
    });
  },

  async archive(id: string): Promise<ImportantDate> {
    const response = await fetch(`/api/important-dates/${id}/archive`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    await throwOnApiError(response, "Misslyckades att arkivera viktigt datum", {
      403: "Du saknar behörighet att arkivera viktiga datum",
    });

    const json = await response.json();
    return json.data;
  },

  async restore(id: string): Promise<ImportantDate> {
    const response = await fetch(`/api/important-dates/${id}/restore`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    await throwOnApiError(response, "Misslyckades att återställa viktigt datum", {
      403: "Du saknar behörighet att återställa viktiga datum",
    });

    const json = await response.json();
    return json.data;
  },

  async importCSV(
    file: File,
    columnMapping: Record<string, string>,
    deadlineSubmit?: string,
    deadlineCancel?: string
  ): Promise<{
    imported: number;
    skipped: number;
    errors: Array<{ row: number; field?: string; message: string }>;
  }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("columnMapping", JSON.stringify(columnMapping));
    
    if (deadlineSubmit) {
      formData.append("deadlineSubmit", deadlineSubmit);
    }
    if (deadlineCancel) {
      formData.append("deadlineCancel", deadlineCancel);
    }

    const response = await fetch("/api/important-dates/import", {
      method: "POST",
      body: formData,
    });

    await throwOnApiError(response, "Misslyckades att importera viktiga datum", {
      403: "Du saknar behörighet att importera viktiga datum",
    });

    const json = await response.json();
    return json.data;
  },
};
