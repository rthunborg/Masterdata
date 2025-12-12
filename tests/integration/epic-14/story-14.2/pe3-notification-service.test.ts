/**
 * Integration Tests: PE3 Deadline Notification Service
 * Story: 14.2 - PE3 Deadline Notifications (Submit / Cancel)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sendPe3SubmitDeadlineNotification,
  sendPe3CancelDeadlineNotification,
  getPe3EntriesForSubmitDeadline,
  getPe3EntriesForCancelDeadline,
} from '@/lib/services/pe3-deadline-notifications';
import * as supabaseServer from '@/lib/supabase/server';
import * as emailService from '@/lib/services/email-service';
import { Pe3EntryWithEmployee } from '@/lib/services/pe3-deadline-notifications';
import { SupabaseClient } from '@supabase/supabase-js';

vi.mock('@/lib/supabase/server');
vi.mock('@/lib/services/email-service');

function createMockPe3Entry(overrides: Partial<Pe3EntryWithEmployee> = {}): Pe3EntryWithEmployee {
  return {
    id: 'pe3-123',
    date_description: 'Fredag 14/2',
    date_value: '2025-02-14',
    time_value: '14:30',
    deadline_submit: '2025-02-10',
    deadline_cancel: '2025-02-12',
    assigned_employees: [
      { id: 'emp-1', name: 'John Doe' },
    ],
    ...overrides,
  };
}

describe('PE3 Deadline Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendPe3SubmitDeadlineNotification', () => {
    it('should send submit notification when deadline matches', async () => {
      const entries = [
        createMockPe3Entry({ deadline_submit: '2025-02-10' }),
      ];
      const today = '2025-02-10';

      // Mock notification not already sent
      let notificationCheckCount = 0;
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'pe3_notifications_log') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({
                        data: null,
                        error: { code: 'PGRST116' },
                      }),
                    })),
                  })),
                })),
              })),
              insert: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            };
          } else if (table === 'users') {
            return {
              select: vi.fn(() => ({
                in: vi.fn(() => ({
                  not: vi.fn(() => ({
                    eq: vi.fn().mockResolvedValue({
                      data: [{ email: 'admin1@example.com' }, { email: 'admin2@example.com' }],
                      error: null,
                    }),
                  })),
                })),
              })),
            };
          } else if (table === 'pe3_notifications_log') {
            // Check if this is a select (checking if already sent) or insert (logging)
            // We'll handle both in the same mock
            const mockChain = {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({
                        data: null,
                        error: { code: 'PGRST116' },
                      }),
                    })),
                  })),
                })),
              })),
              insert: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            };
            return mockChain;
          }
          return {};
        }),
      };

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as unknown as SupabaseClient);
      vi.mocked(emailService.sendEmailToMultiple).mockResolvedValue([
        { success: true, messageId: 'msg-1' },
        { success: true, messageId: 'msg-2' },
      ]);

      const result = await sendPe3SubmitDeadlineNotification(entries, today);

      expect(result).toBe(true);
      expect(emailService.sendEmailToMultiple).toHaveBeenCalledWith(
        ['admin1@example.com', 'admin2@example.com'],
        'PE3 deadline today – last date to submit spots',
        expect.stringContaining('2025-02-10'),
        expect.stringContaining('submit')
      );
    });

    it('should send cancel notification when deadline matches', async () => {
      const entries = [
        createMockPe3Entry({ deadline_cancel: '2025-02-12' }),
      ];
      const today = '2025-02-12';

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'pe3_notifications_log') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({
                        data: null,
                        error: { code: 'PGRST116' },
                      }),
                    })),
                  })),
                })),
              })),
              insert: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            };
          } else if (table === 'users') {
            return {
              select: vi.fn(() => ({
                in: vi.fn(() => ({
                  not: vi.fn(() => ({
                    eq: vi.fn().mockResolvedValue({
                      data: [{ email: 'admin1@example.com' }],
                      error: null,
                    }),
                  })),
                })),
              })),
            };
          } else if (table === 'pe3_notifications_log') {
            const mockChain = {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({
                        data: null,
                        error: { code: 'PGRST116' },
                      }),
                    })),
                  })),
                })),
              })),
              insert: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            };
            return mockChain;
          }
          return {};
        }),
      };

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as unknown as SupabaseClient);
      vi.mocked(emailService.sendEmailToMultiple).mockResolvedValue([
        { success: true, messageId: 'msg-1' },
      ]);

      const result = await sendPe3CancelDeadlineNotification(entries, today);

      expect(result).toBe(true);
      expect(emailService.sendEmailToMultiple).toHaveBeenCalledWith(
        ['admin1@example.com'],
        'PE3 deadline today – last date to cancel spots',
        expect.stringContaining('2025-02-12'),
        expect.stringContaining('cancel')
      );
    });

    it('should log notification in database after sending', async () => {
      const entries = [createMockPe3Entry()];
      const today = '2025-02-10';

      let insertCalled = false;
      const mockInsert = vi.fn((data: { deadline_type: string; deadline_date: string }) => {
        insertCalled = true;
        expect(data.deadline_type).toBe('submit');
        expect(data.deadline_date).toBe(today);
        return Promise.resolve({
          data: null,
          error: null,
        });
      });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'pe3_notifications_log') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({
                        data: null,
                        error: { code: 'PGRST116' },
                      }),
                    })),
                  })),
                })),
              })),
              insert: mockInsert,
            };
          } else if (table === 'users') {
            return {
              select: vi.fn(() => ({
                in: vi.fn(() => ({
                  not: vi.fn(() => ({
                    eq: vi.fn().mockResolvedValue({
                      data: [{ email: 'admin1@example.com' }],
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

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as unknown as SupabaseClient);
      vi.mocked(emailService.sendEmailToMultiple).mockResolvedValue([
        { success: true, messageId: 'msg-1' },
      ]);

      await sendPe3SubmitDeadlineNotification(entries, today);

      expect(insertCalled).toBe(true);
    });

    it('should not send duplicate notifications', async () => {
      const entries = [createMockPe3Entry()];
      const today = '2025-02-10';

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'pe3_notifications_log') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({
                        data: { id: 'log-123' }, // Notification already sent
                        error: null,
                      }),
                    })),
                  })),
                })),
              })),
            };
          }
          return {};
        }),
      };

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as unknown as SupabaseClient);

      const result = await sendPe3SubmitDeadlineNotification(entries, today);

      expect(result).toBe(true); // Returns true if already sent
      expect(emailService.sendEmailToMultiple).not.toHaveBeenCalled();
    });

    it('should send both notifications if both deadlines same day', async () => {
      const submitEntries = [createMockPe3Entry({ deadline_submit: '2025-02-10' })];
      const cancelEntries = [createMockPe3Entry({ deadline_cancel: '2025-02-10' })];
      const today = '2025-02-10';

      let callCount = 0;
      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'pe3_notifications_log') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({
                        data: null,
                        error: { code: 'PGRST116' },
                      }),
                    })),
                  })),
                })),
              })),
              insert: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            };
          } else if (table === 'users') {
            return {
              select: vi.fn(() => ({
                in: vi.fn(() => ({
                  not: vi.fn(() => ({
                    eq: vi.fn().mockResolvedValue({
                      data: [{ email: 'admin1@example.com' }],
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

      // Fix the pe3_notifications_log mock to support both select and insert
      const originalFrom = mockSupabase.from;
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'pe3_notifications_log') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: null,
                      error: { code: 'PGRST116' },
                    }),
                  })),
                })),
              })),
            })),
            insert: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          };
        }
        return originalFrom(table);
      });

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as unknown as SupabaseClient);
      vi.mocked(emailService.sendEmailToMultiple).mockResolvedValue([
        { success: true, messageId: 'msg-1' },
      ]);

      const submitResult = await sendPe3SubmitDeadlineNotification(submitEntries, today);
      const cancelResult = await sendPe3CancelDeadlineNotification(cancelEntries, today);

      expect(submitResult).toBe(true);
      expect(cancelResult).toBe(true);
      expect(emailService.sendEmailToMultiple).toHaveBeenCalledTimes(2);
    });

    it('should return false when no HR admin emails found', async () => {
      const entries = [createMockPe3Entry()];
      const today = '2025-02-10';

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'pe3_notifications_log') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({
                        data: null,
                        error: { code: 'PGRST116' },
                      }),
                    })),
                  })),
                })),
              })),
              insert: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            };
          } else if (table === 'users') {
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

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as unknown as SupabaseClient);

      const result = await sendPe3SubmitDeadlineNotification(entries, today);

      expect(result).toBe(false);
      expect(emailService.sendEmailToMultiple).not.toHaveBeenCalled();
    });

    it('should handle email sending failures gracefully', async () => {
      const entries = [createMockPe3Entry()];
      const today = '2025-02-10';

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === 'pe3_notifications_log') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({
                        data: null,
                        error: { code: 'PGRST116' },
                      }),
                    })),
                  })),
                })),
              })),
              insert: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            };
          } else if (table === 'users') {
            return {
              select: vi.fn(() => ({
                in: vi.fn(() => ({
                  not: vi.fn(() => ({
                    eq: vi.fn().mockResolvedValue({
                      data: [{ email: 'admin1@example.com' }],
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

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as unknown as SupabaseClient);
      vi.mocked(emailService.sendEmailToMultiple).mockResolvedValue([
        { success: false, error: 'SMTP error' },
      ]);

      const result = await sendPe3SubmitDeadlineNotification(entries, today);

      expect(result).toBe(false);
    });
  });
});
