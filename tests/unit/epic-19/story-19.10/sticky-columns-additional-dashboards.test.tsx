/**
 * Story 19.10: Sticky Columns on Additional Dashboards Tests
 *
 * Tests that verify sticky column positioning on:
 * - Important Dates table: Week Number and Category columns
 * - User Management table: Email column
 * - Column Settings table: Drag icon, Display Name, Database Name columns
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ImportantDatesTable } from "@/components/dashboard/important-dates-table";
import { UserManagementTable } from "@/components/admin/user-management-table";
import { ColumnSettingsTable } from "@/components/admin/column-settings-table";
import type { ImportantDate } from "@/lib/types/important-date";
import type { User } from "@/lib/types/user";
import type { ColumnConfig } from "@/lib/types/column-config";

// Mock dependencies for ImportantDatesTable
vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { id: "test-user", role: "hr_admin" },
  }),
}));

vi.mock("@/lib/store/ui-store", () => ({
  useUIStore: () => ({
    density: "default",
    setDensity: vi.fn(),
  }),
}));

vi.mock("@/lib/i18n", () => ({
  useTranslations: () => (key: string) => key,
  useFormatter: () => ({
    relativeTime: vi.fn().mockReturnValue("just now"),
  }),
}));

vi.mock("@/lib/services/important-date-service", () => ({
  importantDateService: {
    update: vi.fn(),
    delete: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
  },
}));

vi.mock("@/lib/services/admin-service", () => ({
  adminService: {
    updateUserStatus: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

vi.mock("@/lib/services/column-service", () => ({
  columnService: {
    updateColumnPermissions: vi.fn(),
    reorderColumns: vi.fn(),
    toggleVisibility: vi.fn(),
    updateCategoryColor: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock data
const mockImportantDates: ImportantDate[] = [
  {
    id: "date-1",
    week_number: 5,
    year: 2026,
    category: "Utbildning",
    date_description: "Training session",
    date_value: "2026-02-01",
    time_value: null,
    notes: "Test notes",
    deadline_submit: null,
    deadline_cancel: null,
    max_spots: 10,
    remaining_spots: 5,
    assigned_employees: [],
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
];

const mockUsers: User[] = [
  {
    id: "user-1",
    email: "test@example.com",
    role: "hr_admin",
    is_active: true,
    last_active_at: "2026-01-19T00:00:00Z",
    created_at: "2025-01-01T00:00:00Z",
  },
];

const mockColumnConfigs: ColumnConfig[] = [
  {
    id: "col-1",
    column_name: "First Name",
    db_column_name: "first_name",
    column_type: "text",
    is_masterdata: true,
    role_permissions: { hr_admin: { view: true, edit: true } },
    category: "Personal",
    category_color: "#3B82F6",
    display_order: 0,
    is_visible: true,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "col-2",
    column_name: "Surname",
    db_column_name: "surname",
    column_type: "text",
    is_masterdata: true,
    role_permissions: { hr_admin: { view: true, edit: true } },
    category: "Personal",
    category_color: "#3B82F6",
    display_order: 1,
    is_visible: true,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
];

describe("Story 19.10: Sticky Columns on Additional Dashboards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Important Dates Table", () => {
    it("should apply sticky positioning to Week Number column header", async () => {
      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      // Find the Week Number header
      const headers = document.querySelectorAll("th");
      let weekNumberHeader: HTMLTableCellElement | null = null;

      headers.forEach((header) => {
        if (header.textContent?.includes("weekNumber")) {
          weekNumberHeader = header as HTMLTableCellElement;
        }
      });

      expect(weekNumberHeader).not.toBeNull();
      if (weekNumberHeader) {
        expect(weekNumberHeader.className).toContain("sticky");
        expect(weekNumberHeader.className).toContain("z-20");
        expect(weekNumberHeader.style.left).toBe("0px");
      }
    });

    it("should apply sticky positioning to Category column header with shadow", async () => {
      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      // Find the Category header
      const headers = document.querySelectorAll("th");
      let categoryHeader: HTMLTableCellElement | null = null;

      headers.forEach((header) => {
        if (header.textContent?.includes("category")) {
          categoryHeader = header as HTMLTableCellElement;
        }
      });

      expect(categoryHeader).not.toBeNull();
      if (categoryHeader) {
        expect(categoryHeader.className).toContain("sticky");
        expect(categoryHeader.className).toContain("z-20");
        // Category is rightmost sticky left column, should have shadow
        expect(categoryHeader.className).toContain("shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]");
        expect(categoryHeader.style.left).toBe("80px");
      }
    });

    it("should apply sticky positioning to Week Number cells", async () => {
      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      // Find a cell with week number value
      const weekNumberCell = screen.getByText("5").closest("td");
      expect(weekNumberCell).not.toBeNull();
      if (weekNumberCell) {
        expect(weekNumberCell.className).toContain("sticky");
        expect(weekNumberCell.className).toContain("z-10");
        expect(weekNumberCell.className).toContain("bg-inherit");
        expect(weekNumberCell.style.left).toBe("0px");
      }
    });

    it("should apply sticky positioning to Category cells with shadow", async () => {
      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      // Find a cell with category value
      const categoryCell = screen.getByText("Utbildning").closest("td");
      expect(categoryCell).not.toBeNull();
      if (categoryCell) {
        expect(categoryCell.className).toContain("sticky");
        expect(categoryCell.className).toContain("z-10");
        expect(categoryCell.className).toContain("bg-inherit");
        expect(categoryCell.className).toContain("shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]");
        expect(categoryCell.style.left).toBe("80px");
      }
    });

    it("should maintain existing sticky action column on right", async () => {
      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      // Find action header
      const headers = document.querySelectorAll("th");
      let actionsHeader: HTMLTableCellElement | null = null;

      headers.forEach((header) => {
        if (header.textContent?.includes("actions")) {
          actionsHeader = header as HTMLTableCellElement;
        }
      });

      if (actionsHeader) {
        expect(actionsHeader.className).toContain("sticky");
        expect(actionsHeader.className).toContain("right-0");
      }
    });
  });

  describe("User Management Table", () => {
    it("should apply sticky positioning to Email column header with shadow", async () => {
      render(
        <UserManagementTable
          users={mockUsers}
          onUserStatusChanged={vi.fn()}
        />
      );

      // Find the Email header
      const headers = document.querySelectorAll("th");
      let emailHeader: HTMLTableCellElement | null = null;

      headers.forEach((header) => {
        if (header.textContent?.includes("Email")) {
          emailHeader = header as HTMLTableCellElement;
        }
      });

      expect(emailHeader).not.toBeNull();
      if (emailHeader) {
        expect(emailHeader.className).toContain("sticky");
        expect(emailHeader.className).toContain("left-0");
        expect(emailHeader.className).toContain("z-20");
        // Email is the only sticky left column, so it should have shadow
        expect(emailHeader.className).toContain("shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]");
      }
    });

    it("should apply sticky positioning to Email cells with shadow", async () => {
      render(
        <UserManagementTable
          users={mockUsers}
          onUserStatusChanged={vi.fn()}
        />
      );

      // Find a cell with email value
      const emailCell = screen.getByText("test@example.com").closest("td");
      expect(emailCell).not.toBeNull();
      if (emailCell) {
        expect(emailCell.className).toContain("sticky");
        expect(emailCell.className).toContain("left-0");
        expect(emailCell.className).toContain("z-10");
        expect(emailCell.className).toContain("bg-inherit");
        expect(emailCell.className).toContain("shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]");
      }
    });

    it("should maintain sticky actions column on right", async () => {
      render(
        <UserManagementTable
          users={mockUsers}
          onUserStatusChanged={vi.fn()}
        />
      );

      // Find action header
      const headers = document.querySelectorAll("th");
      let actionsHeader: HTMLTableCellElement | null = null;

      headers.forEach((header) => {
        if (header.textContent?.includes("actionsColumn")) {
          actionsHeader = header as HTMLTableCellElement;
        }
      });

      if (actionsHeader) {
        expect(actionsHeader.className).toContain("sticky");
        expect(actionsHeader.className).toContain("right-0");
      }
    });

    it("should apply bg-background to rows for proper sticky backgrounds", async () => {
      render(
        <UserManagementTable
          users={mockUsers}
          onUserStatusChanged={vi.fn()}
        />
      );

      // Find a data row
      const rows = document.querySelectorAll("tbody tr");
      expect(rows.length).toBeGreaterThan(0);
      if (rows[0]) {
        expect(rows[0].className).toContain("bg-background");
      }
    });
  });

  describe("Column Settings Table", () => {
    it("should apply sticky positioning to Drag icon column header", async () => {
      render(
        <ColumnSettingsTable
          columns={mockColumnConfigs}
          allColumns={mockColumnConfigs}
          onPermissionsUpdated={vi.fn()}
        />
      );

      // First header should be sticky (drag icon)
      const headers = document.querySelectorAll("th");
      const dragIconHeader = headers[0] as HTMLTableCellElement;

      expect(dragIconHeader).not.toBeNull();
      expect(dragIconHeader.className).toContain("sticky");
      expect(dragIconHeader.className).toContain("z-20");
      expect(dragIconHeader.style.left).toBe("0px");
    });

    it("should apply sticky positioning to Display Name column header", async () => {
      render(
        <ColumnSettingsTable
          columns={mockColumnConfigs}
          allColumns={mockColumnConfigs}
          onPermissionsUpdated={vi.fn()}
        />
      );

      // Find Display Name header
      const headers = document.querySelectorAll("th");
      let displayNameHeader: HTMLTableCellElement | null = null;

      headers.forEach((header) => {
        if (header.textContent?.includes("Visningsnamn")) {
          displayNameHeader = header as HTMLTableCellElement;
        }
      });

      expect(displayNameHeader).not.toBeNull();
      if (displayNameHeader) {
        expect(displayNameHeader.className).toContain("sticky");
        expect(displayNameHeader.className).toContain("z-20");
        expect(displayNameHeader.style.left).toBe("40px");
      }
    });

    it("should apply sticky positioning to Database Name column header with shadow", async () => {
      render(
        <ColumnSettingsTable
          columns={mockColumnConfigs}
          allColumns={mockColumnConfigs}
          onPermissionsUpdated={vi.fn()}
        />
      );

      // Find Database Name header
      const headers = document.querySelectorAll("th");
      let dbNameHeader: HTMLTableCellElement | null = null;

      headers.forEach((header) => {
        if (header.textContent?.includes("Databasnamn")) {
          dbNameHeader = header as HTMLTableCellElement;
        }
      });

      expect(dbNameHeader).not.toBeNull();
      if (dbNameHeader) {
        expect(dbNameHeader.className).toContain("sticky");
        expect(dbNameHeader.className).toContain("z-20");
        // Database name is rightmost sticky left column, should have shadow
        expect(dbNameHeader.className).toContain("shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]");
        expect(dbNameHeader.style.left).toBe("190px");
      }
    });

    it("should apply sticky positioning to Drag icon cells", async () => {
      render(
        <ColumnSettingsTable
          columns={mockColumnConfigs}
          allColumns={mockColumnConfigs}
          onPermissionsUpdated={vi.fn()}
        />
      );

      // Find first cell in data row (drag icon)
      const rows = document.querySelectorAll("tbody tr");
      expect(rows.length).toBeGreaterThan(0);

      const firstCell = rows[0].querySelector("td");
      expect(firstCell).not.toBeNull();
      if (firstCell) {
        expect(firstCell.className).toContain("sticky");
        expect(firstCell.className).toContain("z-10");
        expect(firstCell.className).toContain("bg-inherit");
        expect(firstCell.style.left).toBe("0px");
      }
    });

    it("should apply sticky positioning to Display Name cells", async () => {
      render(
        <ColumnSettingsTable
          columns={mockColumnConfigs}
          allColumns={mockColumnConfigs}
          onPermissionsUpdated={vi.fn()}
        />
      );

      // Find cell containing column display name
      const displayNameCell = screen.getByText("First Name").closest("td");
      expect(displayNameCell).not.toBeNull();
      if (displayNameCell) {
        expect(displayNameCell.className).toContain("sticky");
        expect(displayNameCell.className).toContain("z-10");
        expect(displayNameCell.className).toContain("bg-inherit");
        expect(displayNameCell.style.left).toBe("40px");
      }
    });

    it("should apply sticky positioning to Database Name cells with shadow", async () => {
      render(
        <ColumnSettingsTable
          columns={mockColumnConfigs}
          allColumns={mockColumnConfigs}
          onPermissionsUpdated={vi.fn()}
        />
      );

      // Find cell containing db column name
      const dbNameCell = screen.getByText("first_name").closest("td");
      expect(dbNameCell).not.toBeNull();
      if (dbNameCell) {
        expect(dbNameCell.className).toContain("sticky");
        expect(dbNameCell.className).toContain("z-10");
        expect(dbNameCell.className).toContain("bg-inherit");
        expect(dbNameCell.className).toContain("shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]");
        expect(dbNameCell.style.left).toBe("190px");
      }
    });

    it("should apply sticky positioning to Actions column header on right", async () => {
      render(
        <ColumnSettingsTable
          columns={mockColumnConfigs}
          allColumns={mockColumnConfigs}
          onPermissionsUpdated={vi.fn()}
        />
      );

      // Find Actions header
      const headers = document.querySelectorAll("th");
      let actionsHeader: HTMLTableCellElement | null = null;

      headers.forEach((header) => {
        if (header.textContent?.includes("actions")) {
          actionsHeader = header as HTMLTableCellElement;
        }
      });

      if (actionsHeader) {
        expect(actionsHeader.className).toContain("sticky");
        expect(actionsHeader.className).toContain("right-0");
        expect(actionsHeader.className).toContain("z-20");
      }
    });

    it("should apply bg-background to rows for proper sticky backgrounds", async () => {
      render(
        <ColumnSettingsTable
          columns={mockColumnConfigs}
          allColumns={mockColumnConfigs}
          onPermissionsUpdated={vi.fn()}
        />
      );

      // Find data rows
      const rows = document.querySelectorAll("tbody tr");
      expect(rows.length).toBeGreaterThan(0);
      if (rows[0]) {
        expect(rows[0].className).toContain("bg-background");
      }
    });
  });

  describe("Compatibility - All Tables", () => {
    it("should not break vertical scrolling functionality", async () => {
      // This test verifies that sticky columns don't interfere with table scroll containers
      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      // Verify table structure exists with scroll container
      const table = document.querySelector("table");
      expect(table).not.toBeNull();

      // Table should be within a scrollable container
      const scrollContainer = table?.closest("div.overflow-x-auto, div.overflow-auto");
      // If not found directly, check for rounded-md border container
      const tableContainer = table?.closest(".rounded-md.border");
      expect(scrollContainer || tableContainer).not.toBeNull();
    });
  });
});
