/**
 * Integration Tests for User Activity Tracking
 * Story 6.7: Add Last Active Timestamp to User Table
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { mockUsers } from '../../utils/role-test-utils';

vi.mock('@/lib/server/auth');
vi.mock('@/lib/server/repositories/user-repository');

describe('PATCH /api/admin/users/[id]/update-activity', () => {
  const mockRequireAuthAPI = vi.fn();
  const mockUserRepository = {
    updateLastActive: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    const auth = await import('@/lib/server/auth');
    vi.mocked(auth.requireAuthAPI).mockImplementation(mockRequireAuthAPI);
    
    const userRepository = await import('@/lib/server/repositories/user-repository');
    vi.mocked(userRepository.userRepository).mockReturnValue(mockUserRepository);
  });

  it('should update last_active_at for authenticated user', async () => {
    mockRequireAuthAPI.mockResolvedValue(mockUsers.hrAdmin);
    mockUserRepository.updateLastActive.mockResolvedValue(undefined);

    const { PATCH } = await import('@/app/api/admin/users/[id]/update-activity/route');

    const request = new NextRequest(
      'http://localhost:3000/api/admin/users/user-123/update-activity',
      { method: 'PATCH' }
    );

    const response = await PATCH(request, { params: Promise.resolve({ id: 'user-123' }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockUserRepository.updateLastActive).toHaveBeenCalledWith('user-123');
  });

  it('should return 401 for unauthenticated request', async () => {
    mockRequireAuthAPI.mockRejectedValue(new Error('Authentication required'));

    const { PATCH } = await import('@/app/api/admin/users/[id]/update-activity/route');

    const request = new NextRequest(
      'http://localhost:3000/api/admin/users/user-123/update-activity',
      { method: 'PATCH' }
    );

    const response = await PATCH(request, { params: Promise.resolve({ id: 'user-123' }) });

    expect(response.status).toBe(401);
  });
});
