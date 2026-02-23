/**
 * Unit Tests for Filter Engine
 * Story 20.4: Filter Engine & State Management
 * 
 * Tests verify:
 * 1. Text filtering (case-insensitive contains)
 * 2. Boolean filtering (exact match)
 * 3. Date filtering (range + specific dates with OR logic)
 * 4. Multiple filters combine with AND logic
 * 5. Null/undefined value handling
 * 6. Empty filter array returns all employees
 * 7. Helper functions (getFilteredCount, hasActiveFilters)
 */

import { describe, it, expect } from 'vitest';
import {
  applyFilters,
  getFilteredCount,
  hasActiveFilters,
} from '@/lib/filters/filterEngine';
import type { Employee } from '@/lib/types/employee';
import type { FilterState } from '@/lib/types/filter';
import type { ImportantDate } from '@/lib/types/important-date';
import type { ColumnConfig } from '@/lib/types/column-config';

describe('Story 20.4: Filter Engine', () => {
  // Mock data
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
    {
      id: 'emp-3',
      first_name: 'Bob',
      surname: 'Johnson',
      ssn: '345678-9012',
      email: null,
      mobile: null,
      rank: null,
      gender: null,
      town_district: null,
      hire_date: '2024-03-01',
      stena_date: null,
      omc_date: null,
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
      one: false,
      one_marked_at: null,
      talmundo: false,
      isps: false,
      photo: false,
      origo: false,
      loneiva: null,
      mail_lon: false,
      bankuppgifter: false,
      li: false,
      passport: false,
      kvitto_c17_18: false,
      c17: false,
      crewing_done: false,
      hotel_required: false,
      room_number_shared: null,
      created_at: '2024-03-01T00:00:00Z',
      updated_at: '2024-03-01T00:00:00Z',
    },
  ];

  const mockImportantDates: ImportantDate[] = [
    {
      id: 'date-1',
      week_number: 1,
      year: 2024,
      category: 'Stena Dates',
      date_description: 'January Training',
      date_value: '2024-01-15',
      time_value: null,
      deadline_submit: null,
      deadline_cancel: null,
      notes: null,
      is_active: true,
      max_spots: 20,
      remaining_spots: 10,
      assigned_employees: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'date-2',
      week_number: 5,
      year: 2024,
      category: 'Stena Dates',
      date_description: 'February Training',
      date_value: '2024-02-15',
      time_value: null,
      deadline_submit: null,
      deadline_cancel: null,
      notes: null,
      is_active: true,
      max_spots: 20,
      remaining_spots: 10,
      assigned_employees: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'date-3',
      week_number: 10,
      year: 2024,
      category: 'ÖMC Dates',
      date_description: 'March ÖMC',
      date_value: '2024-03-15',
      time_value: null,
      deadline_submit: null,
      deadline_cancel: null,
      notes: null,
      is_active: true,
      max_spots: 15,
      remaining_spots: 5,
      assigned_employees: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'date-4',
      week_number: 15,
      year: 2024,
      category: 'PE3 Dates',
      date_description: 'April PE3',
      date_value: '2024-04-15',
      time_value: '09:00',
      deadline_submit: null,
      deadline_cancel: null,
      notes: null,
      is_active: true,
      max_spots: 10,
      remaining_spots: 3,
      assigned_employees: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
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
      column_name: 'Surname',
      db_column_name: 'surname',
      column_type: 'text',
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
    {
      id: 'col-3',
      column_name: 'Hotel Required',
      db_column_name: 'hotel_required',
      column_type: 'boolean',
      role_permissions: {},
      is_masterdata: true,
      category: null,
      category_color: null,
      display_order: 3,
      is_visible: true,
      is_checklist_item: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'col-4',
      column_name: 'OMC Date',
      db_column_name: 'omc_date',
      column_type: 'date',
      role_permissions: {},
      is_masterdata: true,
      category: null,
      category_color: null,
      display_order: 4,
      is_visible: true,
      is_checklist_item: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  describe('applyFilters', () => {
    it('should return all employees when no filters applied', () => {
      const result = applyFilters(mockEmployees, [], mockImportantDates, mockColumnConfigs);
      expect(result).toEqual(mockEmployees);
      expect(result).toHaveLength(3);
    });

    it('should filter by text (case-insensitive contains)', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-2', // Surname column
          type: 'text',
          textValue: 'o', // Matches Doe, Johnson, and contains 'o'
        },
      ];

      const result = applyFilters(mockEmployees, filters, mockImportantDates, mockColumnConfigs);
      expect(result).toHaveLength(2); // Doe and Johnson
      expect(result[0].id).toBe('emp-1');
      expect(result[1].id).toBe('emp-3');
    });

    it('should filter by text with exact match', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-1',
          type: 'text',
          textValue: 'Jane',
        },
      ];

      const result = applyFilters(mockEmployees, filters, mockImportantDates, mockColumnConfigs);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('emp-2');
    });

    it('should filter by boolean (true)', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-3',
          type: 'boolean',
          boolValue: true,
        },
      ];

      const result = applyFilters(mockEmployees, filters, mockImportantDates, mockColumnConfigs);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('emp-1');
      expect(result[0].hotel_required).toBe(true);
    });

    it('should filter by boolean (false)', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-3',
          type: 'boolean',
          boolValue: false,
        },
      ];

      const result = applyFilters(mockEmployees, filters, mockImportantDates, mockColumnConfigs);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('emp-2');
      expect(result[1].id).toBe('emp-3');
    });

    it('should not filter when boolean is null (no selection)', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-3',
          type: 'boolean',
          boolValue: null,
        },
      ];

      const result = applyFilters(mockEmployees, filters, mockImportantDates, mockColumnConfigs);
      expect(result).toHaveLength(3); // All employees
    });

    it('should include null boolean values when filtering for false', () => {
      const employeesWithNull = [
        ...mockEmployees,
        {
          ...mockEmployees[2],
          id: 'emp-4',
          first_name: 'Null Hotel',
          hotel_required: null as unknown as boolean,
        },
      ];

      const filters: FilterState[] = [
        {
          columnId: 'col-3',
          type: 'boolean',
          boolValue: false,
        },
      ];

      const result = applyFilters(employeesWithNull, filters, mockImportantDates, mockColumnConfigs);
      expect(result).toHaveLength(3); // emp-2, emp-3 (false), emp-4 (null treated as false)
      expect(result.map(e => e.id)).toContain('emp-4');
    });

    it('should not include null boolean values when filtering for true', () => {
      const employeesWithNull = [
        ...mockEmployees,
        {
          ...mockEmployees[2],
          id: 'emp-4',
          first_name: 'Null Hotel',
          hotel_required: null as unknown as boolean,
        },
      ];

      const filters: FilterState[] = [
        {
          columnId: 'col-3',
          type: 'boolean',
          boolValue: true,
        },
      ];

      const result = applyFilters(employeesWithNull, filters, mockImportantDates, mockColumnConfigs);
      expect(result).toHaveLength(1); // Only emp-1
      expect(result[0].id).toBe('emp-1');
    });

    it('should filter by select values (case-insensitive)', () => {
      const genderColumnConfig: ColumnConfig = {
        id: 'col-gender',
        column_name: 'Gender',
        db_column_name: 'gender',
        column_type: 'text',
        role_permissions: {},
        is_masterdata: true,
        category: null,
        category_color: null,
        display_order: 5,
        is_visible: true,
        is_checklist_item: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const configs = [...mockColumnConfigs, genderColumnConfig];

      const filters: FilterState[] = [
        {
          columnId: 'col-gender',
          type: 'select',
          selectedValues: ['Man'],
        },
      ];

      const result = applyFilters(mockEmployees, filters, mockImportantDates, configs);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('emp-1');
    });

    it('should filter by multiple select values (OR logic)', () => {
      const genderColumnConfig: ColumnConfig = {
        id: 'col-gender',
        column_name: 'Gender',
        db_column_name: 'gender',
        column_type: 'text',
        role_permissions: {},
        is_masterdata: true,
        category: null,
        category_color: null,
        display_order: 5,
        is_visible: true,
        is_checklist_item: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const configs = [...mockColumnConfigs, genderColumnConfig];

      const filters: FilterState[] = [
        {
          columnId: 'col-gender',
          type: 'select',
          selectedValues: ['Man', 'Woman'],
        },
      ];

      const result = applyFilters(mockEmployees, filters, mockImportantDates, configs);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('emp-1');
      expect(result[1].id).toBe('emp-2');
    });

    it('should not match null values in select filter', () => {
      const genderColumnConfig: ColumnConfig = {
        id: 'col-gender',
        column_name: 'Gender',
        db_column_name: 'gender',
        column_type: 'text',
        role_permissions: {},
        is_masterdata: true,
        category: null,
        category_color: null,
        display_order: 5,
        is_visible: true,
        is_checklist_item: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const configs = [...mockColumnConfigs, genderColumnConfig];

      const filters: FilterState[] = [
        {
          columnId: 'col-gender',
          type: 'select',
          selectedValues: ['Man'],
        },
      ];

      const result = applyFilters(mockEmployees, filters, mockImportantDates, configs);
      // emp-3 has gender: null, should not match
      expect(result.map(e => e.id)).not.toContain('emp-3');
    });

    it('should filter by specific date IDs', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-4',
          type: 'date',
          selectedDateIds: ['date-2'],
        },
      ];

      const result = applyFilters(mockEmployees, filters, mockImportantDates, mockColumnConfigs);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('emp-1');
      expect(result[0].omc_date).toBe('date-2');
    });

    it('should filter by date range', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-4',
          type: 'date',
          dateRange: {
            from: new Date('2024-02-01'),
            to: new Date('2024-03-31'),
          },
        },
      ];

      const result = applyFilters(mockEmployees, filters, mockImportantDates, mockColumnConfigs);
      expect(result).toHaveLength(2); // date-2 (Feb 15) and date-3 (Mar 15)
      expect(result[0].id).toBe('emp-1'); // omc_date = date-2 (Feb 15)
      expect(result[1].id).toBe('emp-2'); // omc_date = date-3 (Mar 15)
    });

    it('should filter by date range (from only)', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-4',
          type: 'date',
          dateRange: {
            from: new Date('2024-03-01'),
            to: null,
          },
        },
      ];

      const result = applyFilters(mockEmployees, filters, mockImportantDates, mockColumnConfigs);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('emp-2');
    });

    it('should filter by date range (to only)', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-4',
          type: 'date',
          dateRange: {
            from: null,
            to: new Date('2024-02-20'),
          },
        },
      ];

      const result = applyFilters(mockEmployees, filters, mockImportantDates, mockColumnConfigs);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('emp-1');
      expect(result[0].omc_date).toBe('date-2'); // Feb 15
    });

    it('should combine date range and specific dates with OR logic', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-4',
          type: 'date',
          dateRange: {
            from: new Date('2024-01-01'),
            to: new Date('2024-01-31'),
          },
          selectedDateIds: ['date-3'], // March 15
        },
      ];

      const result = applyFilters(mockEmployees, filters, mockImportantDates, mockColumnConfigs);
      expect(result).toHaveLength(1); // emp-2 has date-3 which matches selectedDateIds
      expect(result[0].id).toBe('emp-2');
    });

    it('should combine multiple filters with AND logic', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-1',
          type: 'text',
          textValue: 'Jane',
        },
        {
          columnId: 'col-3',
          type: 'boolean',
          boolValue: false,
        },
      ];

      const result = applyFilters(mockEmployees, filters, mockImportantDates, mockColumnConfigs);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('emp-2');
      expect(result[0].first_name).toBe('Jane');
      expect(result[0].hotel_required).toBe(false);
    });

    it('should return empty array when no employees match all filters', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-1',
          type: 'text',
          textValue: 'Jane',
        },
        {
          columnId: 'col-3',
          type: 'boolean',
          boolValue: true, // Jane has hotel_required = false
        },
      ];

      const result = applyFilters(mockEmployees, filters, mockImportantDates, mockColumnConfigs);
      expect(result).toHaveLength(0);
    });

    it('should handle null/undefined text values', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-1',
          type: 'text',
          textValue: 'test',
        },
      ];

      // Bob has null email
      const result = applyFilters([mockEmployees[2]], filters, mockImportantDates, mockColumnConfigs);
      expect(result).toHaveLength(0);
    });

    it('should handle empty text filter', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-1',
          type: 'text',
          textValue: '',
        },
      ];

      const result = applyFilters(mockEmployees, filters, mockImportantDates, mockColumnConfigs);
      expect(result).toHaveLength(3); // Empty text = no filtering
    });

    it('should handle missing column config gracefully', () => {
      const filters: FilterState[] = [
        {
          columnId: 'non-existent-column',
          type: 'text',
          textValue: 'test',
        },
      ];

      const result = applyFilters(mockEmployees, filters, mockImportantDates, mockColumnConfigs);
      expect(result).toHaveLength(3); // Missing column = skip filter
    });
  });

  describe('getFilteredCount', () => {
    it('should return correct count of filtered employees', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-3',
          type: 'boolean',
          boolValue: true,
        },
      ];

      const count = getFilteredCount(mockEmployees, filters, mockImportantDates, mockColumnConfigs);
      expect(count).toBe(1);
    });

    it('should return total count when no filters', () => {
      const count = getFilteredCount(mockEmployees, [], mockImportantDates, mockColumnConfigs);
      expect(count).toBe(3);
    });
  });

  describe('hasActiveFilters', () => {
    it('should return false for empty filter array', () => {
      expect(hasActiveFilters([])).toBe(false);
    });

    it('should return true for text filter with value', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-1',
          type: 'text',
          textValue: 'John',
        },
      ];
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return false for text filter with empty value', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-1',
          type: 'text',
          textValue: '',
        },
      ];
      expect(hasActiveFilters(filters)).toBe(false);
    });

    it('should return true for boolean filter with true', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-3',
          type: 'boolean',
          boolValue: true,
        },
      ];
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return true for boolean filter with false', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-3',
          type: 'boolean',
          boolValue: false,
        },
      ];
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return false for boolean filter with null (Either)', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-3',
          type: 'boolean',
          boolValue: null,
        },
      ];
      expect(hasActiveFilters(filters)).toBe(false);
    });

    it('should return true for date filter with range', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-4',
          type: 'date',
          dateRange: {
            from: new Date('2024-01-01'),
            to: new Date('2024-12-31'),
          },
        },
      ];
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return true for date filter with specific dates', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-4',
          type: 'date',
          selectedDateIds: ['date-1', 'date-2'],
        },
      ];
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return false for date filter with no criteria', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-4',
          type: 'date',
        },
      ];
      expect(hasActiveFilters(filters)).toBe(false);
    });

    it('should return true for select filter with selected values', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-1',
          type: 'select',
          selectedValues: ['Man'],
        },
      ];
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return false for select filter with empty selected values', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-1',
          type: 'select',
          selectedValues: [],
        },
      ];
      expect(hasActiveFilters(filters)).toBe(false);
    });
  });
});
