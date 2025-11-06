/**
 * Unit tests for column-width-storage utility
 * Story 9.4: Table UX Enhancements - Column Resizing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getColumnWidthsStorageKey,
  saveColumnWidths,
  loadColumnWidths,
  clearColumnWidths,
} from './column-width-storage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Replace global localStorage with mock
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Column Width Storage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
  });

  describe('getColumnWidthsStorageKey', () => {
    it('generates correct storage key format', () => {
      const key = getColumnWidthsStorageKey('dashboard', 'user123');
      expect(key).toBe('columnWidths-dashboard-user123');
    });

    it('generates unique keys for different views', () => {
      const key1 = getColumnWidthsStorageKey('dashboard', 'user123');
      const key2 = getColumnWidthsStorageKey('important-dates', 'user123');
      expect(key1).not.toBe(key2);
    });

    it('generates unique keys for different users', () => {
      const key1 = getColumnWidthsStorageKey('dashboard', 'user123');
      const key2 = getColumnWidthsStorageKey('dashboard', 'user456');
      expect(key1).not.toBe(key2);
    });
  });

  describe('saveColumnWidths', () => {
    it('saves column widths to localStorage', () => {
      const widths = { col1: 150, col2: 200, col3: 250 };
      saveColumnWidths('dashboard', 'user123', widths);

      const stored = localStorage.getItem('columnWidths-dashboard-user123');
      expect(stored).toBe(JSON.stringify(widths));
    });

    it('overwrites existing widths', () => {
      const widths1 = { col1: 150, col2: 200 };
      const widths2 = { col1: 180, col2: 220 };

      saveColumnWidths('dashboard', 'user123', widths1);
      saveColumnWidths('dashboard', 'user123', widths2);

      const stored = localStorage.getItem('columnWidths-dashboard-user123');
      expect(stored).toBe(JSON.stringify(widths2));
    });

    it('handles localStorage errors gracefully', () => {
      // Mock setItem to throw an error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      // Should not throw
      expect(() => {
        saveColumnWidths('dashboard', 'user123', { col1: 150 });
      }).not.toThrow();

      // Restore original method
      localStorage.setItem = originalSetItem;
    });
  });

  describe('loadColumnWidths', () => {
    it('loads column widths from localStorage', () => {
      const widths = { col1: 150, col2: 200, col3: 250 };
      saveColumnWidths('dashboard', 'user123', widths);

      const loaded = loadColumnWidths('dashboard', 'user123');
      expect(loaded).toEqual(widths);
    });

    it('returns null when no widths are saved', () => {
      const loaded = loadColumnWidths('dashboard', 'user123');
      expect(loaded).toBeNull();
    });

    it('returns null on JSON parse error', () => {
      // Manually set invalid JSON
      localStorage.setItem('columnWidths-dashboard-user123', 'invalid-json');

      const loaded = loadColumnWidths('dashboard', 'user123');
      expect(loaded).toBeNull();
    });

    it('loads different widths for different views', () => {
      const widths1 = { col1: 150, col2: 200 };
      const widths2 = { col1: 180, col2: 220 };

      saveColumnWidths('dashboard', 'user123', widths1);
      saveColumnWidths('important-dates', 'user123', widths2);

      const loaded1 = loadColumnWidths('dashboard', 'user123');
      const loaded2 = loadColumnWidths('important-dates', 'user123');

      expect(loaded1).toEqual(widths1);
      expect(loaded2).toEqual(widths2);
    });

    it('loads different widths for different users', () => {
      const widths1 = { col1: 150, col2: 200 };
      const widths2 = { col1: 180, col2: 220 };

      saveColumnWidths('dashboard', 'user123', widths1);
      saveColumnWidths('dashboard', 'user456', widths2);

      const loaded1 = loadColumnWidths('dashboard', 'user123');
      const loaded2 = loadColumnWidths('dashboard', 'user456');

      expect(loaded1).toEqual(widths1);
      expect(loaded2).toEqual(widths2);
    });
  });

  describe('clearColumnWidths', () => {
    it('removes column widths from localStorage', () => {
      const widths = { col1: 150, col2: 200 };
      saveColumnWidths('dashboard', 'user123', widths);

      clearColumnWidths('dashboard', 'user123');

      const loaded = loadColumnWidths('dashboard', 'user123');
      expect(loaded).toBeNull();
    });

    it('only clears widths for specified view', () => {
      const widths1 = { col1: 150, col2: 200 };
      const widths2 = { col1: 180, col2: 220 };

      saveColumnWidths('dashboard', 'user123', widths1);
      saveColumnWidths('important-dates', 'user123', widths2);

      clearColumnWidths('dashboard', 'user123');

      const loaded1 = loadColumnWidths('dashboard', 'user123');
      const loaded2 = loadColumnWidths('important-dates', 'user123');

      expect(loaded1).toBeNull();
      expect(loaded2).toEqual(widths2);
    });

    it('handles localStorage errors gracefully', () => {
      // Mock removeItem to throw an error
      const originalRemoveItem = localStorage.removeItem;
      localStorage.removeItem = vi.fn(() => {
        throw new Error('SecurityError');
      });

      // Should not throw
      expect(() => {
        clearColumnWidths('dashboard', 'user123');
      }).not.toThrow();

      // Restore original method
      localStorage.removeItem = originalRemoveItem;
    });
  });

  describe('Full workflow', () => {
    it('saves, loads, and clears widths correctly', () => {
      const widths = { col1: 150, col2: 200, col3: 250 };

      // Save widths
      saveColumnWidths('dashboard', 'user123', widths);

      // Load and verify
      let loaded = loadColumnWidths('dashboard', 'user123');
      expect(loaded).toEqual(widths);

      // Clear widths
      clearColumnWidths('dashboard', 'user123');

      // Verify cleared
      loaded = loadColumnWidths('dashboard', 'user123');
      expect(loaded).toBeNull();
    });
  });
});
