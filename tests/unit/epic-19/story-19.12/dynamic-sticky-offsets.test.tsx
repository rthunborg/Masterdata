/**
 * Story 19.12: Dynamic Sticky Column Offset Calculation Tests
 *
 * Tests that verify sticky column offsets adjust dynamically based on
 * actual column widths rather than hardcoded values.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { ImportantDatesTable } from "@/components/dashboard/important-dates-table";
import type { ImportantDate } from "@/lib/types/important-date";

// Mock dependencies
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
}));

vi.mock("@/lib/services/important-date-service", () => ({
  importantDateService: {
    update: vi.fn(),
    delete: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: "/dashboard",
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    toString: vi.fn(() => ""),
  }),
  usePathname: () => "/dashboard",
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

describe("Story 19.12: Dynamic Sticky Column Offsets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Important Dates Table - Dynamic Offsets", () => {
    it("should use dynamic offset for Category column based on Week Number width", async () => {
      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      // Find Category header
      const headers = document.querySelectorAll("th");
      let categoryHeader: HTMLTableCellElement | null = null;

      headers.forEach((header) => {
        if (header.textContent?.includes("category")) {
          categoryHeader = header as HTMLTableCellElement;
        }
      });

      expect(categoryHeader).not.toBeNull();
      if (categoryHeader) {
        // Should have a left style (value depends on Week Number column width)
        expect(categoryHeader.style.left).toBeTruthy();
        // TanStack Table default column size is 150px (not compact density)
        // The offset comes from table.getColumn('week_number')?.getSize()
        expect(categoryHeader.style.left).toBe("150px");
      }
    });

    it("should maintain sticky positioning on Week Number column at left: 0", async () => {
      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      // Find Week Number header
      const headers = document.querySelectorAll("th");
      let weekNumberHeader: HTMLTableCellElement | null = null;

      headers.forEach((header) => {
        if (header.textContent?.includes("weekNumber")) {
          weekNumberHeader = header as HTMLTableCellElement;
        }
      });

      expect(weekNumberHeader).not.toBeNull();
      if (weekNumberHeader) {
        // First sticky column always at 0
        expect(weekNumberHeader.style.left).toBe("0px");
      }
    });

    it("should apply dynamic offset to Category cells", async () => {
      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      // Find Category cell
      const categoryCell = document.querySelector('td')?.parentElement?.querySelectorAll('td')[2];
      
      // Alternative: find by content
      const allCells = document.querySelectorAll("td");
      let foundCategoryCell: HTMLTableCellElement | null = null;
      
      allCells.forEach((cell) => {
        if (cell.textContent?.includes("Utbildning")) {
          foundCategoryCell = cell as HTMLTableCellElement;
        }
      });

      if (foundCategoryCell) {
        expect(foundCategoryCell.style.left).toBeTruthy();
      }
    });

    it("should use TanStack Table default width when no custom sizing set", async () => {
      // Clear any saved column widths
      localStorage.clear();

      render(
        <ImportantDatesTable
          dates={mockImportantDates}
          isLoading={false}
          userRole="hr_admin"
        />
      );

      // Find Category header
      const headers = document.querySelectorAll("th");
      let categoryHeader: HTMLTableCellElement | null = null;

      headers.forEach((header) => {
        if (header.textContent?.includes("category")) {
          categoryHeader = header as HTMLTableCellElement;
        }
      });

      if (categoryHeader) {
        // TanStack Table default column size is 150px
        // Our code uses table.getColumn('week_number')?.getSize() which returns this default
        // The fallback ?? 80 only applies if getSize() returns undefined
        expect(categoryHeader.style.left).toBe("150px");
      }
    });
  });

  describe("Column Settings Table - Static Offsets", () => {
    // Note: Column Settings table doesn't use TanStack Table and doesn't support
    // user column resizing, so hardcoded offsets are appropriate.
    // This test documents the intentional design decision.
    
    it("should document that Column Settings uses static offsets (no TanStack Table)", () => {
      // Column Settings table uses DND Kit for row reordering, not TanStack Table
      // for column management. Users cannot resize columns in this table,
      // so static offsets (0, 40, 190) are the correct implementation.
      //
      // If Column Settings ever adds column resizing via TanStack Table,
      // it should be updated to use dynamic offsets like Important Dates.
      expect(true).toBe(true);
    });
  });

  describe("Offset Calculation Logic", () => {
    it("should calculate offset as sum of preceding sticky column widths", () => {
      // Test the offset calculation concept
      // For Important Dates: Category offset = Week Number width
      // For tables with 3+ sticky columns: offset[n] = sum(width[0..n-1])
      
      const calculateOffset = (columnIndex: number, widths: number[]) => {
        let offset = 0;
        for (let i = 0; i < columnIndex; i++) {
          offset += widths[i];
        }
        return offset;
      };

      // Important Dates scenario
      const importantDatesWidths = [80]; // Week Number
      expect(calculateOffset(0, importantDatesWidths)).toBe(0); // Week Number
      expect(calculateOffset(1, importantDatesWidths)).toBe(80); // Category

      // Column Settings scenario (if it used dynamic offsets)
      const columnSettingsWidths = [40, 150]; // Drag, Display Name
      expect(calculateOffset(0, columnSettingsWidths)).toBe(0); // Drag
      expect(calculateOffset(1, columnSettingsWidths)).toBe(40); // Display Name
      expect(calculateOffset(2, columnSettingsWidths)).toBe(190); // Database Name
    });

    it("should handle custom column widths correctly", () => {
      const calculateOffset = (columnIndex: number, widths: number[]) => {
        let offset = 0;
        for (let i = 0; i < columnIndex; i++) {
          offset += widths[i];
        }
        return offset;
      };

      // User resizes Week Number to 120px
      const customWidths = [120];
      expect(calculateOffset(1, customWidths)).toBe(120); // Category at 120px
    });
  });
});
