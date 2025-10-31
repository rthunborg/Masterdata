import { describe, it, expect } from "vitest";
import { createColumnSchema } from "@/lib/validation/column-validation";

describe("createColumnSchema", () => {
  describe("column_name validation", () => {
    it("should validate required column_name", () => {
      const data = { column_type: "text" as const };
      const result = createColumnSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain("column_name");
        expect(result.error.errors[0].message.toLowerCase()).toContain("required");
      }
    });

    it("should accept valid column_name", () => {
      const data = { column_name: "Test Column", column_type: "text" as const };
      const result = createColumnSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject column_name exceeding 100 characters", () => {
      const data = {
        column_name: "a".repeat(101),
        column_type: "text" as const,
      };
      const result = createColumnSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("100 characters");
      }
    });

    it("should trim whitespace from column_name", () => {
      const data = {
        column_name: "  Test Column  ",
        column_type: "text" as const,
      };
      const result = createColumnSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.column_name).toBe("Test Column");
      }
    });

    it("should reject empty string after trimming", () => {
      const data = { column_name: "   ", column_type: "text" as const };
      const result = createColumnSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("column_type validation", () => {
    it("should accept text column type", () => {
      const data = { column_name: "Test", column_type: "text" as const };
      const result = createColumnSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should accept number column type", () => {
      const data = { column_name: "Test", column_type: "number" as const };
      const result = createColumnSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should accept date column type", () => {
      const data = { column_name: "Test", column_type: "date" as const };
      const result = createColumnSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should accept boolean column type", () => {
      const data = { column_name: "Test", column_type: "boolean" as const };
      const result = createColumnSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject invalid column type", () => {
      const data = { column_name: "Test", column_type: "invalid" };
      const result = createColumnSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("Invalid");
      }
    });
  });

  describe("category validation", () => {
    it("should accept optional category", () => {
      const data = {
        column_name: "Test",
        column_type: "text" as const,
        category: "HR Data",
      };
      const result = createColumnSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should accept null category", () => {
      const data = {
        column_name: "Test",
        column_type: "text" as const,
        category: null,
      };
      const result = createColumnSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should accept missing category", () => {
      const data = { column_name: "Test", column_type: "text" as const };
      const result = createColumnSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject category exceeding 50 characters", () => {
      const data = {
        column_name: "Test",
        column_type: "text" as const,
        category: "a".repeat(51),
      };
      const result = createColumnSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("50 characters");
      }
    });

    it("should trim whitespace from category", () => {
      const data = {
        column_name: "Test",
        column_type: "text" as const,
        category: "  HR Data  ",
      };
      const result = createColumnSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.category).toBe("HR Data");
      }
    });
  });

  describe("display_order validation", () => {
    it("should accept optional display_order", () => {
      const data = {
        column_name: "Test",
        column_type: "text" as const,
        display_order: 5,
      };
      const result = createColumnSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should accept missing display_order", () => {
      const data = { column_name: "Test", column_type: "text" as const };
      const result = createColumnSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject negative display_order", () => {
      const data = {
        column_name: "Test",
        column_type: "text" as const,
        display_order: -1,
      };
      const result = createColumnSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject zero display_order", () => {
      const data = {
        column_name: "Test",
        column_type: "text" as const,
        display_order: 0,
      };
      const result = createColumnSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject decimal display_order", () => {
      const data = {
        column_name: "Test",
        column_type: "text" as const,
        display_order: 5.5,
      };
      const result = createColumnSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("complete validation", () => {
    it("should validate complete valid data", () => {
      const data = {
        column_name: "Department",
        column_type: "text" as const,
        category: "HR Data",
        display_order: 10,
      };
      const result = createColumnSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          column_name: "Department",
          column_type: "text",
          category: "HR Data",
          display_order: 10,
        });
      }
    });

    it("should validate minimal valid data", () => {
      const data = {
        column_name: "Status",
        column_type: "boolean" as const,
      };
      const result = createColumnSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});

