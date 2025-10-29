import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

describe.skip("DELETE /api/admin/columns/[id]", () => {
  let supabase: SupabaseClient;
  let adminToken: string;
  let nonAdminToken: string;
  let customColumnId: string;
  let masterdataColumnId: string;
  let testEmployeeId: string;

  beforeAll(async () => {
    // Create Supabase client with service role key
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Login as HR Admin
    const { data: adminAuth, error: adminAuthError } =
      await supabase.auth.signInWithPassword({
        email: "admin@test.com",
        password: "testpass123",
      });

    if (adminAuthError) {
      throw new Error(`Admin login failed: ${adminAuthError.message}`);
    }

    adminToken = adminAuth.session.access_token;

    // Login as Sodexo (non-admin)
    const { data: sodexoAuth, error: sodexoAuthError } =
      await supabase.auth.signInWithPassword({
        email: "sodexo@test.com",
        password: "testpass123",
      });

    if (sodexoAuthError) {
      throw new Error(`Sodexo login failed: ${sodexoAuthError.message}`);
    }

    nonAdminToken = sodexoAuth.session.access_token;

    // Get a masterdata column
    const { data: masterdataColumn } = await supabase
      .from("column_config")
      .select("*")
      .eq("is_masterdata", true)
      .limit(1)
      .single();

    masterdataColumnId = masterdataColumn.id;

    // Get a test employee
    const { data: employee } = await supabase
      .from("employees")
      .select("*")
      .limit(1)
      .single();

    testEmployeeId = employee.id;
  });

  beforeEach(async () => {
    // Create a fresh test custom column before each test
    const { data: customColumn } = await supabase
      .from("column_config")
      .insert({
        column_name: `Test Custom Column ${Date.now()}`,
        column_type: "text",
        is_masterdata: false,
        role_permissions: {
          sodexo: { view: true, edit: true },
        },
      })
      .select()
      .single();

    customColumnId = customColumn.id;
  });

  afterAll(async () => {
    // Cleanup: sign out
    await supabase.auth.signOut();
  });

  it("successfully deletes custom column for HR Admin", async () => {
    const response = await fetch(
      `http://localhost:3000/api/admin/columns/${customColumnId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data.id).toBe(customColumnId);
    expect(json.data.message).toBe("Column deleted successfully");

    // Verify column deleted from database
    const { data: deletedColumn } = await supabase
      .from("column_config")
      .select("*")
      .eq("id", customColumnId)
      .maybeSingle();

    expect(deletedColumn).toBeNull();
  });

  it("returns 403 when trying to delete masterdata column", async () => {
    const response = await fetch(
      `http://localhost:3000/api/admin/columns/${masterdataColumnId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error.code).toBe("FORBIDDEN");
    expect(json.error.message).toContain(
      "Masterdata columns cannot be deleted"
    );
  });

  it("returns 403 for non-admin users", async () => {
    const response = await fetch(
      `http://localhost:3000/api/admin/columns/${customColumnId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${nonAdminToken}` },
      }
    );

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("returns 404 for non-existent column", async () => {
    const response = await fetch(
      `http://localhost:3000/api/admin/columns/00000000-0000-0000-0000-000000000000`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("removes JSONB keys from party data tables", async () => {
    // Create test column with specific name
    const testColumnName = `JSONB Test Column ${Date.now()}`;
    const { data: testColumn } = await supabase
      .from("column_config")
      .insert({
        column_name: testColumnName,
        column_type: "text",
        is_masterdata: false,
        role_permissions: {
          sodexo: { view: true, edit: true },
        },
      })
      .select()
      .single();

    // Add data to sodexo_data table
    await supabase.from("sodexo_data").upsert({
      employee_id: testEmployeeId,
      data: { [testColumnName]: "test value" },
    });

    // Verify data exists
    const { data: beforeDelete } = await supabase
      .from("sodexo_data")
      .select("data")
      .eq("employee_id", testEmployeeId)
      .single();

    expect(beforeDelete).not.toBeNull();
    expect(beforeDelete!.data).toHaveProperty(testColumnName);

    // Delete column
    const response = await fetch(
      `http://localhost:3000/api/admin/columns/${testColumn.id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    expect(response.status).toBe(200);

    // Verify JSONB key removed
    const { data: afterDelete } = await supabase
      .from("sodexo_data")
      .select("data")
      .eq("employee_id", testEmployeeId)
      .single();

    expect(afterDelete).not.toBeNull();
    expect(afterDelete!.data).not.toHaveProperty(testColumnName);
  });

  it("returns affected records count", async () => {
    const testColumnName = `Count Test Column ${Date.now()}`;
    const { data: testColumn } = await supabase
      .from("column_config")
      .insert({
        column_name: testColumnName,
        column_type: "text",
        is_masterdata: false,
        role_permissions: {
          sodexo: { view: true, edit: true },
        },
      })
      .select()
      .single();

    // Add data to multiple employees
    const { data: employees } = await supabase
      .from("employees")
      .select("id")
      .limit(3);

    expect(employees).not.toBeNull();

    for (const employee of employees!) {
      await supabase.from("sodexo_data").upsert({
        employee_id: employee.id,
        data: { [testColumnName]: "test" },
      });
    }

    const response = await fetch(
      `http://localhost:3000/api/admin/columns/${testColumn.id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    const json = await response.json();
    expect(json.data.affected_records).toBeGreaterThanOrEqual(3);
  });
});
