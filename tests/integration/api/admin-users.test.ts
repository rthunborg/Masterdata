/**
 * Integration Tests for User Management API Routes
 * Story 5.1: User Account Management Interface
 * 
 * Tests cover:
 * - GET /api/admin/users (list users)
 * - POST /api/admin/users (create user)
 * - PATCH /api/admin/users/[id] (activate/deactivate user)
 * 
 * Authentication scenarios:
 * - 200: Successful operations for HR Admin
 * - 403: Forbidden for non-admin roles
 * - 401: Unauthorized for unauthenticated requests
 * 
 * Edge cases:
 * - 400: Validation errors (invalid email, short password)
 * - 409: Duplicate email
 * - 403: Self-deactivation prevention
 * - 404: User not found
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { UserRole } from '@/lib/types/user';
import { mockUsers } from '../../utils/role-test-utils';
import type { User } from '@/lib/types/user';

// Mock Supabase client with chainable query builder
const mockSupabaseClient = {
  rpc: vi.fn(),
  auth: {
    getSession: vi.fn(),
    admin: {
      createUser: vi.fn(),
      deleteUser: vi.fn(),
      signOut: vi.fn(),
    },
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      order: vi.fn(() => ({
        data: [],
        error: null,
      })),
      eq: vi.fn(() => ({
        single: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
    })),
  })),
};

// Create service role mock client (needs both auth and from for user management operations)
const mockServiceRoleClient = {
  rpc: vi.fn(),
  auth: {
    admin: {
      createUser: vi.fn(),
      updateUserById: vi.fn(),
      deleteUser: vi.fn(),
      signOut: vi.fn(),
    },
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      order: vi.fn(() => ({
        data: [],
        error: null,
      })),
      eq: vi.fn(() => ({
        single: vi.fn(() => ({
          data: null,
          error: null,
        })),
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: null,
        error: null,
      })),
    })),
  })),
};
const mockCreateServiceRoleClient = vi.fn(() => mockServiceRoleClient);

vi.mock('@/lib/supabase/server-api', () => ({
  createAPIClient: vi.fn(() => mockSupabaseClient),
}));

// Mock next/headers cookies() for createClient
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
  createServiceRoleClient: mockCreateServiceRoleClient,
}));

// Mock the auth helpers
const mockRequireHRAdminAPI = vi.fn();
const mockRequireAuthAPI = vi.fn();

vi.mock('@/lib/server/auth', () => ({
  requireHRAdminAPI: mockRequireHRAdminAPI,
  requireAuthAPI: mockRequireAuthAPI,
  createErrorResponse: vi.fn((error) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Autentisering krävs') {
      return new Response(JSON.stringify({
        error: { code: 'UNAUTHORIZED', message }
      }), { status: 401 });
    }
    if (message === 'Saknar behörighet') {
      return new Response(JSON.stringify({
        error: { code: 'FORBIDDEN', message }
      }), { status: 403 });
    }
    if (message.includes('Cannot deactivate')) {
      return new Response(JSON.stringify({
        error: { code: 'FORBIDDEN', message }
      }), { status: 403 });
    }
    return new Response(JSON.stringify({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
    }), { status: 500 });
  }),
}));

// Mock user repository
const mockUserRepository = {
  findAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  findById: vi.fn(),
};

vi.mock('@/lib/server/repositories/user-repository', () => ({
  userRepository: mockUserRepository,
}));

// Import API handlers after mocking
const { GET } = await import('@/app/api/admin/users/route');
const { POST } = await import('@/app/api/admin/users/route');
const { PATCH, DELETE } = await import('@/app/api/admin/users/[id]/route');

// Mock users that will be returned from database
const dbMockUsers: User[] = [
  {
    id: mockUsers.hrAdmin.id,
    email: mockUsers.hrAdmin.email,
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: mockUsers.hrAdmin.created_at,
    last_active_at: null,
  },
  {
    id: mockUsers.sodexo.id,
    email: mockUsers.sodexo.email,
    role: UserRole.SODEXO,
    is_active: true,
    created_at: mockUsers.sodexo.created_at,
    last_active_at: null,
  },
];

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRepository.findAll.mockResolvedValue(dbMockUsers);
    
    // Reset Supabase mock to return users list
    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({
          data: dbMockUsers,
          error: null,
        })),
      })),
    });
  });

  it('returns user list for HR Admin (200)', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data).toHaveLength(2);
    
    // Validate user structure
    const user = data.data[0];
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('role');
    expect(user).toHaveProperty('is_active');
    expect(user).toHaveProperty('created_at');
  });

  it('returns 403 for non-admin roles (Sodexo)', async () => {
    mockRequireHRAdminAPI.mockRejectedValue(new Error('Saknar behörighet'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toHaveProperty('code', 'FORBIDDEN');
  });

  it('returns 401 for unauthenticated requests', async () => {
    mockRequireHRAdminAPI.mockRejectedValue(new Error('Autentisering krävs'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toHaveProperty('code', 'UNAUTHORIZED');
  });
});

describe('POST /api/admin/users', () => {
  const validUserData = {
    email: 'testuser@example.com',
    password: 'testPass123',
    role: UserRole.SODEXO,
    is_active: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup Service Role client mocks for POST operations (used by admin routes)
    vi.mocked(mockServiceRoleClient.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: null, // No existing user by default
                error: null,
              })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: {
                  id: 'new-user-id',
                  email: validUserData.email,
                  role: validUserData.role,
                  is_active: validUserData.is_active,
                  created_at: new Date().toISOString(),
                },
                error: null,
              })),
            })),
          })),
        };
      }
      return {
        select: vi.fn(),
        insert: vi.fn(),
      };
    });
    
    // Mock auth.admin.createUser to return successful auth user creation
    mockServiceRoleClient.auth.admin.createUser.mockResolvedValue({
      data: {
        user: {
          id: 'auth-user-id',
          email: validUserData.email,
        },
      },
      error: null,
    });
  });

  it('creates user successfully for HR Admin (201)', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    
    const newUser = {
      id: 'new-user-id',
      ...validUserData,
      created_at: new Date().toISOString(),
      temporary_password: validUserData.password,
    };
    
    mockUserRepository.create.mockResolvedValue(newUser);

    const request = new NextRequest('http://localhost/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validUserData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data).toHaveProperty('id');
    expect(data.data).toHaveProperty('email', validUserData.email);
    expect(data.data).toHaveProperty('role', validUserData.role);
    expect(data.data).toHaveProperty('is_active', validUserData.is_active);
    expect(data.data).toHaveProperty('temporary_password', validUserData.password);
  });

  it('validates email format (400)', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    
    const invalidData = {
      ...validUserData,
      email: 'not-an-email',
    };

    const request = new NextRequest('http://localhost/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(data.error.message).toContain('email');
  });

  it('validates password length (400)', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    
    const invalidData = {
      ...validUserData,
      password: 'short',
    };

    const request = new NextRequest('http://localhost/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(data.error.message).toContain('8 characters');
  });

  it('prevents duplicate emails (409)', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    
    // Override mock to return existing user (use mockServiceRoleClient)
    vi.mocked(mockServiceRoleClient.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 'existing-user-id', email: validUserData.email }, // User exists
            error: null,
          })),
        })),
      })),
    });

    const request = new NextRequest('http://localhost/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validUserData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toHaveProperty('code', 'DUPLICATE_ENTRY');
    expect(data.error.message).toContain('already exists');
  });

  it('returns 403 for non-admin roles', async () => {
    mockRequireHRAdminAPI.mockRejectedValue(new Error('Saknar behörighet'));

    const request = new NextRequest('http://localhost/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validUserData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toHaveProperty('code', 'FORBIDDEN');
  });

  it('validates role enum (400)', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    
    const invalidData = {
      ...validUserData,
      role: 'invalid_role',
    };

    const request = new NextRequest('http://localhost/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });
});

describe('PATCH /api/admin/users/[id]', () => {
  const testUserId = 'test-user-id';
  const currentUserId = mockUsers.hrAdmin.id;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.rpc.mockResolvedValue({
      data: {
        id: testUserId,
        email: 'test@example.com',
        role: UserRole.TOPLUX,
        is_active: false,
        created_at: new Date().toISOString(),
        last_active_at: null,
      },
      error: null,
    });
    
    // Setup Supabase mocks for PATCH operations
    vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: {
                  id: testUserId,
                  auth_user_id: 'auth-user-id',
                  email: 'test@example.com',
                  role: UserRole.TOPLUX,
                  is_active: true,
                  created_at: new Date().toISOString(),
                },
                error: null,
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: {
                    id: testUserId,
                    email: 'test@example.com',
                    role: UserRole.TOPLUX,
                    is_active: false, // Will be overridden in tests
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                })),
              })),
            })),
          })),
        };
      }
      return {
        select: vi.fn(),
        update: vi.fn(),
      };
    });

    vi.mocked(mockServiceRoleClient.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: {
                    id: testUserId,
                    email: 'test@example.com',
                    role: UserRole.TOPLUX,
                    is_active: false,
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                })),
              })),
            })),
          })),
        };
      }
      return { update: vi.fn() };
    });
    
    // Mock auth.admin.signOut
    mockSupabaseClient.auth.admin.signOut = vi.fn().mockResolvedValue({
      error: null,
    });
  });

  it('deactivates user successfully (200)', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    
    // Override mock to return deactivated user
    vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: {
                  id: testUserId,
                  auth_user_id: 'auth-user-id',
                  email: 'test@example.com',
                  role: UserRole.TOPLUX,
                  is_active: true,
                  created_at: new Date().toISOString(),
                },
                error: null,
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: {
                    id: testUserId,
                    email: 'test@example.com',
                    role: UserRole.TOPLUX,
                    is_active: false, // Deactivated
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                })),
              })),
            })),
          })),
        };
      }
      return { select: vi.fn(), update: vi.fn() };
    });

    const request = new NextRequest(`http://localhost/api/admin/users/${testUserId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: testUserId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveProperty('id', testUserId);
    expect(data.data).toHaveProperty('is_active', false);
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
      'set_user_active_status',
      { p_user_id: testUserId, p_is_active: false }
    );
    expect(mockServiceRoleClient.auth.admin.signOut).not.toHaveBeenCalled();
  });

  it('activates user successfully (200)', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    mockSupabaseClient.rpc.mockResolvedValue({
      data: {
        id: testUserId,
        email: 'test@example.com',
        role: UserRole.TOPLUX,
        is_active: true,
        created_at: new Date().toISOString(),
        last_active_at: null,
      },
      error: null,
    });
    
    // Override mock to return activated user
    vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: {
                  id: testUserId,
                  auth_user_id: 'auth-user-id',
                  email: 'test@example.com',
                  role: UserRole.TOPLUX,
                  is_active: false,
                  created_at: new Date().toISOString(),
                },
                error: null,
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: {
                    id: testUserId,
                    email: 'test@example.com',
                    role: UserRole.TOPLUX,
                    is_active: true, // Activated
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                })),
              })),
            })),
          })),
        };
      }
      return { select: vi.fn(), update: vi.fn() };
    });

    vi.mocked(mockServiceRoleClient.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: {
                    id: testUserId,
                    email: 'test@example.com',
                    role: UserRole.TOPLUX,
                    is_active: true,
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                })),
              })),
            })),
          })),
        };
      }
      return { update: vi.fn() };
    });

    const request = new NextRequest(`http://localhost/api/admin/users/${testUserId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: true }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: testUserId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveProperty('is_active', true);
  });

  it('prevents self-deactivation (403)', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);

    const request = new NextRequest('http://localhost/api/admin/users/' + currentUserId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: currentUserId }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toHaveProperty('code', 'FORBIDDEN');
    expect(data.error.message).toContain('Kan inte inaktivera din egen användare');
  });

  it('returns 404 for non-existent user', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    
    // Override mock to return user not found
    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: null, // User not found
            error: { message: 'Not found' },
          })),
        })),
      })),
    });

    const request = new NextRequest('http://localhost/api/admin/users/00000000-0000-0000-0000-000000000000', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toHaveProperty('code', 'NOT_FOUND');
  });

  it('returns 403 for non-admin roles', async () => {
    mockRequireHRAdminAPI.mockRejectedValue(new Error('Saknar behörighet'));

    const request = new NextRequest(`http://localhost/api/admin/users/${testUserId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: testUserId }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toHaveProperty('code', 'FORBIDDEN');
  });

  it('validates request body (400)', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);

    const request = new NextRequest('http://localhost/api/admin/users/test-user-id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: 'not-a-boolean' }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: testUserId }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toHaveProperty('code', 'VALIDATION_ERROR');
  });

  it('does not mislabel a generic permission failure as the last-admin invariant', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    mockSupabaseClient.rpc.mockResolvedValue({
      data: null,
      error: {
        code: '42501',
        message: 'Insufficient permission to change user status',
      },
    });

    const request = new NextRequest('http://localhost/api/admin/users/test-user-id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: testUserId }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error.message).toContain('Saknar behörighet');
    expect(data.error.message).not.toContain('sista aktiva HR Admin');
  });
});

describe('DELETE /api/admin/users/[id]', () => {
  const testUserId = '11111111-1111-4111-8111-111111111111';
  const authUserId = '22222222-2222-4222-8222-222222222222';
  const cleanupId = '33333333-3333-4333-8333-333333333333';

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.rpc.mockReset();
    mockSupabaseClient.rpc.mockImplementation((functionName: string) => {
      if (functionName === 'delete_app_user') {
        return Promise.resolve({
          data: {
            cleanup_id: cleanupId,
            auth_user_id: authUserId,
            cleanup_state: 'pending',
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });
    mockServiceRoleClient.rpc.mockReset();
    mockServiceRoleClient.rpc.mockResolvedValue({
      data: {
        cleanup_id: cleanupId,
        cleanup_state: 'completed',
        completed_at: '2026-09-01T10:00:00.000Z',
      },
      error: null,
    });
    
    // Setup regular Supabase client mocks for SELECT operations (checking user)
    vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: {
                  id: testUserId,
                  auth_user_id: authUserId,
                  email: 'test@example.com',
                  role: UserRole.TOPLUX,
                  is_active: true,
                },
                error: null,
              })),
            })),
          })),
        };
      }
      return {
        select: vi.fn(),
      };
    });
    
    // Setup Service Role client mocks for DELETE operations
    vi.mocked(mockServiceRoleClient.from).mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({
              error: null,
            })),
          })),
        };
      }
      return {
        delete: vi.fn(),
      };
    });
    
    // Mock auth.admin.deleteUser on service role client
    mockServiceRoleClient.auth.admin.deleteUser = vi.fn().mockResolvedValue({
      error: null,
    });
  });

  it('deletes user successfully (200)', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);

    const request = new NextRequest('http://localhost/api/admin/users/test-user-id', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: testUserId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveProperty('message');
    expect(data.data).toMatchObject({
      cleanup_id: cleanupId,
      cleanup_state: 'completed',
      app_user_deleted: true,
      auth_cleanup_required: true,
      auth_user_deleted: true,
    });
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
      'delete_app_user',
      { p_user_id: testUserId }
    );
    expect(mockServiceRoleClient.auth.admin.deleteUser).toHaveBeenCalledWith(
      authUserId
    );
    expect(mockServiceRoleClient.rpc).toHaveBeenCalledWith(
      'complete_app_user_auth_cleanup',
      { p_cleanup_id: cleanupId }
    );
  });

  it('accepts a provider not-found response and completes the durable handoff', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    mockServiceRoleClient.auth.admin.deleteUser.mockResolvedValue({
      error: { code: 'user_not_found', status: 404, message: 'User not found' },
    });

    const response = await DELETE(
      new NextRequest(`http://localhost/api/admin/users/${testUserId}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: testUserId }) }
    );

    expect(response.status).toBe(200);
    expect(mockServiceRoleClient.rpc).toHaveBeenCalledWith(
      'complete_app_user_auth_cleanup',
      { p_cleanup_id: cleanupId }
    );
  });

  it('keeps the original cleanup pending when completion attests a different cleanup id', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    mockServiceRoleClient.rpc.mockResolvedValue({
      data: {
        cleanup_id: '44444444-4444-4444-8444-444444444444',
        cleanup_state: 'completed',
        completed_at: '2026-09-01T10:00:00.000Z',
      },
      error: null,
    });

    const response = await DELETE(
      new NextRequest(`http://localhost/api/admin/users/${testUserId}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: testUserId }) }
    );
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toMatchObject({
      code: 'AUTH_CLEANUP_PENDING',
      recoverable: true,
    });
    expect(data.data).toMatchObject({
      cleanup_id: cleanupId,
      cleanup_state: 'pending',
      app_user_deleted: true,
      auth_user_deleted: true,
    });
  });

  it('keeps cleanup pending for a generic Auth API 404', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    mockServiceRoleClient.auth.admin.deleteUser.mockResolvedValue({
      error: {
        code: 'gateway_route_not_found',
        status: 404,
        message: 'User not found',
      },
    });

    const response = await DELETE(
      new NextRequest(`http://localhost/api/admin/users/${testUserId}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: testUserId }) }
    );
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toMatchObject({
      code: 'AUTH_CLEANUP_PENDING',
      recoverable: true,
    });
    expect(data.data).toMatchObject({
      cleanup_id: cleanupId,
      cleanup_state: 'pending',
      auth_user_deleted: false,
    });
    expect(mockServiceRoleClient.rpc).not.toHaveBeenCalled();
  });

  it('returns a completed app-only tombstone without creating a service-role client', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    mockSupabaseClient.rpc.mockResolvedValue({
      data: {
        cleanup_id: cleanupId,
        auth_user_id: null,
        cleanup_state: 'completed',
      },
      error: null,
    });

    const response = await DELETE(
      new NextRequest(`http://localhost/api/admin/users/${testUserId}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: testUserId }) }
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toMatchObject({
      cleanup_id: cleanupId,
      cleanup_state: 'completed',
      auth_cleanup_required: false,
      auth_user_deleted: false,
    });
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
    expect(mockServiceRoleClient.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it('retries the same user idempotently without repeating completed Auth cleanup', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    mockSupabaseClient.rpc.mockResolvedValue({
      data: {
        cleanup_id: cleanupId,
        auth_user_id: authUserId,
        cleanup_state: 'completed',
      },
      error: null,
    });

    const response = await DELETE(
      new NextRequest(`http://localhost/api/admin/users/${testUserId}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: testUserId }) }
    );

    expect(response.status).toBe(200);
    expect(mockSupabaseClient.rpc).toHaveBeenCalledTimes(1);
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
    expect(mockServiceRoleClient.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it('returns recoverable unknown-cleanup status for malformed delete RPC output', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    mockSupabaseClient.rpc.mockResolvedValue({
      data: { auth_user_id: authUserId },
      error: null,
    });

    const response = await DELETE(
      new NextRequest(`http://localhost/api/admin/users/${testUserId}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: testUserId }) }
    );
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data).toMatchObject({
      error: {
        code: 'AUTH_CLEANUP_STATE_UNKNOWN',
        recoverable: true,
      },
      data: {
        status: 'unknown',
        cleanup_id: null,
        retry_same_user_id: true,
      },
    });
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
  });

  it('returns unknown cleanup state when the deletion RPC transport rejects', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    mockSupabaseClient.rpc.mockRejectedValueOnce(new Error('transport reset'));

    const response = await DELETE(
      new NextRequest(`http://localhost/api/admin/users/${testUserId}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: testUserId }) }
    );
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data).toMatchObject({
      error: {
        code: 'AUTH_CLEANUP_STATE_UNKNOWN',
        recoverable: true,
      },
      data: {
        cleanup_id: null,
        retry_same_user_id: true,
      },
    });
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
    expect(mockServiceRoleClient.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it('returns unknown cleanup state for an unclassified gateway response', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'PGRST504',
        status: 504,
        message: 'gateway timeout',
      },
    });

    const response = await DELETE(
      new NextRequest(`http://localhost/api/admin/users/${testUserId}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: testUserId }) }
    );
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error.code).toBe('AUTH_CLEANUP_STATE_UNKNOWN');
    expect(data.data).toMatchObject({
      cleanup_id: null,
      retry_same_user_id: true,
    });
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
    expect(mockServiceRoleClient.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it('bounds a hanging deletion RPC and returns unknown cleanup state', async () => {
    vi.useFakeTimers();
    try {
      mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
      mockSupabaseClient.rpc.mockReturnValueOnce(new Promise(() => {}));

      const responsePromise = DELETE(
        new NextRequest(`http://localhost/api/admin/users/${testUserId}`, {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: testUserId }) }
      );
      await vi.advanceTimersByTimeAsync(5_000);
      const response = await responsePromise;
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.error.code).toBe('AUTH_CLEANUP_STATE_UNKNOWN');
      expect(data.data).toMatchObject({
        cleanup_id: null,
        retry_same_user_id: true,
      });
      expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
      expect(mockServiceRoleClient.auth.admin.deleteUser).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects an invalid UUID before calling the deletion RPC', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);

    const response = await DELETE(
      new NextRequest('http://localhost/api/admin/users/not-a-uuid', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: 'not-a-uuid' }) }
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(mockSupabaseClient.rpc).not.toHaveBeenCalled();
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled();
  });

  it('bounds a hanging Auth deletion and returns a retryable partial status', async () => {
    vi.useFakeTimers();
    try {
      mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
      mockServiceRoleClient.auth.admin.deleteUser.mockReturnValue(
        new Promise(() => {})
      );

      const responsePromise = DELETE(
        new NextRequest(`http://localhost/api/admin/users/${testUserId}`, {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: testUserId }) }
      );
      await vi.advanceTimersByTimeAsync(5_001);
      const response = await responsePromise;
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.error).toMatchObject({
        code: 'AUTH_CLEANUP_PENDING',
        recoverable: true,
      });
      expect(data.data).toMatchObject({
        cleanup_id: cleanupId,
        cleanup_state: 'pending',
        auth_user_deleted: false,
      });
      expect(mockServiceRoleClient.rpc).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('bounds a hanging completion RPC after Auth deletion', async () => {
    vi.useFakeTimers();
    try {
      mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
      mockServiceRoleClient.rpc.mockReturnValueOnce(new Promise(() => {}));

      const responsePromise = DELETE(
        new NextRequest(`http://localhost/api/admin/users/${testUserId}`, {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: testUserId }) }
      );
      await vi.advanceTimersByTimeAsync(5_000);
      const response = await responsePromise;
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.error).toMatchObject({
        code: 'AUTH_CLEANUP_PENDING',
        recoverable: true,
      });
      expect(data.data).toMatchObject({
        cleanup_id: cleanupId,
        cleanup_state: 'pending',
        app_user_deleted: true,
        auth_user_deleted: true,
      });
      expect(mockServiceRoleClient.auth.admin.deleteUser).toHaveBeenCalledWith(
        authUserId
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns partial status if service-role completion attestation fails', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    mockServiceRoleClient.rpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST500', message: 'unavailable' },
    });

    const response = await DELETE(
      new NextRequest(`http://localhost/api/admin/users/${testUserId}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: testUserId }) }
    );
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.data).toMatchObject({
      cleanup_id: cleanupId,
      cleanup_state: 'pending',
      auth_user_deleted: true,
    });
  });

  it('returns partial status with the cleanup id if privileged-client construction throws', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    mockCreateServiceRoleClient.mockImplementationOnce(() => {
      throw new Error('service configuration detail');
    });

    const response = await DELETE(
      new NextRequest(`http://localhost/api/admin/users/${testUserId}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: testUserId }) }
    );
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toMatchObject({
      code: 'AUTH_CLEANUP_PENDING',
      recoverable: true,
    });
    expect(data.data).toMatchObject({
      cleanup_id: cleanupId,
      cleanup_state: 'pending',
      auth_user_deleted: false,
    });
  });

  it('returns partial status with the cleanup id if completion RPC rejects', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    mockServiceRoleClient.rpc.mockRejectedValue(
      new Error('completion transport detail')
    );

    const response = await DELETE(
      new NextRequest(`http://localhost/api/admin/users/${testUserId}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: testUserId }) }
    );
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toMatchObject({
      code: 'AUTH_CLEANUP_PENDING',
      recoverable: true,
    });
    expect(data.data).toMatchObject({
      cleanup_id: cleanupId,
      cleanup_state: 'pending',
      auth_user_deleted: true,
    });
  });

  it('prevents self-deletion (403)', async () => {
    const currentUser = { ...mockUsers.hrAdmin, id: testUserId };
    mockRequireHRAdminAPI.mockResolvedValue(currentUser);

    const request = new NextRequest('http://localhost/api/admin/users/' + currentUser.id, {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: currentUser.id }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toHaveProperty('code', 'FORBIDDEN');
    expect(data.error.message).toContain('Kan inte ta bort din egen användare');
  });

  it('prevents deleting last HR admin (403)', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    mockSupabaseClient.rpc.mockResolvedValue({
      data: null,
      error: {
        code: '42501',
        message: 'Cannot delete the final active HR Admin',
      },
    });

    const request = new NextRequest('http://localhost/api/admin/users/test-user-id', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: testUserId }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toHaveProperty('code', 'FORBIDDEN');
    expect(data.error.message).toContain('Kan inte ta bort den sista aktiva HR Admin');
  });

  it('returns 404 for non-existent user', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    mockSupabaseClient.rpc.mockResolvedValue({
      data: null,
      error: { code: 'P0002', message: 'User not found' },
    });

    const request = new NextRequest('http://localhost/api/admin/users/00000000-0000-0000-0000-000000000000', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toHaveProperty('code', 'NOT_FOUND');
  });

  it('returns an explicit partial-cleanup error when Auth deletion fails', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    mockServiceRoleClient.auth.admin.deleteUser.mockResolvedValue({
      error: { message: 'Auth unavailable' },
    });

    const request = new NextRequest(`http://localhost/api/admin/users/${testUserId}`, {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: testUserId }) });
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toMatchObject({
      code: 'AUTH_CLEANUP_PENDING',
      recoverable: true,
    });
    expect(data.data).toEqual({
      status: 'partial',
      cleanup_id: cleanupId,
      cleanup_state: 'pending',
      app_user_deleted: true,
      auth_user_deleted: false,
    });
  });

  it('does not attempt Auth cleanup when atomic app-row deletion fails', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    mockSupabaseClient.rpc.mockResolvedValue({
      data: null,
      error: { code: '23503', message: 'foreign key violation' },
    });

    const request = new NextRequest(`http://localhost/api/admin/users/${testUserId}`, {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: testUserId }) });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'USER_DELETE_CONFLICT' },
    });
    expect(mockServiceRoleClient.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it('returns 403 for non-admin roles', async () => {
    mockRequireHRAdminAPI.mockRejectedValue(new Error('Saknar behörighet'));

    const request = new NextRequest('http://localhost/api/admin/users/test-user-id', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: testUserId }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toHaveProperty('code', 'FORBIDDEN');
  });
});
