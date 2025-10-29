/**
 * Authentication Test Helper
 * 
 * Provides utilities for obtaining authenticated sessions for integration testing.
 * 
 * Creates real Supabase sessions and extracts cookies to send with HTTP requests.
 * 
 * Usage in tests:
 * ```typescript
 * import { getAuthenticatedClient } from './auth-test-helper';
 * 
 * const client = await getAuthenticatedClient('hrAdmin');
 * const response = await client.get('/api/admin/users');
 * ```
 */

import { createClient } from '@supabase/supabase-js';
import { UserRole } from '@/lib/types/user';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Test user credentials
 */
export const testUsers = {
  hrAdmin: {
    email: 'admin@test.com',
    password: 'Test123!',
    role: UserRole.HR_ADMIN,
    userId: process.env.TEST_ADMIN_USER_ID!,
  },
  sodexo: {
    email: 'sodexo@test.com',
    password: 'Test123!',
    role: UserRole.SODEXO,
    userId: process.env.TEST_SODEXO_USER_ID!,
  },
  omc: {
    email: 'omc@test.com',
    password: 'Test123!',
    role: UserRole.OMC,
    userId: process.env.TEST_OMC_USER_ID!,
  },
  payroll: {
    email: 'payroll@test.com',
    password: 'Test123!',
    role: UserRole.PAYROLL,
    userId: process.env.TEST_PAYROLL_USER_ID!,
  },
  toplux: {
    email: 'toplux@test.com',
    password: 'Test123!',
    role: UserRole.TOPLUX,
    userId: process.env.TEST_TOPLUX_USER_ID!,
  },
} as const;

export type TestUserRole = keyof typeof testUsers;

export interface AuthenticatedClient {
  get(path: string, options?: RequestInit): Promise<Response>;
  post(path: string, body?: unknown, options?: RequestInit): Promise<Response>;
  put(path: string, body?: unknown, options?: RequestInit): Promise<Response>;
  delete(path: string, options?: RequestInit): Promise<Response>;
  cookies: string;
}

/**
 * Get an authenticated HTTP client for testing
 * 
 * Signs in the user and returns a client that includes authentication cookies
 * in all requests.
 * 
 * @param userRole - The role of the test user
 * @returns Authenticated client with cookie-based session
 */
export async function getAuthenticatedClient(userRole: TestUserRole): Promise<AuthenticatedClient> {
  const user = testUsers[userRole];
  
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Sign in
  const { data, error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  
  if (error || !data.session) {
    throw new Error(`Failed to authenticate ${userRole}: ${error?.message || 'No session'}`);
  }
  
  // Format cookies for HTTP requests
  // Supabase SSR uses these cookie names by default
  const cookies = [
    `sb-${getProjectRef()}-auth-token=${JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
      user: data.session.user,
    })}`,
  ].join('; ');
  
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  
  // Create client with helper methods
  const client: AuthenticatedClient = {
    cookies,
    
    async get(path: string, options: RequestInit = {}) {
      return fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
          ...options.headers,
          Cookie: cookies,
        },
      });
    },
    
    async post(path: string, body?: unknown, options: RequestInit = {}) {
      return fetch(`${baseUrl}${path}`, {
        method: 'POST',
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          Cookie: cookies,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    },
    
    async put(path: string, body?: unknown, options: RequestInit = {}) {
      return fetch(`${baseUrl}${path}`, {
        method: 'PUT',
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          Cookie: cookies,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    },
    
    async delete(path: string, options: RequestInit = {}) {
      return fetch(`${baseUrl}${path}`, {
        method: 'DELETE',
        ...options,
        headers: {
          ...options.headers,
          Cookie: cookies,
        },
      });
    },
  };
  
  return client;
}

/**
 * Extract project ref from Supabase URL for cookie naming
 */
function getProjectRef(): string {
  const url = new URL(supabaseUrl);
  // Extract project ref from URL like https://abcdefg.supabase.co
  return url.hostname.split('.')[0];
}

/**
 * Get user data for a specific role
 */
export function getTestUserData(userRole: TestUserRole) {
  return testUsers[userRole];
}
