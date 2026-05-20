/**
 * Integration Tests: PE3 Deadline Notification Service
 * Story: 14.2 - PE3 Deadline Notifications (Submit / Cancel)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sendPe3SubmitDeadlineNotification,
  sendPe3CancelDeadlineNotification
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

type Pe3LogSelectResult = {
  data: { id: string } | null;
  error: { code?: string; message?: string } | null;
};

type Pe3LogInsertResult = {
  data: null;
  error: { code?: string; message?: string } | null;
};

interface MockSupabaseOptions {
  emails?: string[];
  logSelectResult?: Pe3LogSelectResult;
  logInsertResult?: Pe3LogInsertResult;
  onLogInsert?: (data: { deadline_type: string; deadline_date: string; sent_at: string }) => void;
}

function createMockSupabase({
  emails = ['admin1@example.com'],
  logSelectResult = {
    data: null,
    error: { code: 'PGRST116', message: 'No rows found' },
  },
  logInsertResult = { data: null, error: null },
  onLogInsert,
}: MockSupabaseOptions = {}) {
  const insert = vi.fn((data: { deadline_type: string; deadline_date: string; sent_at: string }) => {
    onLogInsert?.(data);
    return Promise.resolve(logInsertResult);
  });

  const secondDeleteEq = vi.fn().mockResolvedValue({ data: null, error: null });
  const firstDeleteEq = vi.fn(() => ({ eq: secondDeleteEq }));
  const deleteMock = vi.fn(() => ({ eq: firstDeleteEq }));

  const client = {
    from: vi.fn((table: string) => {
      if (table === 'pe3_notifications_log') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                limit: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue(logSelectResult),
                })),
              })),
            })),
          })),
          insert,
          delete: deleteMock,
        };
      }

      if (table === 'users') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              not: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: emails.map(email => ({ email })),
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

  return {
    client: client as unknown as SupabaseClient,
    insert,
    deleteMock,
    firstDeleteEq,
    secondDeleteEq,
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
      const { client } = createMockSupabase({
        emails: ['admin1@example.com', 'admin2@example.com'],
      });

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(client);
      vi.mocked(emailService.sendEmailToMultiple).mockResolvedValue([
        { success: true, messageId: 'msg-1' },
        { success: true, messageId: 'msg-2' },
      ]);

      const result = await sendPe3SubmitDeadlineNotification(entries, today);

      expect(result).toBe(true);
      expect(emailService.sendEmailToMultiple).toHaveBeenCalledWith(
        ['admin1@example.com', 'admin2@example.com'],
        'Stena Season: PE3 deadline idag – sista dagen att skicka in platser',
        expect.stringContaining('2025-02-10'),
        expect.stringContaining('skicka in')
      );
    });

    it('should send cancel notification when deadline matches', async () => {
      const entries = [
        createMockPe3Entry({ deadline_cancel: '2025-02-12' }),
      ];
      const today = '2025-02-12';
      const { client } = createMockSupabase();

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(client);
      vi.mocked(emailService.sendEmailToMultiple).mockResolvedValue([
        { success: true, messageId: 'msg-1' },
      ]);

      const result = await sendPe3CancelDeadlineNotification(entries, today);

      expect(result).toBe(true);
      expect(emailService.sendEmailToMultiple).toHaveBeenCalledWith(
        ['admin1@example.com'],
        'Stena Season: PE3 deadline idag – sista dagen att avboka platser',
        expect.stringContaining('2025-02-12'),
        expect.stringContaining('avboka')
      );
    });

    it('should claim notification in database before sending', async () => {
      const entries = [createMockPe3Entry()];
      const today = '2025-02-10';
      const { client, insert } = createMockSupabase({
        onLogInsert: (data) => {
          expect(emailService.sendEmailToMultiple).not.toHaveBeenCalled();
          expect(data.deadline_type).toBe('submit');
          expect(data.deadline_date).toBe(today);
          expect(data.sent_at).toBeDefined();
        },
      });

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(client);
      vi.mocked(emailService.sendEmailToMultiple).mockResolvedValue([
        { success: true, messageId: 'msg-1' },
      ]);

      await sendPe3SubmitDeadlineNotification(entries, today);

      expect(insert).toHaveBeenCalledTimes(1);
    });

    it('should not send when an existing notification log is found', async () => {
      const entries = [createMockPe3Entry()];
      const today = '2025-02-10';
      const { client, insert } = createMockSupabase({
        logSelectResult: {
          data: { id: 'log-123' },
          error: null,
        },
      });

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(client);

      const result = await sendPe3SubmitDeadlineNotification(entries, today);

      expect(result).toBe(true);
      expect(insert).not.toHaveBeenCalled();
      expect(emailService.sendEmailToMultiple).not.toHaveBeenCalled();
    });

    it('should not send when another invocation already claimed the notification', async () => {
      const entries = [createMockPe3Entry()];
      const today = '2025-02-10';
      const { client, insert } = createMockSupabase({
        logInsertResult: {
          data: null,
          error: { code: '23505', message: 'duplicate key value violates unique constraint' },
        },
      });

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(client);

      const result = await sendPe3SubmitDeadlineNotification(entries, today);

      expect(result).toBe(true);
      expect(insert).toHaveBeenCalledTimes(1);
      expect(emailService.sendEmailToMultiple).not.toHaveBeenCalled();
    });

    it('should fail closed when the notification claim cannot be written', async () => {
      const entries = [createMockPe3Entry()];
      const today = '2025-02-10';
      const { client } = createMockSupabase({
        logInsertResult: {
          data: null,
          error: { code: 'DATABASE_ERROR', message: 'Database unavailable' },
        },
      });

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(client);

      const result = await sendPe3SubmitDeadlineNotification(entries, today);

      expect(result).toBe(false);
      expect(emailService.sendEmailToMultiple).not.toHaveBeenCalled();
    });

    it('should send both notifications if both deadlines same day', async () => {
      const submitEntries = [createMockPe3Entry({ deadline_submit: '2025-02-10' })];
      const cancelEntries = [createMockPe3Entry({ deadline_cancel: '2025-02-10' })];
      const today = '2025-02-10';
      const { client, insert } = createMockSupabase();

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(client);
      vi.mocked(emailService.sendEmailToMultiple).mockResolvedValue([
        { success: true, messageId: 'msg-1' },
      ]);

      const submitResult = await sendPe3SubmitDeadlineNotification(submitEntries, today);
      const cancelResult = await sendPe3CancelDeadlineNotification(cancelEntries, today);

      expect(submitResult).toBe(true);
      expect(cancelResult).toBe(true);
      expect(insert).toHaveBeenCalledTimes(2);
      expect(emailService.sendEmailToMultiple).toHaveBeenCalledTimes(2);
    });

    it('should return false when no HR admin emails found', async () => {
      const entries = [createMockPe3Entry()];
      const today = '2025-02-10';
      const { client, insert } = createMockSupabase({
        emails: [],
      });

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(client);

      const result = await sendPe3SubmitDeadlineNotification(entries, today);

      expect(result).toBe(false);
      expect(insert).not.toHaveBeenCalled();
      expect(emailService.sendEmailToMultiple).not.toHaveBeenCalled();
    });

    it('should clear the claim when every email send fails', async () => {
      const entries = [createMockPe3Entry()];
      const today = '2025-02-10';
      const { client, deleteMock, firstDeleteEq, secondDeleteEq } = createMockSupabase();

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(client);
      vi.mocked(emailService.sendEmailToMultiple).mockResolvedValue([
        { success: false, error: 'SMTP error' },
      ]);

      const result = await sendPe3SubmitDeadlineNotification(entries, today);

      expect(result).toBe(false);
      expect(deleteMock).toHaveBeenCalledTimes(1);
      expect(firstDeleteEq).toHaveBeenCalledWith('deadline_type', 'submit');
      expect(secondDeleteEq).toHaveBeenCalledWith('deadline_date', today);
    });

    it('should clear the submit claim when email sending throws before any confirmed send', async () => {
      const entries = [createMockPe3Entry()];
      const today = '2025-02-10';
      const { client, deleteMock, firstDeleteEq, secondDeleteEq } = createMockSupabase();

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(client);
      vi.mocked(emailService.sendEmailToMultiple).mockRejectedValue(new Error('Mailer crashed'));

      const result = await sendPe3SubmitDeadlineNotification(entries, today);

      expect(result).toBe(false);
      expect(deleteMock).toHaveBeenCalledTimes(1);
      expect(firstDeleteEq).toHaveBeenCalledWith('deadline_type', 'submit');
      expect(secondDeleteEq).toHaveBeenCalledWith('deadline_date', today);
    });

    it('should clear the cancel claim when email sending throws before any confirmed send', async () => {
      const entries = [createMockPe3Entry()];
      const today = '2025-02-12';
      const { client, deleteMock, firstDeleteEq, secondDeleteEq } = createMockSupabase();

      vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(client);
      vi.mocked(emailService.sendEmailToMultiple).mockRejectedValue(new Error('Mailer crashed'));

      const result = await sendPe3CancelDeadlineNotification(entries, today);

      expect(result).toBe(false);
      expect(deleteMock).toHaveBeenCalledTimes(1);
      expect(firstDeleteEq).toHaveBeenCalledWith('deadline_type', 'cancel');
      expect(secondDeleteEq).toHaveBeenCalledWith('deadline_date', today);
    });
  });
});
