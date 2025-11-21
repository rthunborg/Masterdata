/**
 * Unit Tests for Export Service Functions
 * Story 13.7: Write Comprehensive Export Tests
 * 
 * NOTE: These tests cover the `exportEmployeesByCategory` function used for
 * category-based exports (Stena Dates, ÖMC Dates, PE3 Dates). This is separate
 * from the general export API endpoint (/api/employees/export) which uses
 * `employeeRepository.findAll()` directly. Integration tests cover the API endpoints.
 * 
 * Tests verify:
 * - Export filters by selected employee IDs
 * - Export includes only selected fields
 * - Export handles empty selection gracefully
 * - Export handles invalid field names
 * - CSV generation produces correct format
 * - Field ordering is maintained
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

describe('Story 13.7: Export Service Functions', () => {
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
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'hire_date', label: 'Hire Date', type: 'date' },
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
    mockQuery.order.mockReturnValue(mockQuery);
    
    mockSupabase = {
      from: vi.fn().mockReturnValue(mockQuery),
    };
    
    vi.mocked(createClient).mockReturnValue(mockSupabase as never);
  });

  describe('Export filters by selected employee IDs', () => {
    it('should filter by selected employee IDs when provided', async () => {
      const selectedIds = ['emp-1', 'emp-2'];
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

      expect(mockQuery.in).toHaveBeenCalledWith('id', selectedIds);
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

      expect(mockQuery.in).toHaveBeenCalledWith('id', selectedIds);
      expect(mockQuery.in).not.toHaveBeenCalledWith('id', expect.arrayContaining(['emp-2']));
    });
  });

  describe('Export includes only selected fields', () => {
    it('should include only selected fields in export', async () => {
      const selectedFields = ['first_name', 'surname'];
      const mockEmployees = [
        {
          id: 'emp-1',
          first_name: 'John',
          surname: 'Doe',
          ssn: '123456-7890',
          email: 'john@example.com',
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
        selectedFields,
        fieldDefinitions,
        selectedEmployeeIds: ['emp-1'],
      };

      await exportEmployeesByCategory(options);

      // Verify select clause includes only selected fields
      const selectCall = mockQuery.select.mock.calls[0][0];
      expect(selectCall).toContain('first_name');
      expect(selectCall).toContain('surname');
      expect(selectCall).not.toContain('email');
    });

    it('should maintain field order in export', async () => {
      const selectedFields = ['surname', 'first_name', 'ssn'];
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
        selectedFields,
        fieldDefinitions,
        selectedEmployeeIds: ['emp-1'],
      };

      await exportEmployeesByCategory(options);

      // Verify field order is maintained
      const selectCall = mockQuery.select.mock.calls[0][0];
      const fieldIndexes = selectedFields.map(field => selectCall.indexOf(field));
      expect(fieldIndexes[0]).toBeLessThan(fieldIndexes[1]);
      expect(fieldIndexes[1]).toBeLessThan(fieldIndexes[2]);
    });
  });

  describe('Export handles empty selection gracefully', () => {
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

      await expect(exportEmployeesByCategory(options)).rejects.toThrow(
        'No employees found for the selected criteria'
      );
    });

    it('should handle case where no employees match selected IDs', async () => {
      const selectedIds = ['emp-999'];

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

      await expect(exportEmployeesByCategory(options)).rejects.toThrow(
        'No selected employees found for the selected criteria'
      );
    });
  });

  describe('Export handles invalid field names', () => {
    it('should handle invalid field names gracefully', async () => {
      const selectedFields = ['first_name', 'invalid_field', 'surname'];
      const mockEmployees = [
        {
          id: 'emp-1',
          first_name: 'John',
          surname: 'Doe',
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
        selectedFields,
        fieldDefinitions,
        selectedEmployeeIds: ['emp-1'],
      };

      // Should not throw error, but invalid field should be handled
      await expect(exportEmployeesByCategory(options)).resolves.not.toThrow();
    });
  });

  describe('CSV generation produces correct format', () => {
    it('should generate CSV with correct headers', async () => {
      const selectedFields = ['first_name', 'surname'];
      const mockEmployees = [
        {
          id: 'emp-1',
          first_name: 'John',
          surname: 'Doe',
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
        selectedFields,
        fieldDefinitions,
        selectedEmployeeIds: ['emp-1'],
      };

      await exportEmployeesByCategory(options);

      // Verify CSV generation was called
      const { generateCSV } = await import('@/lib/utils/csv-export');
      expect(generateCSV).toHaveBeenCalled();
    });

    it('should generate CSV with correct data rows', async () => {
      const selectedFields = ['first_name', 'surname'];
      const mockEmployees = [
        {
          id: 'emp-1',
          first_name: 'John',
          surname: 'Doe',
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
        selectedFields,
        fieldDefinitions,
        selectedEmployeeIds: ['emp-1'],
      };

      await exportEmployeesByCategory(options);

      // Verify CSV contains employee data
      const { generateCSV } = await import('@/lib/utils/csv-export');
      const csvCall = vi.mocked(generateCSV).mock.calls[0];
      const headers = csvCall[0];
      const rows = csvCall[1];

      expect(headers).toContain('First Name');
      expect(headers).toContain('Surname');
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  describe('Field ordering is maintained', () => {
    it('should maintain field order from selectedFields array', async () => {
      const selectedFields = ['ssn', 'first_name', 'surname', 'email'];
      const mockEmployees = [
        {
          id: 'emp-1',
          first_name: 'John',
          surname: 'Doe',
          ssn: '123456-7890',
          email: 'john@example.com',
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
        selectedFields,
        fieldDefinitions,
        selectedEmployeeIds: ['emp-1'],
      };

      await exportEmployeesByCategory(options);

      // Verify field order in select clause
      const selectCall = mockQuery.select.mock.calls[0][0];
      const ssnIndex = selectCall.indexOf('ssn');
      const firstNameIndex = selectCall.indexOf('first_name');
      const surnameIndex = selectCall.indexOf('surname');
      const emailIndex = selectCall.indexOf('email');

      expect(ssnIndex).toBeLessThan(firstNameIndex);
      expect(firstNameIndex).toBeLessThan(surnameIndex);
      expect(surnameIndex).toBeLessThan(emailIndex);
    });
  });
});

