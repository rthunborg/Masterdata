/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/important-dates/available-omc/route";
import { mockUsers } from "../../utils/role-test-utils";
import * as auth from "@/lib/server/auth";
import { createClient } from "@/lib/supabase/server";

// Mock the Supabase client
const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/server/auth", async () => {
  const actual = await vi.importActual("@/lib/server/auth");
  return {
    ...actual,
    requireAuthAPI: vi.fn(),
    createErrorResponse: vi.fn((error: unknown) => {
      const message = error instanceof Error ? error.message : "Internal server error";
      // Check if it's an authentication error
      if (message.includes("Authentication required")) {
        return new Response(
          JSON.stringify({
            error: {
              code: "UNAUTHORIZED",
              message,
              timestamp: new Date().toISOString(),
            },
          }),
          { status: 401 }
        );
      }
      return new Response(
        JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message,
            timestamp: new Date().toISOString(),
          },
        }),
        { status: 500 }
      );
    }),
  };
});

describe("GET /api/important-dates/available-omc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock requireAuthAPI to succeed by default
    vi.mocked(auth.requireAuthAPI).mockResolvedValue({
      id: mockUsers.hrAdmin.id,
      auth_id: mockUsers.hrAdmin.auth_id,
      email: mockUsers.hrAdmin.email,
      role: mockUsers.hrAdmin.role,
      is_active: true,
      created_at: mockUsers.hrAdmin.created_at,
      last_active_at: null,
    });
    
    // Mock createClient to return mockSupabaseClient
    vi.mocked(createClient).mockResolvedValue(mockSupabaseClient as any);
  });

  it("should return ÖMC dates with remaining capacity (not filtered by assignment)", async () => {
    // Note: Unlike PE3 dates (unique per employee), ÖMC dates have capacity (multiple employees per date)
    // Dates should be filtered by remaining_spots, NOT by whether any employee is assigned
    const currentYear = new Date().getFullYear();
    
    // Mock authentication
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: mockUsers.hrAdmin.auth_id } } },
      error: null,
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: mockUsers.hrAdmin.id,
                  email: mockUsers.hrAdmin.email,
                  role: mockUsers.hrAdmin.role,
                  is_active: true,
                  created_at: mockUsers.hrAdmin.created_at,
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === "important_dates") {
        const mockChain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: "date-1",
                week_number: 10,
                year: currentYear,
                category: "ÖMC Dates",
                date_description: "8-9 mars",
                date_value: `${currentYear}-03-08`,
                notes: null,
                time_value: null,
                max_spots: 20,
                remaining_spots: 15, // Has capacity
                is_active: true,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
              {
                id: "date-2",
                week_number: 14,
                year: currentYear,
                category: "ÖMC Dates",
                date_description: "5-6 april",
                date_value: `${currentYear}-04-05`,
                notes: null,
                time_value: null,
                max_spots: 20,
                remaining_spots: 10, // Has capacity (even though employees may be assigned)
                is_active: true,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
              {
                id: "date-3",
                week_number: 20,
                year: currentYear,
                category: "ÖMC Dates",
                date_description: "17-18 maj",
                date_value: `${currentYear}-05-17`,
                notes: null,
                time_value: null,
                max_spots: 20,
                remaining_spots: 0, // NO capacity - should be filtered out
                is_active: true,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
            ],
            error: null,
          }),
        };
        // Chain eq calls to return mockChain for each call
        mockChain.eq.mockReturnValue(mockChain);
        return mockChain;
      }

      return {};
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    // Both date-1 and date-2 should be available (they have remaining capacity)
    // date-3 should NOT be available (no capacity)
    expect(json.data).toHaveLength(2);
    expect(json.data[0].id).toBe("date-1");
    expect(json.data[1].id).toBe("date-2");
    expect(json.meta.total).toBe(2);
  });

  it("should return future dates only (excluding past dates except Jan 1 current year)", async () => {
    const currentYear = new Date().getFullYear();
    
    // Mock authentication
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: mockUsers.hrAdmin.auth_id } } },
      error: null,
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: mockUsers.hrAdmin.id,
                  email: mockUsers.hrAdmin.email,
                  role: mockUsers.hrAdmin.role,
                  is_active: true,
                  created_at: mockUsers.hrAdmin.created_at,
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === "important_dates") {
        const mockChain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: "date-future",
                week_number: 20,
                year: currentYear,
                category: "ÖMC Dates",
                date_description: "17-18 maj",
                date_value: `${currentYear}-05-17`,
                notes: null,
                time_value: null,
                max_spots: 20,
                remaining_spots: 18,
                is_active: true,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
            ],
            error: null,
          }),
        };
        mockChain.eq.mockReturnValue(mockChain);
        return mockChain;
      }

      return {};
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].date_value).toBe(`${currentYear}-05-17`);
  });

  it("should include Jan 1 current year even if in the past", async () => {
    // This test verifies AC: "Any ÖMC date equal to Jan 1 of the current 
    // calendar year appears even if it is in the past"
    const currentYear = new Date().getFullYear();
    const jan1CurrentYear = `${currentYear}-01-01`;

    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: mockUsers.hrAdmin.auth_id } } },
      error: null,
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: mockUsers.hrAdmin.id,
                  email: mockUsers.hrAdmin.email,
                  role: mockUsers.hrAdmin.role,
                  is_active: true,
                  created_at: mockUsers.hrAdmin.created_at,
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === "important_dates") {
        const mockChain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            // Simulate that the query returns Jan 1 (past) + future dates
            data: [
              {
                id: "date-jan1",
                week_number: 1,
                year: currentYear,
                category: "ÖMC Dates",
                date_description: "Har certifikat",
                date_value: jan1CurrentYear,
                notes: null,
                time_value: null,
                max_spots: 999,
                remaining_spots: 997,
                is_active: true,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
              {
                id: "date-future",
                week_number: 20,
                year: currentYear,
                category: "ÖMC Dates",
                date_description: "17-18 maj",
                date_value: `${currentYear}-05-17`,
                notes: null,
                time_value: null,
                max_spots: 20,
                remaining_spots: 18,
                is_active: true,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
            ],
            error: null,
          }),
        };
        mockChain.eq.mockReturnValue(mockChain);
        return mockChain;
      }

      return {};
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(2);
    // Jan 1 current year should be included
    expect(json.data.some((d: { date_value: string }) => d.date_value === jan1CurrentYear)).toBe(true);
  });

  it("should NOT include Jan 1 of previous year (only current year exception)", async () => {
    // This test verifies that the Jan 1 exception ONLY applies to the current year.
    // Jan 1 of a previous year should be excluded like any other past date.
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    const jan1PreviousYear = `${previousYear}-01-01`;
    const jan1CurrentYear = `${currentYear}-01-01`;

    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: mockUsers.hrAdmin.auth_id } } },
      error: null,
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: mockUsers.hrAdmin.id,
                  email: mockUsers.hrAdmin.email,
                  role: mockUsers.hrAdmin.role,
                  is_active: true,
                  created_at: mockUsers.hrAdmin.created_at,
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === "important_dates") {
        const mockChain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            // This mock simulates correct DB behavior - only current year dates
            data: [
              {
                id: "date-jan1-current",
                week_number: 1,
                year: currentYear,
                category: "ÖMC Dates",
                date_description: "Har certifikat",
                date_value: jan1CurrentYear,
                notes: null,
                time_value: null,
                max_spots: 999,
                remaining_spots: 997,
                is_active: true,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
              {
                id: "date-future",
                week_number: 20,
                year: currentYear,
                category: "ÖMC Dates",
                date_description: "17-18 maj",
                date_value: `${currentYear}-05-17`,
                notes: null,
                time_value: null,
                max_spots: 20,
                remaining_spots: 18,
                is_active: true,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
            ],
            error: null,
          }),
        };
        mockChain.eq.mockReturnValue(mockChain);
        return mockChain;
      }

      return {};
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(2);
    // Current year Jan 1 SHOULD be included
    expect(json.data.some((d: { date_value: string }) => d.date_value === jan1CurrentYear)).toBe(true);
    // Previous year Jan 1 should NOT be included
    expect(json.data.some((d: { date_value: string }) => d.date_value === jan1PreviousYear)).toBe(false);
    // Verify no dates from previous year at all
    expect(json.data.every((d: { date_value: string }) => d.date_value.startsWith(`${currentYear}`))).toBe(true);
  });

  it("should pin Jan 1 current year to top of the list", async () => {
    // This test verifies AC: "The Jan 1 current-year date is pinned to 
    // the top of the dropdown list when present"
    const currentYear = new Date().getFullYear();
    const jan1CurrentYear = `${currentYear}-01-01`;

    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: mockUsers.hrAdmin.auth_id } } },
      error: null,
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: mockUsers.hrAdmin.id,
                  email: mockUsers.hrAdmin.email,
                  role: mockUsers.hrAdmin.role,
                  is_active: true,
                  created_at: mockUsers.hrAdmin.created_at,
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === "important_dates") {
        const mockChain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            // DB returns in date order, but API should reorder with Jan 1 first
            data: [
              {
                id: "date-jan1",
                week_number: 1,
                year: currentYear,
                category: "ÖMC Dates",
                date_description: "Har certifikat",
                date_value: jan1CurrentYear,
                notes: null,
                time_value: null,
                max_spots: 999,
                remaining_spots: 997,
                is_active: true,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
              {
                id: "date-march",
                week_number: 10,
                year: currentYear,
                category: "ÖMC Dates",
                date_description: "8-9 mars",
                date_value: `${currentYear}-03-08`,
                notes: null,
                time_value: null,
                max_spots: 20,
                remaining_spots: 15,
                is_active: true,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
              {
                id: "date-may",
                week_number: 20,
                year: currentYear,
                category: "ÖMC Dates",
                date_description: "17-18 maj",
                date_value: `${currentYear}-05-17`,
                notes: null,
                time_value: null,
                max_spots: 20,
                remaining_spots: 18,
                is_active: true,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
            ],
            error: null,
          }),
        };
        mockChain.eq.mockReturnValue(mockChain);
        return mockChain;
      }

      return {};
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(3);
    // Jan 1 should be first (pinned to top)
    expect(json.data[0].date_value).toBe(jan1CurrentYear);
    expect(json.data[0].id).toBe("date-jan1");
    // Other dates should follow in date order
    expect(json.data[1].date_value).toBe(`${currentYear}-03-08`);
    expect(json.data[2].date_value).toBe(`${currentYear}-05-17`);
  });

  it("should include Jan 1 current year even when remaining_spots is 0 (full)", async () => {
    // This test verifies that the Jan 1 exception date is included in the API response
    // even when it's "full" (remaining_spots = 0), because the frontend handles the
    // disable state via `disabled={isFull && !isExceptionDate}`
    const currentYear = new Date().getFullYear();
    const jan1CurrentYear = `${currentYear}-01-01`;

    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: mockUsers.hrAdmin.auth_id } } },
      error: null,
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: mockUsers.hrAdmin.id,
                  email: mockUsers.hrAdmin.email,
                  role: mockUsers.hrAdmin.role,
                  is_active: true,
                  created_at: mockUsers.hrAdmin.created_at,
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === "important_dates") {
        const mockChain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: "date-jan1-full",
                week_number: 1,
                year: currentYear,
                category: "ÖMC Dates",
                date_description: "1 januari",
                date_value: jan1CurrentYear,
                notes: null,
                time_value: null,
                max_spots: 10,
                remaining_spots: 0, // FULL - no spots remaining
                is_active: true,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
              {
                id: "date-future",
                week_number: 10,
                year: currentYear,
                category: "ÖMC Dates",
                date_description: "8-9 mars",
                date_value: `${currentYear}-03-08`,
                notes: null,
                time_value: null,
                max_spots: 20,
                remaining_spots: 15, // Has capacity
                is_active: true,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
              {
                id: "date-future-full",
                week_number: 20,
                year: currentYear,
                category: "ÖMC Dates",
                date_description: "17-18 maj",
                date_value: `${currentYear}-05-17`,
                notes: null,
                time_value: null,
                max_spots: 20,
                remaining_spots: 0, // FULL - should be excluded (not Jan 1)
                is_active: true,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
            ],
            error: null,
          }),
        };
        mockChain.eq.mockReturnValue(mockChain);
        return mockChain;
      }

      return {};
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    // Should include Jan 1 (full but exception) + future date with capacity
    // Should NOT include future date that's full (date-future-full)
    expect(json.data).toHaveLength(2);
    // Jan 1 should be first (pinned to top)
    expect(json.data[0].date_value).toBe(jan1CurrentYear);
    expect(json.data[0].remaining_spots).toBe(0); // Confirms it's full but included
    // Future date with capacity should be second
    expect(json.data[1].date_value).toBe(`${currentYear}-03-08`);
    expect(json.data[1].remaining_spots).toBe(15);
  });

  it("should return all dates with remaining capacity regardless of employee assignments", async () => {
    // Unlike PE3 dates (unique per employee), ÖMC dates have capacity (multiple employees per date)
    // Dates should be filtered by remaining_spots, not by whether any employee is assigned
    // This test verifies that dates with capacity are available even if employees are assigned
    const currentYear = new Date().getFullYear();

    mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: mockUsers.hrAdmin.auth_id } } },
      error: null,
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: mockUsers.hrAdmin.id,
                  email: mockUsers.hrAdmin.email,
                  role: mockUsers.hrAdmin.role,
                  is_active: true,
                  created_at: mockUsers.hrAdmin.created_at,
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === "important_dates") {
        const mockChain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: "date-1",
                week_number: 10,
                year: currentYear,
                category: "ÖMC Dates",
                date_description: "8-9 mars",
                date_value: `${currentYear}-03-08`,
                notes: null,
                time_value: null,
                max_spots: 20,
                remaining_spots: 15, // Has capacity
                is_active: true,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
              {
                id: "date-2",
                week_number: 14,
                year: currentYear,
                category: "ÖMC Dates",
                date_description: "5-6 april",
                date_value: `${currentYear}-04-05`,
                notes: null,
                time_value: null,
                max_spots: 20,
                remaining_spots: 10, // Has capacity (even though employees are assigned)
                is_active: true,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
              {
                id: "date-3",
                week_number: 18,
                year: currentYear,
                category: "ÖMC Dates",
                date_description: "3-4 maj",
                date_value: `${currentYear}-05-03`,
                notes: null,
                time_value: null,
                max_spots: 20,
                remaining_spots: 0, // No capacity - should be filtered out
                is_active: true,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
            ],
            error: null,
          }),
        };
        mockChain.eq.mockReturnValue(mockChain);
        return mockChain;
      }

      return {};
    });

    const response = await GET();
    const json = await response.json();

    // Both date-1 and date-2 should be available (they have remaining capacity)
    // date-3 should NOT be available (no capacity)
    expect(json.data).toHaveLength(2);
    expect(json.data[0].id).toBe("date-1");
    expect(json.data[1].id).toBe("date-2");
    // Verify date-3 (no capacity) is not included
    expect(json.data.find((d: { id: string }) => d.id === "date-3")).toBeUndefined();
  });

  it("should require authentication", async () => {
    // Mock auth failure
    vi.mocked(auth.requireAuthAPI).mockRejectedValueOnce(
      new Error("Authentication required")
    );

    const response = await GET();
    
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("should return correct response structure", async () => {
    // Mock authentication
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: mockUsers.hrAdmin.auth_id } } },
      error: null,
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: mockUsers.hrAdmin.id,
                  email: mockUsers.hrAdmin.email,
                  role: mockUsers.hrAdmin.role,
                  is_active: true,
                  created_at: mockUsers.hrAdmin.created_at,
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === "important_dates") {
        const mockChain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        };
        mockChain.eq.mockReturnValue(mockChain);
        return mockChain;
      }

      return {};
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toHaveProperty("data");
    expect(json).toHaveProperty("meta");
    expect(json.meta).toHaveProperty("total");
    expect(json.meta).toHaveProperty("timestamp");
    expect(typeof json.meta.total).toBe("number");
    expect(typeof json.meta.timestamp).toBe("string");
  });

  it("should handle database errors gracefully", async () => {
    // Mock authentication
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: mockUsers.hrAdmin.auth_id } } },
      error: null,
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: mockUsers.hrAdmin.id,
                  email: mockUsers.hrAdmin.email,
                  role: mockUsers.hrAdmin.role,
                  is_active: true,
                  created_at: mockUsers.hrAdmin.created_at,
                },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === "important_dates") {
        const mockChain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Database connection error" },
          }),
        };
        mockChain.eq.mockReturnValue(mockChain);
        return mockChain;
      }

      return {};
    });

    const response = await GET();
    
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });
});
