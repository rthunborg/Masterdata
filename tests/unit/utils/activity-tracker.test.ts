import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateUserActivity } from '@/lib/server/utils/activity-tracker';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      })),
    })),
  })),
}));

describe('updateUserActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Threshold logic', () => {
    it('should update activity if last_active_at is null (never logged in)', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const mockSingle = vi.fn(() => ({ 
        data: { id: 'user-123', last_active_at: null }, 
        error: null 
      }));
      const mockEq = vi.fn(() => ({ single: mockSingle }));
      const mockSelect = vi.fn(() => ({ eq: mockEq }));
      const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }));
      const mockFrom = vi.fn((table: string) => {
        if (table === 'users') {
          return { 
            select: mockSelect,
            update: mockUpdate
          };
        }
        return {};
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (createClient as any).mockReturnValue({ from: mockFrom });

      await updateUserActivity('auth-user-123');

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should skip update if last activity < 5 minutes ago', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const recentActivity = new Date(Date.now() - 3 * 60 * 1000).toISOString();
      const mockSingle = vi.fn(() => ({ 
        data: { id: 'user-123', last_active_at: recentActivity }, 
        error: null 
      }));
      const mockEq = vi.fn(() => ({ single: mockSingle }));
      const mockSelect = vi.fn(() => ({ eq: mockEq }));
      const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }));
      const mockFrom = vi.fn((table: string) => {
        if (table === 'users') {
          return { 
            select: mockSelect,
            update: mockUpdate
          };
        }
        return {};
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (createClient as any).mockReturnValue({ from: mockFrom });

      await updateUserActivity('auth-user-123');

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should update activity if last activity > 5 minutes ago', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const oldActivity = new Date(Date.now() - 6 * 60 * 1000).toISOString();
      const mockSingle = vi.fn(() => ({ 
        data: { id: 'user-123', last_active_at: oldActivity }, 
        error: null 
      }));
      const mockEq = vi.fn(() => ({ single: mockSingle }));
      const mockSelect = vi.fn(() => ({ eq: mockEq }));
      const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }));
      const mockFrom = vi.fn((table: string) => {
        if (table === 'users') {
          return { 
            select: mockSelect,
            update: mockUpdate
          };
        }
        return {};
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (createClient as any).mockReturnValue({ from: mockFrom });

      await updateUserActivity('auth-user-123');

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should update activity exactly at 5 minute threshold', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const thresholdActivity = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const mockSingle = vi.fn(() => ({ 
        data: { id: 'user-123', last_active_at: thresholdActivity }, 
        error: null 
      }));
      const mockEq = vi.fn(() => ({ single: mockSingle }));
      const mockSelect = vi.fn(() => ({ eq: mockEq }));
      const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }));
      const mockFrom = vi.fn((table: string) => {
        if (table === 'users') {
          return { 
            select: mockSelect,
            update: mockUpdate
          };
        }
        return {};
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (createClient as any).mockReturnValue({ from: mockFrom });

      await updateUserActivity('auth-user-123');

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should skip update if user not found in database', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const mockSingle = vi.fn(() => ({ 
        data: null, 
        error: { message: 'User not found' }
      }));
      const mockEq = vi.fn(() => ({ single: mockSingle }));
      const mockSelect = vi.fn(() => ({ eq: mockEq }));
      const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }));
      const mockFrom = vi.fn((table: string) => {
        if (table === 'users') {
          return { 
            select: mockSelect,
            update: mockUpdate
          };
        }
        return {};
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (createClient as any).mockReturnValue({ from: mockFrom });

      await updateUserActivity('auth-user-123');

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should throw error on database update failure', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const mockSingle = vi.fn(() => ({ 
        data: { id: 'user-123', last_active_at: null }, 
        error: null 
      }));
      const mockEq = vi.fn(() => ({ single: mockSingle }));
      const mockSelect = vi.fn(() => ({ eq: mockEq }));
      const mockUpdateEq = vi.fn(() => ({ error: { message: 'Database error' } }));
      const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));
      const mockFrom = vi.fn((table: string) => {
        if (table === 'users') {
          return { 
            select: mockSelect,
            update: mockUpdate
          };
        }
        return {};
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (createClient as any).mockReturnValue({ from: mockFrom });

      await expect(updateUserActivity('auth-user-123')).rejects.toThrow(
        'Failed to update user activity: Database error'
      );
    });
  });
});
