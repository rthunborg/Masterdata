import { describe, it, expect } from 'vitest';
import { normalizeSSN } from '@/lib/utils/ssn-formatter';

describe('normalizeSSN', () => {
  describe('Valid formats - 10 digits without dash', () => {
    it('should normalize dashless 10-digit SSN (YYMMDDXXXX)', () => {
      expect(normalizeSSN('8503151234')).toBe('850315-1234');
    });

    it('should normalize dashless 10-digit SSN with different date', () => {
      expect(normalizeSSN('9001011234')).toBe('900101-1234');
    });

    it('should normalize dashless 10-digit SSN from 2000s', () => {
      expect(normalizeSSN('0512251234')).toBe('051225-1234');
    });
  });

  describe('Valid formats - 12 digits without dash', () => {
    it('should normalize dashless 12-digit SSN (YYYYMMDDXXXX) by stripping century', () => {
      expect(normalizeSSN('198503151234')).toBe('850315-1234');
    });

    it('should normalize 12-digit SSN from 1900s', () => {
      expect(normalizeSSN('199001011234')).toBe('900101-1234');
    });

    it('should normalize 12-digit SSN from 2000s', () => {
      expect(normalizeSSN('200512251234')).toBe('051225-1234');
    });
  });

  describe('Valid formats - already normalized with dash', () => {
    it('should return already normalized SSN (YYMMDD-XXXX) unchanged', () => {
      expect(normalizeSSN('850315-1234')).toBe('850315-1234');
    });

    it('should return already normalized SSN with different date unchanged', () => {
      expect(normalizeSSN('900101-1234')).toBe('900101-1234');
    });

    it('should normalize SSN from 2000s with dash', () => {
      expect(normalizeSSN('051225-1234')).toBe('051225-1234');
    });
  });

  describe('Valid formats - with century and dash', () => {
    it('should strip century from SSN with dash (YYYYMMDD-XXXX)', () => {
      expect(normalizeSSN('19850315-1234')).toBe('850315-1234');
    });

    it('should strip century from 1900s SSN with dash', () => {
      expect(normalizeSSN('19900101-1234')).toBe('900101-1234');
    });

    it('should strip century from 2000s SSN with dash', () => {
      expect(normalizeSSN('20051225-1234')).toBe('051225-1234');
    });
  });

  describe('Edge cases - spaces and special characters', () => {
    it('should handle SSN with spaces', () => {
      expect(normalizeSSN('850315 1234')).toBe('850315-1234');
    });

    it('should handle SSN with multiple dashes', () => {
      expect(normalizeSSN('850-315-1234')).toBe('850315-1234');
    });

    it('should handle SSN with mixed separators', () => {
      expect(normalizeSSN('850.315-1234')).toBe('850315-1234');
    });

    it('should strip all non-digit characters before processing', () => {
      expect(normalizeSSN('850/315/1234')).toBe('850315-1234');
    });
  });

  describe('Invalid formats - wrong length', () => {
    it('should throw error for 9 digits', () => {
      expect(() => normalizeSSN('123456789')).toThrow(
        'Invalid SSN length: expected 10 or 12 digits, got 9'
      );
    });

    it('should throw error for 11 digits', () => {
      expect(() => normalizeSSN('12345678901')).toThrow(
        'Invalid SSN length: expected 10 or 12 digits, got 11'
      );
    });

    it('should throw error for 13 digits', () => {
      expect(() => normalizeSSN('1234567890123')).toThrow(
        'Invalid SSN length: expected 10 or 12 digits, got 13'
      );
    });

    it('should throw error for 8 digits', () => {
      expect(() => normalizeSSN('12345678')).toThrow(
        'Invalid SSN length: expected 10 or 12 digits, got 8'
      );
    });

    it('should throw error for 3 digits', () => {
      expect(() => normalizeSSN('123')).toThrow(
        'Invalid SSN length: expected 10 or 12 digits, got 3'
      );
    });
  });

  describe('Invalid formats - empty or non-numeric', () => {
    it('should throw error for empty string', () => {
      expect(() => normalizeSSN('')).toThrow(
        'Invalid SSN length: expected 10 or 12 digits, got 0'
      );
    });

    it('should throw error for non-numeric characters only', () => {
      expect(() => normalizeSSN('abcdef')).toThrow(
        'Invalid SSN length: expected 10 or 12 digits, got 0'
      );
    });

    it('should throw error for mixed alphanumeric with wrong length', () => {
      expect(() => normalizeSSN('abc123')).toThrow(
        'Invalid SSN length: expected 10 or 12 digits, got 3'
      );
    });

    it('should throw error for special characters only', () => {
      expect(() => normalizeSSN('!@#$%^&*()')).toThrow(
        'Invalid SSN length: expected 10 or 12 digits, got 0'
      );
    });
  });

  describe('Real-world Swedish SSN examples', () => {
    it('should normalize typical Swedish SSN from 1980s', () => {
      expect(normalizeSSN('8503151234')).toBe('850315-1234');
    });

    it('should normalize typical Swedish SSN from 1990s', () => {
      expect(normalizeSSN('9512011234')).toBe('951201-1234');
    });

    it('should normalize typical Swedish SSN from 2000s', () => {
      expect(normalizeSSN('0301151234')).toBe('030115-1234');
    });

    it('should normalize century-prefixed SSN from 1980s', () => {
      expect(normalizeSSN('19850315-1234')).toBe('850315-1234');
    });

    it('should normalize century-prefixed SSN from 2000s', () => {
      expect(normalizeSSN('20030115-1234')).toBe('030115-1234');
    });
  });
});
