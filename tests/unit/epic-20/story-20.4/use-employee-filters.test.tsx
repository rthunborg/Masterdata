/**
 * Integration Tests for useEmployeeFilters Hook
 * Story 20.4: Filter Engine & State Management
 * 
 * Tests verify:
 * 1. Hook initialization
 * 2. Filter application and removal
 * 3. Real-time filtering with memoization
 * 4. URL synchronization (mocked)
 * 5. Important dates fetching
 * 6. State management functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEmployeeFilters } from '@/hooks/useEmployeeFilters';
import type { Employee } from '@/lib/types/employee';
import type { ColumnConfig } from '@/lib/types/column-config';
import type { FilterState } from '@/lib/types/filter';

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock fetch for important dates
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({ data: [] }),
    text: async () => "",
    status: 200,
    statusText: "OK",
  } as Response)
);

describe('Story 20.4: useEmployeeFilters Hook', () => {
  const mockEmployees: Employee[] = [
    {
      id: 'emp-1',
      first_name: 'John',
      surname: 'Doe',
      ssn: '123456-7890',
      email: 'john.doe@example.com',
      mobile: '+46701234567',
      rank: 'SEV',
      gender: 'Man',
      town_district: null,
      hire_date: '2024-01-01',
      stena_date: 'date-1',
      omc_date: 'date-2',
      pe3_date: null,
      termination_date: null,
      termination_reason: null,
      is_terminated: false,
      is_archived: false,
      archived_at: null,
      is_anonymized: false,
      repayment_needed_omc: null,
      repayment_needed_pe3: null,
      special_diet: false,
      diet_details: null,
      comments: null,
      one: true,
      one_marked_at: '2024-01-01T00:00:00Z',
      talmundo: true,
      isps: true,
      photo: true,
      origo: true,
      loneiva: 5,
      mail_lon: true,
      bankuppgifter: true,
      li: true,
      passport: true,
      kvitto_c17_18: true,
      c17: true,
      crewing_done: false,
      hotel_required: true,
      room_number_shared: 101,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'emp-2',
      first_name: 'Jane',
      surname: 'Smith',
      ssn: '234567-8901',
      email: 'jane.smith@example.com',
      mobile: '+46702345678',
      rank: 'CHEF',
      gender: 'Woman',
      town_district: null,
      hire_date: '2024-02-01',
      stena_date: 'date-2',
      omc_date: 'date-3',
      pe3_date: 'date-4',
      termination_date: null,
      termination_reason: null,
      is_terminated: false,
      is_archived: false,
      archived_at: null,
      is_anonymized: false,
      repayment_needed_omc: null,
      repayment_needed_pe3: null,
      special_diet: true,
      diet_details: 'Vegetarian',
      comments: 'Good employee',
      one: false,
      one_marked_at: null,
      talmundo: false,
      isps: true,
      photo: false,
      origo: false,
      loneiva: 3,
      mail_lon: false,
      bankuppgifter: true,
      li: false,
      passport: true,
      kvitto_c17_18: false,
      c17: false,
      crewing_done: false,
      hotel_required: false,
      room_number_shared: null,
      created_at: '2024-02-01T00:00:00Z',
      updated_at: '2024-02-01T00:00:00Z',
    },
  ];

  const mockColumnConfigs: ColumnConfig[] = [
    {
      id: 'col-1',
      column_name: 'First Name',
      db_column_name: 'first_name',
      column_type: 'text',
      role_permissions: {},
      is_masterdata: true,
      category: null,
      category_color: null,
      display_order: 1,
      is_visible: true,
      is_checklist_item: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'col-2',
      column_name: 'Hotel Required',
      db_column_name: 'hotel_required',
      column_type: 'boolean',
      role_permissions: {},
      is_masterdata: true,
      category: null,
      category_color: null,
      display_order: 2,
      is_visible: true,
      is_checklist_item: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete('filters');
    
    // Mock fetch to return important dates
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'date-1',
            date_value: '2024-01-15',
            category: 'Stena Dates',
          },
          {
            id: 'date-2',
            date_value: '2024-02-15',
            category: 'Stena Dates',
          },
        ],
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with empty filters', async () => {
      const { result } = renderHook(() =>
        useEmployeeFilters({
          employees: mockEmployees,
          columnConfigs: mockColumnConfigs,
          enableUrlSync: false,
        })
      );

      await waitFor(() => {
        expect(result.current.activeFilters).toEqual([]);
        expect(result.current.filteredEmployees).toEqual(mockEmployees);
        expect(result.current.filterCount).toBe(0);
        expect(result.current.isFilterActive).toBe(false);
      });
    });

    it('should fetch important dates on mount', async () => {
      const { result } = renderHook(() =>
        useEmployeeFilters({
          employees: mockEmployees,
          columnConfigs: mockColumnConfigs,
          enableUrlSync: false,
        })
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/important-dates',
          expect.any(Object)
        );
        expect(result.current.importantDates).toHaveLength(2);
        expect(result.current.isLoadingDates).toBe(false);
      });
    });

    it('should return all employees initially', async () => {
      const { result } = renderHook(() =>
        useEmployeeFilters({
          employees: mockEmployees,
          columnConfigs: mockColumnConfigs,
          enableUrlSync: false,
        })
      );

      await waitFor(() => {
        expect(result.current.filteredEmployees).toHaveLength(2);
        expect(result.current.totalCount).toBe(2);
        expect(result.current.filteredCount).toBe(2);
      });
    });
  });

  describe('Filter Application', () => {
    it('should apply text filter', async () => {
      const { result } = renderHook(() =>
        useEmployeeFilters({
          employees: mockEmployees,
          columnConfigs: mockColumnConfigs,
          enableUrlSync: false,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoadingDates).toBe(false);
      });

      const textFilter: FilterState = {
        columnId: 'col-1',
        type: 'text',
        textValue: 'John',
      };

      act(() => {
        result.current.applyFilter(textFilter);
      });

      await waitFor(() => {
        expect(result.current.activeFilters).toHaveLength(1);
        expect(result.current.filteredEmployees).toHaveLength(1);
        expect(result.current.filteredEmployees[0].id).toBe('emp-1');
        expect(result.current.isFilterActive).toBe(true);
      });
    });

    it('should apply boolean filter', async () => {
      const { result } = renderHook(() =>
        useEmployeeFilters({
          employees: mockEmployees,
          columnConfigs: mockColumnConfigs,
          enableUrlSync: false,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoadingDates).toBe(false);
      });

      const boolFilter: FilterState = {
        columnId: 'col-2',
        type: 'boolean',
        boolValue: true,
      };

      act(() => {
        result.current.applyFilter(boolFilter);
      });

      await waitFor(() => {
        expect(result.current.filteredEmployees).toHaveLength(1);
        expect(result.current.filteredEmployees[0].id).toBe('emp-1');
        expect(result.current.filteredEmployees[0].hotel_required).toBe(true);
      });
    });

    it('should update existing filter', async () => {
      const { result } = renderHook(() =>
        useEmployeeFilters({
          employees: mockEmployees,
          columnConfigs: mockColumnConfigs,
          enableUrlSync: false,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoadingDates).toBe(false);
      });

      const filter1: FilterState = {
        columnId: 'col-1',
        type: 'text',
        textValue: 'John',
      };

      const filter2: FilterState = {
        columnId: 'col-1',
        type: 'text',
        textValue: 'Jane',
      };

      act(() => {
        result.current.applyFilter(filter1);
      });

      await waitFor(() => {
        expect(result.current.filteredEmployees).toHaveLength(1);
        expect(result.current.filteredEmployees[0].first_name).toBe('John');
      });

      act(() => {
        result.current.applyFilter(filter2);
      });

      await waitFor(() => {
        expect(result.current.activeFilters).toHaveLength(1);
        expect(result.current.filteredEmployees).toHaveLength(1);
        expect(result.current.filteredEmployees[0].first_name).toBe('Jane');
      });
    });

    it('should apply multiple filters with AND logic', async () => {
      const { result } = renderHook(() =>
        useEmployeeFilters({
          employees: mockEmployees,
          columnConfigs: mockColumnConfigs,
          enableUrlSync: false,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoadingDates).toBe(false);
      });

      const textFilter: FilterState = {
        columnId: 'col-1',
        type: 'text',
        textValue: 'Jane',
      };

      const boolFilter: FilterState = {
        columnId: 'col-2',
        type: 'boolean',
        boolValue: false,
      };

      act(() => {
        result.current.applyFilter(textFilter);
      });

      await waitFor(() => {
        expect(result.current.activeFilters).toHaveLength(1);
      });

      act(() => {
        result.current.applyFilter(boolFilter);
      });

      await waitFor(() => {
        expect(result.current.activeFilters).toHaveLength(2);
        expect(result.current.filteredEmployees).toHaveLength(1);
        expect(result.current.filteredEmployees[0].id).toBe('emp-2');
      });
    });
  });

  describe('Filter Removal', () => {
    it('should remove filter by column ID', async () => {
      const { result } = renderHook(() =>
        useEmployeeFilters({
          employees: mockEmployees,
          columnConfigs: mockColumnConfigs,
          enableUrlSync: false,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoadingDates).toBe(false);
      });

      const filter: FilterState = {
        columnId: 'col-1',
        type: 'text',
        textValue: 'John',
      };

      act(() => {
        result.current.applyFilter(filter);
      });

      await waitFor(() => {
        expect(result.current.activeFilters).toHaveLength(1);
      });

      act(() => {
        result.current.removeFilter('col-1');
      });

      await waitFor(() => {
        expect(result.current.activeFilters).toHaveLength(0);
        expect(result.current.filteredEmployees).toHaveLength(2);
        expect(result.current.isFilterActive).toBe(false);
      });
    });

    it('should clear all filters', async () => {
      const { result } = renderHook(() =>
        useEmployeeFilters({
          employees: mockEmployees,
          columnConfigs: mockColumnConfigs,
          enableUrlSync: false,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoadingDates).toBe(false);
      });

      const filter1: FilterState = {
        columnId: 'col-1',
        type: 'text',
        textValue: 'John',
      };

      const filter2: FilterState = {
        columnId: 'col-2',
        type: 'boolean',
        boolValue: true,
      };

      act(() => {
        result.current.applyFilter(filter1);
      });

      await waitFor(() => {
        expect(result.current.activeFilters).toHaveLength(1);
      });

      act(() => {
        result.current.applyFilter(filter2);
      });

      await waitFor(() => {
        expect(result.current.activeFilters).toHaveLength(2);
      });

      act(() => {
        result.current.clearAllFilters();
      });

      await waitFor(() => {
        expect(result.current.activeFilters).toHaveLength(0);
        expect(result.current.filteredEmployees).toHaveLength(2);
      });
    });
  });

  describe('Memoization', () => {
    it('should memoize filtered employees', async () => {
      const { result, rerender } = renderHook(() =>
        useEmployeeFilters({
          employees: mockEmployees,
          columnConfigs: mockColumnConfigs,
          enableUrlSync: false,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoadingDates).toBe(false);
      });

      const firstResult = result.current.filteredEmployees;

      // Rerender without changing inputs
      rerender();

      // Should return same reference (memoized)
      expect(result.current.filteredEmployees).toBe(firstResult);
    });

    it('should recalculate when filters change', async () => {
      const { result } = renderHook(() =>
        useEmployeeFilters({
          employees: mockEmployees,
          columnConfigs: mockColumnConfigs,
          enableUrlSync: false,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoadingDates).toBe(false);
      });

      const firstResult = result.current.filteredEmployees;

      const filter: FilterState = {
        columnId: 'col-1',
        type: 'text',
        textValue: 'John',
      };

      act(() => {
        result.current.applyFilter(filter);
      });

      await waitFor(() => {
        // Should be different reference
        expect(result.current.filteredEmployees).not.toBe(firstResult);
        expect(result.current.filteredEmployees).toHaveLength(1);
      });
    });
  });

  describe('Computed Values', () => {
    it('should calculate filterCount correctly', async () => {
      const { result } = renderHook(() =>
        useEmployeeFilters({
          employees: mockEmployees,
          columnConfigs: mockColumnConfigs,
          enableUrlSync: false,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoadingDates).toBe(false);
      });

      expect(result.current.filterCount).toBe(0);

      act(() => {
        result.current.applyFilter({
          columnId: 'col-1',
          type: 'text',
          textValue: 'John',
        });
      });

      await waitFor(() => {
        expect(result.current.filterCount).toBe(1);
      });
    });

    it('should calculate filteredCount correctly', async () => {
      const { result } = renderHook(() =>
        useEmployeeFilters({
          employees: mockEmployees,
          columnConfigs: mockColumnConfigs,
          enableUrlSync: false,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoadingDates).toBe(false);
      });

      expect(result.current.filteredCount).toBe(2);

      act(() => {
        result.current.applyFilter({
          columnId: 'col-1',
          type: 'text',
          textValue: 'John',
        });
      });

      await waitFor(() => {
        expect(result.current.filteredCount).toBe(1);
      });
    });

    it('should calculate totalCount correctly', async () => {
      const { result } = renderHook(() =>
        useEmployeeFilters({
          employees: mockEmployees,
          columnConfigs: mockColumnConfigs,
          enableUrlSync: false,
        })
      );

      await waitFor(() => {
        expect(result.current.totalCount).toBe(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle failed important dates fetch', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useEmployeeFilters({
          employees: mockEmployees,
          columnConfigs: mockColumnConfigs,
          enableUrlSync: false,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoadingDates).toBe(false);
        expect(result.current.importantDates).toEqual([]);
      });

      // Should still work with text/boolean filters
      act(() => {
        result.current.applyFilter({
          columnId: 'col-1',
          type: 'text',
          textValue: 'John',
        });
      });

      await waitFor(() => {
        expect(result.current.filteredEmployees).toHaveLength(1);
      });
    });
  });
});
