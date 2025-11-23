/**
 * Unit Tests: Notification Idempotency
 * Story: 14.2 - PE3 Deadline Notifications (Submit / Cancel)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  hasPe3NotificationBeenSent,
} from '@/lib/services/pe3-deadline-notifications';
import * as supabaseServer from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server');

describe('hasPe3NotificationBeenSent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false when notification has not been sent', async () => {
    const deadlineType = 'submit';
    const deadlineDate = '2025-02-10';

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116', message: 'No rows found' },
                }),
              })),
            })),
          })),
        })),
      })),
    };

    vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

    const result = await hasPe3NotificationBeenSent(deadlineType, deadlineDate);

    expect(result).toBe(false);
    expect(mockSupabase.from).toHaveBeenCalledWith('pe3_notifications_log');
  });

  it('should return true when notification has already been sent', async () => {
    const deadlineType = 'submit';
    const deadlineDate = '2025-02-10';

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'log-123' },
                  error: null,
                }),
              })),
            })),
          })),
        })),
      })),
    };

    vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

    const result = await hasPe3NotificationBeenSent(deadlineType, deadlineDate);

    expect(result).toBe(true);
  });

  it('should check submit deadline type correctly', async () => {
    const deadlineType = 'submit';
    const deadlineDate = '2025-02-10';

    let capturedDeadlineType: string | undefined;

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn((field: string, value: string) => {
            if (field === 'deadline_type') {
              capturedDeadlineType = value;
            }
            return {
              eq: vi.fn(() => ({
                limit: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116' },
                  }),
                })),
              })),
            };
          }),
        })),
      })),
    };

    vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

    await hasPe3NotificationBeenSent(deadlineType, deadlineDate);

    expect(capturedDeadlineType).toBe('submit');
  });

  it('should check cancel deadline type correctly', async () => {
    const deadlineType = 'cancel';
    const deadlineDate = '2025-02-12';

    let capturedDeadlineType: string | undefined;

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn((field: string, value: string) => {
            if (field === 'deadline_type') {
              capturedDeadlineType = value;
            }
            return {
              eq: vi.fn(() => ({
                limit: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116' },
                  }),
                })),
              })),
            };
          }),
        })),
      })),
    };

    vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

    await hasPe3NotificationBeenSent(deadlineType, deadlineDate);

    expect(capturedDeadlineType).toBe('cancel');
  });

  it('should handle database errors gracefully and return false', async () => {
    const deadlineType = 'submit';
    const deadlineDate = '2025-02-10';

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'OTHER_ERROR', message: 'Database error' },
                }),
              })),
            })),
          })),
        })),
      })),
    };

    vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

    const result = await hasPe3NotificationBeenSent(deadlineType, deadlineDate);

    // On error, should return false to allow retry
    expect(result).toBe(false);
  });

  it('should check separate notifications for submit and cancel (even if same day)', async () => {
    const sameDate = '2025-02-10';

    // Mock: submit notification sent, cancel notification not sent
    let callCount = 0;
    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(() => ({
                single: vi.fn().mockImplementation(() => {
                  callCount++;
                  // First call (submit): notification sent
                  if (callCount === 1) {
                    return Promise.resolve({
                      data: { id: 'log-1' },
                      error: null,
                    });
                  }
                  // Second call (cancel): notification not sent
                  return Promise.resolve({
                    data: null,
                    error: { code: 'PGRST116' },
                  });
                }),
              })),
            })),
          })),
        })),
      })),
    };

    vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

    const submitResult = await hasPe3NotificationBeenSent('submit', sameDate);
    const cancelResult = await hasPe3NotificationBeenSent('cancel', sameDate);

    expect(submitResult).toBe(true);
    expect(cancelResult).toBe(false);
  });
});

