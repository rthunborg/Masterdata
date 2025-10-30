import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/important-dates/available-pe3/route";
import { mockUsers } from "../../utils/role-test-utils";

// Mock the Supabase client
const mockSupabaseClient = {
  auth: {
    getSession: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe("GET /api/important-dates/available-pe3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
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
                      created_at: "2025-01-01T00:00:00Z",
                      updated_at: "2025-01-01T00:00:00Z",
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === "employees") {
        return {
          select: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { pe3_date: "date-2" }, // date-2 is assigned
                ],
                error: null,
              }),
            }),
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

  it("should return future dates only", async () => {
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
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
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
                      created_at: "2025-01-01T00:00:00Z",
                      updated_at: "2025-01-01T00:00:00Z",
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === "employees") {
        return {
          select: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
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
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
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
                      created_at: "2025-01-01T00:00:00Z",
                      updated_at: "2025-01-01T00:00:00Z",
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === "employees") {
        return {
          select: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                // First call: date-2 is assigned
                // Second call: no dates assigned
                data: callCount === 0 ? [{ pe3_date: "date-2" }] : [],
                error: null,
              }),
            }),
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
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

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
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === "employees") {
        return {
          select: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
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
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: "Database connection error" },
                }),
              }),
            }),
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
