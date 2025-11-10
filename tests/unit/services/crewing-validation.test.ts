/**
 * Unit Tests for Crewing/Done Validation Service
 * Story 8.5: Crewing/Done Field Conditional Logic
 */

import { describe, it, expect } from 'vitest';
import { canEditCrewingDone, getIncompleteFields } from '@/lib/services/crewing-validation';
import type { Employee } from '@/lib/types/employee';

describe('canEditCrewingDone', () => {
  // Complete employee with all 10 prerequisites set to true
  const completeEmployee: Partial<Employee> = {
    isps: true,
    photo: true,
    origo: true,
    mail_lon: true,
    loneiva: 1,
    bankuppgifter: true,
    li: true,
    passport: true,
    kvitto_c17_18: true,
    c17: true,
  };

  describe('when all prerequisites are complete', () => {
    it('returns true', () => {
      const result = canEditCrewingDone(completeEmployee);
      expect(result).toBe(true);
    });

    it('returns true even when crewing_done is already set', () => {
      const result = canEditCrewingDone({
        ...completeEmployee,
        crewing_done: true,
      });
      expect(result).toBe(true);
    });
  });

  describe('when any single prerequisite is false', () => {
    it('returns false when isps is false', () => {
      const result = canEditCrewingDone({ ...completeEmployee, isps: false });
      expect(result).toBe(false);
    });

    it('returns false when photo is false', () => {
      const result = canEditCrewingDone({ ...completeEmployee, photo: false });
      expect(result).toBe(false);
    });

    it('returns false when origo is false', () => {
      const result = canEditCrewingDone({ ...completeEmployee, origo: false });
      expect(result).toBe(false);
    });

    it('returns false when mail_lon is false', () => {
      const result = canEditCrewingDone({ ...completeEmployee, mail_lon: false });
      expect(result).toBe(false);
    });

    it('returns false when loneiva is false', () => {
      const result = canEditCrewingDone({ ...completeEmployee, loneiva: 0 });
      expect(result).toBe(false);
    });

    it('returns false when bankuppgifter is false', () => {
      const result = canEditCrewingDone({ ...completeEmployee, bankuppgifter: false });
      expect(result).toBe(false);
    });

    it('returns false when li is false', () => {
      const result = canEditCrewingDone({ ...completeEmployee, li: false });
      expect(result).toBe(false);
    });

    it('returns false when passport is false', () => {
      const result = canEditCrewingDone({ ...completeEmployee, passport: false });
      expect(result).toBe(false);
    });

    it('returns false when kvitto_c17_18 is false', () => {
      const result = canEditCrewingDone({ ...completeEmployee, kvitto_c17_18: false });
      expect(result).toBe(false);
    });

    it('returns false when c17 is false', () => {
      const result = canEditCrewingDone({ ...completeEmployee, c17: false });
      expect(result).toBe(false);
    });
  });

  describe('when any single prerequisite is null', () => {
    it('returns false when isps is null', () => {
      const result = canEditCrewingDone({ ...completeEmployee, isps: null });
      expect(result).toBe(false);
    });

    it('returns false when photo is null', () => {
      const result = canEditCrewingDone({ ...completeEmployee, photo: null });
      expect(result).toBe(false);
    });

    it('returns false when origo is null', () => {
      const result = canEditCrewingDone({ ...completeEmployee, origo: null });
      expect(result).toBe(false);
    });

    it('returns false when mail_lon is null', () => {
      const result = canEditCrewingDone({ ...completeEmployee, mail_lon: null });
      expect(result).toBe(false);
    });

    it('returns false when loneiva is null', () => {
      const result = canEditCrewingDone({ ...completeEmployee, loneiva: null });
      expect(result).toBe(false);
    });

    it('returns false when bankuppgifter is null', () => {
      const result = canEditCrewingDone({ ...completeEmployee, bankuppgifter: null });
      expect(result).toBe(false);
    });

    it('returns false when li is null', () => {
      const result = canEditCrewingDone({ ...completeEmployee, li: null });
      expect(result).toBe(false);
    });

    it('returns false when passport is null', () => {
      const result = canEditCrewingDone({ ...completeEmployee, passport: null });
      expect(result).toBe(false);
    });

    it('returns false when kvitto_c17_18 is null', () => {
      const result = canEditCrewingDone({ ...completeEmployee, kvitto_c17_18: null });
      expect(result).toBe(false);
    });

    it('returns false when c17 is null', () => {
      const result = canEditCrewingDone({ ...completeEmployee, c17: null });
      expect(result).toBe(false);
    });
  });

  describe('when multiple prerequisites are incomplete', () => {
    it('returns false when 5 prerequisites are false', () => {
      const result = canEditCrewingDone({
        ...completeEmployee,
        isps: false,
        photo: false,
        origo: false,
        mail_lon: false,
        loneiva: 0,
      });
      expect(result).toBe(false);
    });

    it('returns false when 9 prerequisites are true and 1 is false', () => {
      const result = canEditCrewingDone({
        ...completeEmployee,
        c17: false,
      });
      expect(result).toBe(false);
    });

    it('returns false when all prerequisites are false', () => {
      const result = canEditCrewingDone({
        isps: false,
        photo: false,
        origo: false,
        mail_lon: false,
        loneiva: 0,
        bankuppgifter: false,
        li: false,
        passport: false,
        kvitto_c17_18: false,
        c17: false,
      });
      expect(result).toBe(false);
    });

    it('returns false when all prerequisites are null', () => {
      const result = canEditCrewingDone({
        isps: null,
        photo: null,
        origo: null,
        mail_lon: null,
        loneiva: null,
        bankuppgifter: null,
        li: null,
        passport: null,
        kvitto_c17_18: null,
        c17: null,
      });
      expect(result).toBe(false);
    });
  });

  describe('when prerequisite field is missing', () => {
    it('returns false when a required field is missing from employee object', () => {
      const incomplete = { ...completeEmployee };
      delete (incomplete as Record<string, unknown>).li;
      const result = canEditCrewingDone(incomplete);
      expect(result).toBe(false);
    });

    it('returns false with empty employee object', () => {
      const result = canEditCrewingDone({});
      expect(result).toBe(false);
    });
  });
});

