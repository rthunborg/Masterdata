/**
 * Unit Tests: ÖMC Reminder Email Template
 * Story: 14.1 - ÖMC + Masterdata Completion Follow-up
 */

import { describe, it, expect } from 'vitest';
import {
  generateOmcReminderEmailSubject,
  generateOmcReminderEmailBody,
} from '@/lib/services/omc-masterdata-reminder';
import { Employee } from '@/lib/types/employee';

function createMockEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-123',
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

describe('generateOmcReminderEmailSubject', () => {
  it('should include employee name in subject', () => {
    const subject = generateOmcReminderEmailSubject('John Doe');
    expect(subject).toContain('John Doe');
    expect(subject).toContain('ÖMC genomförd för 3 dagar sedan');
  });

  it('should format subject correctly', () => {
    const subject = generateOmcReminderEmailSubject('Jane Smith');
    expect(subject).toBe('Stena Season: ÖMC genomförd för 3 dagar sedan – masterdata fortfarande ofullständig för Jane Smith');
  });
});

describe('generateOmcReminderEmailBody', () => {
  it('should include employee name', () => {
    const employee = createMockEmployee();
    const body = generateOmcReminderEmailBody(employee, '2025-01-01', ['one', 'isps']);
    
    expect(body).toContain('John Doe');
  });

  it('should include omc_date value', () => {
    const employee = createMockEmployee();
    const body = generateOmcReminderEmailBody(employee, '2025-01-15', ['one']);
    
    expect(body).toContain('2025-01-15');
  });

  it('should list all missing fields', () => {
    const employee = createMockEmployee();
    const missingFields = ['one', 'isps', 'photo', 'loneiva'];
    const body = generateOmcReminderEmailBody(employee, '2025-01-01', missingFields);
    
    // Check for display names, not field names
    expect(body).toContain('One');
    expect(body).toContain('ISPS');
    expect(body).toContain('Photo');
    expect(body).toContain('Lönenivå');
  });

  // Employee ID check removed as it is no longer included in the template

  it('should format boolean fields as "false"', () => {
    const employee = createMockEmployee();
    const body = generateOmcReminderEmailBody(employee, '2025-01-01', ['one', 'isps']);
    
    expect(body).toContain('(saknas)');
  });

  it('should format loneiva as "empty"', () => {
    const employee = createMockEmployee();
    const body = generateOmcReminderEmailBody(employee, '2025-01-01', ['loneiva']);
    
    expect(body).toContain('Lönenivå');
    expect(body).toContain('(tom)');
  });

  it('should handle multiple missing fields', () => {
    const employee = createMockEmployee();
    const missingFields = ['one', 'talmundo', 'isps', 'photo', 'origo', 'mail_lon', 'bankuppgifter', 'li', 'passport', 'kvitto_c17_18', 'c17', 'loneiva'];
    const body = generateOmcReminderEmailBody(employee, '2025-01-01', missingFields);
    
    // Check that all fields are mentioned (using display names)
    const displayNameMap: Record<string, string> = {
      one: 'One',
      talmundo: 'Talmundo',
      isps: 'ISPS',
      photo: 'Photo',
      origo: 'Origo',
      mail_lon: 'Mail Lön',
      bankuppgifter: 'Bankuppgifter',
      li: 'LI',
      passport: 'Passport',
      kvitto_c17_18: 'Kvitto C17/18',
      c17: 'C17',
      loneiva: 'Lönenivå',
    };
    
    missingFields.forEach(field => {
      const displayName = displayNameMap[field] || field;
      expect(body).toContain(displayName);
    });
  });
});
