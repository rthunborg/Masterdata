/**
 * Integration Tests: ÖMC Masterdata Reminder Notification Service
 * Story: 14.1 - ÖMC + Masterdata Completion Follow-up
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sendOmcMasterdataReminder,
  getHrAdminEmails,
} from '@/lib/services/omc-masterdata-reminder';
import { Employee } from '@/lib/types/employee';
import * as supabaseServer from '@/lib/supabase/server';
import * as emailService from '@/lib/services/email-service';

vi.mock('@/lib/supabase/server');
vi.mock('@/lib/services/email-service');

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

describe('ÖMC Masterdata Reminder Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getHrAdminEmails', () => {
    it('should return HR admin email addresses', async () => {
      const mockHrAdmins = [
        { email: 'admin1@example.com' },
        { email: 'admin2@example.com' },
      ];

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              not: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: mockHrAdmins,
                  error: null,
                }),
              })),
            })),
          })),
        })),
      };

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

      const emails = await getHrAdminEmails();

      expect(emails).toEqual(['admin1@example.com', 'admin2@example.com']);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
    });

    it('should return empty array when no HR admins exist', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              not: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              })),
            })),
          })),
        })),
      };

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

      const emails = await getHrAdminEmails();

      expect(emails).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              not: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' },
                }),
              })),
            })),
          })),
        })),
      };

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

      const emails = await getHrAdminEmails();

      expect(emails).toEqual([]);
    });

    it('should query for both hr_admin and recruiter roles', async () => {
      const inSpy = vi.fn(() => ({
        not: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        })),
      }));

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            in: inSpy,
          })),
        })),
      };

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

      await getHrAdminEmails();

      expect(inSpy).toHaveBeenCalledWith('role', ['hr_admin', 'recruiter']);
    });
  });

  describe('sendOmcMasterdataReminder', () => {
    it('should send notification email to all HR admins', async () => {
      const employee = createMockEmployee();
      const missingFields = ['one', 'isps', 'loneiva'];
      const omcDateValue = '2025-01-01';

      // Mock HR admin emails
      const mockHrAdmins = [
        { email: 'admin1@example.com' },
        { email: 'admin2@example.com' },
      ];

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'users') {
            return {
              select: vi.fn(() => ({
                in: vi.fn(() => ({
                  not: vi.fn(() => ({
                    eq: vi.fn().mockResolvedValue({
                      data: mockHrAdmins,
                      error: null,
                    }),
                  })),
                })),
              })),
            };
          } else if (table === 'employees') {
            return {
              update: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              })),
            };
          }
          return {};
        }),
      };

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

      // Mock email service
      vi.mocked(emailService.sendEmailToMultiple).mockResolvedValue([
        { success: true, messageId: 'msg-1' },
        { success: true, messageId: 'msg-2' },
      ]);

      const result = await sendOmcMasterdataReminder(employee, missingFields, omcDateValue);

      expect(result).toBe(true);
      expect(emailService.sendEmailToMultiple).toHaveBeenCalledWith(
        ['admin1@example.com', 'admin2@example.com'],
        expect.stringContaining('John Doe'),
        expect.stringContaining('2025-01-01'),
        expect.any(String) // HTML content
      );
    });

    it('should update notification marker in database after sending', async () => {
      const employee = createMockEmployee();
      const missingFields = ['one'];
      const omcDateValue = '2025-01-01';

      const mockHrAdmins = [{ email: 'admin1@example.com' }];

      let updateCalled = false;
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'users') {
            return {
              select: vi.fn(() => ({
                in: vi.fn(() => ({
                  not: vi.fn(() => ({
                    eq: vi.fn().mockResolvedValue({
                      data: mockHrAdmins,
                      error: null,
                    }),
                  })),
                })),
              })),
            };
          } else if (table === 'employees') {
            return {
              update: vi.fn((data: any) => {
                updateCalled = true;
                expect(data.omc_masterdata_reminder_sent_at).toBeDefined();
                return {
                  eq: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                };
              }),
            };
          }
          return {};
        }),
      };

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);
      vi.mocked(emailService.sendEmailToMultiple).mockResolvedValue([
        { success: true, messageId: 'msg-1' },
      ]);

      await sendOmcMasterdataReminder(employee, missingFields, omcDateValue);

      expect(updateCalled).toBe(true);
    });

    it('should return false when no HR admin emails found', async () => {
      const employee = createMockEmployee();
      const missingFields = ['one'];
      const omcDateValue = '2025-01-01';

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'users') {
            return {
              select: vi.fn(() => ({
                in: vi.fn(() => ({
                  not: vi.fn(() => ({
                    eq: vi.fn().mockResolvedValue({
                      data: [],
                      error: null,
                    }),
                  })),
                })),
              })),
            };
          }
          return {};
        }),
      };

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

      const result = await sendOmcMasterdataReminder(employee, missingFields, omcDateValue);

      expect(result).toBe(false);
      expect(emailService.sendEmailToMultiple).not.toHaveBeenCalled();
    });

    it('should return false when email sending fails', async () => {
      const employee = createMockEmployee();
      const missingFields = ['one'];
      const omcDateValue = '2025-01-01';

      const mockHrAdmins = [{ email: 'admin1@example.com' }];

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'users') {
            return {
              select: vi.fn(() => ({
                in: vi.fn(() => ({
                  not: vi.fn(() => ({
                    eq: vi.fn().mockResolvedValue({
                      data: mockHrAdmins,
                      error: null,
                    }),
                  })),
                })),
              })),
            };
          }
          return {};
        }),
      };

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);
      vi.mocked(emailService.sendEmailToMultiple).mockResolvedValue([
        { success: false, error: 'SMTP error' },
      ]);

      const result = await sendOmcMasterdataReminder(employee, missingFields, omcDateValue);

      expect(result).toBe(false);
    });

    it('should handle marker update failure gracefully', async () => {
      const employee = createMockEmployee();
      const missingFields = ['one'];
      const omcDateValue = '2025-01-01';

      const mockHrAdmins = [{ email: 'admin1@example.com' }];

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'users') {
            return {
              select: vi.fn(() => ({
                in: vi.fn(() => ({
                  not: vi.fn(() => ({
                    eq: vi.fn().mockResolvedValue({
                      data: mockHrAdmins,
                      error: null,
                    }),
                  })),
                })),
              })),
            };
          } else if (table === 'employees') {
            return {
              update: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Update failed' },
                }),
              })),
            };
          }
          return {};
        }),
      };

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);
      vi.mocked(emailService.sendEmailToMultiple).mockResolvedValue([
        { success: true, messageId: 'msg-1' },
      ]);

      // Should still return true even if marker update fails (email was sent)
      const result = await sendOmcMasterdataReminder(employee, missingFields, omcDateValue);

      expect(result).toBe(true);
    });

    it('should include all missing fields in email content', async () => {
      const employee = createMockEmployee();
      const missingFields = ['one', 'isps', 'photo', 'loneiva'];
      const omcDateValue = '2025-01-01';

      const mockHrAdmins = [{ email: 'admin1@example.com' }];

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'users') {
            return {
              select: vi.fn(() => ({
                in: vi.fn(() => ({
                  not: vi.fn(() => ({
                    eq: vi.fn().mockResolvedValue({
                      data: mockHrAdmins,
                      error: null,
                    }),
                  })),
                })),
              })),
            };
          } else if (table === 'employees') {
            return {
              update: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              })),
            };
          }
          return {};
        }),
      };

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);
      vi.mocked(emailService.sendEmailToMultiple).mockResolvedValue([
        { success: true, messageId: 'msg-1' },
      ]);

      await sendOmcMasterdataReminder(employee, missingFields, omcDateValue);

      const callArgs = vi.mocked(emailService.sendEmailToMultiple).mock.calls[0];
      const emailText = callArgs[2] as string; // callArgs[2] is the text body, not subject

      // Check that all missing fields are mentioned (using display names)
      expect(emailText).toContain('One');
      expect(emailText).toContain('ISPS');
      expect(emailText).toContain('Photo');
      expect(emailText).toContain('Lönenivå');
    });
  });
});
