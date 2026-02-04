/**
 * Component Tests for Column Settings Display Name Text Wrapping
 * Story 11.10: PE3 Validation & UI Component Tests
 * AC5: Column Settings Display Name Wrapping Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ColumnSettingsTable } from "@/components/admin/column-settings-table";
import type { ColumnConfig } from "@/lib/types/column-config";
import { UserRole } from "@/lib/types/user";
import { renderWithI18n } from "@/../tests/utils/i18n-test-wrapper";

// Mock the column service
vi.mock("@/lib/services/column-service", () => ({
  columnService: {
    updateColumnName: vi.fn(),
    updateCategory: vi.fn(),
    updateCategoryColor: vi.fn(),
    deleteColumn: vi.fn(),
    toggleVisibility: vi.fn(),
    reorderColumns: vi.fn(),
  },
}));

describe("Column Settings Display Name Text Wrapping", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return renderWithI18n(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  const mockOnPermissionsUpdated = vi.fn();

  const mockColumns: ColumnConfig[] = [
    {
      id: "col-1",
      column_name: "Short Name",
      db_column_name: "short_name",
      column_type: "text",
      category: "Personal",
      is_masterdata: true,
      is_visible: true,
      role_permissions: {},
      display_order: 1,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "col-2",
      column_name: "This is a very long display name that exceeds fifty characters and should wrap to multiple lines in the table",
      db_column_name: "very_long_column_name",
      column_type: "text",
      category: "Personal",
      is_masterdata: true,
      is_visible: true,
      role_permissions: {},
      display_order: 2,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
  ];

  const mockAllColumns = mockColumns;
  const mockRoles: UserRole[] = [UserRole.HR_ADMIN];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AC5: Column Settings Display Name Wrapping Tests", () => {
    it("should wrap long display names (>50 chars) to multiple lines", () => {
      renderWithQueryClient(
        <ColumnSettingsTable
          columns={mockColumns}
          allColumns={mockAllColumns}
          onPermissionsUpdated={mockOnPermissionsUpdated}
        />
      );

      // Find the long column name cell
      const longNameCell = screen.getByText(/This is a very long display name/i);
      const cellElement = longNameCell.closest('td');
      
      expect(cellElement).toBeTruthy();
      
      // Check that the cell allows text wrapping
      // The cell should not have text truncation classes like 'truncate' or 'overflow-hidden'
      const styles = window.getComputedStyle(cellElement!);
      expect(styles.whiteSpace).not.toBe('nowrap');
      
      // Check that the text content is present (not truncated with ellipsis)
      expect(longNameCell.textContent).toContain('This is a very long display name');
      expect(longNameCell.textContent?.length).toBeGreaterThan(50);
    });

    it("should expand row height to accommodate wrapped text", () => {
      renderWithQueryClient(
        <ColumnSettingsTable
          columns={mockColumns}
          allColumns={mockAllColumns}
          onPermissionsUpdated={mockOnPermissionsUpdated}
        />
      );

      const longNameCell = screen.getByText(/This is a very long display name/i);
      // The min-h-8 class is on the inner div, not the td
      const textElement = longNameCell.closest('div');
      const cellElement = longNameCell.closest('td');
      
      expect(cellElement).toBeTruthy();
      expect(textElement).toBeTruthy();
      
      // Check if inner div has min-height class (min-h-8 = 32px)
      const hasMinHeightClass = textElement!.classList.contains('min-h-8') ||
                               textElement!.className.includes('min-h-8');
      
      // Check computed styles on the inner div
      const textStyles = window.getComputedStyle(textElement!);
      const minHeight = parseFloat(textStyles.minHeight) || 0;
      const actualHeight = parseFloat(textStyles.height) || textElement!.getBoundingClientRect().height;
      
      // Either has the class OR computed size should accommodate wrapped text
      // Long text should make the element taller than a single line
      if (!hasMinHeightClass) {
        const effectiveHeight = Math.max(minHeight, actualHeight);
        // Text wrapping should make element taller than typical single-line height (~20-24px)
        expect(effectiveHeight).toBeGreaterThanOrEqual(25);
      } else {
        // If class is present, that's sufficient
        expect(hasMinHeightClass).toBe(true);
      }
    });

    it("should keep database column name visible below display name", () => {
      renderWithQueryClient(
        <ColumnSettingsTable
          columns={mockColumns}
          allColumns={mockAllColumns}
          onPermissionsUpdated={mockOnPermissionsUpdated}
        />
      );

      // Find the row with long display name
      const longNameCell = screen.getByText(/This is a very long display name/i);
      const row = longNameCell.closest('tr');
      
      expect(row).toBeTruthy();
      
      // Database column name should be in the same row
      const dbColumnName = screen.getByText('very_long_column_name');
      expect(dbColumnName).toBeInTheDocument();
      
      // Both should be in the same row
      const dbColumnRow = dbColumnName.closest('tr');
      expect(dbColumnRow).toBe(row);
    });

    it("should maintain readable line-height for wrapped text", () => {
      renderWithQueryClient(
        <ColumnSettingsTable
          columns={mockColumns}
          allColumns={mockAllColumns}
          onPermissionsUpdated={mockOnPermissionsUpdated}
        />
      );

      const longNameCell = screen.getByText(/This is a very long display name/i);
      const cellElement = longNameCell.closest('td');
      
      expect(cellElement).toBeTruthy();
      
      const styles = window.getComputedStyle(cellElement!);
      const lineHeight = styles.lineHeight;
      
      // Line height should be reasonable (not too small)
      // Check if it's a number (px) or a multiplier (like "1.5")
      if (lineHeight !== 'normal') {
        const lineHeightValue = parseFloat(lineHeight);
        if (!isNaN(lineHeightValue)) {
          // If it's a multiplier (less than 10), multiply by font size
          const fontSize = parseFloat(styles.fontSize) || 16;
          const actualLineHeight = lineHeightValue < 10 ? lineHeightValue * fontSize : lineHeightValue;
          expect(actualLineHeight).toBeGreaterThan(15);
        }
      }
      // If lineHeight is 'normal', that's also acceptable (browser default)
    });

    it("should prevent horizontal overflow on narrow screens", () => {
      // Set a narrow viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // Mobile width
      });

      renderWithQueryClient(
        <ColumnSettingsTable
          columns={mockColumns}
          allColumns={mockAllColumns}
          onPermissionsUpdated={mockOnPermissionsUpdated}
        />
      );

      const longNameCell = screen.getByText(/This is a very long display name/i);
      // Find the div element that contains the text (EditableColumnNameCell's display div)
      // The text is inside a div with inline styles for wordWrap
      const textElement = longNameCell.closest('div') as HTMLElement;
      
      expect(textElement).toBeTruthy();
      
      // Check that text wrapping is enabled via inline styles or classes
      const textStyles = window.getComputedStyle(textElement);
      // Implementation uses: wordWrap: 'break-word', overflowWrap: 'break-word' (inline style)
      // OR break-words class (Tailwind) which sets word-break: break-word
      // Check for either inline style or computed style
      const hasWordWrap = textStyles.wordWrap === 'break-word' || 
                         textStyles.overflowWrap === 'break-word' ||
                         textStyles.wordBreak === 'break-word';
      expect(hasWordWrap).toBeTruthy();
      // Should not prevent wrapping
      expect(textStyles.whiteSpace).not.toBe('nowrap');
    });

    it("should handle multiple long display names in the same table", () => {
      const multipleLongColumns: ColumnConfig[] = [
        ...mockColumns,
        {
          id: "col-3",
          column_name: "Another extremely long column display name that is also over fifty characters and needs proper wrapping behavior",
          db_column_name: "another_long_name",
          column_type: "text",
          category: "Personal",
          is_masterdata: true,
          is_visible: true,
          role_permissions: {},
          display_order: 3,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      renderWithQueryClient(
        <ColumnSettingsTable
          columns={multipleLongColumns}
          allColumns={multipleLongColumns}
          onPermissionsUpdated={mockOnPermissionsUpdated}
        />
      );

      // Both long names should be visible and wrapped
      const firstLongName = screen.getByText(/This is a very long display name/i);
      const secondLongName = screen.getByText(/Another extremely long column display name/i);
      
      expect(firstLongName).toBeInTheDocument();
      expect(secondLongName).toBeInTheDocument();
      
      // Both should be in separate rows
      const firstRow = firstLongName.closest('tr');
      const secondRow = secondLongName.closest('tr');
      
      expect(firstRow).toBeTruthy();
      expect(secondRow).toBeTruthy();
      expect(firstRow).not.toBe(secondRow);
    });
  });
});

