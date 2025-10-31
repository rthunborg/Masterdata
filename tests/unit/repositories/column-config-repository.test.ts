import { describe, it, expect, beforeEach, vi } from "vitest";
import { ColumnConfigRepository } from "@/lib/server/repositories/column-config-repository";
import type { ColumnConfig } from "@/lib/types/column-config";
import { UserRole } from "@/lib/types/user";
import * as supabaseServer from "@/lib/supabase/server";

// Mock the Supabase client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("ColumnConfigRepository", () => {
  let repository: ColumnConfigRepository;

  beforeEach(() => {
    repository = new ColumnConfigRepository();
    vi.clearAllMocks();
  });

  const mockColumnConfigs: ColumnConfig[] = [
    {
      id: "col-1",
      column_name: "First Name",
      column_type: "text",
      is_masterdata: true,
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: true, edit: false },
        omc: { view: true, edit: false },
      },
      category: null,
      created_at: "2025-10-28T00:00:00Z",
    },
    {
      id: "col-2",
      column_name: "SSN",
      column_type: "text",
      is_masterdata: true,
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: false, edit: false },
        omc: { view: false, edit: false },
      },
      category: null,
      created_at: "2025-10-28T00:00:00Z",
    },
    {
      id: "col-3",
      column_name: "Hire Date",
      column_type: "date",
      is_masterdata: true,
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: true, edit: false },
        omc: { view: true, edit: false },
      },
      category: null,
      created_at: "2025-10-28T00:00:00Z",
    },
  ];

  describe("findAll", () => {
    it("should return all column configurations", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockColumnConfigs, error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.findAll();

      expect(result).toEqual(mockColumnConfigs);
      expect(result.length).toBe(3);
      expect(mockClient.from).toHaveBeenCalledWith("column_config");
      expect(mockClient.order).toHaveBeenCalledWith("display_order", { ascending: true });
    });

    it("should return empty array when no columns exist", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it("should return empty array on database error", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: "Database error" } }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe("findById", () => {
    it("should return column config by id", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockColumnConfigs[0], error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.findById("col-1");

      expect(result).toEqual(mockColumnConfigs[0]);
      expect(mockClient.from).toHaveBeenCalledWith("column_config");
      expect(mockClient.eq).toHaveBeenCalledWith("id", "col-1");
    });

    it("should return null when column not found", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "Not found" },
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.findById("nonexistent");

      expect(result).toBeNull();
    });

    it("should return null on database error", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "Database error" } }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.findById("col-1");

      expect(result).toBeNull();
    });
  });

  describe("findByRole", () => {
    it("should return only columns visible to sodexo role", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockColumnConfigs, error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.findByRole(UserRole.SODEXO);

      expect(result.length).toBe(2); // First Name and Hire Date only (SSN is hidden)
      expect(result[0].column_name).toBe("First Name");
      expect(result[1].column_name).toBe("Hire Date");
    });

    it("should return all columns for hr_admin role", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockColumnConfigs, error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.findByRole(UserRole.HR_ADMIN);

      expect(result.length).toBe(3); // All columns visible to hr_admin
      expect(result.every(col => col.role_permissions.hr_admin?.view === true)).toBe(true);
    });

    it("should return empty array when role has no permissions", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockColumnConfigs, error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.findByRole("nonexistent_role" as UserRole);

      expect(result).toEqual([]);
    });

    it("should return empty array on database error", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: "Database error" } }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.findByRole(UserRole.SODEXO);

      expect(result).toEqual([]);
    });
  });

  describe("createCustomColumn", () => {
    it("should create a custom column with correct properties", async () => {
      const newColumn: ColumnConfig = {
        id: "col-new",
        column_name: "Sodexo Team",
        column_type: "text",
        is_masterdata: false,
        role_permissions: {
          sodexo: { view: true, edit: true },
        },
        category: "Recruitment",
        created_at: "2025-10-28T00:00:00Z",
      };

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }), // No existing columns
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: newColumn, error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.createCustomColumn({
        column_name: "Sodexo Team",
        column_type: "text",
        role: UserRole.SODEXO,
        category: "Recruitment",
      });

      expect(result).toEqual(newColumn);
      expect(result.is_masterdata).toBe(false);
      expect(result.role_permissions).toEqual({
        sodexo: { view: true, edit: true },
      });
      expect(mockClient.insert).toHaveBeenCalled();
    });

    it("should throw error when duplicate column name exists", async () => {
      const existingColumn: ColumnConfig = {
        id: "col-existing",
        column_name: "Sodexo Team",
        column_type: "text",
        is_masterdata: false,
        role_permissions: {
          sodexo: { view: true, edit: true },
        },
        category: null,
        created_at: "2025-10-28T00:00:00Z",
      };

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [existingColumn], error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(
        repository.createCustomColumn({
          column_name: "Sodexo Team",
          column_type: "text",
          role: UserRole.SODEXO,
        })
      ).rejects.toThrow('Column "Sodexo Team" already exists for this role');
    });

    it("should throw error on database insert failure", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Insert failed" },
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(
        repository.createCustomColumn({
          column_name: "New Column",
          column_type: "text",
          role: UserRole.SODEXO,
        })
      ).rejects.toThrow("Failed to create column");
    });
  });

  describe("updateColumn", () => {
    it("should update a custom column", async () => {
      const customColumn: ColumnConfig = {
        id: "col-custom",
        column_name: "Team Assignment",
        column_type: "text",
        is_masterdata: false,
        role_permissions: { sodexo: { view: true, edit: true } },
        category: null,
        created_at: "2025-10-28T00:00:00Z",
      };

      const updatedColumn = { ...customColumn, category: "HR" };

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: customColumn, error: null }) // findById
          .mockResolvedValueOnce({ data: updatedColumn, error: null }), // update
        update: vi.fn().mockReturnThis(),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.updateColumn("col-custom", "user-1", UserRole.SODEXO, { category: "HR" });

      expect(result.category).toBe("HR");
      expect(mockClient.update).toHaveBeenCalled();
    });

    it("should throw error when updating masterdata column", async () => {
      const masterdataColumn: ColumnConfig = {
        id: "col-master",
        column_name: "First Name",
        column_type: "text",
        is_masterdata: true,
        role_permissions: { hr_admin: { view: true, edit: true } },
        category: null,
        created_at: "2025-10-28T00:00:00Z",
      };

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: masterdataColumn, error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(
        repository.updateColumn("col-master", "user-1", UserRole.HR_ADMIN, { category: "HR" })
      ).rejects.toThrow("Cannot update masterdata column");
    });

    it("should throw error when column not found", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "Not found" },
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(
        repository.updateColumn("nonexistent", "user-1", UserRole.HR_ADMIN, { category: "HR" })
      ).rejects.toThrow("Column not found");
    });
  });

  describe("deleteColumn", () => {
    it("should delete a custom column", async () => {
      const customColumn: ColumnConfig = {
        id: "col-custom",
        column_name: "Team Assignment",
        column_type: "text",
        is_masterdata: false,
        role_permissions: { sodexo: { view: true, edit: true } },
        category: null,
        created_at: "2025-10-28T00:00:00Z",
      };

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: customColumn, error: null }),
        delete: vi.fn().mockReturnThis(),
      };

      // Mock chained calls - delete returns the same mockClient
      mockClient.delete.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(repository.deleteColumn("col-custom")).resolves.toBeUndefined();
    });

    it("should throw error when deleting masterdata column", async () => {
      const masterdataColumn: ColumnConfig = {
        id: "col-master",
        column_name: "First Name",
        column_type: "text",
        is_masterdata: true,
        role_permissions: { hr_admin: { view: true, edit: true } },
        category: null,
        created_at: "2025-10-28T00:00:00Z",
      };

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: masterdataColumn, error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(repository.deleteColumn("col-master")).rejects.toThrow(
        "Cannot delete masterdata column"
      );
    });

    it("should throw error when column not found", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "Not found" },
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(repository.deleteColumn("nonexistent")).rejects.toThrow("Column not found");
    });

    it("should throw error on database delete failure", async () => {
      const customColumn: ColumnConfig = {
        id: "col-custom",
        column_name: "Team Assignment",
        column_type: "text",
        is_masterdata: false,
        role_permissions: { sodexo: { view: true, edit: true } },
        category: null,
        created_at: "2025-10-28T00:00:00Z",
      };

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: customColumn, error: null }),
        delete: vi.fn().mockReturnThis(),
      };

      // Mock delete to return error
      mockClient.delete.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: "Delete failed" } }),
      });

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(repository.deleteColumn("col-custom")).rejects.toThrow(
        "Failed to delete column"
      );
    });
  });
});
