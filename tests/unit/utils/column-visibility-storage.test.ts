import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveColumnVisibility,
  loadColumnVisibility,
  clearColumnVisibility,
} from '@/lib/utils/column-visibility-storage';

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

// Assign mock to window.localStorage before importing the utility
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('column-visibility-storage', () => {
  const testUserId = 'user-123';
  const testPreferences = {
    'column-1': true,
    'column-2': false,
    'column-3': true,
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    // Clear console.error mock
    vi.clearAllMocks();
  });

  describe('saveColumnVisibility', () => {
    it('should save preferences to localStorage with correct key', () => {
      saveColumnVisibility(testUserId, testPreferences);
      
      const key = `hr_masterdata_column_visibility_${testUserId}`;
      const stored = localStorageMock.getItem(key);
      
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual(testPreferences);
    });

    it('should overwrite existing preferences', () => {
      saveColumnVisibility(testUserId, testPreferences);
      
      const newPreferences = {
        'column-1': false,
        'column-4': true,
      };
      saveColumnVisibility(testUserId, newPreferences);
      
      const key = `hr_masterdata_column_visibility_${testUserId}`;
      const stored = localStorageMock.getItem(key);
      
      expect(JSON.parse(stored!)).toEqual(newPreferences);
    });

    it('should save empty preferences object', () => {
      saveColumnVisibility(testUserId, {});
      
      const key = `hr_masterdata_column_visibility_${testUserId}`;
      const stored = localStorageMock.getItem(key);
      
      expect(JSON.parse(stored!)).toEqual({});
    });

    it('should handle different user IDs separately', () => {
      const user1Prefs = { 'column-1': true };
      const user2Prefs = { 'column-1': false };
      
      saveColumnVisibility('user-1', user1Prefs);
      saveColumnVisibility('user-2', user2Prefs);
      
      const stored1 = localStorageMock.getItem('hr_masterdata_column_visibility_user-1');
      const stored2 = localStorageMock.getItem('hr_masterdata_column_visibility_user-2');
      
      expect(JSON.parse(stored1!)).toEqual(user1Prefs);
      expect(JSON.parse(stored2!)).toEqual(user2Prefs);
    });
  });

  describe('loadColumnVisibility', () => {
    it('should load preferences from localStorage', () => {
      saveColumnVisibility(testUserId, testPreferences);
      
      const loaded = loadColumnVisibility(testUserId);
      
      expect(loaded).toEqual(testPreferences);
    });

    it('should return null if no preferences exist', () => {
      const loaded = loadColumnVisibility('non-existent-user');
      
      expect(loaded).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const key = `hr_masterdata_column_visibility_${testUserId}`;
      localStorageMock.setItem(key, 'invalid-json{');
      
      const loaded = loadColumnVisibility(testUserId);
      
      expect(loaded).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load column visibility preferences:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle empty preferences object', () => {
      saveColumnVisibility(testUserId, {});
      
      const loaded = loadColumnVisibility(testUserId);
      
      expect(loaded).toEqual({});
    });

    it('should load correct preferences for different users', () => {
      const user1Prefs = { 'column-1': true };
      const user2Prefs = { 'column-1': false };
      
      saveColumnVisibility('user-1', user1Prefs);
      saveColumnVisibility('user-2', user2Prefs);
      
      expect(loadColumnVisibility('user-1')).toEqual(user1Prefs);
      expect(loadColumnVisibility('user-2')).toEqual(user2Prefs);
    });
  });

  describe('clearColumnVisibility', () => {
    it('should remove preferences from localStorage', () => {
      saveColumnVisibility(testUserId, testPreferences);
      
      const key = `hr_masterdata_column_visibility_${testUserId}`;
      expect(localStorageMock.getItem(key)).not.toBeNull();
      
      clearColumnVisibility(testUserId);
      
      expect(localStorageMock.getItem(key)).toBeNull();
    });

    it('should not throw error if preferences do not exist', () => {
      expect(() => clearColumnVisibility('non-existent-user')).not.toThrow();
    });

    it('should only clear preferences for specified user', () => {
      saveColumnVisibility('user-1', { 'column-1': true });
      saveColumnVisibility('user-2', { 'column-1': false });
      
      clearColumnVisibility('user-1');
      
      expect(loadColumnVisibility('user-1')).toBeNull();
      expect(loadColumnVisibility('user-2')).toEqual({ 'column-1': false });
    });
  });

  describe('edge cases', () => {
    it('should handle user IDs with special characters', () => {
      const specialUserId = 'user-!@#$%^&*()';
      const prefs = { 'column-1': true };
      
      saveColumnVisibility(specialUserId, prefs);
      const loaded = loadColumnVisibility(specialUserId);
      
      expect(loaded).toEqual(prefs);
    });

    it('should handle moderately large preference objects', () => {
      const largePrefs: Record<string, boolean> = {};
      for (let i = 0; i < 100; i++) {
        largePrefs[`column-${i}`] = i % 2 === 0;
      }
      
      saveColumnVisibility(testUserId, largePrefs);
      const loaded = loadColumnVisibility(testUserId);
      
      expect(loaded).toEqual(largePrefs);
    });
  });
});
