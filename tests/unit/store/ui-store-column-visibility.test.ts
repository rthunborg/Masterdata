import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUIStore } from '@/lib/store/ui-store';
import type { ColumnConfig } from '@/lib/types/column-config';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Mock window.location.hostname for debug logging
Object.defineProperty(window, 'location', {
  value: {
    hostname: 'localhost',
  },
  writable: true,
});

// Assign mock to window.localStorage
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('UIStore - Column Visibility', () => {
  const testUserId = 'test-user-123';
  const testColumnId = 'col-first-name';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    // Reset the store state
    useUIStore.setState({ columnVisibility: {} });
    // Clear console mocks
    vi.clearAllMocks();
  });

  describe('initColumnVisibility', () => {
    it('should initialize empty column visibility when no stored preferences', () => {
      const { initColumnVisibility } = useUIStore.getState();
      
      initColumnVisibility(testUserId);
      
      const state = useUIStore.getState();
      expect(state.columnVisibility).toEqual({});
    });

    it('should load stored preferences from localStorage', () => {
      const storedPrefs = {
        'col-1': true,
        'col-2': false,
        'col-3': true,
      };
      
      localStorageMock.setItem(
        `hr_masterdata_column_visibility_${testUserId}`,
        JSON.stringify(storedPrefs)
      );
      
      const { initColumnVisibility } = useUIStore.getState();
      initColumnVisibility(testUserId);
      
      const state = useUIStore.getState();
      expect(state.columnVisibility).toEqual(storedPrefs);
    });

    it('should handle invalid JSON by resetting to empty', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      localStorageMock.setItem(
        `hr_masterdata_column_visibility_${testUserId}`,
        'invalid-json{'
      );
      
      const { initColumnVisibility } = useUIStore.getState();
      initColumnVisibility(testUserId);
      
      const state = useUIStore.getState();
      expect(state.columnVisibility).toEqual({});
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to parse column visibility preferences:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should store userId in localStorage for later operations', () => {
      const { initColumnVisibility } = useUIStore.getState();
      initColumnVisibility(testUserId);
      
      expect(localStorageMock.getItem('currentUserId')).toBe(testUserId);
    });
  });

  describe('toggleColumnVisibility', () => {
    beforeEach(() => {
      // Initialize with a userId
      localStorageMock.setItem('currentUserId', testUserId);
    });

    it('should hide a visible column (undefined -> false)', () => {
      const { toggleColumnVisibility } = useUIStore.getState();
      
      // Column is visible by default (undefined)
      toggleColumnVisibility(testColumnId);
      
      const state = useUIStore.getState();
      expect(state.columnVisibility[testColumnId]).toBe(false);
    });

    it('should show a hidden column (false -> true)', () => {
      // Set column as hidden first
      useUIStore.setState({ columnVisibility: { [testColumnId]: false } });
      
      const { toggleColumnVisibility } = useUIStore.getState();
      toggleColumnVisibility(testColumnId);
      
      const state = useUIStore.getState();
      expect(state.columnVisibility[testColumnId]).toBe(true);
    });

    it('should hide an explicitly visible column (true -> false)', () => {
      // Set column as explicitly visible
      useUIStore.setState({ columnVisibility: { [testColumnId]: true } });
      
      const { toggleColumnVisibility } = useUIStore.getState();
      toggleColumnVisibility(testColumnId);
      
      const state = useUIStore.getState();
      expect(state.columnVisibility[testColumnId]).toBe(false);
    });

    it('should persist changes to localStorage', () => {
      const { toggleColumnVisibility } = useUIStore.getState();
      
      toggleColumnVisibility(testColumnId);
      
      const stored = localStorageMock.getItem(
        `hr_masterdata_column_visibility_${testUserId}`
      );
      expect(stored).not.toBeNull();
      
      const parsed = JSON.parse(stored!);
      expect(parsed[testColumnId]).toBe(false);
    });

    it('should preserve other column visibility states when toggling one column', () => {
      // Set initial state with multiple columns
      useUIStore.setState({
        columnVisibility: {
          'col-1': true,
          'col-2': false,
          'col-3': true,
        },
      });
      
      const { toggleColumnVisibility } = useUIStore.getState();
      toggleColumnVisibility('col-2'); // Toggle col-2 from false to true
      
      const state = useUIStore.getState();
      expect(state.columnVisibility).toEqual({
        'col-1': true,
        'col-2': true, // Changed
        'col-3': true,
      });
    });

    it('should handle multiple sequential toggles correctly', () => {
      const { toggleColumnVisibility } = useUIStore.getState();
      
      // First toggle: undefined -> false
      toggleColumnVisibility(testColumnId);
      expect(useUIStore.getState().columnVisibility[testColumnId]).toBe(false);
      
      // Second toggle: false -> true
      toggleColumnVisibility(testColumnId);
      expect(useUIStore.getState().columnVisibility[testColumnId]).toBe(true);
      
      // Third toggle: true -> false
      toggleColumnVisibility(testColumnId);
      expect(useUIStore.getState().columnVisibility[testColumnId]).toBe(false);
    });
  });

  describe('resetColumnVisibility', () => {
    beforeEach(() => {
      localStorageMock.setItem('currentUserId', testUserId);
    });

    it('should clear all column visibility preferences', () => {
      // Set some initial preferences
      useUIStore.setState({
        columnVisibility: {
          'col-1': false,
          'col-2': true,
          'col-3': false,
        },
      });
      
      const { resetColumnVisibility } = useUIStore.getState();
      resetColumnVisibility();
      
      const state = useUIStore.getState();
      expect(state.columnVisibility).toEqual({});
    });

    it('should remove preferences from localStorage', () => {
      // Store some preferences first
      localStorageMock.setItem(
        `hr_masterdata_column_visibility_${testUserId}`,
        JSON.stringify({ 'col-1': false })
      );
      
      const { resetColumnVisibility } = useUIStore.getState();
      resetColumnVisibility();
      
      const stored = localStorageMock.getItem(
        `hr_masterdata_column_visibility_${testUserId}`
      );
      expect(stored).toBeNull();
    });
  });

  describe('getVisibleColumns', () => {
    it('should return all columns when no visibility preferences are set', () => {
      const allColumns = [
        { id: 'col-1', column_name: 'Column 1' },
        { id: 'col-2', column_name: 'Column 2' },
        { id: 'col-3', column_name: 'Column 3' },
      ] as Array<Partial<ColumnConfig>>;
      
      const { getVisibleColumns } = useUIStore.getState();
      const visible = getVisibleColumns(allColumns as ColumnConfig[]);
      
      expect(visible).toEqual(allColumns);
    });

    it('should filter out columns set to false', () => {
      useUIStore.setState({
        columnVisibility: {
          'col-1': true,
          'col-2': false, // Hidden
          'col-3': true,
        },
      });
      
      const allColumns = [
        { id: 'col-1', column_name: 'Column 1' },
        { id: 'col-2', column_name: 'Column 2' },
        { id: 'col-3', column_name: 'Column 3' },
      ] as Array<Partial<ColumnConfig>>;
      
      const { getVisibleColumns } = useUIStore.getState();
      const visible = getVisibleColumns(allColumns as ColumnConfig[]);
      
      expect(visible).toHaveLength(2);
      expect(visible.map((c) => c.id)).toEqual(['col-1', 'col-3']);
    });

    it('should show columns that are undefined or explicitly true', () => {
      useUIStore.setState({
        columnVisibility: {
          'col-1': true, // Explicitly visible
          'col-2': false, // Hidden
          // col-3 is undefined (default visible)
        },
      });
      
      const allColumns = [
        { id: 'col-1', column_name: 'Column 1' },
        { id: 'col-2', column_name: 'Column 2' },
        { id: 'col-3', column_name: 'Column 3' },
      ] as Array<Partial<ColumnConfig>>;
      
      const { getVisibleColumns } = useUIStore.getState();
      const visible = getVisibleColumns(allColumns as ColumnConfig[]);
      
      expect(visible).toHaveLength(2);
      expect(visible.map((c) => c.id)).toEqual(['col-1', 'col-3']);
    });
  });
});
