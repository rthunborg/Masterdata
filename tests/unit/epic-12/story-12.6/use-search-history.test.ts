/**
 * Unit Tests: useSearchHistory Hook
 * Story 12.6: Mobile Quick Actions and Shortcuts - AC 5
 * 
 * Tests that search history is stored and retrieved correctly from localStorage.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchHistory } from '@/hooks/use-search-history';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useSearchHistory (Story 12.6)', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should initialize with empty history when localStorage is empty', () => {
    const { result } = renderHook(() => useSearchHistory());

    expect(result.current.history).toEqual([]);
  });

  it('should load existing history from localStorage', () => {
    const existingHistory = ['search1', 'search2', 'search3'];
    localStorageMock.setItem(
      'employee_search_history',
      JSON.stringify(existingHistory)
    );

    const { result } = renderHook(() => useSearchHistory());

    expect(result.current.history).toEqual(existingHistory);
  });

  it('should add search term to history', () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.addToHistory('test search');
    });

    expect(result.current.history).toEqual(['test search']);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'employee_search_history',
      JSON.stringify(['test search'])
    );
  });

  it('should not add empty search terms', () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.addToHistory('');
    });

    act(() => {
      result.current.addToHistory('   ');
    });

    expect(result.current.history).toEqual([]);
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('should move duplicate search to front', () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.addToHistory('search1');
    });

    act(() => {
      result.current.addToHistory('search2');
    });

    act(() => {
      result.current.addToHistory('search1'); // Duplicate
    });

    expect(result.current.history).toEqual(['search1', 'search2']);
  });

  it('should limit history to 5 items (max)', () => {
    const { result } = renderHook(() => useSearchHistory());

    // Add 6 items
    for (let i = 1; i <= 6; i++) {
      act(() => {
        result.current.addToHistory(`search${i}`);
      });
    }

    expect(result.current.history).toHaveLength(5);
    expect(result.current.history).toEqual([
      'search6',
      'search5',
      'search4',
      'search3',
      'search2',
    ]);
    // search1 should be removed (oldest)
  });

  it('should clear history', () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.addToHistory('search1');
    });

    act(() => {
      result.current.addToHistory('search2');
    });

    expect(result.current.history).toHaveLength(2);

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.history).toEqual([]);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      'employee_search_history'
    );
  });

  it('should handle corrupted localStorage data gracefully', () => {
    localStorageMock.setItem('employee_search_history', 'invalid json');

    const { result } = renderHook(() => useSearchHistory());

    // Should default to empty array
    expect(result.current.history).toEqual([]);
  });

  it('should handle localStorage errors gracefully', () => {
    const { result } = renderHook(() => useSearchHistory());

    // Mock setItem to throw error
    localStorageMock.setItem = vi.fn(() => {
      throw new Error('Storage quota exceeded');
    });

    // Should not crash
    act(() => {
      result.current.addToHistory('test');
    });

    // History should still update in memory even if localStorage fails
    expect(result.current.history).toEqual(['test']);
  });
});

