import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildLocalApplicationUrl,
  resolveLocalApplicationBaseUrl,
} from "../../../helpers/local-application-test-environment";

describe("HR Admin impersonation export live-test harness", () => {
  it("requires an explicit app base URL before enabling live application calls", () => {
    expect(resolveLocalApplicationBaseUrl(undefined)).toBeNull();
    expect(resolveLocalApplicationBaseUrl("  ")).toBeNull();
  });

  it("accepts and normalizes explicit loopback application origins", () => {
    expect(
      resolveLocalApplicationBaseUrl("http://localhost:13100/")
    ).toBe("http://localhost:13100");
    expect(
      resolveLocalApplicationBaseUrl("http://127.0.0.1:3100")
    ).toBe("http://127.0.0.1:3100");
    expect(
      buildLocalApplicationUrl(
        "http://127.0.0.1:3100",
        "/api/employees/export"
      )
    ).toBe("http://127.0.0.1:3100/api/employees/export");
  });

  it.each([
    "https://localhost:13100",
    "http://example.com:13100",
    "http://127.0.0.1",
    "http://user:password@127.0.0.1:13100",
    "http://127.0.0.1:13100/application",
    "http://127.0.0.1:13100/?target=remote",
  ])("rejects unsafe or ambiguous application base URL %s", (baseUrl) => {
    expect(() => resolveLocalApplicationBaseUrl(baseUrl)).toThrow(
      /explicit loopback application URL/i
    );
  });

  it("rejects non-origin-relative application paths", () => {
    expect(() =>
      buildLocalApplicationUrl("http://localhost:13100", "api/export")
    ).toThrow(/origin-relative/i);
    expect(() =>
      buildLocalApplicationUrl(
        "http://localhost:13100",
        "//remote.example/api/export"
      )
    ).toThrow(/origin-relative/i);
    expect(() =>
      buildLocalApplicationUrl(
        "http://localhost:13100",
        "/\\remote.example/api/export"
      )
    ).toThrow(/origin-relative/i);
  });

  it("keeps setup failures visible and never derives the app URL from Supabase", () => {
    const harnessSource = readFileSync(
      resolve(
        process.cwd(),
        "tests/integration/hr-admin-impersonation-export-integration.test.ts"
      ),
      "utf8"
    );

    expect(harnessSource).not.toContain("context.skip");
    expect(harnessSource).not.toContain("skipTests");
    expect(harnessSource).not.toContain('supabaseUrl.replace("/v1", "")');
    expect(harnessSource).toContain(
      "process.env.HR_ADMIN_EXPORT_APP_BASE_URL"
    );
    expect(harnessSource).toContain(
      'process.env.REQUIRE_HR_ADMIN_EXPORT_INTEGRATION === "true"'
    );
    expect(harnessSource).toContain(
      'buildLocalApplicationUrl(appBaseUrl!, pathname)'
    );
  });
});
