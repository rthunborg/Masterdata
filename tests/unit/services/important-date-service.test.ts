import { describe, it, expect, beforeEach, vi } from "vitest";
import { importantDateService } from "@/lib/services/important-date-service";
import type { ImportantDate, ImportantDateFormData } from "@/lib/types/important-date";

// Mock fetch globally
global.fetch = vi.fn();

describe("importantDateService", () => {
  const mockDates: ImportantDate[] = [
    {
      id: "date-1",
      week_number: 7,
      year: 2025,
      category: "Stena Dates",
      date_description: "Fredag 14/2",
      date_value: "15-16/2",
      notes: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "date-2",
      week_number: 10,
      year: 2025,
      category: "ÖMC Dates",
      date_description: "Fredag 7/3",
      date_value: "8-9/3",
      notes: "Important planning meeting",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAll", () => {
    it("should fetch all important dates", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockDates,
        }),
      } as Response);

      const result = await importantDateService.getAll();

      expect(global.fetch).toHaveBeenCalledWith("/api/important-dates");
      expect(result).toEqual(mockDates);
    });

    it("should pass category filter", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [mockDates[0]],
        }),
      } as Response);

      await importantDateService.getAll("Stena Dates");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/important-dates?category=Stena+Dates"
      );
    });

    it("should not add category filter if 'All' is selected", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockDates,
        }),
      } as Response);

      await importantDateService.getAll("All");

      expect(global.fetch).toHaveBeenCalledWith("/api/important-dates");
    });

    it("should throw error on failed request", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: "Failed to fetch important dates" },
        }),
      } as Response);

      await expect(importantDateService.getAll()).rejects.toThrow(
        "Failed to fetch important dates"
      );
    });
  });

  describe("create", () => {
    const newDateData: ImportantDateFormData = {
      week_number: 15,
      year: 2025,
      category: "Other",
      date_description: "Test Date",
      date_value: "10/4",
      notes: null,
    };

    it("should create a new important date", async () => {
      const createdDate: ImportantDate = {
        id: "date-3",
        ...newDateData,
        created_at: "2025-01-15T00:00:00Z",
        updated_at: "2025-01-15T00:00:00Z",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: createdDate,
        }),
      } as Response);

      const result = await importantDateService.create(newDateData);

      expect(global.fetch).toHaveBeenCalledWith("/api/important-dates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newDateData),
      });
      expect(result).toEqual(createdDate);
    });

    it("should throw validation error on invalid data", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input data",
            details: {
              date_description: ["Date description is required"],
            },
          },
        }),
      } as Response);

      await expect(importantDateService.create(newDateData)).rejects.toThrow(
        "Invalid input data"
      );
    });
  });

  describe("update", () => {
    it("should update an important date", async () => {
      const updatedDate: ImportantDate = {
        ...mockDates[0],
        date_description: "Updated Description",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: updatedDate,
        }),
      } as Response);

      const result = await importantDateService.update("date-1", {
        date_description: "Updated Description",
      });

      expect(global.fetch).toHaveBeenCalledWith("/api/important-dates/date-1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ date_description: "Updated Description" }),
      });
      expect(result).toEqual(updatedDate);
    });

    it("should throw error when date not found", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            code: "NOT_FOUND",
            message: "Important date with ID date-999 not found",
          },
        }),
      } as Response);

      await expect(
        importantDateService.update("date-999", { date_description: "Test" })
      ).rejects.toThrow("Important date with ID date-999 not found");
    });
  });

  describe("delete", () => {
    it("should delete an important date", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await importantDateService.delete("date-1");

      expect(global.fetch).toHaveBeenCalledWith("/api/important-dates/date-1", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
    });

    it("should throw error when date not found", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            code: "NOT_FOUND",
            message: "Important date with ID date-999 not found",
          },
        }),
      } as Response);

      await expect(importantDateService.delete("date-999")).rejects.toThrow(
        "Important date with ID date-999 not found"
      );
    });

    it("should throw error when forbidden", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: {
            code: "FORBIDDEN",
            message: "Insufficient permissions",
          },
        }),
      } as Response);

      await expect(importantDateService.delete("date-1")).rejects.toThrow(
        "You do not have permission to delete important dates"
      );
    });
  });
});
