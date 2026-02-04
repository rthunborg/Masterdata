/**
 * Unit Tests for Filter Serializer
 * Story 20.4: Filter Engine & State Management
 * 
 * Tests verify:
 * 1. Serialization to base64 encoded JSON
 * 2. Deserialization from base64 encoded JSON
 * 3. Validation of filter structure
 * 4. Error handling for invalid/corrupted data
 * 5. URL creation with filters
 * 6. Filter extraction from URL
 */

import { describe, it, expect } from 'vitest';
import {
  serializeFilters,
  deserializeFilters,
  createFilteredUrl,
  extractFiltersFromUrl,
} from '@/lib/filters/filterSerializer';
import type { FilterState } from '@/lib/types/filter';

describe('Story 20.4: Filter Serializer', () => {
  describe('serializeFilters', () => {
    it('should return empty string for empty filter array', () => {
      const result = serializeFilters([]);
      expect(result).toBe('');
    });

    it('should serialize text filter to base64', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-1',
          type: 'text',
          textValue: 'John',
        },
      ];

      const result = serializeFilters(filters);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      
      // Verify it's valid base64
      expect(() => atob(result)).not.toThrow();
    });

    it('should serialize boolean filter to base64', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-2',
          type: 'boolean',
          boolValue: true,
        },
      ];

      const result = serializeFilters(filters);
      expect(result).toBeTruthy();
      
      // Decode and verify content
      const decoded = JSON.parse(atob(result));
      expect(decoded).toEqual(filters);
    });

    it('should serialize date filter to base64', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-3',
          type: 'date',
          dateRange: {
            from: new Date('2024-01-01'),
            to: new Date('2024-12-31'),
          },
          selectedDateIds: ['date-1', 'date-2'],
        },
      ];

      const result = serializeFilters(filters);
      expect(result).toBeTruthy();
      
      // Decode and verify content structure
      const decoded = JSON.parse(atob(result));
      expect(decoded).toHaveLength(1);
      expect(decoded[0].columnId).toBe('col-3');
      expect(decoded[0].type).toBe('date');
    });

    it('should serialize multiple filters', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-1',
          type: 'text',
          textValue: 'John',
        },
        {
          columnId: 'col-2',
          type: 'boolean',
          boolValue: false,
        },
        {
          columnId: 'col-3',
          type: 'date',
          selectedDateIds: ['date-1'],
        },
      ];

      const result = serializeFilters(filters);
      expect(result).toBeTruthy();
      
      // Verify all filters are encoded
      const decoded = JSON.parse(atob(result));
      expect(decoded).toHaveLength(3);
    });

    it('should handle special characters in text values', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-1',
          type: 'text',
          textValue: 'John & Jane <test> "quotes"',
        },
      ];

      const result = serializeFilters(filters);
      const decoded = JSON.parse(atob(result));
      expect(decoded[0].textValue).toBe('John & Jane <test> "quotes"');
    });
  });

  describe('deserializeFilters', () => {
    it('should return empty array for empty string', () => {
      const result = deserializeFilters('');
      expect(result).toEqual([]);
    });

    it('should deserialize valid text filter', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-1',
          type: 'text',
          textValue: 'John',
        },
      ];
      
      const encoded = serializeFilters(filters);
      const result = deserializeFilters(encoded);
      
      expect(result).toEqual(filters);
    });

    it('should deserialize valid boolean filter', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-2',
          type: 'boolean',
          boolValue: true,
        },
      ];
      
      const encoded = serializeFilters(filters);
      const result = deserializeFilters(encoded);
      
      expect(result).toEqual(filters);
    });

    it('should deserialize valid date filter', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-3',
          type: 'date',
          selectedDateIds: ['date-1', 'date-2'],
        },
      ];
      
      const encoded = serializeFilters(filters);
      const result = deserializeFilters(encoded);
      
      expect(result).toHaveLength(1);
      expect(result[0].columnId).toBe('col-3');
      expect(result[0].selectedDateIds).toEqual(['date-1', 'date-2']);
    });

    it('should deserialize multiple filters', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-1',
          type: 'text',
          textValue: 'test',
        },
        {
          columnId: 'col-2',
          type: 'boolean',
          boolValue: false,
        },
      ];
      
      const encoded = serializeFilters(filters);
      const result = deserializeFilters(encoded);
      
      expect(result).toHaveLength(2);
      expect(result[0].columnId).toBe('col-1');
      expect(result[1].columnId).toBe('col-2');
    });

    it('should return empty array for invalid base64', () => {
      const result = deserializeFilters('!!!invalid-base64!!!');
      expect(result).toEqual([]);
    });

    it('should return empty array for invalid JSON', () => {
      const invalidBase64 = btoa('not valid json');
      const result = deserializeFilters(invalidBase64);
      expect(result).toEqual([]);
    });

    it('should return empty array when decoded value is not an array', () => {
      const notArray = btoa(JSON.stringify({ filter: 'test' }));
      const result = deserializeFilters(notArray);
      expect(result).toEqual([]);
    });

    it('should filter out invalid filter objects', () => {
      const mixed = [
        {
          columnId: 'col-1',
          type: 'text',
          textValue: 'valid',
        },
        {
          // Missing columnId
          type: 'text',
          textValue: 'invalid',
        },
        {
          columnId: 'col-2',
          // Invalid type
          type: 'unknown',
        },
        {
          columnId: 'col-3',
          type: 'boolean',
          boolValue: true,
        },
      ];

      const encoded = btoa(JSON.stringify(mixed));
      const result = deserializeFilters(encoded);
      
      // Should only have 2 valid filters
      expect(result).toHaveLength(2);
      expect(result[0].columnId).toBe('col-1');
      expect(result[1].columnId).toBe('col-3');
    });

    it('should validate text filter value type', () => {
      const invalid = [
        {
          columnId: 'col-1',
          type: 'text',
          textValue: 123, // Should be string
        },
      ];

      const encoded = btoa(JSON.stringify(invalid));
      const result = deserializeFilters(encoded);
      
      expect(result).toEqual([]);
    });

    it('should validate boolean filter value type', () => {
      const invalid = [
        {
          columnId: 'col-1',
          type: 'boolean',
          boolValue: 'true', // Should be boolean or null
        },
      ];

      const encoded = btoa(JSON.stringify(invalid));
      const result = deserializeFilters(encoded);
      
      expect(result).toEqual([]);
    });

    it('should allow null boolean value (Either)', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-1',
          type: 'boolean',
          boolValue: null,
        },
      ];

      const encoded = serializeFilters(filters);
      const result = deserializeFilters(encoded);
      
      expect(result).toHaveLength(1);
      expect(result[0].boolValue).toBe(null);
    });
  });

  describe('createFilteredUrl', () => {
    it('should return base URL when no filters', () => {
      const baseUrl = 'https://example.com/dashboard';
      const result = createFilteredUrl(baseUrl, []);
      
      expect(result).toBe(baseUrl);
    });

    it('should append filters query param', () => {
      const baseUrl = 'https://example.com/dashboard';
      const filters: FilterState[] = [
        {
          columnId: 'col-1',
          type: 'text',
          textValue: 'John',
        },
      ];

      const result = createFilteredUrl(baseUrl, filters);
      
      expect(result).toContain('?filters=');
      expect(result).toContain(baseUrl);
    });

    it('should preserve existing query params', () => {
      const baseUrl = 'https://example.com/dashboard?tab=employees';
      const filters: FilterState[] = [
        {
          columnId: 'col-1',
          type: 'text',
          textValue: 'John',
        },
      ];

      const result = createFilteredUrl(baseUrl, filters);
      
      expect(result).toContain('tab=employees');
      expect(result).toContain('filters=');
    });
  });

  describe('extractFiltersFromUrl', () => {
    it('should extract filters from full URL', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-1',
          type: 'text',
          textValue: 'John',
        },
      ];

      const url = createFilteredUrl('https://example.com/dashboard', filters);
      const result = extractFiltersFromUrl(url);
      
      expect(result).toEqual(filters);
    });

    it('should extract filters from query string', () => {
      const filters: FilterState[] = [
        {
          columnId: 'col-2',
          type: 'boolean',
          boolValue: true,
        },
      ];

      const encoded = serializeFilters(filters);
      const queryString = `?filters=${encoded}`;
      const result = extractFiltersFromUrl(queryString);
      
      expect(result).toHaveLength(1);
      expect(result[0].columnId).toBe('col-2');
    });

    it('should return empty array when no filters param', () => {
      const url = 'https://example.com/dashboard?tab=employees';
      const result = extractFiltersFromUrl(url);
      
      expect(result).toEqual([]);
    });

    it('should handle invalid URL gracefully', () => {
      const result = extractFiltersFromUrl('not a valid url');
      expect(result).toEqual([]);
    });
  });

  describe('Round-trip serialization', () => {
    it('should preserve data through serialize -> deserialize cycle', () => {
      const originalFilters: FilterState[] = [
        {
          columnId: 'col-1',
          type: 'text',
          textValue: 'John Doe',
        },
        {
          columnId: 'col-2',
          type: 'boolean',
          boolValue: true,
        },
        {
          columnId: 'col-3',
          type: 'date',
          dateRange: {
            from: new Date('2024-01-01'),
            to: new Date('2024-12-31'),
          },
          selectedDateIds: ['date-1', 'date-2', 'date-3'],
        },
      ];

      const encoded = serializeFilters(originalFilters);
      const decoded = deserializeFilters(encoded);
      
      expect(decoded).toHaveLength(originalFilters.length);
      expect(decoded[0].textValue).toBe('John Doe');
      expect(decoded[1].boolValue).toBe(true);
      expect(decoded[2].selectedDateIds).toEqual(['date-1', 'date-2', 'date-3']);
    });

    it('should preserve data through URL creation -> extraction cycle', () => {
      const originalFilters: FilterState[] = [
        {
          columnId: 'col-1',
          type: 'text',
          textValue: 'Test User',
        },
      ];

      const url = createFilteredUrl('https://example.com/dashboard', originalFilters);
      const extracted = extractFiltersFromUrl(url);
      
      expect(extracted).toEqual(originalFilters);
    });
  });
});
