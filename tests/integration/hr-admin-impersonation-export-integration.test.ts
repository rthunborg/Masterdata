/**
 * Live integration tests for HR Admin impersonation exports.
 *
 * The suite is enabled only when HR_ADMIN_EXPORT_APP_BASE_URL explicitly points
 * to a running local Next.js application. Supabase is independently pinned to
 * this repository's high-port local stack by the Epic 22 environment helper.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { parse as parseEnv } from "dotenv";
import * as ExcelJS from "exceljs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/lib/types/supabase";
import {
  loadEpic22SupabaseTestEnvironment,
  resolveEpic22LocalServiceRoleKey,
} from "../helpers/epic-22-supabase-test-environment";
import {
  buildLocalApplicationUrl,
  resolveLocalApplicationBaseUrl,
} from "../helpers/local-application-test-environment";

const REQUEST_TIMEOUT_MS = 10_000;

function loadLocalServiceRoleKey(
  environment: ReturnType<typeof loadEpic22SupabaseTestEnvironment>
) {
  const dedicatedKey = process.env.EPIC_22_LOCAL_SERVICE_ROLE_KEY?.trim();
  const legacyKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const hasUsableInProcessKey =
    Boolean(dedicatedKey) ||
    Boolean(legacyKey && legacyKey !== "test-service-role-key");
  const exampleEnvironment =
    !environment.envFilePresent && !hasUsableInProcessKey
      ? parseEnv(readFileSync(resolve(process.cwd(), ".env.example"), "utf8"))
      : {};

  return resolveEpic22LocalServiceRoleKey({
    env: process.env,
    envFilePresent: environment.envFilePresent,
    exampleEnvironment,
  });
}

type CookieCapableHeaders = Headers & {
  getSetCookie?: () => string[];
  raw?: () => Record<string, string[]>;
};

function extractCookieHeader(response: Response) {
  const headers = response.headers as CookieCapableHeaders;
  const nativeSetCookies = headers.getSetCookie?.() ?? [];
  const setCookies =
    nativeSetCookies.length > 0
      ? nativeSetCookies
      : headers.raw?.()["set-cookie"] ?? [];
  const cookiePairs = setCookies
    .map((setCookie) => setCookie.split(";", 1)[0]?.trim())
    .filter((cookie): cookie is string => Boolean(cookie));

  if (cookiePairs.length === 0) {
    throw new Error("Local application login returned no session cookies");
  }

  return cookiePairs.join("; ");
}

async function responseErrorCode(response: Response) {
  try {
    const payload = (await response.json()) as {
      error?: { code?: unknown };
    };
    return typeof payload.error?.code === "string"
      ? payload.error.code
      : "unknown_error";
  } catch {
    return "invalid_error_response";
  }
}

const environment = loadEpic22SupabaseTestEnvironment();
const localServiceRoleKey = loadLocalServiceRoleKey(environment);
const appBaseUrl = resolveLocalApplicationBaseUrl(
  process.env.HR_ADMIN_EXPORT_APP_BASE_URL
);
const requireLiveEvidence =
  process.env.REQUIRE_HR_ADMIN_EXPORT_INTEGRATION === "true";
const environmentSkipReason = !appBaseUrl
  ? "set HR_ADMIN_EXPORT_APP_BASE_URL to the running loopback Next.js origin"
  : !localServiceRoleKey
    ? "provide the local Supabase service-role key"
    : null;

if (environmentSkipReason) {
  if (requireLiveEvidence) {
    throw new Error(
      `[HR Admin impersonation export] ${environmentSkipReason}. ` +
        "REQUIRE_HR_ADMIN_EXPORT_INTEGRATION=true requires all five live tests to run."
    );
  }
  console.warn(
    `[HR Admin impersonation export] Environment skip: ${environmentSkipReason}.`
  );
}

describe.skipIf(Boolean(environmentSkipReason))(
  "HR Admin Impersonation Export Integration",
  () => {
    let supabase: ReturnType<typeof createClient<Database>> | null = null;
    let testAuthUserId: string | null = null;
    let testHRAdminUserId: string | null = null;
    let testEmployeeIds: string[] = [];
    let authCookieHeader: string | null = null;

    const runId = randomUUID().replaceAll("-", "").slice(0, 16);
    const testEmail = `hr-admin-export-${runId}@example.invalid`;
    const testPassword = `LocalOnly-${randomUUID()}!`;
    const employeeSsnValues = [
      `synthetic-${runId}-1`,
      `synthetic-${runId}-2`,
    ];

    function localAppUrl(pathname: string) {
      return buildLocalApplicationUrl(appBaseUrl!, pathname);
    }

    async function exportEmployees(body: Record<string, unknown>) {
      if (!authCookieHeader) {
        throw new Error("Local application session cookie is unavailable");
      }

      return fetch(localAppUrl("/api/employees/export"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: authCookieHeader,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    }

    beforeAll(async () => {
      supabase = createClient<Database>(
        environment.apiUrl,
        localServiceRoleKey!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      const { data: authUser, error: authError } =
        await supabase.auth.admin.createUser({
          email: testEmail,
          password: testPassword,
          email_confirm: true,
        });

      if (authError || !authUser.user) {
        throw authError ?? new Error("Local Auth user creation returned no user");
      }
      testAuthUserId = authUser.user.id;

      const { data: appUser, error: userError } = await supabase
        .from("users")
        .insert({
          auth_user_id: testAuthUserId,
          email: testEmail,
          role: "hr_admin",
          is_active: true,
        })
        .select("id")
        .single();

      if (userError || !appUser) {
        throw userError ?? new Error("Local application user insert returned no row");
      }
      testHRAdminUserId = appUser.id;

      const { data: employees, error: employeeError } = await supabase
        .from("employees")
        .insert([
          {
            first_name: "Export",
            surname: "Synthetic1",
            ssn: employeeSsnValues[0],
            email: `export-1-${runId}@example.invalid`,
            hire_date: "2025-01-01",
          },
          {
            first_name: "Export",
            surname: "Synthetic2",
            ssn: employeeSsnValues[1],
            email: `export-2-${runId}@example.invalid`,
            hire_date: "2025-01-02",
          },
        ])
        .select("id");

      if (employeeError || !employees || employees.length !== 2) {
        throw (
          employeeError ??
          new Error("Local employee setup did not return both inserted rows")
        );
      }
      testEmployeeIds = employees.map((employee) => employee.id);

      const { data: columns, error: columnError } = await supabase
        .from("column_config")
        .select("db_column_name")
        .in("db_column_name", ["first_name", "ssn"]);

      if (columnError) throw columnError;
      const configuredColumns = new Set(
        (columns ?? []).map((column) => column.db_column_name)
      );
      if (
        !configuredColumns.has("first_name") ||
        !configuredColumns.has("ssn")
      ) {
        throw new Error(
          "Local column configuration is missing first_name or ssn"
        );
      }

      const loginResponse = await fetch(localAppUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, password: testPassword }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!loginResponse.ok) {
        const code = await responseErrorCode(loginResponse);
        throw new Error(
          `Local application login setup failed with ${loginResponse.status} (${code})`
        );
      }
      authCookieHeader = extractCookieHeader(loginResponse);
    });

    afterAll(async () => {
      if (!supabase) return;

      const cleanupErrors: Error[] = [];
      if (testEmployeeIds.length > 0) {
        const { error } = await supabase
          .from("employees")
          .delete()
          .in("id", testEmployeeIds);
        if (error) {
          cleanupErrors.push(
            new Error(`Employee cleanup failed (${error.code ?? "unknown"})`)
          );
        }
      }

      if (testHRAdminUserId) {
        const { error } = await supabase
          .from("users")
          .delete()
          .eq("id", testHRAdminUserId);
        if (error) {
          cleanupErrors.push(
            new Error(
              `Application-user cleanup failed (${error.code ?? "unknown"})`
            )
          );
        }
      }

      if (testAuthUserId) {
        const { error } = await supabase.auth.admin.deleteUser(testAuthUserId);
        if (error) {
          cleanupErrors.push(
            new Error(`Auth-user cleanup failed (${error.code ?? "unknown"})`)
          );
        }
      }

      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          cleanupErrors,
          "HR Admin impersonation export cleanup failed"
        );
      }
    });

    it("exports employee data with impersonated role permissions", async () => {
      const response = await exportEmployees({
        employeeIds: testEmployeeIds,
        fields: ["first_name"],
        impersonatedRole: "sodexo",
        format: "xlsx",
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("spreadsheetml");
      expect(response.headers.get("X-Impersonated-Role")).toBe("sodexo");

      const blob = await response.blob();
      expect(blob.size).toBeGreaterThan(0);
    });

    it("rejects restricted fields when impersonating", async () => {
      const response = await exportEmployees({
        employeeIds: testEmployeeIds,
        fields: ["first_name", "ssn"],
        impersonatedRole: "sodexo",
        format: "xlsx",
      });

      expect(response.status).toBe(403);
      const data = (await response.json()) as {
        error: { code: string };
      };
      expect(data.error.code).toBe("PERMISSION_DENIED");
    });

    it("generates a properly formatted Excel file", async () => {
      const response = await exportEmployees({
        employeeIds: testEmployeeIds,
        fields: ["first_name", "ssn"],
        format: "xlsx",
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("spreadsheetml");

      const contentDisposition = response.headers.get("Content-Disposition");
      expect(contentDisposition).toContain(".xlsx");
      expect(contentDisposition).toContain("attachment");

      const responseBytes = new Uint8Array(await response.arrayBuffer());
      expect(
        Array.from(responseBytes.slice(0, 4)),
        `Unexpected XLSX prefix: ${JSON.stringify(Array.from(responseBytes.slice(0, 20)))}`
      ).toEqual([0x50, 0x4b, 0x03, 0x04]);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(Buffer.from(responseBytes));
      const worksheet = workbook.getWorksheet("Employees");
      expect(worksheet).toBeDefined();
      expect(worksheet?.getRow(1).values).toEqual([
        undefined,
        "First Name",
        "SSN",
      ]);
      expect(worksheet?.rowCount).toBeGreaterThanOrEqual(3);
    });

    it("accepts fields in the requested column order", async () => {
      const response = await exportEmployees({
        employeeIds: testEmployeeIds,
        fields: ["ssn", "first_name"],
        format: "xlsx",
      });

      expect(response.status).toBe(200);
      const blob = await response.blob();
      expect(blob.size).toBeGreaterThan(0);
    });

    it("includes export metadata in response headers", async () => {
      const response = await exportEmployees({
        employeeIds: testEmployeeIds,
        fields: ["first_name"],
        impersonatedRole: "omc",
        format: "xlsx",
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("X-Impersonated-Role")).toBe("omc");
      expect(response.headers.get("X-Employees-Exported")).toBe(
        testEmployeeIds.length.toString()
      );
      expect(response.headers.get("X-Timestamp")).toBeTruthy();
    });
  }
);
