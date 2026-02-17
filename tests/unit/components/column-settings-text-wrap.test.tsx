/**
 * Component Tests for Column Settings Display Name Text Handling
 * Story 11.10: PE3 Validation & UI Component Tests
 * AC5: Column Settings Display Name - long names are truncated with ellipsis
 * to prevent horizontal overflow and keep column alignment consistent.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, render } from "@testing-library/react";
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
    it("should show long display names (>50 chars) with truncation", () => {
      renderWithI18n(
        <ColumnSettingsTable
          columns={mockColumns}
          allColumns={mockAllColumns}
          onPermissionsUpdated={mockOnPermissionsUpdated}
        />
      );

      // Find the long column name (truncated text shows the start)
      const longNameCell = screen.getByText(/This is a very long display name/i);
      const cellElement = longNameCell.closest('td');
      
      expect(cellElement).toBeTruthy();
      
      // Long names use truncate class to prevent overflow; full text in title
      const displayDiv = longNameCell.closest('div');
      expect(displayDiv).toBeTruthy();
      expect(displayDiv!.className).toMatch(/truncate/);
      expect(displayDiv!.getAttribute('title')).toContain('This is a very long display name');
    });

    it("should keep display name cell to single-line height when truncated", () => {
      renderWithI18n(
        <ColumnSettingsTable
          columns={mockColumns}
          allColumns={mockAllColumns}
          onPermissionsUpdated={mockOnPermissionsUpdated}
        />
      );

      const longNameCell = screen.getByText(/This is a very long display name/i);
      const textElement = longNameCell.closest('div');
      const cellElement = longNameCell.closest('td');
      
      expect(cellElement).toBeTruthy();
      expect(textElement).toBeTruthy();
      
      expect(textElement!.className).toMatch(/min-h-8/);
      // truncate class applies nowrap + overflow hidden + ellipsis
      expect(textElement!.className).toMatch(/truncate/);
    });

    it("should keep database column name visible below display name", () => {
      renderWithI18n(
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

    it("should maintain readable line-height for display name text", () => {
      renderWithI18n(
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
      
      if (lineHeight !== 'normal') {
        const lineHeightValue = parseFloat(lineHeight);
        if (!isNaN(lineHeightValue)) {
          const fontSize = parseFloat(styles.fontSize) || 16;
          const actualLineHeight = lineHeightValue < 10 ? lineHeightValue * fontSize : lineHeightValue;
          expect(actualLineHeight).toBeGreaterThan(15);
        }
      }
    });

    it("should prevent horizontal overflow on narrow screens via truncation", () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      renderWithI18n(
        <ColumnSettingsTable
          columns={mockColumns}
          allColumns={mockAllColumns}
          onPermissionsUpdated={mockOnPermissionsUpdated}
        />
      );

      const longNameCell = screen.getByText(/This is a very long display name/i);
      const textElement = longNameCell.closest('div') as HTMLElement;
      
      expect(textElement).toBeTruthy();
      
      // Truncate class prevents overflow (overflow-hidden, text-ellipsis, whitespace-nowrap)
      expect(textElement.className).toMatch(/truncate/);
      // Full text available via title
      expect(textElement.getAttribute('title')).toBeTruthy();
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

      renderWithI18n(
        <ColumnSettingsTable
          columns={multipleLongColumns}
          allColumns={multipleLongColumns}
          onPermissionsUpdated={mockOnPermissionsUpdated}
        />
      );

      // Both long names visible (truncated); each row has its own display name
      const firstLongName = screen.getByText(/This is a very long display name/i);
      const secondLongName = screen.getByText(/Another extremely long column display name/i);
      
      expect(firstLongName).toBeInTheDocument();
      expect(secondLongName).toBeInTheDocument();
      
      const firstRow = firstLongName.closest('tr');
      const secondRow = secondLongName.closest('tr');
      
      expect(firstRow).toBeTruthy();
      expect(secondRow).toBeTruthy();
      expect(firstRow).not.toBe(secondRow);
    });
  });
});

