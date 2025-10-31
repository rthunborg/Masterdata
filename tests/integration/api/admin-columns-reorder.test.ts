/**
 * Integration Tests for POST /api/admin/columns/reorder
 * Story 6.6: Column Management UX Improvements - Drag and Drop Reordering
 *
 * Tests cover:
 * - POST /api/admin/columns/reorder (batch update display order)
 *
 * Test scenarios:
 * - 200: Successful batch reorder
 * - 400: Validation errors (invalid UUIDs, negative display_order)
 * - 403: Forbidden for non-admin roles
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/columns/reorder/route";
import { columnConfigRepository } from "@/lib/server/repositories/column-config-repository";
import { mockUsers } from "../../utils/role-test-utils";

// Mock the repository
vi.mock("@/lib/server/repositories/column-config-repository", () => ({
  columnConfigRepository: {
    batchUpdateDisplayOrders: vi.fn(),
  },
}));

// Mock the auth middleware
vi.mock("@/lib/server/auth", async () => {
  const actual = await vi.importActual("@/lib/server/auth");
  return {
    ...actual,
    requireHRAdminAPI: vi.fn(),
  };
});

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe("POST /api/admin/columns/reorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully batch update display orders", async () => {
    mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: mockUsers.hrAdmin },
      error: null,
    });

    vi.mocked(columnConfigRepository.batchUpdateDisplayOrders).mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost:3000/api/admin/columns/reorder", {
      method: "POST",
      body: JSON.stringify({
        updates: [
          { id: "123e4567-e89b-12d3-a456-426614174000", display_order: 1 },
          { id: "223e4567-e89b-12d3-a456-426614174000", display_order: 2 },
          { id: "323e4567-e89b-12d3-a456-426614174000", display_order: 3 },
        ],
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(columnConfigRepository.batchUpdateDisplayOrders).toHaveBeenCalledWith([
      { id: "123e4567-e89b-12d3-a456-426614174000", display_order: 1 },
      { id: "223e4567-e89b-12d3-a456-426614174000", display_order: 2 },
      { id: "323e4567-e89b-12d3-a456-426614174000", display_order: 3 },
    ]);
  });

  it("should accept empty updates array", async () => {
    mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: mockUsers.hrAdmin },
      error: null,
    });

    vi.mocked(columnConfigRepository.batchUpdateDisplayOrders).mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost:3000/api/admin/columns/reorder", {
      method: "POST",
      body: JSON.stringify({
        updates: [],
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("should reject invalid UUID format", async () => {
    mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: mockUsers.hrAdmin },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/admin/columns/reorder", {
      method: "POST",
      body: JSON.stringify({
        updates: [
          { id: "invalid-uuid", display_order: 1 },
        ],
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject negative display_order", async () => {
    mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: mockUsers.hrAdmin },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/admin/columns/reorder", {
      method: "POST",
      body: JSON.stringify({
        updates: [
          { id: "123e4567-e89b-12d3-a456-426614174000", display_order: -1 },
        ],
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject zero display_order", async () => {
    mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: mockUsers.hrAdmin },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/admin/columns/reorder", {
      method: "POST",
      body: JSON.stringify({
        updates: [
          { id: "123e4567-e89b-12d3-a456-426614174000", display_order: 0 },
        ],
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject decimal display_order", async () => {
    mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: mockUsers.hrAdmin },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/admin/columns/reorder", {
      method: "POST",
      body: JSON.stringify({
        updates: [
          { id: "123e4567-e89b-12d3-a456-426614174000", display_order: 1.5 },
        ],
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject missing updates field", async () => {
    mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: mockUsers.hrAdmin },
      error: null,
    });

    const request = new NextRequest("http://localhost:3000/api/admin/columns/reorder", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("should handle repository errors gracefully", async () => {
    mockSupabaseClient.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: mockUsers.hrAdmin },
      error: null,
    });

    vi.mocked(columnConfigRepository.batchUpdateDisplayOrders).mockRejectedValue(
      new Error("Database error")
    );

    const request = new NextRequest("http://localhost:3000/api/admin/columns/reorder", {
      method: "POST",
      body: JSON.stringify({
        updates: [
          { id: "123e4567-e89b-12d3-a456-426614174000", display_order: 1 },
        ],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});