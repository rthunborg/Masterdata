'use client';

import { useState, useEffect, useCallback } from 'react';

const SEARCH_HISTORY_KEY = 'employee_search_history';
const MAX_HISTORY_ITEMS = 5;

/**
 * Hook for managing search history in localStorage
 * Story 12.6: AC 5 - Search history (last 5 searches)
 */
export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        setHistory(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.warn('Failed to load search history:', error);
      setHistory([]);
    }
  }, []);

  // Save search term to history
  const addToHistory = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return;

    setHistory((prev) => {
      // Remove duplicates and add to front
      const filtered = prev.filter((item) => item !== searchTerm);
      const updated = [searchTerm, ...filtered].slice(0, MAX_HISTORY_ITEMS);

      // Save to localStorage
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn('Failed to save search history:', error);
      }

      return updated;
    });
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (error) {
      console.warn('Failed to clear search history:', error);
    }
  }, []);

  return {
    history,
    addToHistory,
    clearHistory,
  };
}

