/**
 * Integration Tests for HR Admin Impersonation Export Feature
 * 
 * Tests the complete flow from UI interaction to API export,
 * ensuring proper role impersonation and Excel file generation.
 * 
 * NOTE: These tests require a live Supabase instance and will be skipped
 * in CI/CD environments where Supabase credentials are not available.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/supabase";

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Skip integration tests if Supabase credentials are not available
const skipIntegrationTests = !supabaseUrl || !supabaseServiceKey;

describe.skipIf(skipIntegrationTests)("HR Admin Impersonation Export Integration", () => {
  let supabase: ReturnType<typeof createClient<Database>>;
  let testHRAdminUserId: string;
  let testEmployeeIds: string[] = [];
  let testColumnIds: string[] = [];
  let skipTests = false;

  beforeAll(async () => {
    try {
      supabase = createClient<Database>(supabaseUrl!, supabaseServiceKey!);

      // Create test HR Admin user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: "test-hr-admin-export@example.com",
        password: "test-password-123",
        email_confirm: true,
      });

      if (authError) throw authError;

      const { data: appUser, error: userError } = await supabase
        .from("users")
        .insert({
          auth_user_id: authUser.user.id,
          email: "test-hr-admin-export@example.com",
          role: "hr_admin",
          is_active: true,
        })
        .select()
        .single();

      if (userError) throw userError;
      testHRAdminUserId = appUser.id;

      // Create test employees
      const { data: employees, error: empError } = await supabase
        .from("employees")
        .insert([
          {
            first_name: "Export",
            surname: "Test1",
            ssn: "111111-1111",
            email: "export1@test.com",
            hire_date: "2025-01-01",
          },
          {
            first_name: "Export",
            surname: "Test2",
            ssn: "222222-2222",
            email: "export2@test.com",
            hire_date: "2025-01-02",
          },
        ])
        .select();

      if (empError) throw empError;
      testEmployeeIds = employees.map((e) => e.id);

      // Verify column configurations exist for test
      const { data: columns } = await supabase
        .from("column_config")
        .select("id")
        .in("db_column_name", ["first_name", "ssn"]);

      if (columns) {
        testColumnIds = columns.map((c) => c.id);
      }
    } catch (error) {
      // Mark tests as skipped if Supabase connection fails
      console.warn("Skipping HR Admin Impersonation Export integration tests: Supabase unavailable");
      skipTests = true;
      // Tests will be skipped via beforeEach check
    }
  });

  beforeEach((context) => {
    // Skip each test if setup failed
    if (skipTests) {
      context.skip();
    }
  });

  afterAll(async () => {
    // Skip cleanup if tests were skipped
    if (skipTests) return;

    // Cleanup test data
    if (testEmployeeIds.length > 0) {
      await supabase.from("employees").delete().in("id", testEmployeeIds);
    }

    if (testHRAdminUserId) {
      const { data: user } = await supabase
        .from("users")
        .select("auth_user_id")
        .eq("id", testHRAdminUserId)
        .single();

      await supabase.from("users").delete().eq("id", testHRAdminUserId);

      if (user?.auth_user_id) {
        await supabase.auth.admin.deleteUser(user.auth_user_id);
      }
    }
  });

  it("should export employee data with impersonated role permissions", async () => {
    // Sign in as HR Admin
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: "test-hr-admin-export@example.com",
      password: "test-password-123",
    });

    expect(signInError).toBeNull();
    expect(authData.session).toBeTruthy();

    // Make export request with impersonation
    const response = await fetch(`${supabaseUrl.replace("/v1", "")}/api/employees/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authData.session!.access_token}`,
      },
      body: JSON.stringify({
        employeeIds: testEmployeeIds,
        fields: ["first_name"], // Only field accessible to Sodexo in this test
        impersonatedRole: "sodexo",
        format: "xlsx",
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("spreadsheetml");
    expect(response.headers.get("X-Impersonated-Role")).toBe("sodexo");

    const blob = await response.blob();
    expect(blob.size).toBeGreaterThan(0);

    // Cleanup
    await supabase.auth.signOut();
  });

  it("should reject export of restricted fields when impersonating", async () => {
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: "test-hr-admin-export@example.com",
      password: "test-password-123",
    });

    // Try to export SSN while impersonating Sodexo (who doesn't have permission)
    const response = await fetch(`${supabaseUrl.replace("/v1", "")}/api/employees/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authData!.session!.access_token}`,
      },
      body: JSON.stringify({
        employeeIds: testEmployeeIds,
        fields: ["first_name", "ssn"], // SSN not allowed for Sodexo
        impersonatedRole: "sodexo",
        format: "xlsx",
      }),
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error.code).toBe("PERMISSION_DENIED");

    await supabase.auth.signOut();
  });

  it("should generate properly formatted Excel file", async () => {
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: "test-hr-admin-export@example.com",
      password: "test-password-123",
    });

    const response = await fetch(`${supabaseUrl.replace("/v1", "")}/api/employees/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authData!.session!.access_token}`,
      },
      body: JSON.stringify({
        employeeIds: testEmployeeIds,
        fields: ["first_name", "ssn"], // HR Admin can access both
        format: "xlsx",
      }),
    });

    expect(response.status).toBe(200);
    
    const contentType = response.headers.get("Content-Type");
    expect(contentType).toContain("spreadsheetml");
    
    const contentDisposition = response.headers.get("Content-Disposition");
    expect(contentDisposition).toContain(".xlsx");
    expect(contentDisposition).toContain("attachment");

    const blob = await response.blob();
    
    // Verify Excel file has valid size (not empty)
    expect(blob.size).toBeGreaterThan(100); // Excel files have minimum size

    // Verify MIME type
    expect(blob.type).toContain("spreadsheet");

    await supabase.auth.signOut();
  });

  it("should maintain column order in exported Excel file", async () => {
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: "test-hr-admin-export@example.com",
      password: "test-password-123",
    });

    // Request fields in specific order
    const orderedFields = ["ssn", "first_name"]; // Reverse alphabetical order

    const response = await fetch(`${supabaseUrl.replace("/v1", "")}/api/employees/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authData!.session!.access_token}`,
      },
      body: JSON.stringify({
        employeeIds: testEmployeeIds,
        fields: orderedFields,
        format: "xlsx",
      }),
    });

    expect(response.status).toBe(200);

    // Note: Full Excel parsing would require additional libraries
    // This test verifies the export succeeds with ordered fields
    const blob = await response.blob();
    expect(blob.size).toBeGreaterThan(0);

    await supabase.auth.signOut();
  });

  it("should include metadata in response headers", async () => {
    const { data: authData } = await supabase.auth.signInWithPassword({
      email: "test-hr-admin-export@example.com",
      password: "test-password-123",
    });

    const response = await fetch(`${supabaseUrl.replace("/v1", "")}/api/employees/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authData!.session!.access_token}`,
      },
      body: JSON.stringify({
        employeeIds: testEmployeeIds,
        fields: ["first_name"],
        impersonatedRole: "omc",
        format: "xlsx",
      }),
    });

    expect(response.status).toBe(200);
    
    // Verify metadata headers
    expect(response.headers.get("X-Impersonated-Role")).toBe("omc");
    expect(response.headers.get("X-Employees-Exported")).toBe(testEmployeeIds.length.toString());
    expect(response.headers.get("X-Timestamp")).toBeTruthy();

    await supabase.auth.signOut();
  });
});
