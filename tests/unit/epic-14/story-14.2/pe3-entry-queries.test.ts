/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Unit Tests: PE3 Entry Queries
 * Story: 14.2 - PE3 Deadline Notifications (Submit / Cancel)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getPe3EntriesForSubmitDeadline,
  getPe3EntriesForCancelDeadline,
} from '@/lib/services/pe3-deadline-notifications';
import * as supabaseServer from '@/lib/supabase/server';
import { Pe3EntryWithEmployee } from '@/lib/services/pe3-deadline-notifications';

vi.mock('@/lib/supabase/server');

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

describe('getPe3EntriesForSubmitDeadline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return PE3 entries with submit deadline = today', async () => {
    const today = '2025-02-10';
    const mockEntries = [
      createMockPe3Entry({ deadline_submit: today }),
      createMockPe3Entry({ id: 'pe3-456', deadline_submit: today }),
    ];

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn((field: string, value: string) => {
            if (field === 'category') {
              return {
                eq: vi.fn((field2: string, value2: string) => {
                  if (field2 === 'deadline_submit') {
                    return {
                      eq: vi.fn().mockResolvedValue({
                        data: mockEntries,
                        error: null,
                      }),
                    };
                  }
                  return { eq: vi.fn() };
                }),
              };
            }
            return { eq: vi.fn() };
          }),
        })),
      })),
    };

    vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

    const result = await getPe3EntriesForSubmitDeadline(today);

    expect(result).toEqual(mockEntries);
    expect(mockSupabase.from).toHaveBeenCalledWith('important_dates');
  });

  it('should include employee names when assigned', async () => {
    const today = '2025-02-10';
    const mockEntry = createMockPe3Entry({
      deadline_submit: today,
      assigned_employees: [
        { id: 'emp-1', name: 'John Doe' },
        { id: 'emp-2', name: 'Jane Smith' },
      ],
    });

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [mockEntry],
                error: null,
              }),
            })),
          })),
        })),
      })),
    };

    vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

    const result = await getPe3EntriesForSubmitDeadline(today);

    expect(result).toHaveLength(1);
    expect(result[0].assigned_employees).toHaveLength(2);
    expect(result[0].assigned_employees[0].name).toBe('John Doe');
    expect(result[0].assigned_employees[1].name).toBe('Jane Smith');
  });

  it('should return "Unassigned" when no employee assigned', async () => {
    const today = '2025-02-10';
    const mockEntry = createMockPe3Entry({
      deadline_submit: today,
      assigned_employees: [],
    });

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [mockEntry],
                error: null,
              }),
            })),
          })),
        })),
      })),
    };

    vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

    const result = await getPe3EntriesForSubmitDeadline(today);

    expect(result).toHaveLength(1);
    expect(result[0].assigned_employees).toEqual([]);
  });

  it('should return empty array when no entries match', async () => {
    const today = '2025-02-10';

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
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

    const result = await getPe3EntriesForSubmitDeadline(today);

    expect(result).toEqual([]);
  });

  it('should handle database errors gracefully', async () => {
    const today = '2025-02-10';

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
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

    const result = await getPe3EntriesForSubmitDeadline(today);

    expect(result).toEqual([]);
  });
});

describe('getPe3EntriesForCancelDeadline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return PE3 entries with cancel deadline = today', async () => {
    const today = '2025-02-12';
    const mockEntries = [
      createMockPe3Entry({ deadline_cancel: today }),
      createMockPe3Entry({ id: 'pe3-456', deadline_cancel: today }),
    ];

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn((field: string, value: string) => {
            if (field === 'category') {
              return {
                eq: vi.fn((field2: string, value2: string) => {
                  if (field2 === 'deadline_cancel') {
                    return {
                      eq: vi.fn().mockResolvedValue({
                        data: mockEntries,
                        error: null,
                      }),
                    };
                  }
                  return { eq: vi.fn() };
                }),
              };
            }
            return { eq: vi.fn() };
          }),
        })),
      })),
    };

    vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

    const result = await getPe3EntriesForCancelDeadline(today);

    expect(result).toEqual(mockEntries);
    expect(mockSupabase.from).toHaveBeenCalledWith('important_dates');
  });

  it('should include employee names when assigned', async () => {
    const today = '2025-02-12';
    const mockEntry = createMockPe3Entry({
      deadline_cancel: today,
      assigned_employees: [
        { id: 'emp-1', name: 'John Doe' },
      ],
    });

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [mockEntry],
                error: null,
              }),
            })),
          })),
        })),
      })),
    };

    vi.mocked(supabaseServer.createServiceRoleClient).mockReturnValue(mockSupabase as any);

    const result = await getPe3EntriesForCancelDeadline(today);

    expect(result).toHaveLength(1);
    expect(result[0].assigned_employees).toHaveLength(1);
    expect(result[0].assigned_employees[0].name).toBe('John Doe');
  });

  it('should return empty array when no entries match', async () => {
    const today = '2025-02-12';

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
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

    const result = await getPe3EntriesForCancelDeadline(today);

    expect(result).toEqual([]);
  });

  it('should handle database errors gracefully', async () => {
    const today = '2025-02-12';

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
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

    const result = await getPe3EntriesForCancelDeadline(today);

    expect(result).toEqual([]);
  });
});

