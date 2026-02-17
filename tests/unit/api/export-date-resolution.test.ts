/**
 * Tests for Date UUID Resolution in Export
 * 
 * Verifies that date fields (stena_date, omc_date, pe3_date) are resolved 
 * from UUIDs to actual date strings in exports.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/server/auth");
vi.mock("@/lib/server/repositories/employee-repository");
vi.mock("@/lib/server/repositories/column-config-repository");
vi.mock("@/lib/supabase/server-api", () => ({ createAPIClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServiceRoleClient: vi.fn() }));

describe("Export Date Resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should resolve date UUIDs to actual dates in CSV export", async () => {
    const { requireAuthAPI } = await import("@/lib/server/auth");
    const { employeeRepository } = await import("@/lib/server/repositories/employee-repository");
    const { columnConfigRepository } = await import("@/lib/server/repositories/column-config-repository");
    const { createAPIClient } = await import("@/lib/supabase/server-api");

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

    // Mock employees with date UUIDs
    const mockEmployees = [
      {
        id: "emp-1",
        first_name: "John",
        surname: "Doe",
        ssn: "123456-7890",
        email: "john@example.com",
        mobile: "0701234567",
        rank: "SEV",
        gender: "Man",
        town_district: null,
        hire_date: "2025-01-15",
        stena_date: "stena-date-uuid-1", // UUID that should be resolved
        omc_date: "omc-date-uuid-1", // UUID that should be resolved
        pe3_date: "pe3-date-uuid-1", // UUID that should be resolved
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        archived_at: null,
        is_anonymized: false,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
        special_diet: false,
        diet_details: null,
        comments: null,
        one: true,
        one_marked_at: "2025-01-20T10:00:00Z",
        talmundo: true,
        isps: true,
        photo: true,
        origo: true,
        loneiva: 5,
        mail_lon: true,
        bankuppgifter: true,
        li: true,
        passport: true,
        kvitto_c17_18: true,
        c17: true,
        crewing_done: true,
        hotel_required: true,
        room_number_shared: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-29T00:00:00Z",
      },
    ];

    vi.mocked(employeeRepository.findAll).mockResolvedValue(mockEmployees);

    // Mock important dates
    const mockImportantDates = [
      {
        id: "stena-date-uuid-1",
        week_number: 10,
        year: 2025,
        category: "Stena Dates",
        date_description: "Stena 10 mars",
        date_value: "2025-03-10",
        time_value: null,
        deadline_submit: null,
        deadline_cancel: null,
        notes: null,
        is_active: true,
        max_spots: 0,
        remaining_spots: 0,
        assigned_employees: [],
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "omc-date-uuid-1",
        week_number: 11,
        year: 2025,
        category: "ÖMC Dates",
        date_description: "ÖMC 15-16 mars",
        date_value: "2025-03-15", // Start date of 2-day range
        time_value: null,
        deadline_submit: null,
        deadline_cancel: null,
        notes: null,
        is_active: true,
        max_spots: 50,
        remaining_spots: 30,
        assigned_employees: [],
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "pe3-date-uuid-1",
        week_number: 12,
        year: 2025,
        category: "PE3 Dates",
        date_description: "PE3 20 mars",
        date_value: "2025-03-20",
        time_value: "14:30",
        deadline_submit: null,
        deadline_cancel: null,
        notes: null,
        is_active: true,
        max_spots: 20,
        remaining_spots: 10,
        assigned_employees: [],
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
    ];

    // Mock column config
    const mockColumnConfig = [
      {
        id: "col-1",
        column_name: "Stena Date",
        db_column_name: "stena_date",
        is_masterdata: true,
        display_order: 1,
        is_visible: true,
        role_permissions: {
          hr_admin: { view: true, edit: true },
          recruiter: { view: true, edit: true },
          external_party: { view: true, edit: false },
          admin_limited: { view: true, edit: false },
        },
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "col-2",
        column_name: "ÖMC Date",
        db_column_name: "omc_date",
        is_masterdata: true,
        display_order: 2,
        is_visible: true,
        role_permissions: {
          hr_admin: { view: true, edit: true },
          recruiter: { view: true, edit: true },
          external_party: { view: true, edit: false },
          admin_limited: { view: true, edit: false },
        },
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "col-3",
        column_name: "PE3 Date",
        db_column_name: "pe3_date",
        is_masterdata: true,
        display_order: 3,
        is_visible: true,
        role_permissions: {
          hr_admin: { view: true, edit: true },
          recruiter: { view: true, edit: true },
          external_party: { view: true, edit: false },
          admin_limited: { view: true, edit: false },
        },
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
    ];

    vi.mocked(columnConfigRepository.findAll).mockResolvedValue(mockColumnConfig);

    // Mock Supabase client
    const mockSupabaseClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            data: [],
            error: null,
          }),
          eq: vi.fn().mockReturnValue({
            data: mockImportantDates,
            error: null,
          }),
        }),
      }),
    };

    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    vi.mocked(createAPIClient).mockReturnValue(mockSupabaseClient as any);
    vi.mocked(createServiceRoleClient).mockReturnValue(mockSupabaseClient as any);
    vi.mocked(createAPIClient).mockReturnValue(mockSupabaseClient as ReturnType<typeof createAPIClient>);

    // Import the route handler
    const { POST } = await import("@/app/api/employees/export/route");

    // Create mock request
    const request = new NextRequest("http://localhost:3000/api/employees/export", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        employeeIds: ["emp-1"],
        fields: ["stena_date", "omc_date", "pe3_date"],
        format: "csv",
      }),
    });

    // Execute request
    const response = await POST(request);

    // Verify response
    expect(response.status).toBe(200);
    
    // Get CSV content
    const csvContent = await response.text();
    
    // Verify that UUIDs are NOT in the export
    expect(csvContent).not.toContain("stena-date-uuid-1");
    expect(csvContent).not.toContain("omc-date-uuid-1");
    expect(csvContent).not.toContain("pe3-date-uuid-1");
    
    // Verify that actual dates ARE in the export
    // Dates are formatted in Swedish format: DD-MM or DD-MM - DD-MM for ÖMC
    expect(csvContent).toContain("10-03"); // Stena date
    expect(csvContent).toContain("15-03"); // ÖMC date start
    expect(csvContent).toContain("16-03"); // ÖMC date end (day after start)
    expect(csvContent).toContain("20-03"); // PE3 date
  });

  it("should handle deleted dates gracefully with 'Date Deleted' message", async () => {
    const { requireAuthAPI } = await import("@/lib/server/auth");
    const { employeeRepository } = await import("@/lib/server/repositories/employee-repository");
    const { columnConfigRepository } = await import("@/lib/server/repositories/column-config-repository");
    const { createAPIClient } = await import("@/lib/supabase/server-api");

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

    // Mock employee with deleted date UUID
    const mockEmployees = [
      {
        id: "emp-1",
        first_name: "John",
        surname: "Doe",
        ssn: "123456-7890",
        email: "john@example.com",
        mobile: "0701234567",
        rank: "SEV",
        gender: "Man",
        town_district: null,
        hire_date: "2025-01-15",
        stena_date: "deleted-date-uuid", // UUID that doesn't exist in important_dates
        omc_date: null,
        pe3_date: null,
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        archived_at: null,
        is_anonymized: false,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
        special_diet: false,
        diet_details: null,
        comments: null,
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
        room_number_shared: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-29T00:00:00Z",
      },
    ];

    vi.mocked(employeeRepository.findAll).mockResolvedValue(mockEmployees);

    // Mock important dates (has other dates but not the deleted one)
    // Note: allDates must have length > 0 for resolveImportantDateId to return dateDeletedText
    const mockImportantDates = [
      {
        id: "other-date-uuid",
        week_number: 10,
        year: 2025,
        category: "Stena Dates",
        date_description: "Stena 10 mars",
        date_value: "2025-03-10",
        time_value: null,
        deadline_submit: null,
        deadline_cancel: null,
        notes: null,
        is_active: true,
        max_spots: 0,
        remaining_spots: 0,
        assigned_employees: [],
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
    ];

    // Mock column config
    vi.mocked(columnConfigRepository.findAll).mockResolvedValue([
      {
        id: "col-1",
        column_name: "Stena Date",
        db_column_name: "stena_date",
        column_type: "date",
        is_masterdata: true,
        is_visible: true,
        is_checklist_item: false,
        category: null,
        category_color: null,
        display_order: 1,
        role_permissions: {
          hr_admin: { view: true, edit: true },
        },
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
    ]);

    // Mock Supabase client
    const mockSupabaseClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            data: [],
            error: null,
          }),
          eq: vi.fn().mockReturnValue({
            data: mockImportantDates,
            error: null,
          }),
        }),
      }),
    };

    const { createServiceRoleClient } = await import("@/lib/supabase/server");
    vi.mocked(createAPIClient).mockReturnValue(mockSupabaseClient as any);
    vi.mocked(createServiceRoleClient).mockReturnValue(mockSupabaseClient as any);
    vi.mocked(createAPIClient).mockReturnValue(mockSupabaseClient as ReturnType<typeof createAPIClient>);

    // Import the route handler
    const { POST } = await import("@/app/api/employees/export/route");

    // Create mock request
    const request = new NextRequest("http://localhost:3000/api/employees/export", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        employeeIds: ["emp-1"],
        fields: ["stena_date"],
        format: "csv",
      }),
    });

    // Execute request
    const response = await POST(request);

    // Get CSV content
    const csvContent = await response.text();
    
    // Verify that deleted date message appears
    expect(csvContent).toContain("Date Deleted");
    
    // Verify that UUID does not appear
    expect(csvContent).not.toContain("deleted-date-uuid");
  });
});
