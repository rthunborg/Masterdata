import { describe, it, expect, beforeEach, vi } from "vitest";
import { ColumnConfigRepository } from "@/lib/server/repositories/column-config-repository";
import type { ColumnConfig } from "@/lib/types/column-config";
import { UserRole } from "@/lib/types/user";
import * as supabaseServer from "@/lib/supabase/server";

// Mock the Supabase client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
}));

describe("ColumnConfigRepository", () => {
  let repository: ColumnConfigRepository;

  beforeEach(() => {
    repository = new ColumnConfigRepository();
    vi.clearAllMocks();
    vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as never);
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
      display_order: 1,
      is_visible: true,
      db_column_name: "first_name",
      category_color: null,
      created_at: "2025-10-28T00:00:00Z",
      updated_at: "2025-10-28T00:00:00Z",
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
      display_order: 2,
      is_visible: true,
      db_column_name: "ssn",
      category_color: null,
      created_at: "2025-10-28T00:00:00Z",
      updated_at: "2025-10-28T00:00:00Z",      },
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
      display_order: 3,
      is_visible: true,
      db_column_name: "hire_date",
      category_color: null,
      created_at: "2025-10-28T00:00:00Z",
      updated_at: "2025-10-28T00:00:00Z",      },
  ];

  describe("findAll", () => {
    it("should return all column configurations", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn()
          .mockReturnValueOnce({ // First order call returns object with order method
            order: vi.fn().mockResolvedValue({ data: mockColumnConfigs, error: null })
          })
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);
      const result = await repository.findAll();

      expect(result).toEqual(mockColumnConfigs);
      expect(result.length).toBe(3);
      expect(mockClient.from).toHaveBeenCalledWith("column_config");
    });

    it("should return empty array when no columns exist", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn()
          .mockReturnValueOnce({
            order: vi.fn().mockResolvedValue({ data: [], error: null })
          })
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it("should return empty array on database error", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn()
          .mockReturnValueOnce({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: "Database error" } })
          })
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
        order: vi.fn()
          .mockReturnValueOnce({
            order: vi.fn().mockResolvedValue({ data: mockColumnConfigs, error: null })
          })
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
        order: vi.fn()
          .mockReturnValueOnce({
            order: vi.fn().mockResolvedValue({ data: mockColumnConfigs, error: null })
          })
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.findByRole(UserRole.HR_ADMIN);

      expect(result.length).toBe(3); // All columns visible to hr_admin
      expect(result.every(col => col.role_permissions.hr_admin?.view === true)).toBe(true);
    });

    it("should return HR Admin visible columns for recruiter role", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn()
          .mockReturnValueOnce({
            order: vi.fn().mockResolvedValue({ data: mockColumnConfigs, error: null })
          })
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.findByRole(UserRole.RECRUITER);

      expect(result.length).toBe(3);
      expect(result.map((col) => col.column_name)).toEqual([
        "First Name",
        "SSN",
        "Hire Date",
      ]);
    });

    it("should return HR Admin visible columns for admin_limited role", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn()
          .mockReturnValueOnce({
            order: vi.fn().mockResolvedValue({ data: mockColumnConfigs, error: null })
          })
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.findByRole(UserRole.ADMIN_LIMITED);

      expect(result.length).toBe(3);
      expect(result.map((col) => col.column_name)).toEqual([
        "First Name",
        "SSN",
        "Hire Date",
      ]);
    });

    it("should return empty array when role has no permissions", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn()
          .mockReturnValueOnce({
            order: vi.fn().mockResolvedValue({ data: mockColumnConfigs, error: null })
          })
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.findByRole("nonexistent_role" as UserRole);

      expect(result).toEqual([]);
    });

    it("should return empty array on database error", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn()
          .mockReturnValueOnce({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: "Database error" } })
          })
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
          hr_admin: { view: true, edit: true },
          sodexo: { view: false, edit: false },
          omc: { view: false, edit: false },
          payroll: { view: false, edit: false },
          toplux: { view: false, edit: false },
        },
        category: "Recruitment",
        display_order: 0,
        is_visible: true,
        db_column_name: "sodexo_team",
        category_color: null,
        created_at: "2025-10-28T00:00:00Z",
        updated_at: "2025-10-28T00:00:00Z",      };

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn()
          .mockReturnValueOnce({
            order: vi.fn().mockResolvedValue({ data: [], error: null }) // No existing columns (for findAll)
          }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: newColumn, error: null }),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);
      const privilegedRpc = vi.fn().mockResolvedValue({
        data: newColumn,
        error: null,
      });
      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue({
        rpc: privilegedRpc,
      } as never);

      const result = await repository.createCustomColumn({
        column_name: "Sodexo Team",
        column_type: "text",
        role: UserRole.HR_ADMIN,
        db_column_name: "test_column",
        is_masterdata: false,
        category: "Recruitment",
      });

      expect(result).toEqual(newColumn);
      expect(result.is_masterdata).toBe(false);
      expect(result.role_permissions.hr_admin).toEqual({ view: true, edit: true });
      expect(result.role_permissions.sodexo).toEqual({ view: false, edit: false });
      expect(supabaseServer.createServiceRoleClient).toHaveBeenCalledTimes(1);
      expect(privilegedRpc).toHaveBeenCalledWith(
        "create_employee_column_config",
        expect.objectContaining({
          p_db_column_name: "test_column",
          p_column_type: "text",
          p_is_masterdata: false,
        })
      );
    });

    it("should reject direct repository creation by a Sodexo user", async () => {
      const newColumn: ColumnConfig = {
        id: "col-new",
        column_name: "Sodexo Team",
        column_type: "text",
        is_masterdata: false,
        role_permissions: {
          hr_admin: { view: false, edit: false },
          sodexo: { view: true, edit: true },
          omc: { view: false, edit: false },
          payroll: { view: false, edit: false },
          toplux: { view: false, edit: false },
        },
        category: null,
        display_order: 0,
        is_visible: true,
        db_column_name: "sodexo_team",
        category_color: null,
        created_at: "2025-10-28T00:00:00Z",
        updated_at: "2025-10-28T00:00:00Z",
      };

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn()
          .mockReturnValueOnce({
            order: vi.fn().mockResolvedValue({ data: [], error: null })
          }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: newColumn, error: null }),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);
      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue({
        rpc: vi.fn().mockResolvedValue({ data: newColumn, error: null }),
      } as never);

      await expect(
        repository.createCustomColumn({
          column_name: "Sodexo Team",
          column_type: "text",
          role: UserRole.SODEXO,
          db_column_name: "sodexo_team",
          is_masterdata: false,
        })
      ).rejects.toThrow("Endast HR Admin kan skapa nya kolumner");
      expect(supabaseServer.createServiceRoleClient).not.toHaveBeenCalled();
    });

    it("should reject direct repository creation by an ÖMC user", async () => {
      const newColumn: ColumnConfig = {
        id: "col-new",
        column_name: "ÖMC Column",
        column_type: "text",
        is_masterdata: false,
        role_permissions: {
          hr_admin: { view: false, edit: false },
          sodexo: { view: false, edit: false },
          omc: { view: true, edit: true },
          payroll: { view: false, edit: false },
          toplux: { view: false, edit: false },
        },
        category: null,
        display_order: 0,
        is_visible: true,
        db_column_name: "omc_column",
        category_color: null,
        created_at: "2025-10-28T00:00:00Z",
        updated_at: "2025-10-28T00:00:00Z",
      };

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn()
          .mockReturnValueOnce({
            order: vi.fn().mockResolvedValue({ data: [], error: null })
          }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: newColumn, error: null }),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);
      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue({
        rpc: vi.fn().mockResolvedValue({ data: newColumn, error: null }),
      } as never);

      await expect(
        repository.createCustomColumn({
          column_name: "ÖMC Column",
          column_type: "text",
          role: UserRole.OMC,
          db_column_name: "omc_column",
          is_masterdata: false,
        })
      ).rejects.toThrow("Endast HR Admin kan skapa nya kolumner");
      expect(supabaseServer.createServiceRoleClient).not.toHaveBeenCalled();
    });

    it("should create column with HR Admin permissions when created by HR Admin", async () => {
      const newColumn: ColumnConfig = {
        id: "col-new",
        column_name: "HR Column",
        column_type: "text",
        is_masterdata: true,
        role_permissions: {
          hr_admin: { view: true, edit: true },
          sodexo: { view: false, edit: false },
          omc: { view: false, edit: false },
          payroll: { view: false, edit: false },
          toplux: { view: false, edit: false },
        },
        category: null,
        display_order: 0,
        is_visible: true,
        db_column_name: "hr_column",
        category_color: null,
        created_at: "2025-10-28T00:00:00Z",
        updated_at: "2025-10-28T00:00:00Z",
      };

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn()
          .mockReturnValueOnce({
            order: vi.fn().mockResolvedValue({ data: [], error: null })
          }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: newColumn, error: null }),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);
      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue({
        rpc: vi.fn().mockResolvedValue({ data: newColumn, error: null }),
      } as never);

      const result = await repository.createCustomColumn({
        column_name: "HR Column",
        column_type: "text",
        role: UserRole.HR_ADMIN,
        db_column_name: "hr_column",
        is_masterdata: true,
      });

      // When HR Admin creates, they should have permissions
      expect(result.role_permissions.hr_admin).toEqual({ view: true, edit: true });
      // Other roles should not have permissions
      expect(result.role_permissions.sodexo).toEqual({ view: false, edit: false });
    });

    it("should throw error when duplicate column name exists", async () => {
      const existingColumn: ColumnConfig = {
        id: "col-existing",
        column_name: "Sodexo Team",
        column_type: "text",
        is_masterdata: false,
        role_permissions: {
          hr_admin: { view: false, edit: false },
          sodexo: { view: true, edit: true },
          omc: { view: false, edit: false },
          payroll: { view: false, edit: false },
          toplux: { view: false, edit: false },
        },
        category: null,
        display_order: 0,
        is_visible: true,
        db_column_name: "sodexo_team",
        category_color: null,
        created_at: "2025-10-28T00:00:00Z",
        updated_at: "2025-10-28T00:00:00Z",      };

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn()
          .mockReturnValueOnce({
            order: vi.fn().mockResolvedValue({ data: [existingColumn], error: null })
          }),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(
        repository.createCustomColumn({
          column_name: "Sodexo Team",
          db_column_name: "sodexo_team",
          column_type: "text",
          is_masterdata: false,
          role: UserRole.HR_ADMIN,
        })
      ).rejects.toThrow('Column with database name "sodexo_team" already exists');
    });

    it("should throw error when the atomic database RPC fails", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        order: vi.fn()
          .mockReturnValueOnce({
            order: vi.fn().mockResolvedValue({ data: [], error: null })
          }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Insert failed" },
        }),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);
      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue({
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Insert failed" },
        }),
      } as never);

      await expect(
        repository.createCustomColumn({
          column_name: "New Column",
          db_column_name: "new_column",
          column_type: "text",
          is_masterdata: false,
          role: UserRole.HR_ADMIN,
        })
      ).rejects.toThrow("Misslyckades att skapa kolumn och kolumnkonfiguration");
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
        display_order: 0,
        is_visible: true,
        db_column_name: "team_assignment",
        category_color: null,
        created_at: "2025-10-28T00:00:00Z",
        updated_at: "2025-10-28T00:00:00Z",      };

      const updatedColumn = { ...customColumn, category: "HR" };

      const rpc = vi.fn().mockResolvedValue({
        data: updatedColumn,
        error: null,
      });
      const mockClient = { rpc };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.updateColumn("col-custom", "user-1", UserRole.SODEXO, { category: "HR" });

      expect(result.category).toBe("HR");
      expect(rpc).toHaveBeenCalledWith("update_assigned_column_presentation", {
        p_column_id: "col-custom",
        p_updates: { category: "HR" },
      });
      expect(supabaseServer.createServiceRoleClient).not.toHaveBeenCalled();
    });

    it("should throw error when updating masterdata column", async () => {
      const mockClient = {
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "42501", message: "Insufficient permission" },
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(
        repository.updateColumn("col-master", "user-1", UserRole.HR_ADMIN, { category: "HR" })
      ).rejects.toThrow("permission denied to update this column");
    });

    it("should throw error when column not found", async () => {
      const mockClient = {
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "P0002", message: "Not found" },
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(
        repository.updateColumn("nonexistent", "user-1", UserRole.HR_ADMIN, { category: "HR" })
      ).rejects.toThrow("Column not found");
    });
  });

  describe("deleteColumn", () => {
    it("should delete a custom column when user has edit permission", async () => {
      const customColumn: ColumnConfig = {
        id: "col-custom",
        column_name: "Team Assignment",
        column_type: "text",
        is_masterdata: false,
        role_permissions: { sodexo: { view: true, edit: true } },
        category: null,
        display_order: 0,
        is_visible: true,
        db_column_name: "team_assignment",
        category_color: null,
        created_at: "2025-10-28T00:00:00Z",
        updated_at: "2025-10-28T00:00:00Z",      };

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

      await expect(
        repository.deleteColumn("col-custom", "user-id", "sodexo")
      ).resolves.toBeUndefined();
    });

    it("should allow HR Admin to delete any custom column", async () => {
      const customColumn: ColumnConfig = {
        id: "col-custom",
        column_name: "Team Assignment",
        column_type: "text",
        is_masterdata: false,
        role_permissions: { sodexo: { view: true, edit: true } },
        category: null,
        display_order: 0,
        is_visible: true,
        db_column_name: "team_assignment",
        category_color: null,
        created_at: "2025-10-28T00:00:00Z",
        updated_at: "2025-10-28T00:00:00Z",      };

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: customColumn, error: null }),
        delete: vi.fn().mockReturnThis(),
      };

      mockClient.delete.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(
        repository.deleteColumn("col-custom", "admin-id", "hr_admin")
      ).resolves.toBeUndefined();
    });

    it("should throw error when user lacks edit permission", async () => {
      const customColumn: ColumnConfig = {
        id: "col-custom",
        column_name: "Team Assignment",
        column_type: "text",
        is_masterdata: false,
        role_permissions: { sodexo: { view: true, edit: false } }, // No edit permission
        category: null,
        display_order: 0,
        is_visible: true,
        db_column_name: "team_assignment",
        category_color: null,
        created_at: "2025-10-28T00:00:00Z",
        updated_at: "2025-10-28T00:00:00Z",      };

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: customColumn, error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(
        repository.deleteColumn("col-custom", "user-id", "sodexo")
      ).rejects.toThrow("Du saknar behörighet att ta bort denna kolumn");
    });

    it("should throw error when deleting masterdata column", async () => {
      const masterdataColumn: ColumnConfig = {
        id: "col-master",
        column_name: "First Name",
        column_type: "text",
        is_masterdata: true,
        role_permissions: { hr_admin: { view: true, edit: true } },
        category: null,
        display_order: 0,
        is_visible: true,
        db_column_name: "first_name",
        category_color: null,
        created_at: "2025-10-28T00:00:00Z",
        updated_at: "2025-10-28T00:00:00Z",      };

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: masterdataColumn, error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(
        repository.deleteColumn("col-master", "user-id", "sodexo")
      ).rejects.toThrow("Kan inte ta bort masterdata kolumn");
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
        repository.deleteColumn("nonexistent", "user-id", "sodexo")
      ).rejects.toThrow("Kolumn hittades inte");
    });

    it("should throw error on database delete failure", async () => {
      const customColumn: ColumnConfig = {
        id: "col-custom",
        column_name: "Team Assignment",
        column_type: "text",
        is_masterdata: false,
        role_permissions: { sodexo: { view: true, edit: true } },
        category: null,
        display_order: 0,
        is_visible: true,
        db_column_name: "team_assignment",
        category_color: null,
        created_at: "2025-10-28T00:00:00Z",
        updated_at: "2025-10-28T00:00:00Z",      };

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

      await expect(
        repository.deleteColumn("col-custom", "user-id", "sodexo")
      ).rejects.toThrow("Misslyckades att ta bort kolumn");
    });
  });
});
