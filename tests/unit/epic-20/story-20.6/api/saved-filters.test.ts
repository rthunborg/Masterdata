/**
 * Unit tests for Saved Filters API Routes
 * Story 20.6: Saved Filters
 * 
 * Tests:
 * - GET /api/users/filters - Fetch saved filters
 * - POST /api/users/filters - Create saved filter
 * - DELETE /api/users/filters/:id - Delete saved filter
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies - use partial mocks to preserve error handlers
vi.mock("@/lib/server/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/auth")>("@/lib/server/auth");
  return {
    ...actual,
    requireAuthAPI: vi.fn(),
    getUserFromSession: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server");

describe("GET /api/users/filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules(); // Reset module cache to ensure fresh imports
  });

  it("should return saved filters for authenticated user", async () => {
    const { requireAuthAPI } = await import("@/lib/server/auth");
    const { createClient } = await import("@/lib/supabase/server");
    const { GET } = await import("@/app/api/users/filters/route");

    // Mock authenticated user
    vi.mocked(requireAuthAPI).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      role: "hr_admin",
      is_active: true,
      created_at: "2025-01-01T00:00:00Z",
      last_active_at: "2025-01-29T00:00:00Z",
      auth_id: "auth-user-1",
    });

    // Mock Supabase client
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "filter-1",
            user_id: "auth-user-1",
            name: "New Hires",
            filters: [{ columnId: "first_name", type: "text", textValue: "John" }],
            created_at: "2025-01-29T10:00:00Z",
            updated_at: "2025-01-29T10:00:00Z",
          },
        ],
        error: null,
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as ReturnType<typeof createClient>);

    const request = new NextRequest("http://localhost/api/users/filters");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].name).toBe("New Hires");
    expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "auth-user-1");
  });

  it("should return empty array if user has no saved filters", async () => {
    const { requireAuthAPI } = await import("@/lib/server/auth");
    const { createClient } = await import("@/lib/supabase/server");
    const { GET } = await import("@/app/api/users/filters/route");

    vi.mocked(requireAuthAPI).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      role: "hr_admin",
      is_active: true,
      created_at: "2025-01-01T00:00:00Z",
      last_active_at: "2025-01-29T00:00:00Z",
      auth_id: "auth-user-1",
    });

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabase as ReturnType<typeof createClient>);

    const request = new NextRequest("http://localhost/api/users/filters");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual([]);
  });

  it("should return 401 if user not authenticated", async () => {
    const { requireAuthAPI } = await import("@/lib/server/auth");
    
    // Mock auth failure BEFORE importing the route
    vi.mocked(requireAuthAPI).mockRejectedValue(new Error("Autentisering krävs"));
    
    // Use vi.importActual to get a fresh module
    const { GET } = await import("@/app/api/users/filters/route");

    const request = new NextRequest("http://localhost/api/users/filters");
    const response = await GET(request);

    // Response should exist even on error
    expect(response).toBeDefined();
    expect(response.status).toBe(401);
    
    const json = await response.json();
    expect(json.error).toBeDefined();
    expect(json.error.code).toBe("UNAUTHORIZED");
  });
});

describe("POST /api/users/filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules(); // Reset module cache to ensure fresh imports
  });

  it("should create saved filter with valid data", async () => {
    const { requireAuthAPI } = await import("@/lib/server/auth");
    const { createClient } = await import("@/lib/supabase/server");
    const { POST } = await import("@/app/api/users/filters/route");

    vi.mocked(requireAuthAPI).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      role: "hr_admin",
      is_active: true,
      created_at: "2025-01-01T00:00:00Z",
      last_active_at: "2025-01-29T00:00:00Z",
      auth_id: "auth-user-1",
    });

    const createdFilter = {
      id: "filter-1",
      user_id: "auth-user-1",
      name: "Test Filter",
      filters: [{ columnId: "first_name", type: "text", textValue: "John" }],
      created_at: "2025-01-29T10:00:00Z",
      updated_at: "2025-01-29T10:00:00Z",
    };

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: createdFilter,
        error: null,
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const body = {
      name: "Test Filter",
      filters: [{ columnId: "first_name", type: "text", textValue: "John" }],
    };

    const request = new NextRequest("http://localhost/api/users/filters", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.name).toBe("Test Filter");
    expect(json.data.user_id).toBe("auth-user-1");
  });

  it("should return 400 if name is missing", async () => {
    const { requireAuthAPI } = await import("@/lib/server/auth");
    const { POST } = await import("@/app/api/users/filters/route");

    vi.mocked(requireAuthAPI).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      role: "hr_admin",
      is_active: true,
      created_at: "2025-01-01T00:00:00Z",
      last_active_at: "2025-01-29T00:00:00Z",
      auth_id: "auth-user-1",
    });

    const request = new NextRequest("http://localhost/api/users/filters", {
      method: "POST",
      body: JSON.stringify({ filters: [] }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain("Name is required");
  });

  it("should return 400 if filters are missing", async () => {
    const { requireAuthAPI } = await import("@/lib/server/auth");
    const { POST } = await import("@/app/api/users/filters/route");

    vi.mocked(requireAuthAPI).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      role: "hr_admin",
      is_active: true,
      created_at: "2025-01-01T00:00:00Z",
      last_active_at: "2025-01-29T00:00:00Z",
      auth_id: "auth-user-1",
    });

    const request = new NextRequest("http://localhost/api/users/filters", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain("Filters are required");
  });

  it("should return 400 if name is empty string", async () => {
    const { requireAuthAPI } = await import("@/lib/server/auth");
    const { POST } = await import("@/app/api/users/filters/route");

    vi.mocked(requireAuthAPI).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      role: "hr_admin",
      is_active: true,
      created_at: "2025-01-01T00:00:00Z",
      last_active_at: "2025-01-29T00:00:00Z",
      auth_id: "auth-user-1",
    });

    const request = new NextRequest("http://localhost/api/users/filters", {
      method: "POST",
      body: JSON.stringify({ name: "  ", filters: [] }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain("Name cannot be empty");
  });

  it("should return 400 if name exceeds 50 characters", async () => {
    const { requireAuthAPI } = await import("@/lib/server/auth");
    const { POST } = await import("@/app/api/users/filters/route");

    vi.mocked(requireAuthAPI).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      role: "hr_admin",
      is_active: true,
      created_at: "2025-01-01T00:00:00Z",
      last_active_at: "2025-01-29T00:00:00Z",
      auth_id: "auth-user-1",
    });

    const longName = "a".repeat(51);
    const request = new NextRequest("http://localhost/api/users/filters", {
      method: "POST",
      body: JSON.stringify({ name: longName, filters: [] }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain("cannot exceed 50 characters");
  });

  it("should return 409 if filter name already exists", async () => {
    const { requireAuthAPI } = await import("@/lib/server/auth");
    const { createClient } = await import("@/lib/supabase/server");
    const { POST } = await import("@/app/api/users/filters/route");

    vi.mocked(requireAuthAPI).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      role: "hr_admin",
      is_active: true,
      created_at: "2025-01-01T00:00:00Z",
      last_active_at: "2025-01-29T00:00:00Z",
      auth_id: "auth-user-1",
    });

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "23505", message: "duplicate key value" }, // PostgreSQL unique constraint error
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const request = new NextRequest("http://localhost/api/users/filters", {
      method: "POST",
      body: JSON.stringify({ name: "Duplicate", filters: [] }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toBe("A filter with this name already exists");
  });
});

describe("DELETE /api/users/filters/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules(); // Reset module cache to ensure fresh imports
  });

  it("should delete filter successfully", async () => {
    const { requireAuthAPI } = await import("@/lib/server/auth");
    const { createClient } = await import("@/lib/supabase/server");
    const { DELETE } = await import("@/app/api/users/filters/[id]/route");

    vi.mocked(requireAuthAPI).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      role: "hr_admin",
      is_active: true,
      created_at: "2025-01-01T00:00:00Z",
      last_active_at: "2025-01-29T00:00:00Z",
      auth_id: "auth-user-1",
    });

    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };

    // Mock both .eq() calls to return the expected result
    mockSupabase.eq
      .mockReturnValueOnce(mockSupabase)
      .mockResolvedValueOnce({ data: null, error: null });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

    const request = new NextRequest(
      "http://localhost/api/users/filters/550e8400-e29b-41d4-a716-446655440000"
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" }),
    });

    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockSupabase.eq).toHaveBeenCalledWith(
      "id",
      "550e8400-e29b-41d4-a716-446655440000"
    );
    expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "auth-user-1");
  });

  it("should return 400 for invalid UUID format", async () => {
    const { requireAuthAPI } = await import("@/lib/server/auth");
    const { DELETE } = await import("@/app/api/users/filters/[id]/route");

    vi.mocked(requireAuthAPI).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      role: "hr_admin",
      is_active: true,
      created_at: "2025-01-01T00:00:00Z",
      last_active_at: "2025-01-29T00:00:00Z",
      auth_id: "auth-user-1",
    });

    const request = new NextRequest("http://localhost/api/users/filters/invalid-uuid");

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "invalid-uuid" }),
    });

    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Invalid filter ID format");
  });

  it("should return 401 if user not authenticated", async () => {
    const { requireAuthAPI } = await import("@/lib/server/auth");
    
    // Mock auth failure BEFORE importing the route
    vi.mocked(requireAuthAPI).mockRejectedValue(
      new Error("Autentisering krävs")
    );
    
    const { DELETE } = await import("@/app/api/users/filters/[id]/route");

    const request = new NextRequest(
      "http://localhost/api/users/filters/550e8400-e29b-41d4-a716-446655440000"
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" }),
    });

    // Response should exist even on error
    expect(response).toBeDefined();
    expect(response.status).toBe(401);
    
    const json = await response.json();
    expect(json.error).toBeDefined();
    expect(json.error.code).toBe("UNAUTHORIZED");
  });
});
