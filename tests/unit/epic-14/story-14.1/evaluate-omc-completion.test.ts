/**
 * Unit Tests: ÖMC Masterdata Completion Evaluation
 * Story: 14.1 - ÖMC + Masterdata Completion Follow-up
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { evaluateOmcMasterdataCompletion } from '@/lib/services/omc-masterdata-reminder';
import { Employee } from '@/lib/types/employee';
import * as supabaseServer from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server');

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
    one: true,
    one_marked_at: null,
    talmundo: true,
    isps: true,
    photo: true,
    origo: true,
    loneiva: 1,
    mail_lon: true,
    bankuppgifter: true,
    li: true,
    passport: true,
    kvitto_c17_18: true,
    c17: true,
    crewing_done: null,
    hotel_required: null,
    room_number_shared: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('evaluateOmcMasterdataCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return shouldNotify: false when omc_date is not set', async () => {
    const employee = createMockEmployee({ omc_date: null });
    
    const result = await evaluateOmcMasterdataCompletion(employee);
    
    expect(result.shouldNotify).toBe(false);
    expect(result.missingFields).toEqual([]);
    expect(result.omcDateValue).toBeNull();
  });

  it('should return shouldNotify: false when omc_date value cannot be fetched', async () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          })),
        })),
      })),
    };

    vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

    const employee = createMockEmployee({ omc_date: 'invalid-uuid' });
    
    const result = await evaluateOmcMasterdataCompletion(employee);
    
    expect(result.shouldNotify).toBe(false);
    expect(result.missingFields).toEqual([]);
    expect(result.omcDateValue).toBeNull();
  });

  it('should return shouldNotify: false when less than 3 days have passed', async () => {
    // Mock today as 2025-01-03 (only 2 days after ÖMC date)
    const mockDate = new Date('2025-01-03T07:00:00Z');
    vi.useFakeTimers({ now: mockDate });

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { date_value: '2025-01-01' },
              error: null,
            }),
          })),
        })),
      })),
    };

    vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

    const employee = createMockEmployee({ 
      omc_date: 'omc-uuid-1',
      omc_masterdata_reminder_sent_at: null,
    });
    
    const result = await evaluateOmcMasterdataCompletion(employee);
    
    expect(result.shouldNotify).toBe(false);
    expect(result.omcDateValue).toBe('2025-01-01');
  });

  it('should return shouldNotify: true when 3+ days have passed and fields are incomplete', async () => {
    // Mock today as 2025-01-04 (3 days after ÖMC date)
    const mockDate = new Date('2025-01-04T07:00:00Z');
    vi.useFakeTimers({ now: mockDate });

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { date_value: '2025-01-01' },
              error: null,
            }),
          })),
        })),
      })),
    };

    vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

    const employee = createMockEmployee({ 
      omc_date: 'omc-uuid-1',
      omc_masterdata_reminder_sent_at: null,
      one: false, // Missing field
      isps: false, // Missing field
      loneiva: null, // Missing field
    });
    
    const result = await evaluateOmcMasterdataCompletion(employee);
    
    expect(result.shouldNotify).toBe(true);
    expect(result.missingFields).toContain('one');
    expect(result.missingFields).toContain('isps');
    expect(result.missingFields).toContain('loneiva');
    expect(result.omcDateValue).toBe('2025-01-01');
  });

  it('should return shouldNotify: false when all required fields are complete', async () => {
    // Mock today as 2025-01-04 (3 days after ÖMC date)
    const mockDate = new Date('2025-01-04T07:00:00Z');
    vi.useFakeTimers({ now: mockDate });

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { date_value: '2025-01-01' },
              error: null,
            }),
          })),
        })),
      })),
    };

    vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

    const employee = createMockEmployee({ 
      omc_date: 'omc-uuid-1',
      omc_masterdata_reminder_sent_at: null,
      // All required fields complete
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
    
    const result = await evaluateOmcMasterdataCompletion(employee);
    
    expect(result.shouldNotify).toBe(false);
    expect(result.missingFields).toEqual([]);
    expect(result.omcDateValue).toBe('2025-01-01');
  });

  it('should return shouldNotify: false when notification already sent for same omc_date', async () => {
    // Mock today as 2025-01-04 (3 days after ÖMC date)
    const mockDate = new Date('2025-01-04T07:00:00Z');
    vi.useFakeTimers({ now: mockDate });

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { date_value: '2025-01-01' },
              error: null,
            }),
          })),
        })),
      })),
    };

    vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

    const employee = createMockEmployee({ 
      omc_date: 'omc-uuid-1',
      // Notification was sent on 2025-01-02 (after ÖMC date)
      omc_masterdata_reminder_sent_at: '2025-01-02T07:00:00Z',
      one: false, // Missing field, but notification already sent
    });
    
    const result = await evaluateOmcMasterdataCompletion(employee);
    
    expect(result.shouldNotify).toBe(false);
    expect(result.omcDateValue).toBe('2025-01-01');
  });

  it('should return shouldNotify: true when omc_date changed after notification was sent', async () => {
    // Mock today as 2025-01-10 (9 days after new ÖMC date)
    const mockDate = new Date('2025-01-10T07:00:00Z');
    vi.useFakeTimers({ now: mockDate });

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { date_value: '2025-01-01' }, // New ÖMC date
              error: null,
            }),
          })),
        })),
      })),
    };

    vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

    const employee = createMockEmployee({ 
      omc_date: 'omc-uuid-2', // Different UUID (new ÖMC date)
      // Notification was sent for old ÖMC date
      omc_masterdata_reminder_sent_at: '2024-12-20T07:00:00Z',
      one: false, // Missing field
    });
    
    const result = await evaluateOmcMasterdataCompletion(employee);
    
    // Should notify because omc_date changed (new evaluation needed)
    expect(result.shouldNotify).toBe(true);
    expect(result.missingFields).toContain('one');
    expect(result.omcDateValue).toBe('2025-01-01');
  });

  it('should handle timezone correctly for Stockholm timezone', async () => {
    // Mock today as 2025-01-04 07:00 Stockholm time (which is 06:00 UTC in winter)
    // This tests that the function uses Stockholm timezone for date calculations
    const mockDate = new Date('2025-01-04T06:00:00Z'); // UTC equivalent of 07:00 Stockholm
    vi.useFakeTimers({ now: mockDate });

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { date_value: '2025-01-01' },
              error: null,
            }),
          })),
        })),
      })),
    };

    vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

    const employee = createMockEmployee({ 
      omc_date: 'omc-uuid-1',
      omc_masterdata_reminder_sent_at: null,
      one: false,
    });
    
    const result = await evaluateOmcMasterdataCompletion(employee);
    
    // Should notify because 3 calendar days have passed in Stockholm timezone
    expect(result.shouldNotify).toBe(true);
    expect(result.missingFields).toContain('one');
  });
});