describe('getIncompleteFields', () => {
  const completeEmployee: Partial<Employee> = {
    isps: true,
    photo: true,
    origo: true,
    mail_lon: true,
    loneiva: 1,
    bankuppgifter: true,
    li: true,
    passport: true,
    kvitto_c17_18: true,
    c17: true,
  };

  describe('when all prerequisites are complete', () => {
    it('returns empty array', () => {
      const result = getIncompleteFields(completeEmployee);
      expect(result).toEqual([]);
    });
  });

  describe('when one prerequisite is incomplete', () => {
    it('returns correct field name for isps', () => {
      const result = getIncompleteFields({ ...completeEmployee, isps: false });
      expect(result).toEqual(['ISP']);
    });

    it('returns correct field name for photo', () => {
      const result = getIncompleteFields({ ...completeEmployee, photo: null });
      expect(result).toEqual(['Photo']);
    });

    it('returns correct field name for mail_lon', () => {
      const result = getIncompleteFields({ ...completeEmployee, mail_lon: false });
      expect(result).toEqual(['Mail']);
    });

    it('returns correct field name for loneiva', () => {
      const result = getIncompleteFields({ ...completeEmployee, loneiva: null });
      expect(result).toEqual(['lön']);
    });

    it('returns correct field name for kvitto_c17_18', () => {
      const result = getIncompleteFields({ ...completeEmployee, kvitto_c17_18: false });
      expect(result).toEqual(['Kvitto C17/18']);
    });
  });

  describe('when multiple prerequisites are incomplete', () => {
    it('returns correct field names for 2 incomplete fields', () => {
      const result = getIncompleteFields({
        ...completeEmployee,
        isps: false,
        photo: null,
      });
      expect(result).toEqual(['ISP', 'Photo']);
    });

    it('returns correct field names for 5 incomplete fields', () => {
      const result = getIncompleteFields({
        ...completeEmployee,
        isps: false,
        photo: false,
        origo: null,
        mail_lon: false,
        loneiva: null,
      });
      expect(result).toEqual(['ISP', 'Photo', 'Origo', 'Mail', 'lön']);
    });

    it('returns all field names when all prerequisites are incomplete', () => {
      const result = getIncompleteFields({
        isps: false,
        photo: false,
        origo: false,
        mail_lon: false,
        loneiva: 0,
        bankuppgifter: false,
        li: false,
        passport: false,
        kvitto_c17_18: false,
        c17: false,
      });
      expect(result).toEqual([
        'ISP',
        'Photo',
        'Origo',
        'Mail',
        'lön',
        'Bankuppgifter',
        'LI',
        'Passport',
        'Kvitto C17/18',
        'C17',
      ]);
    });
  });

  describe('when employee object is incomplete', () => {
    it('returns correct field names for missing fields', () => {
      const result = getIncompleteFields({
        isps: true,
        photo: true,
        origo: true,
        // mail_lon missing
        // loneiva missing
        bankuppgifter: true,
        li: true,
        passport: true,
        kvitto_c17_18: true,
        c17: true,
      });
      expect(result).toEqual(['Mail', 'lön']);
    });

    it('handles empty employee object', () => {
      const result = getIncompleteFields({});
      expect(result).toEqual([
        'ISP',
        'Photo',
        'Origo',
        'Mail',
        'lön',
        'Bankuppgifter',
        'LI',
        'Passport',
        'Kvitto C17/18',
        'C17',
      ]);
    });
  });
});
