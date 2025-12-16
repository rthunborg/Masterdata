/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Integration Tests: ÖMC Masterdata Reminder Scheduled Job
 * Story: 14.1 - ÖMC + Masterdata Completion Follow-up
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/cron/omc-masterdata-reminder/route';
import { NextRequest } from 'next/server';
import * as supabaseServer from '@/lib/supabase/server';
import * as omcReminderService from '@/lib/services/omc-masterdata-reminder';
import { Employee } from '@/lib/types/employee';

vi.mock('@/lib/supabase/server');
vi.mock('@/lib/services/omc-masterdata-reminder');

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
    omc_date: 'omc-uuid-1',
    pe3_date: null,
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    repayment_needed_omc: null,
    repayment_needed_pe3: null,
    comments: null,
    one: false,
    one_marked_at: null,
    talmundo: true,
    isps: false,
    photo: true,
    origo: true,
    loneiva: null,
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

describe('ÖMC Masterdata Reminder Scheduled Job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default environment
    process.env.CRON_SECRET = 'test-secret';
    process.env.NODE_ENV = 'test';
  });

  describe('Authentication', () => {
    it('should reject unauthorized requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/cron/omc-masterdata-reminder', {
        headers: {
          authorization: 'Bearer wrong-secret',
        },
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });

    it('should accept authorized requests with correct secret', async () => {
      const mockEmployees: Employee[] = [];

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            not: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: mockEmployees,
                  error: null,
                }),
              })),
            })),
          })),
        })),
      };

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/api/cron/omc-masterdata-reminder', {
        headers: {
          authorization: 'Bearer test-secret',
        },
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it('should reject requests without authorization header in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.CRON_SECRET = 'prod-secret';

      const request = new NextRequest('http://localhost:3000/api/cron/omc-masterdata-reminder');

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe('Unauthorized');

      // Reset
      process.env.NODE_ENV = 'test';
    });
  });

  describe('Job Execution', () => {
    it('should query eligible employees', async () => {
      const mockEmployees: Employee[] = [
        createMockEmployee({ id: 'emp-1', omc_date: 'omc-uuid-1' }),
        createMockEmployee({ id: 'emp-2', omc_date: 'omc-uuid-2' }),
      ];

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            not: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: mockEmployees,
                  error: null,
                }),
              })),
            })),
          })),
        })),
      };

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);
      vi.mocked(omcReminderService.evaluateOmcMasterdataCompletion).mockResolvedValue({
        shouldNotify: false,
        missingFields: [],
        omcDateValue: null,
      });

      const request = new NextRequest('http://localhost:3000/api/cron/omc-masterdata-reminder', {
        headers: {
          authorization: 'Bearer test-secret',
        },
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.stats.totalEmployees).toBe(2);
      expect(mockSupabase.from).toHaveBeenCalledWith('employees');
    });

    it('should send notifications for eligible employees', async () => {
      const employee1 = createMockEmployee({ id: 'emp-1', omc_date: 'omc-uuid-1' });
      const employee2 = createMockEmployee({ id: 'emp-2', omc_date: 'omc-uuid-2' });

      const mockEmployees: Employee[] = [employee1, employee2];

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            not: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: mockEmployees,
                  error: null,
                }),
              })),
            })),
          })),
        })),
      };

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

      // First employee needs notification
      vi.mocked(omcReminderService.evaluateOmcMasterdataCompletion)
        .mockResolvedValueOnce({
          shouldNotify: true,
          missingFields: ['one', 'isps'],
          omcDateValue: '2025-01-01',
        })
        // Second employee doesn't need notification
        .mockResolvedValueOnce({
          shouldNotify: false,
          missingFields: [],
          omcDateValue: '2025-01-01',
        });

      vi.mocked(omcReminderService.sendOmcMasterdataReminder).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/cron/omc-masterdata-reminder', {
        headers: {
          authorization: 'Bearer test-secret',
        },
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.stats.notified).toBe(1);
      expect(json.stats.processed).toBe(1); // Only employees that needed notification are counted as processed
      expect(omcReminderService.sendOmcMasterdataReminder).toHaveBeenCalledTimes(1);
      expect(omcReminderService.sendOmcMasterdataReminder).toHaveBeenCalledWith(
        employee1,
        ['one', 'isps'],
        '2025-01-01'
      );
    });

    it('should not send notifications if no employees need them', async () => {
      const mockEmployees: Employee[] = [
        createMockEmployee({ id: 'emp-1' }),
      ];

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            not: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: mockEmployees,
                  error: null,
                }),
              })),
            })),
          })),
        })),
      };

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);
      vi.mocked(omcReminderService.evaluateOmcMasterdataCompletion).mockResolvedValue({
        shouldNotify: false,
        missingFields: [],
        omcDateValue: '2025-01-01',
      });

      const request = new NextRequest('http://localhost:3000/api/cron/omc-masterdata-reminder', {
        headers: {
          authorization: 'Bearer test-secret',
        },
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.stats.notified).toBe(0);
      expect(omcReminderService.sendOmcMasterdataReminder).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully and continue processing', async () => {
      const employee1 = createMockEmployee({ id: 'emp-1' });
      const employee2 = createMockEmployee({ id: 'emp-2' });

      const mockEmployees: Employee[] = [employee1, employee2];

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            not: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: mockEmployees,
                  error: null,
                }),
              })),
            })),
          })),
        })),
      };

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

      // First employee throws error
      vi.mocked(omcReminderService.evaluateOmcMasterdataCompletion)
        .mockRejectedValueOnce(new Error('Evaluation failed'))
        // Second employee succeeds
        .mockResolvedValueOnce({
          shouldNotify: true,
          missingFields: ['one'],
          omcDateValue: '2025-01-01',
        });

      vi.mocked(omcReminderService.sendOmcMasterdataReminder).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/cron/omc-masterdata-reminder', {
        headers: {
          authorization: 'Bearer test-secret',
        },
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.stats.errors).toBe(1);
      expect(json.stats.notified).toBe(1);
      expect(json.errors).toBeDefined();
      expect(json.errors).toEqual(expect.arrayContaining([expect.stringContaining('emp-1')]));
    });

    it('should log job execution statistics', async () => {
      const mockEmployees: Employee[] = [];

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            not: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: mockEmployees,
                  error: null,
                }),
              })),
            })),
          })),
        })),
      };

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

      const request = new NextRequest('http://localhost:3000/api/cron/omc-masterdata-reminder', {
        headers: {
          authorization: 'Bearer test-secret',
        },
      });

      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.jobId).toBeDefined();
      expect(json.duration).toBeDefined();
      expect(json.stats).toEqual({
        totalEmployees: 0,
        processed: 0,
        notified: 0,
        errors: 0,
      });
    });
  });
});

