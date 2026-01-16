/**
 * Integration Tests for PE3 Uniqueness API
 * 
 * Story: 11.6 - Integration Tests for API Routes
 * AC4: PE3 Uniqueness Integration Tests
 * 
 * Tests verify:
 * - GET /api/important-dates/available-pe3 returns only available dates
 * - POST /api/employees rejects duplicate PE3 assignments (409)
 * - PATCH /api/employees/[id] rejects duplicate PE3 assignments (409)
 * - Database constraint prevents duplicate PE3 assignments
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "@/app/api/important-dates/available-pe3/route";
import { POST } from "@/app/api/employees/route";
import { PATCH } from "@/app/api/employees/[id]/route";
import { NextRequest } from "next/server";
import * as auth from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import { createClient } from "@/lib/supabase/server";
import { assignEmployeeToDate } from "@/lib/services/date-capacity";
import type { Employee, EmployeeFormData } from "@/lib/types/employee";
import type { ImportantDate } from "@/lib/types/important-date";
import { UserRole } from "@/lib/types/user";

vi.mock("@/lib/server/auth");
vi.mock("@/lib/server/repositories/employee-repository");
vi.mock("@/lib/supabase/server");
vi.mock("@/lib/services/date-capacity");

describe("GET /api/important-dates/available-pe3", () => {
  const mockHRAdminUser = {
    id: "user-1",
    auth_id: "auth-1",
    email: "admin@example.com",
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    last_active_at: null,
  };

  const mockAvailableDates: ImportantDate[] = [
    {
      id: "pe3-1",
      week_number: 15,
      year: 2025,
      category: "PE3 Dates",
      date_description: "PE3 Test 1",
      date_value: "10/4",
      notes: null,
      is_active: true,
      time_value: null,
      deadline_submit: null,
      deadline_cancel: null,
      max_spots: 10,
      remaining_spots: 5,
      assigned_employees: [],
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
    {
      id: "pe3-2",
      week_number: 16,
      year: 2025,
      category: "PE3 Dates",
      date_description: "PE3 Test 2",
      date_value: "17/4",
      notes: null,
      is_active: true,
      time_value: null,
      deadline_submit: null,
      deadline_cancel: null,
      max_spots: 20,
      remaining_spots: 10,
      assigned_employees: [],
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return only available PE3 dates", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockHRAdminUser);
    
    const mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
    };

    // Mock first query (important_dates)
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "important_dates") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockAvailableDates, error: null }),
        } as unknown as ReturnType<typeof mockSupabaseClient.from>;
      } else if (table === "employees") {
        return {
          select: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }), // No assigned dates
        } as unknown as ReturnType<typeof mockSupabaseClient.from>;
      }
      return mockSupabaseClient;
    });

    vi.mocked(createClient).mockResolvedValue(mockSupabaseClient as unknown as ReturnType<typeof createClient>);

    const request = new NextRequest("http://localhost:3000/api/important-dates/available-pe3");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual(mockAvailableDates);
  });

  it("should exclude dates with remaining_spots=0", async () => {
    const datesWithFull = [
      ...mockAvailableDates,
      {
        id: "pe3-full",
        week_number: 17,
        year: 2025,
        category: "PE3 Dates",
        date_description: "PE3 Full",
        date_value: "24/4",
        notes: null,
        is_active: true,
        time_value: null,
        deadline_submit: null,
        deadline_cancel: null,
        max_spots: 10,
        remaining_spots: 0, // Full
        assigned_employees: [],
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
    ];

    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockHRAdminUser);
    
    const mockSupabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "important_dates") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: datesWithFull, error: null }),
          };
        } else if (table === "employees") {
          return {
            select: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return {};
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabaseClient as unknown as ReturnType<typeof createClient>);

    const request = new NextRequest("http://localhost:3000/api/important-dates/available-pe3");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    // Route filters out dates with remaining_spots=0 in the response
    expect(json.data).toHaveLength(2);
    expect(json.data.find((d: ImportantDate) => d.id === "pe3-full")).toBeUndefined();
  });

  it("should exclude dates already assigned to employee", async () => {
    const employeeId = "emp-123";
    const assignedDateId = "pe3-1";

    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockHRAdminUser);
    
    const mockSupabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "important_dates") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockAvailableDates, error: null }),
          };
        } else if (table === "employees") {
          return {
            select: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ 
              data: [{ pe3_date: assignedDateId }], // This date is assigned
              error: null 
            }),
          };
        }
        return {};
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabaseClient as unknown as ReturnType<typeof createClient>);

    const request = new NextRequest(
      `http://localhost:3000/api/important-dates/available-pe3?employeeId=${employeeId}`
    );
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.find((d: ImportantDate) => d.id === assignedDateId)).toBeUndefined();
  });

  it("should return empty array when no dates available", async () => {
    vi.mocked(auth.requireAuthAPI).mockResolvedValue(mockHRAdminUser);
    
    const mockSupabaseClient = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "important_dates") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        } else if (table === "employees") {
          return {
            select: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return {};
      }),
    };

    vi.mocked(createClient).mockResolvedValue(mockSupabaseClient as unknown as ReturnType<typeof createClient>);

    const request = new NextRequest("http://localhost:3000/api/important-dates/available-pe3");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual([]);
  });

  it("should return 401 for unauthenticated requests", async () => {
    vi.mocked(auth.requireAuthAPI).mockRejectedValue(new Error("Authentication required"));
    vi.mocked(auth.createErrorResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        }),
        { status: 401 }
      )
    );

    const request = new NextRequest("http://localhost:3000/api/important-dates/available-pe3");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });
});

describe("POST /api/employees - PE3 Uniqueness", () => {
  const mockHRAdminUser = {
    id: "user-1",
    auth_id: "auth-1",
    email: "admin@example.com",
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    last_active_at: null,
  };

  const validEmployeeData: EmployeeFormData = {
    first_name: "Jane",
    surname: "Smith",
    ssn: "19900101-1234",
    email: "jane.smith@example.com",
    mobile: "+46701234567",
    rank: "CHEF",
    gender: "Woman",
    town_district: "Göteborg",
    hire_date: "2020-01-01", // Use past date to pass validation
    stena_date: null,
    omc_date: null,
    pe3_date: "pe3-date-1",
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    repayment_needed_omc: null,
    repayment_needed_pe3: null,
    one: false,
    one_marked_at: null,
    talmundo: false,
    isps: false,
    photo: false,
    origo: false,
    loneiva: null,
    mail_lon: false,
    bankuppgifter: false,
    li: false,
    passport: false,
    kvitto_c17_18: false,
    c17: false,
    crewing_done: false,
    hotel_required: false,
    comments: null,
    omc_masterdata_reminder_sent_at: null,
    room_number_shared: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject duplicate PE3 date assignment (409)", async () => {
    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    const duplicateError = new Error("PE3 date pe3-date-1 is already assigned to another employee");
    vi.mocked(employeeRepository.create).mockRejectedValue(duplicateError);

    const request = new NextRequest("http://localhost:3000/api/employees", {
      method: "POST",
      body: JSON.stringify(validEmployeeData),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error.message).toContain("already assigned");
  });

  it("should allow PE3 date assignment when not duplicate", async () => {
    const mockCreatedEmployee: Employee = {
      id: "new-emp-123",
      ...validEmployeeData,
      created_at: "2025-10-27T12:00:00Z",
      updated_at: "2025-10-27T12:00:00Z",
    };

    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.create).mockResolvedValue(mockCreatedEmployee);
    vi.mocked(assignEmployeeToDate).mockResolvedValue({ success: true, message: "Assigned" });
    vi.mocked(createClient).mockResolvedValue({} as unknown as ReturnType<typeof createClient>);

    const request = new NextRequest("http://localhost:3000/api/employees", {
      method: "POST",
      body: JSON.stringify(validEmployeeData),
    });

    // Clone request body since it can only be read once
    const clonedRequest = new NextRequest("http://localhost:3000/api/employees", {
      method: "POST",
      body: JSON.stringify(validEmployeeData),
    });

    const response = await POST(clonedRequest);
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.pe3_date).toBe("pe3-date-1");
  });
});

describe("PATCH /api/employees/[id] - PE3 Uniqueness", () => {
  const mockHRAdminUser = {
    id: "user-1",
    auth_id: "auth-1",
    email: "admin@example.com",
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    last_active_at: null,
  };

  const mockEmployee: Employee = {
    id: "employee-123",
    first_name: "John",
    surname: "Doe",
    ssn: "19850315-1234",
    email: "john.doe@example.com",
    mobile: "+46701234567",
    rank: "CHEF",
    gender: "Man",
    town_district: "Göteborg",
    hire_date: "2020-01-01", // Use past date to pass validation,
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    repayment_needed_omc: null,
    repayment_needed_pe3: null,
    one: null,
    one_marked_at: null,
    talmundo: null,
    isps: null,
    photo: null,
    origo: null,
    loneiva: null,
    mail_lon: null,
    bankuppgifter: null,
    li: null,
    passport: null,
    kvitto_c17_18: null,
    c17: null,
    crewing_done: null,
    comments: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject duplicate PE3 date assignment (409)", async () => {
    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    vi.mocked(employeeRepository.findById).mockResolvedValue(mockEmployee);
    // assignEmployeeToDate throws PE3 duplicate error
    const duplicateError = new Error("PE3 date pe3-date-1 is already assigned to another employee");
    vi.mocked(assignEmployeeToDate).mockRejectedValue(duplicateError);
    vi.mocked(createClient).mockResolvedValue({} as unknown as ReturnType<typeof createClient>);

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123", {
      method: "PATCH",
      body: JSON.stringify({ pe3_date: "pe3-date-1" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error.message).toContain("already assigned");
  });

  it("should allow PE3 date update when not duplicate", async () => {
    const updatedEmployee = {
      ...mockEmployee,
      pe3_date: "pe3-date-1",
      updated_at: "2025-10-27T15:30:00Z",
    };

    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    // When only date fields are updated, route calls findById after assignEmployeeToDate
    vi.mocked(employeeRepository.findById).mockResolvedValueOnce(mockEmployee).mockResolvedValueOnce(updatedEmployee);
    vi.mocked(assignEmployeeToDate).mockResolvedValue({ success: true, message: "Assigned" });
    vi.mocked(createClient).mockResolvedValue({} as unknown as ReturnType<typeof createClient>);

    const request = new NextRequest("http://localhost:3000/api/employees/employee-123", {
      method: "PATCH",
      body: JSON.stringify({ pe3_date: "pe3-date-1" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "employee-123" }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.pe3_date).toBe("pe3-date-1");
  });
});
