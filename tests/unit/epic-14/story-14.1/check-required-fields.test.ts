/**
 * Unit Tests: Check Required Masterdata Fields
 * Story: 14.1 - ÖMC + Masterdata Completion Follow-up
 */

import { describe, it, expect } from 'vitest';
import { checkRequiredMasterdataFields } from '@/lib/services/omc-masterdata-reminder';
import { Employee } from '@/lib/types/employee';

function createMockEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    first_name: 'John',
    surname: 'Doe',
    ssn: '1234567890',
    email: 'john@example.com',
    mobile: null,
    rank: null,
    gender: null,
    town_district: null,
    hire_date: '2025-01-01',
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    repayment_needed_omc: null,
    repayment_needed_pe3: null,
    comments: null,
    one: null,
    one_marked_at: null,
    talmundo: null,
    isps: null,
    photo: null,
    origo: null,
    loneiva: null,
    mail_lon: null,
    bankuppgifter: null,
    li: null,
    passport: null,
    kvitto_c17_18: null,
    c17: null,
    crewing_done: null,
    hotel_required: null,
    room_number_shared: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('checkRequiredMasterdataFields', () => {
  it('should return empty array when all required fields are complete', () => {
    const employee = createMockEmployee({
      one: true,
      talmundo: true,
      isps: true,
      photo: true,
      origo: true,
      mail_lon: true,
      bankuppgifter: true,
      li: true,
      passport: true,
      kvitto_c17_18: true,
      c17: true,
      loneiva: 1,
    });

    const missing = checkRequiredMasterdataFields(employee);
    expect(missing).toEqual([]);
  });

  it('should identify missing boolean fields', () => {
    const employee = createMockEmployee({
      one: false,
      isps: null,
      photo: true,
      origo: false,
    });

    const missing = checkRequiredMasterdataFields(employee);
    expect(missing).toContain('one');
    expect(missing).toContain('isps');
    expect(missing).toContain('origo');
    expect(missing).not.toContain('photo');
  });

  it('should identify missing loneiva field', () => {
    const employee = createMockEmployee({
      one: true,
      isps: true,
      photo: true,
      origo: true,
      mail_lon: true,
      bankuppgifter: true,
      li: true,
      passport: true,
      kvitto_c17_18: true,
      c17: true,
      loneiva: null,
    });

    const missing = checkRequiredMasterdataFields(employee);
    expect(missing).toContain('loneiva');
  });

  it('should exclude hotel_required and crewing_done from required fields', () => {
    const employee = createMockEmployee({
      one: true,
      talmundo: true,
      isps: true,
      photo: true,
      origo: true,
      mail_lon: true,
      bankuppgifter: true,
      li: true,
      passport: true,
      kvitto_c17_18: true,
      c17: true,
      loneiva: 1,
      hotel_required: false, // Should be ignored
      crewing_done: false, // Should be ignored
    });

    const missing = checkRequiredMasterdataFields(employee);
    expect(missing).not.toContain('hotel_required');
    expect(missing).not.toContain('crewing_done');
    expect(missing).toEqual([]);
  });

  it('should return all required fields when all are missing', () => {
    const employee = createMockEmployee({
      one: null,
      talmundo: null,
      isps: null,
      photo: null,
      origo: null,
      mail_lon: null,
      bankuppgifter: null,
      li: null,
      passport: null,
      kvitto_c17_18: null,
      c17: null,
      loneiva: null,
    });

    const missing = checkRequiredMasterdataFields(employee);
    expect(missing.length).toBeGreaterThan(0);
    expect(missing).toContain('one');
    expect(missing).toContain('isps');
    expect(missing).toContain('loneiva');
  });

  it('should handle false values as missing', () => {
    const employee = createMockEmployee({
      one: false,
      isps: false,
      photo: false,
    });

    const missing = checkRequiredMasterdataFields(employee);
    expect(missing).toContain('one');
    expect(missing).toContain('isps');
    expect(missing).toContain('photo');
  });
});

