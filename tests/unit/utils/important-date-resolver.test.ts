import { describe, it, expect } from 'vitest';
import {
  resolveImportantDateId,
  resolveImportantDateTooltip,
  getImportantDateById,
  createDateResolutionCache,
  resolveImportantDateIdFromCache,
} from '@/lib/utils/important-date-resolver';
import type { ImportantDate } from '@/lib/types/important-date';

const mockDates: ImportantDate[] = [
  {
    id: 'uuid-1',
    date_description: 'Fredag 14/2',
    week_number: 7,
    year: 2025,
    category: 'Stena Dates',
    date_value: '2025-02-14',
    notes: null,
    time_value: null,
    deadline_submit: null,
    deadline_cancel: null,
    is_active: true,
    max_spots: 0,
    remaining_spots: 0,
    assigned_employees: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'uuid-2',
    date_description: 'Måndag 10/3',
    week_number: 11,
    year: 2025,
    category: 'ÖMC Dates',
    date_value: '2025-03-10',
    notes: 'ÖMC event',
    time_value: null,
    deadline_submit: null,
    deadline_cancel: null,
    is_active: true,
    max_spots: 0,
    remaining_spots: 0,
    assigned_employees: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'uuid-3',
    date_description: 'Tisdag 15/4',
    week_number: 16,
    year: 2025,
    category: 'PE3 Dates',
    date_value: '2025-04-15',
    notes: null,
    time_value: null,
    deadline_submit: null,
    deadline_cancel: null,
    is_active: true,
    max_spots: 0,
    remaining_spots: 0,
    assigned_employees: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

describe('important-date-resolver', () => {
  describe('resolveImportantDateId', () => {
    it('should return date description for valid ID', () => {
      const result = resolveImportantDateId('uuid-1', mockDates);
      expect(result).toBe('Fredag 14/2');
    });

    it('should return "Datum borttaget" for invalid ID', () => {
      const result = resolveImportantDateId('invalid-uuid', mockDates);
      expect(result).toBe('Datum borttaget');
    });

    it('should return empty string for null ID', () => {
      const result = resolveImportantDateId(null, mockDates);
      expect(result).toBe('');
    });

    it('should return empty string for empty array', () => {
      const result = resolveImportantDateId('uuid-1', []);
      expect(result).toBe(''); // Empty array → empty string (dates not loaded yet)
    });
  });

  describe('resolveImportantDateTooltip', () => {
    it('should return formatted tooltip with all fields', () => {
      const result = resolveImportantDateTooltip('uuid-1', mockDates);
      expect(result).toBe('v. 7\n2025\nStena Dates\n2025-02-14');
    });

    it('should return formatted tooltip with notes', () => {
      const result = resolveImportantDateTooltip('uuid-2', mockDates);
      expect(result).toBe('v. 11\n2025\nÖMC Dates\n2025-03-10');
    });

    it('should return "Datum borttaget" for invalid ID', () => {
      const result = resolveImportantDateTooltip('invalid-uuid', mockDates);
      expect(result).toBe('Datum borttaget');
    });

    it('should return null for null ID', () => {
      const result = resolveImportantDateTooltip(null, mockDates);
      expect(result).toBeNull();
    });

    it('should handle date without week_number', () => {
      const dateWithoutWeek: ImportantDate = {
        ...mockDates[0],
        id: 'uuid-no-week',
        week_number: null,
      };
      const result = resolveImportantDateTooltip('uuid-no-week', [dateWithoutWeek]);
      expect(result).toBe('2025\nStena Dates\n2025-02-14');
    });

    it('should handle date without date_value', () => {
      const dateWithoutValue: ImportantDate = {
        ...mockDates[0],
        id: 'uuid-no-value',
        date_value: '',
      };
      const result = resolveImportantDateTooltip('uuid-no-value', [dateWithoutValue]);
      expect(result).toBe('v. 7\n2025\nStena Dates');
    });
  });

  describe('getImportantDateById', () => {
    it('should return ImportantDate object for valid ID', () => {
      const result = getImportantDateById('uuid-1', mockDates);
      expect(result).toEqual(mockDates[0]);
    });

    it('should return null for invalid ID', () => {
      const result = getImportantDateById('invalid-uuid', mockDates);
      expect(result).toBeNull();
    });

    it('should return null for empty array', () => {
      const result = getImportantDateById('uuid-1', []);
      expect(result).toBeNull();
    });
  });

  describe('createDateResolutionCache', () => {
    it('should create a Map with correct entries', () => {
      const cache = createDateResolutionCache(mockDates);
      expect(cache instanceof Map).toBe(true);
      expect(cache.size).toBe(3);
      expect(cache.get('uuid-1')).toBe('Fredag 14/2');
      expect(cache.get('uuid-2')).toBe('Måndag 10/3');
      expect(cache.get('uuid-3')).toBe('Tisdag 15/4');
    });

    it('should create empty Map for empty array', () => {
      const cache = createDateResolutionCache([]);
      expect(cache.size).toBe(0);
    });
  });

  describe('resolveImportantDateIdFromCache', () => {
    it('should resolve date description from cache', () => {
      const cache = createDateResolutionCache(mockDates);
      const result = resolveImportantDateIdFromCache('uuid-1', cache);
      expect(result).toBe('Fredag 14/2');
    });

    it('should return "Datum borttaget" for ID not in cache', () => {
      const cache = createDateResolutionCache(mockDates);
      const result = resolveImportantDateIdFromCache('invalid-uuid', cache);
      expect(result).toBe('Datum borttaget');
    });

    it('should return empty string for null ID', () => {
      const cache = createDateResolutionCache(mockDates);
      const result = resolveImportantDateIdFromCache(null, cache);
      expect(result).toBe('');
    });

    it('should work with empty cache', () => {
      const cache = new Map<string, string>();
      const result = resolveImportantDateIdFromCache('uuid-1', cache);
      expect(result).toBe('Datum borttaget');
    });
  });
});
