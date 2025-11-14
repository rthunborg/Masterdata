/**
 * Integration Tests for CSV Import/Export with ÖMC Dates
 * Story 11.5: Date Format & Parsing Tests
 * AC2: Integration Test Coverage (CSV Import/Export)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportImportantDates } from '@/lib/services/export-service';
import { validateImportantDatesCSV } from '@/lib/utils/important-dates-csv-validator';
import type { ImportantDate } from '@/lib/types/important-date';

// Mock the downloadCSV function to capture output
let capturedCSV: string | null = null;
let capturedFilename: string | null = null;

// Mock downloadCSV
vi.mock('@/lib/utils/csv-export', async () => {
  const actual = await vi.importActual('@/lib/utils/csv-export');
  return {
    ...actual,
    downloadCSV: (content: string, filename: string) => {
      capturedCSV = content;
      capturedFilename = filename;
    },
  };
});

beforeEach(() => {
  capturedCSV = null;
  capturedFilename = null;
});

describe('CSV Export with ÖMC Dates', () => {
  it('should export ÖMC dates formatted as "8-9 mars 2025"', () => {
    const dates: ImportantDate[] = [
      {
        id: '1',
        week_number: 10,
        year: 2025,
        category: 'ÖMC Dates',
        date_description: 'Test ÖMC Date',
        date_value: '2025-03-08', // Start date only
        time_value: null,
        deadline_submit: null,
        deadline_cancel: null,
        max_spots: 99,
        remaining_spots: 50,
        notes: null,
        assigned_employees: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    exportImportantDates(dates);
    
    expect(capturedCSV).not.toBeNull();
    expect(capturedCSV).toContain('8-9 mars 2025');
    expect(capturedCSV).toContain('ÖMC Dates');
  });
});

describe('CSV Import with ÖMC Dates', () => {
  it('should parse "8-9/3" format correctly', () => {
    const csvRows = [
      {
        week_number: '10',
        year: '2025',
        category: 'ÖMC Dates',
        date_description: 'Test Date',
        date_value: '8-9/3',
        time_value: '',
        deadline_submit: '',
        deadline_cancel: '',
        notes: '',
      },
    ];

    const result = validateImportantDatesCSV(csvRows);
    
    expect(result.valid.length).toBe(1);
    expect(result.valid[0].date_value).toBe('2025-03-08'); // Converted to ISO format
    expect(result.invalid.length).toBe(0);
  });

  it('should parse "8-9 mars" format correctly', () => {
    const csvRows = [
      {
        week_number: '10',
        year: '2025',
        category: 'ÖMC Dates',
        date_description: 'Test Date',
        date_value: '8-9 mars',
        time_value: '',
        deadline_submit: '',
        deadline_cancel: '',
        notes: '',
      },
    ];

    const result = validateImportantDatesCSV(csvRows);
    
    expect(result.valid.length).toBe(1);
    expect(result.valid[0].date_value).toBe('2025-03-08'); // Converted to ISO format
    expect(result.invalid.length).toBe(0);
  });

  it('should parse "2025-03-08" (ISO) format correctly', () => {
    const csvRows = [
      {
        week_number: '10',
        year: '2025',
        category: 'ÖMC Dates',
        date_description: 'Test Date',
        date_value: '2025-03-08',
        time_value: '',
        deadline_submit: '',
        deadline_cancel: '',
        notes: '',
      },
    ];

    const result = validateImportantDatesCSV(csvRows);
    
    expect(result.valid.length).toBe(1);
    expect(result.valid[0].date_value).toBe('2025-03-08');
    expect(result.invalid.length).toBe(0);
  });

  it('should reject invalid formats with error', () => {
    const csvRows = [
      {
        week_number: '10',
        year: '2025',
        category: 'ÖMC Dates',
        date_description: 'Test Date',
        date_value: '8 mars', // Single day (invalid)
        time_value: '',
        deadline_submit: '',
        deadline_cancel: '',
        notes: '',
      },
    ];

    const result = validateImportantDatesCSV(csvRows);
    
    expect(result.valid.length).toBe(0);
    expect(result.invalid.length).toBeGreaterThan(0);
    expect(result.invalid[0].message).toContain('två på varandra följande dagar');
  });

  it('should reject non-consecutive dates', () => {
    const csvRows = [
      {
        week_number: '10',
        year: '2025',
        category: 'ÖMC Dates',
        date_description: 'Test Date',
        date_value: '8-10/3', // Non-consecutive (8, 9, 10)
        time_value: '',
        deadline_submit: '',
        deadline_cancel: '',
        notes: '',
      },
    ];

    const result = validateImportantDatesCSV(csvRows);
    
    expect(result.valid.length).toBe(0);
    expect(result.invalid.length).toBeGreaterThan(0);
  });

  it('should validate all ÖMC dates in bulk import', () => {
    const csvRows = [
      {
        week_number: '10',
        year: '2025',
        category: 'ÖMC Dates',
        date_description: 'Date 1',
        date_value: '8-9/3', // Valid
        time_value: '',
        deadline_submit: '',
        deadline_cancel: '',
        notes: '',
      },
      {
        week_number: '11',
        year: '2025',
        category: 'ÖMC Dates',
        date_description: 'Date 2',
        date_value: '15-16 mars', // Valid
        time_value: '',
        deadline_submit: '',
        deadline_cancel: '',
        notes: '',
      },
      {
        week_number: '12',
        year: '2025',
        category: 'ÖMC Dates',
        date_description: 'Date 3',
        date_value: '8 mars', // Invalid (single day)
        time_value: '',
        deadline_submit: '',
        deadline_cancel: '',
        notes: '',
      },
    ];

    const result = validateImportantDatesCSV(csvRows);
    
    expect(result.valid.length).toBe(2); // First two are valid
    expect(result.invalid.length).toBeGreaterThan(0); // Third is invalid
    expect(result.valid[0].date_value).toBe('2025-03-08');
    expect(result.valid[1].date_value).toBe('2025-03-15');
  });
});

