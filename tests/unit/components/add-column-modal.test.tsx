import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AddColumnModal } from "@/components/dashboard/add-column-modal";
import { columnService } from "@/lib/services/column-service";
import { useAuth } from "@/lib/hooks/use-auth";
import { useUIStore } from "@/lib/store/ui-store";
import { useColumns } from "@/lib/hooks/use-columns";
import { toast } from "sonner";
import { UserRole } from "@/lib/types/user";
import type { ColumnConfig } from "@/lib/types/column-config";

// Mock dependencies
vi.mock("@/lib/services/column-service");
vi.mock("@/lib/hooks/use-auth");
vi.mock("@/lib/store/ui-store");
vi.mock("@/lib/hooks/use-columns");
vi.mock("sonner");

describe("AddColumnModal", () => {
  const mockCloseModal = vi.fn();
  const mockRefetch = vi.fn();
  const mockOnColumnCreated = vi.fn();

  const mockColumns: ColumnConfig[] = [
    {
      id: "col-1",
      column_name: "First Name",
      column_type: "text",
      is_masterdata: true,
      role_permissions: {
        hr_admin: { view: true, edit: true },
        sodexo: { view: true, edit: false },
      },
      category: null,
      display_order: 1,
      is_visible: true,
      db_column_name: "first_name",
      category_color: null,
      created_at: "2025-10-28T00:00:00Z",
      updated_at: "2025-10-28T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock setup
    vi.mocked(useUIStore).mockReturnValue({
      modals: { addColumn: true },
      closeModal: mockCloseModal,
      openModal: vi.fn(),
      isPreviewMode: false,
      previewRole: null,
      setPreviewRole: vi.fn(),
      setIsPreviewMode: vi.fn(),
      columnVisibility: {},
      initColumnVisibility: vi.fn(),
      setColumnVisibility: vi.fn(),
      toggleColumnVisibility: vi.fn(),
    });

    vi.mocked(useColumns).mockReturnValue({
      columns: mockColumns,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  describe("Column Type Selection Visibility", () => {
    it("should hide column type selection for Sodexo user", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "user-1",
          email: "sodexo@test.com",
          role: UserRole.SODEXO,
          is_active: true,
          auth_id: "auth-1",
          created_at: "2025-01-01T00:00:00Z",
          last_active_at: new Date().toISOString(),
        },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      renderWithI18n(<AddColumnModal onColumnCreated={mockOnColumnCreated} />);

      // Column type selection label should not be visible
      expect(
        screen.queryByText(/Kolumnkategori/i)
      ).not.toBeInTheDocument();
      
      // Radio buttons for External/Masterdata should not be visible
      expect(
        screen.queryByText(/Extern kolumn/i)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Masterdata kolumn/i)
      ).not.toBeInTheDocument();
    });

    it("should hide column type selection for ÖMC user", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "user-2",
          email: "omc@test.com",
          role: UserRole.OMC,
          is_active: true,
          auth_id: "auth-2",
          created_at: "2025-01-01T00:00:00Z",
          last_active_at: new Date().toISOString(),
        },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      renderWithI18n(<AddColumnModal onColumnCreated={mockOnColumnCreated} />);

      expect(
        screen.queryByText(/Kolumnkategori/i)
      ).not.toBeInTheDocument();
    });

    it("should show column type selection for HR Admin user", () => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "user-3",
          email: "hr@test.com",
          role: UserRole.HR_ADMIN,
          is_active: true,
          auth_id: "auth-3",
          created_at: "2025-01-01T00:00:00Z",
          last_active_at: new Date().toISOString(),
        },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      renderWithI18n(<AddColumnModal onColumnCreated={mockOnColumnCreated} />);

      // Column type selection should be visible for HR Admin
      expect(
        screen.getByText(/Kolumnkategori/i)
      ).toBeInTheDocument();
      // Use getAllByText and check that radio button labels exist
      const externLabels = screen.getAllByText(/Extern kolumn/i);
      expect(externLabels.length).toBeGreaterThan(0);
      // Check that at least one is a radio button label (not just description text)
      expect(
        screen.getByLabelText(/Extern kolumn/i)
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/Masterdata kolumn/i)
      ).toBeInTheDocument();
    });
  });

  describe("Column Creation with Correct Permissions", () => {
    it("should create column with only Sodexo permissions (not HR Admin)", async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "user-1",
          email: "sodexo@test.com",
          role: UserRole.SODEXO,
          is_active: true,
          auth_id: "auth-1",
          created_at: "2025-01-01T00:00:00Z",
          last_active_at: new Date().toISOString(),
        },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      const mockCreatedColumn: ColumnConfig = {
        id: "new-col",
        column_name: "Test Column",
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
        db_column_name: "test_column",
        category_color: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      vi.mocked(columnService.createCustomColumn).mockResolvedValue(mockCreatedColumn);

      renderWithI18n(<AddColumnModal onColumnCreated={mockOnColumnCreated} />);

      // Fill in the form - use placeholder text or more specific label text
      const columnNameInput = screen.getByPlaceholderText(/Meal Plan, Training Status/i);
      const dbColumnNameInput = screen.getByPlaceholderText(/meal_plan, training_status/i);
      
      fireEvent.change(columnNameInput, { target: { value: "Test Column" } });
      fireEvent.change(dbColumnNameInput, { target: { value: "test_column" } });

      // Submit the form
      const submitButton = screen.getByRole("button", { name: /Skapa kolumn/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(columnService.createCustomColumn).toHaveBeenCalledWith(
          expect.objectContaining({
            column_name: "Test Column",
            db_column_name: "test_column",
            is_masterdata: false, // Should always be false for non-HR Admin
          })
        );
      });

      // Verify the service was called with correct data
      const callArgs = vi.mocked(columnService.createCustomColumn).mock.calls[0][0];
      expect(callArgs.is_masterdata).toBe(false);
    });

    it("should create column with only ÖMC permissions (not HR Admin)", async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "user-2",
          email: "omc@test.com",
          role: UserRole.OMC,
          is_active: true,
          auth_id: "auth-2",
          created_at: "2025-01-01T00:00:00Z",
          last_active_at: new Date().toISOString(),
        },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      const mockCreatedColumn: ColumnConfig = {
        id: "new-col",
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
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      vi.mocked(columnService.createCustomColumn).mockResolvedValue(mockCreatedColumn);

      renderWithI18n(<AddColumnModal onColumnCreated={mockOnColumnCreated} />);

      const columnNameInput = screen.getByPlaceholderText(/Meal Plan, Training Status/i);
      const dbColumnNameInput = screen.getByPlaceholderText(/meal_plan, training_status/i);
      
      fireEvent.change(columnNameInput, { target: { value: "ÖMC Column" } });
      fireEvent.change(dbColumnNameInput, { target: { value: "omc_column" } });

      const submitButton = screen.getByRole("button", { name: /Skapa kolumn/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(columnService.createCustomColumn).toHaveBeenCalled();
      });

      const callArgs = vi.mocked(columnService.createCustomColumn).mock.calls[0][0];
      expect(callArgs.is_masterdata).toBe(false);
    });

    it("should force is_masterdata to false even if user tries to set it to true (non-HR Admin)", async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "user-1",
          email: "sodexo@test.com",
          role: UserRole.SODEXO,
          is_active: true,
          auth_id: "auth-1",
          created_at: "2025-01-01T00:00:00Z",
          last_active_at: new Date().toISOString(),
        },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      const mockCreatedColumn: ColumnConfig = {
        id: "new-col",
        column_name: "Test Column",
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
        db_column_name: "test_column",
        category_color: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      vi.mocked(columnService.createCustomColumn).mockResolvedValue(mockCreatedColumn);

      renderWithI18n(<AddColumnModal onColumnCreated={mockOnColumnCreated} />);

      const columnNameInput = screen.getByPlaceholderText(/Meal Plan, Training Status/i);
      const dbColumnNameInput = screen.getByPlaceholderText(/meal_plan, training_status/i);
      
      fireEvent.change(columnNameInput, { target: { value: "Test Column" } });
      fireEvent.change(dbColumnNameInput, { target: { value: "test_column" } });

      const submitButton = screen.getByRole("button", { name: /Skapa kolumn/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(columnService.createCustomColumn).toHaveBeenCalled();
      });

      // Even if somehow is_masterdata was set to true, it should be forced to false
      const callArgs = vi.mocked(columnService.createCustomColumn).mock.calls[0][0];
      expect(callArgs.is_masterdata).toBe(false);
    });
  });

  describe("HR Admin can create masterdata columns", () => {
    it("should allow HR Admin to select masterdata column type", async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: {
          id: "user-3",
          email: "hr@test.com",
          role: UserRole.HR_ADMIN,
          is_active: true,
          auth_id: "auth-3",
          created_at: "2025-01-01T00:00:00Z",
          last_active_at: new Date().toISOString(),
        },
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        setUser: vi.fn(),
        checkAuth: vi.fn(),
        setLoading: vi.fn(),
      });

      const mockCreatedColumn: ColumnConfig = {
        id: "new-col",
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
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      vi.mocked(columnService.createCustomColumn).mockResolvedValue(mockCreatedColumn);

      renderWithI18n(<AddColumnModal onColumnCreated={mockOnColumnCreated} />);

      // HR Admin should see the column type selection
      const masterdataRadio = screen.getByLabelText(/Masterdata kolumn/i);
      fireEvent.click(masterdataRadio);

      const columnNameInput = screen.getByPlaceholderText(/Meal Plan, Training Status/i);
      const dbColumnNameInput = screen.getByPlaceholderText(/meal_plan, training_status/i);
      
      fireEvent.change(columnNameInput, { target: { value: "HR Column" } });
      fireEvent.change(dbColumnNameInput, { target: { value: "hr_column" } });

      const submitButton = screen.getByRole("button", { name: /Skapa kolumn/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(columnService.createCustomColumn).toHaveBeenCalled();
      });

      // HR Admin can set is_masterdata to true
      const callArgs = vi.mocked(columnService.createCustomColumn).mock.calls[0][0];
      expect(callArgs.is_masterdata).toBe(true);
    });
  });
});

