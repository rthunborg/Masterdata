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

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

// Mock the auth helpers
const mockRequireHRAdminAPI = vi.fn();
const mockRequireAuthAPI = vi.fn();

vi.mock('@/lib/server/auth', () => ({
  requireHRAdminAPI: mockRequireHRAdminAPI,
  requireAuthAPI: mockRequireAuthAPI,
  createErrorResponse: vi.fn((error) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Authentication required') {
      return new Response(JSON.stringify({
        error: { code: 'UNAUTHORIZED', message }
      }), { status: 401 });
    }
    if (message === 'Insufficient permissions') {
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
const { PATCH } = await import('@/app/api/admin/users/[id]/route');

// Mock users that will be returned from database
const dbMockUsers: User[] = [
  {
    id: mockUsers.hrAdmin.id,
    email: mockUsers.hrAdmin.email,
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: mockUsers.hrAdmin.created_at,
  },
  {
    id: mockUsers.sodexo.id,
    email: mockUsers.sodexo.email,
    role: UserRole.SODEXO,
    is_active: true,
    created_at: mockUsers.sodexo.created_at,
  },
];

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRepository.findAll.mockResolvedValue(dbMockUsers);
    
    // Reset Supabase mock to return users list
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockSupabaseClient.from as any).mockReturnValue({
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

    const request = new NextRequest('http://localhost/api/admin/users');
    const response = await GET(request);
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
    mockRequireHRAdminAPI.mockRejectedValue(new Error('Insufficient permissions'));

    const request = new NextRequest('http://localhost/api/admin/users');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toHaveProperty('code', 'FORBIDDEN');
  });

  it('returns 401 for unauthenticated requests', async () => {
    mockRequireHRAdminAPI.mockRejectedValue(new Error('Authentication required'));

    const request = new NextRequest('http://localhost/api/admin/users');
    const response = await GET(request);
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
    
    // Setup Supabase mocks for POST operations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockSupabaseClient.from as any).mockImplementation((table: string) => {
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
    mockSupabaseClient.auth.admin.createUser.mockResolvedValue({
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
    
    // Override mock to return existing user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockSupabaseClient.from as any).mockReturnValue({
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
    mockRequireHRAdminAPI.mockRejectedValue(new Error('Insufficient permissions'));

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
    
    // Setup Supabase mocks for PATCH operations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockSupabaseClient.from as any).mockImplementation((table: string) => {
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
    
    // Mock auth.admin.signOut
    mockSupabaseClient.auth.admin.signOut = vi.fn().mockResolvedValue({
      error: null,
    });
  });

  it('deactivates user successfully (200)', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    
    // Override mock to return deactivated user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockSupabaseClient.from as any).mockImplementation((table: string) => {
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

    const request = new NextRequest('http://localhost/api/admin/users/test-user-id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: testUserId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveProperty('id', testUserId);
    expect(data.data).toHaveProperty('is_active', false);
  });

  it('activates user successfully (200)', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    
    // Override mock to return activated user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockSupabaseClient.from as any).mockImplementation((table: string) => {
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

    const request = new NextRequest('http://localhost/api/admin/users/test-user-id', {
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
    expect(data.error.message).toContain('Cannot deactivate your own account');
  });

  it('returns 404 for non-existent user', async () => {
    mockRequireHRAdminAPI.mockResolvedValue(mockUsers.hrAdmin);
    
    // Override mock to return user not found
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockSupabaseClient.from as any).mockReturnValue({
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
    mockRequireHRAdminAPI.mockRejectedValue(new Error('Insufficient permissions'));

    const request = new NextRequest('http://localhost/api/admin/users/test-user-id', {
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
});
