/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from 'vitest';

/**
 * Creates a comprehensive mock Supabase client with all necessary methods
 * for testing. Supports chaining and all common operations.
 */
export function createMockSupabaseClient(
   
  resolvedData: { data: any; error: any } | null = null
) {
  // Create a chainable mock that supports all Supabase operations
  const chainMock = {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    gt: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    lte: vi.fn(),
    like: vi.fn(),
    ilike: vi.fn(),
    is: vi.fn(),
    in: vi.fn(),
    contains: vi.fn(),
    containedBy: vi.fn(),
    rangeGt: vi.fn(),
    rangeGte: vi.fn(),
    rangeLt: vi.fn(),
    rangeLte: vi.fn(),
    rangeAdjacent: vi.fn(),
    overlaps: vi.fn(),
    textSearch: vi.fn(),
    match: vi.fn(),
    not: vi.fn(),
    or: vi.fn(),
    filter: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    csv: vi.fn(),
    then: vi.fn(), // Make it thenable for await
    catch: vi.fn(),
  };

  // All methods return the mock itself for chaining
  // Special handling for methods that should resolve to promises
  Object.keys(chainMock).forEach((key) => {
    if (key !== 'then' && key !== 'catch') {
       
      (chainMock as any)[key].mockReturnValue(chainMock);
    }
  });

  // When awaited, return the resolved data or a default success response
  const defaultResponse = resolvedData || { data: null, error: null };
  
  // Make the chainMock itself thenable (so it can be awaited)
  chainMock.then = ((onFulfilled?: (value: typeof defaultResponse) => any) => {
    return Promise.resolve(defaultResponse).then(onFulfilled);
  }) as any;
  
  chainMock.catch = ((onRejected?: (reason: any) => any) => {
    return Promise.resolve(defaultResponse).catch(onRejected);
  }) as any;
  
  // Make chainMock itself a Promise-like object
  Object.defineProperty(chainMock, Symbol.toStringTag, {
    value: 'Promise',
    configurable: true,
  });

  // The supabase client itself
  const mockSupabaseClient = {
    from: vi.fn().mockReturnValue(chainMock),
    rpc: vi.fn().mockReturnValue(chainMock),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({
        error: null,
      }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        download: vi.fn().mockResolvedValue({ data: null, error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
  };

  return { mockSupabaseClient, chainMock };
}

/**
 * Creates a mock Supabase client with custom responses for specific operations
 */
export function createMockSupabaseClientWithOverrides(overrides: {
   
  from?: (table: string) => any;
   
  rpc?: (fn: string, params?: any) => any;
   
  auth?: any;
}) {
  const { mockSupabaseClient, chainMock } = createMockSupabaseClient();

  if (overrides.from) {
    mockSupabaseClient.from = vi.fn(overrides.from);
  }

  if (overrides.rpc) {
    mockSupabaseClient.rpc = vi.fn(overrides.rpc);
  }

  if (overrides.auth) {
    mockSupabaseClient.auth = {
      ...mockSupabaseClient.auth,
      ...overrides.auth,
    };
  }

  return { mockSupabaseClient, chainMock };
}
