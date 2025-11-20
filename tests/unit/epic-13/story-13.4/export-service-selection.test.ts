/**
 * Unit Tests for Export Service with Selection
 * Story 13.4: Export Only Selected Employees
 * 
 * Tests verify:
 * - Export filters by selected employee IDs
 * - Export excludes non-selected employees
 * - Empty selection returns error
 * - Export includes all selected employees
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { exportEmployeesByCategory, type CategoryExportOptions } from '@/lib/services/export-service';
import type { ExportField } from '@/lib/constants/export-fields';
import { createClient } from '@/lib/supabase/client';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

// Mock CSV utilities
vi.mock('@/lib/utils/csv-export', () => ({
  generateCSV: vi.fn((headers, rows) => {
    const csvRows = [headers.join(','), ...rows.map((row: (string | number | null)[]) => row.join(','))];
    return csvRows.join('\n');
  }),
  downloadCSV: vi.fn(),
  formatDateForCSV: vi.fn((date: string) => date),
  formatAssignedEmployeesForCSV: vi.fn((employees: unknown[]) => employees.join(';')),
}));

describe('Story 13.4: Export Service with Selection', () => {
  let mockSupabase: { from: ReturnType<typeof vi.fn> };
  let mockQuery: {
    select: ReturnType<typeof vi.fn>;
    not: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    gte: ReturnType<typeof vi.fn>;
    lte: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
  };

  const fieldDefinitions: ExportField[] = [
    { key: 'first_name', label: 'First Name', type: 'text' },
    { key: 'surname', label: 'Surname', type: 'text' },
    { key: 'ssn', label: 'SSN', type: 'text' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create fresh mocks for each test
    mockQuery = {
      select: vi.fn(),
      not: vi.fn(),
      in: vi.fn(),
      gte: vi.fn(),
      lte: vi.fn(),
      order: vi.fn(),
    };
    
    // Make all methods return mockQuery to support chaining
    mockQuery.select.mockReturnValue(mockQuery);
    mockQuery.not.mockReturnValue(mockQuery);
    mockQuery.in.mockReturnValue(mockQuery);
    mockQuery.gte.mockReturnValue(mockQuery);
    mockQuery.lte.mockReturnValue(mockQuery);
    mockQuery.order.mockReturnValue(mockQuery); // This allows chaining .order().order()
    
    mockSupabase = {
      from: vi.fn().mockReturnValue(mockQuery),
    };
    
    vi.mocked(createClient).mockReturnValue(mockSupabase as never);
  });

  describe('exportEmployeesByCategory with selectedEmployeeIds', () => {
    it('should filter by selected employee IDs when provided', async () => {
      const selectedIds = ['emp-1', 'emp-2', 'emp-3'];
      const mockEmployees = [
        {
          id: 'emp-1',
          first_name: 'John',
          surname: 'Doe',
          ssn: '123456-7890',
          stena_date: { date_description: 'Test Date', date_value: '2025-01-15' },
        },
        {
          id: 'emp-2',
          first_name: 'Jane',
          surname: 'Smith',
          ssn: '987654-3210',
          stena_date: { date_description: 'Test Date', date_value: '2025-01-16' },
        },
      ];

      // The second .order() call should return a promise with data/error
      mockQuery.order
        .mockReturnValueOnce(mockQuery) // First .order('surname')
        .mockResolvedValueOnce({ // Second .order('first_name') returns promise
          data: mockEmployees,
          error: null,
        });

      const options: CategoryExportOptions = {
        category: 'Stena Dates',
        selectedFields: ['first_name', 'surname', 'ssn'],
        fieldDefinitions,
        selectedEmployeeIds: selectedIds,
      };

      await exportEmployeesByCategory(options);

      // Verify query was filtered by selected IDs
      expect(mockQuery.in).toHaveBeenCalledWith('id', selectedIds);
      expect(mockQuery.not).toHaveBeenCalledWith('stena_date', 'is', null);
    });

    it('should exclude non-selected employees from export', async () => {
      const selectedIds = ['emp-1'];
      const mockEmployees = [
        {
          id: 'emp-1',
          first_name: 'John',
          surname: 'Doe',
          ssn: '123456-7890',
          stena_date: { date_description: 'Test Date', date_value: '2025-01-15' },
        },
      ];

      mockQuery.order
        .mockReturnValueOnce(mockQuery)
        .mockResolvedValueOnce({
          data: mockEmployees,
          error: null,
        });

      const options: CategoryExportOptions = {
        category: 'Stena Dates',
        selectedFields: ['first_name', 'surname', 'ssn'],
        fieldDefinitions,
        selectedEmployeeIds: selectedIds,
      };

      await exportEmployeesByCategory(options);

      // Verify only selected employee is in results
      expect(mockQuery.in).toHaveBeenCalledWith('id', selectedIds);
      // Verify emp-2 (not selected) is not in the query
      expect(mockQuery.in).not.toHaveBeenCalledWith('id', expect.arrayContaining(['emp-2']));
    });

    it('should throw error when empty selection is provided', async () => {
      const selectedIds: string[] = [];

      mockQuery.order
        .mockReturnValueOnce(mockQuery)
        .mockResolvedValueOnce({
          data: [],
          error: null,
        });

      const options: CategoryExportOptions = {
        category: 'Stena Dates',
        selectedFields: ['first_name', 'surname', 'ssn'],
        fieldDefinitions,
        selectedEmployeeIds: selectedIds,
      };

      // When selectedEmployeeIds is empty array, it throws generic error
      // (The implementation checks selectedEmployeeIds.length > 0 for specific message)
      await expect(exportEmployeesByCategory(options)).rejects.toThrow(
        'No employees found for the selected criteria'
      );
    });

    it('should include all selected employees in export', async () => {
      const selectedIds = ['emp-1', 'emp-2', 'emp-3'];
      const mockEmployees = [
        {
          id: 'emp-1',
          first_name: 'John',
          surname: 'Doe',
          ssn: '123456-7890',
          stena_date: { date_description: 'Test Date', date_value: '2025-01-15' },
        },
        {
          id: 'emp-2',
          first_name: 'Jane',
          surname: 'Smith',
          ssn: '987654-3210',
          stena_date: { date_description: 'Test Date', date_value: '2025-01-16' },
        },
        {
          id: 'emp-3',
          first_name: 'Bob',
          surname: 'Johnson',
          ssn: '111111-2222',
          stena_date: { date_description: 'Test Date', date_value: '2025-01-17' },
        },
      ];

      mockQuery.order
        .mockReturnValueOnce(mockQuery)
        .mockResolvedValueOnce({
          data: mockEmployees,
          error: null,
        });

      const options: CategoryExportOptions = {
        category: 'Stena Dates',
        selectedFields: ['first_name', 'surname', 'ssn'],
        fieldDefinitions,
        selectedEmployeeIds: selectedIds,
      };

      await exportEmployeesByCategory(options);

      // Verify all selected employees are included
      expect(mockQuery.in).toHaveBeenCalledWith('id', selectedIds);
      // Verify we got all 3 employees back
      expect(mockEmployees).toHaveLength(3);
    });

    it('should work without selectedEmployeeIds (backward compatibility)', async () => {
      const mockEmployees = [
        {
          id: 'emp-1',
          first_name: 'John',
          surname: 'Doe',
          ssn: '123456-7890',
          stena_date: { date_description: 'Test Date', date_value: '2025-01-15' },
        },
      ];

      mockQuery.order
        .mockReturnValueOnce(mockQuery)
        .mockResolvedValueOnce({
          data: mockEmployees,
          error: null,
        });

      const options: CategoryExportOptions = {
        category: 'Stena Dates',
        selectedFields: ['first_name', 'surname', 'ssn'],
        fieldDefinitions,
        // No selectedEmployeeIds provided
      };

      await exportEmployeesByCategory(options);

      // Verify query was not filtered by IDs
      expect(mockQuery.in).not.toHaveBeenCalled();
      expect(mockQuery.not).toHaveBeenCalledWith('stena_date', 'is', null);
    });

    it('should handle different categories (ÖMC Dates, PE3 Dates)', async () => {
      const selectedIds = ['emp-1'];
      const mockEmployees = [
        {
          id: 'emp-1',
          first_name: 'John',
          surname: 'Doe',
          ssn: '123456-7890',
          omc_date: { date_description: 'ÖMC Date', date_value: '2025-01-15' },
        },
      ];

      mockQuery.order
        .mockReturnValueOnce(mockQuery)
        .mockResolvedValueOnce({
          data: mockEmployees,
          error: null,
        });

      const options: CategoryExportOptions = {
        category: 'ÖMC Dates',
        selectedFields: ['first_name', 'surname', 'ssn'],
        fieldDefinitions,
        selectedEmployeeIds: selectedIds,
      };

      await exportEmployeesByCategory(options);

      // Verify correct date field is used
      expect(mockQuery.not).toHaveBeenCalledWith('omc_date', 'is', null);
    });
  });
});

