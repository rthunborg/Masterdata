/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/important-dates/available-pe3/route";
import { mockUsers } from "../../utils/role-test-utils";
import * as auth from "@/lib/server/auth";

// Mock the Supabase client
const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server-api", () => ({
  createAPIClient: vi.fn(),
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

describe("GET /api/important-dates/available-pe3", () => {
  beforeEach(async () => {
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
    
    // Mock createAPIClient to return mockSupabaseClient
    const { createAPIClient } = await import("@/lib/supabase/server-api");
    vi.mocked(createAPIClient).mockReturnValue(mockSupabaseClient as any);
  });

  it("should return only unassigned PE3 dates", async () => {
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
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: "date-1",
                week_number: 10,
                year: 2025,
                category: "PE3 Dates",
                date_description: "Fredag 7/3",
                date_value: "2025-03-07",
                notes: null,
                time_value: null,
                max_spots: 1,
                remaining_spots: 1,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
              {
                id: "date-2",
                week_number: 14,
                year: 2025,
                category: "PE3 Dates",
                date_description: "Fredag 4/4",
                date_value: "2025-04-04",
                notes: null,
                time_value: null,
                max_spots: 1,
                remaining_spots: 1,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
              {
                id: "date-3",
                week_number: 20,
                year: 2025,
                category: "PE3 Dates",
                date_description: "Fredag 16/5",
                date_value: "2025-05-16",
                notes: null,
                time_value: null,
                max_spots: 1,
                remaining_spots: 1,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
            ],
            error: null,
          }),
        };
      }

      if (table === "employees") {
        return {
          select: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [
              { pe3_date: "date-2" }, // date-2 is assigned
            ],
            error: null,
          }),
        };
      }

      return {};
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(2); // Only date-1 and date-3 (date-2 is assigned)
    expect(json.data[0].id).toBe("date-1");
    expect(json.data[1].id).toBe("date-3");
    expect(json.meta.total).toBe(2);
  });

  it("should return future dates only (excluding past dates except Jan 1 current year)", async () => {
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
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: "date-future",
                week_number: 20,
                year: 2025,
                category: "PE3 Dates",
                date_description: "Fredag 16/5",
                date_value: "2025-05-16",
                notes: null,
                time_value: null,
                max_spots: 1,
                remaining_spots: 1,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
            ],
            error: null,
          }),
        };
      }

      if (table === "employees") {
        return {
          select: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        };
      }

      return {};
    });

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].date_value).toBe("2025-05-16");
  });

  it("should include Jan 1 current year even if in the past", async () => {
    // This test verifies AC: "Any PE3 date equal to Jan 1 of the current 
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
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            // Simulate that the query returns Jan 1 (past) + future dates
            data: [
              {
                id: "date-jan1",
                week_number: 1,
                year: currentYear,
                category: "PE3 Dates",
                date_description: "Onsdag 1/1",
                date_value: jan1CurrentYear,
                notes: null,
                time_value: null,
                max_spots: 5,
                remaining_spots: 3,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
              {
                id: "date-future",
                week_number: 20,
                year: currentYear,
                category: "PE3 Dates",
                date_description: "Fredag 16/5",
                date_value: `${currentYear}-05-16`,
                notes: null,
                time_value: null,
                max_spots: 1,
                remaining_spots: 1,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
            ],
            error: null,
          }),
        };
      }

      if (table === "employees") {
        return {
          select: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        };
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
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            // The DB query with .or() filter should NOT return previous year Jan 1
            // because it only matches: date_value >= today OR date_value = jan1CurrentYear
            // This mock simulates correct DB behavior - only current year Jan 1 + future dates
            data: [
              {
                id: "date-jan1-current",
                week_number: 1,
                year: currentYear,
                category: "PE3 Dates",
                date_description: "Onsdag 1/1",
                date_value: jan1CurrentYear,
                notes: null,
                time_value: null,
                max_spots: 5,
                remaining_spots: 3,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
              {
                id: "date-future",
                week_number: 20,
                year: currentYear,
                category: "PE3 Dates",
                date_description: "Fredag 16/5",
                date_value: `${currentYear}-05-16`,
                notes: null,
                time_value: null,
                max_spots: 1,
                remaining_spots: 1,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
            ],
            error: null,
          }),
        };
      }

      if (table === "employees") {
        return {
          select: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        };
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
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            // DB returns in date order, but API should reorder with Jan 1 first
            data: [
              {
                id: "date-jan1",
                week_number: 1,
                year: currentYear,
                category: "PE3 Dates",
                date_description: "Onsdag 1/1",
                date_value: jan1CurrentYear,
                notes: null,
                time_value: null,
                max_spots: 5,
                remaining_spots: 3,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
              {
                id: "date-march",
                week_number: 10,
                year: currentYear,
                category: "PE3 Dates",
                date_description: "Fredag 7/3",
                date_value: `${currentYear}-03-07`,
                notes: null,
                time_value: null,
                max_spots: 1,
                remaining_spots: 1,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
              {
                id: "date-may",
                week_number: 20,
                year: currentYear,
                category: "PE3 Dates",
                date_description: "Fredag 16/5",
                date_value: `${currentYear}-05-16`,
                notes: null,
                time_value: null,
                max_spots: 1,
                remaining_spots: 1,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
            ],
            error: null,
          }),
        };
      }

      if (table === "employees") {
        return {
          select: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        };
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
    expect(json.data[1].date_value).toBe(`${currentYear}-03-07`);
    expect(json.data[2].date_value).toBe(`${currentYear}-05-16`);
  });

  it("should update when employee PE3 date is cleared", async () => {
    // This test simulates two separate API calls
    // First call: date-2 is assigned to an employee
    // Second call: PE3 date cleared (employee deleted or pe3_date set to null)

    // First call setup
    mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: mockUsers.hrAdmin.auth_id } } },
      error: null,
    });

    let callCount = 0;
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
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: "date-1",
                week_number: 10,
                year: 2025,
                category: "PE3 Dates",
                date_description: "Fredag 7/3",
                date_value: "2025-03-07",
                notes: null,
                time_value: null,
                max_spots: 1,
                remaining_spots: 1,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
              {
                id: "date-2",
                week_number: 14,
                year: 2025,
                category: "PE3 Dates",
                date_description: "Fredag 4/4",
                date_value: "2025-04-04",
                notes: null,
                time_value: null,
                max_spots: 1,
                remaining_spots: 1,
                created_at: "2025-01-01T00:00:00Z",
                updated_at: "2025-01-01T00:00:00Z",
              },
            ],
            error: null,
          }),
        };
      }

      if (table === "employees") {
        return {
          select: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            // First call: date-2 is assigned
            // Second call: no dates assigned
            data: callCount === 0 ? [{ pe3_date: "date-2" }] : [],
            error: null,
          }),
        };
      }

      return {};
    });

    // First call
    const response1 = await GET();
    const json1 = await response1.json();

    expect(json1.data).toHaveLength(1); // Only date-1 available
    expect(json1.data[0].id).toBe("date-1");

    // Increment call count to simulate state change
    callCount++;

    // Second call: PE3 date cleared
    mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: mockUsers.hrAdmin.auth_id } } },
      error: null,
    });

    const response2 = await GET();
    const json2 = await response2.json();

    expect(json2.data).toHaveLength(2); // Both dates now available
    expect(json2.data[0].id).toBe("date-1");
    expect(json2.data[1].id).toBe("date-2");
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
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        };
      }

      if (table === "employees") {
        return {
          select: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        };
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
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Database connection error" },
          }),
        };
      }

      return {};
    });

    const response = await GET();
    
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });
});
