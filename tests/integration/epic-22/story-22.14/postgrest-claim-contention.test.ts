import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parse as parseEnv } from "dotenv";
import { Client } from "pg";
import { describe, expect, it, vi } from "vitest";

import {
  claimOmcMasterdataReminder,
  evaluateOmcMasterdataCompletion,
  releaseOmcMasterdataReminderClaims,
  type ClaimedOmcReminderCandidate,
  type OmcReminderCandidate,
  type OmcReminderEmployee,
} from "@/lib/services/omc-masterdata-reminder";
import {
  assertEpic22DatabaseFingerprint,
  formatEpic22SupabaseSkipDiagnostic,
  isEpic22DatabaseReachable,
  loadEpic22SupabaseTestEnvironment,
} from "../../../helpers/epic-22-supabase-test-environment";

const CLAIM_SELECT_COLUMNS = "id,omc_date,omc_masterdata_reminder_sent_at";

function loadLocalServiceRoleKey(
  environment: ReturnType<typeof loadEpic22SupabaseTestEnvironment>
) {
  if (environment.envFilePresent) {
    return process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
  }

  const exampleEnvironment = parseEnv(
    readFileSync(resolve(process.cwd(), ".env.example"), "utf8")
  );
  return exampleEnvironment.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

function restoreProcessEnvironment(snapshot: NodeJS.ProcessEnv) {
  for (const key of Object.keys(process.env)) {
    if (!(key in snapshot)) {
      delete process.env[key];
    }
  }

  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function loadIsolatedEvidenceEnvironment() {
  const processEnvironmentSnapshot = { ...process.env };

  try {
    const environment = loadEpic22SupabaseTestEnvironment();
    return {
      environment,
      localServiceRoleKey: loadLocalServiceRoleKey(environment),
      requireLocalEvidence:
        process.env.REQUIRE_OMC_POSTGREST_EVIDENCE === "true",
    };
  } finally {
    restoreProcessEnvironment(processEnvironmentSnapshot);
  }
}

const {
  environment,
  localServiceRoleKey,
  requireLocalEvidence: REQUIRE_LOCAL_EVIDENCE,
} = loadIsolatedEvidenceEnvironment();
const databaseReachable = await isEpic22DatabaseReachable(environment.dbUrl);

async function isLocalPostgrestReachable() {
  if (!databaseReachable || !localServiceRoleKey) return false;

  try {
    const response = await fetch(
      `${environment.apiUrl}/rest/v1/employees?select=id&limit=0`,
      {
        headers: {
          apikey: localServiceRoleKey,
          Authorization: `Bearer ${localServiceRoleKey}`,
        },
        signal: AbortSignal.timeout(2_000),
      }
    );

    return response.ok;
  } catch {
    return false;
  }
}

const postgrestReachable = await isLocalPostgrestReachable();

const evidenceUnavailable = !databaseReachable || !postgrestReachable;

if (evidenceUnavailable) {
  const diagnostic = formatEpic22SupabaseSkipDiagnostic(environment);
  if (REQUIRE_LOCAL_EVIDENCE) {
    throw new Error(
      `${diagnostic} REQUIRE_OMC_POSTGREST_EVIDENCE=true requires this evidence test to run.`
    );
  }
  console.warn(diagnostic);
}

function employee(id: string, omcDateId: string): OmcReminderEmployee {
  return {
    id,
    first_name: "Story",
    surname: "TwentyTwoFourteen",
    omc_date: omcDateId,
    is_terminated: false,
    is_archived: false,
    omc_masterdata_reminder_sent_at: null,
    one: false,
    talmundo: true,
    isps: true,
    photo: true,
    origo: true,
    mail_lon: true,
    bankuppgifter: true,
    li: true,
    passport: true,
    kvitto_c17_18: null,
    c17: true,
    loneiva: 2,
  };
}

function candidate(
  employeeId: string,
  omcDateId: string,
  omcDateValue: string
): OmcReminderCandidate {
  return {
    employee: employee(employeeId, omcDateId),
    omcDateValue,
    elapsedDays: 7,
    missingFields: ["one"],
  };
}

function getRequestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return new URL(input);
  if (input instanceof URL) return input;
  return new URL(input.url);
}

function getRequestMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) return init.method;
  return input instanceof Request ? input.method : "GET";
}

function expectAssignmentScopedPatch(
  url: URL,
  employeeId: string,
  omcDateId: string
) {
  expect(url.searchParams.get("id")).toBe(`eq.${employeeId}`);
  expect(url.searchParams.get("omc_date")).toBe(`eq.${omcDateId}`);
  expect(url.searchParams.get("select")).toBe(CLAIM_SELECT_COLUMNS);
  expect(url.searchParams.has("or")).toBe(false);
}

function expectClaimPatch(
  url: URL,
  employeeId: string,
  omcDateId: string
) {
  expectAssignmentScopedPatch(url, employeeId, omcDateId);
  expect(url.searchParams.get("is_terminated")).toBe("eq.false");
  expect(url.searchParams.get("is_archived")).toBe("eq.false");
  expect(url.searchParams.get("one")).toBe("eq.false");
  for (const field of [
    "talmundo",
    "isps",
    "photo",
    "origo",
    "mail_lon",
    "bankuppgifter",
    "li",
    "passport",
    "c17",
  ]) {
    expect(url.searchParams.get(field)).toBe("eq.true");
  }
  expect(url.searchParams.get("loneiva")).toBe("eq.2");
  expect(url.searchParams.has("kvitto_c17_18")).toBe(false);
}

function restoreEnvironmentVariable(
  key: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY",
  value: string | undefined
) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

describe.skipIf(evidenceUnavailable)(
  "Story 22.14 real local PostgREST reminder claim evidence",
  () => {
    it("serializes concurrent null and stale-marker claims, re-arms later assignments, and releases only an exact marker", async () => {
      const database = new Client({ connectionString: environment.dbUrl });
      const employeeId = randomUUID();
      const currentOmcDateId = randomUUID();
      const laterOmcDateId = randomUUID();
      const currentOmcDateValue = "2026-08-20";
      const laterOmcDateValue = "2026-08-25";
      const firstClaimTimestamp = "2026-08-27T07:00:00.000Z";
      const secondClaimTimestamp = "2026-08-27T07:00:01.000Z";
      const staleMarker = "2026-08-20T07:00:00.000Z";
      const firstRearmedClaimTimestamp = "2026-08-29T07:00:00.000Z";
      const secondRearmedClaimTimestamp = "2026-08-29T07:00:01.000Z";
      const wrongReleaseTimestamp = "2026-08-29T07:00:02.000Z";
      const patchUrls: URL[] = [];
      const previousApiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const originalFetch = globalThis.fetch;
      let fetchSpy: ReturnType<typeof vi.spyOn> | undefined;
      let expectedEmployeeCleanupCount = 0;
      let expectedImportantDateCleanupCount = 0;

      try {
        await database.connect();
        await assertEpic22DatabaseFingerprint(database);
        const importantDateInsert = await database.query(
          `INSERT INTO public.important_dates
             (id, week_number, year, category, date_description, date_value)
           VALUES
             ($1, 34, 2026, 'omc', 'Story 22.14 current assignment', $2),
             ($3, 35, 2026, 'omc', 'Story 22.14 later assignment', $4)`,
          [
            currentOmcDateId,
            currentOmcDateValue,
            laterOmcDateId,
            laterOmcDateValue,
          ]
        );
        expectedImportantDateCleanupCount = importantDateInsert.rowCount ?? 0;
        expect(importantDateInsert.rowCount).toBe(2);

        const employeeInsert = await database.query(
          `INSERT INTO public.employees
             (id, first_name, surname, ssn, hire_date, omc_date,
              is_terminated, is_archived, omc_masterdata_reminder_sent_at,
              one, talmundo, isps, photo, origo, mail_lon, bankuppgifter,
              li, passport, c17, loneiva)
           VALUES ($1, 'Story', 'TwentyTwoFourteen', $2, '2026-01-01', $3,
                   false, false, null,
                   false, true, true, true, true, true, true,
                   true, true, true, 2)`,
          [employeeId, `story-22-14-${employeeId}`, currentOmcDateId]
        );
        expectedEmployeeCleanupCount = employeeInsert.rowCount ?? 0;
        expect(employeeInsert.rowCount).toBe(1);

        process.env.NEXT_PUBLIC_SUPABASE_URL = environment.apiUrl;
        process.env.SUPABASE_SERVICE_ROLE_KEY = localServiceRoleKey!;
        fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
          async (input: RequestInfo | URL, init?: RequestInit) => {
            if (getRequestMethod(input, init).toUpperCase() === "PATCH") {
              patchUrls.push(getRequestUrl(input));
            }
            return originalFetch(input, init);
          }
        );

        const currentCandidate = candidate(
          employeeId,
          currentOmcDateId,
          currentOmcDateValue
        );
        const contentionStart = patchUrls.length;
        const contentionResults = await Promise.all([
          claimOmcMasterdataReminder(currentCandidate, firstClaimTimestamp),
          claimOmcMasterdataReminder(currentCandidate, secondClaimTimestamp),
        ]);
        const contentionPatches = patchUrls.slice(contentionStart);

        expect(contentionResults.filter((result) => result.status === "claimed")).toHaveLength(1);
        expect(contentionResults.filter((result) => result.status === "suppressed")).toHaveLength(1);
        expect(contentionPatches).toHaveLength(3);
        for (const url of contentionPatches) {
          expectClaimPatch(url, employeeId, currentOmcDateId);
        }
        expect(
          contentionPatches.filter(
            (url) =>
              url.searchParams.get("omc_masterdata_reminder_sent_at") ===
              "is.null"
          )
        ).toHaveLength(2);
        expect(
          contentionPatches.filter((url) =>
            url.searchParams
              .get("omc_masterdata_reminder_sent_at")
              ?.startsWith("lt.")
          )
        ).toHaveLength(1);

        const claimedResult = contentionResults.find(
          (result) => result.status === "claimed"
        );
        const persistedContentionMarker = await database.query<{
          marker: Date | null;
        }>(
          `SELECT omc_masterdata_reminder_sent_at AS marker
           FROM public.employees
           WHERE id = $1`,
          [employeeId]
        );
        expect(persistedContentionMarker.rows[0].marker?.toISOString()).toBe(
          claimedResult?.claimTimestamp
        );

        const assignmentUpdate = await database.query(
          `UPDATE public.employees
           SET omc_date = $2, omc_masterdata_reminder_sent_at = $3
           WHERE id = $1`,
          [employeeId, laterOmcDateId, staleMarker]
        );
        expect(assignmentUpdate.rowCount).toBe(1);
        const laterCandidate = candidate(
          employeeId,
          laterOmcDateId,
          laterOmcDateValue
        );
        const rearmStart = patchUrls.length;
        const rearmResults = await Promise.all([
          claimOmcMasterdataReminder(
            laterCandidate,
            firstRearmedClaimTimestamp
          ),
          claimOmcMasterdataReminder(
            laterCandidate,
            secondRearmedClaimTimestamp
          ),
        ]);
        const rearmPatches = patchUrls.slice(rearmStart);

        expect(
          rearmResults.filter((result) => result.status === "claimed")
        ).toHaveLength(1);
        expect(
          rearmResults.filter((result) => result.status === "suppressed")
        ).toHaveLength(1);
        expect(rearmPatches).toHaveLength(4);
        for (const url of rearmPatches) {
          expectClaimPatch(url, employeeId, laterOmcDateId);
        }
        expect(
          rearmPatches.filter(
            (url) =>
              url.searchParams.get("omc_masterdata_reminder_sent_at") ===
              "is.null"
          )
        ).toHaveLength(2);
        expect(
          rearmPatches.filter((url) =>
            url.searchParams
              .get("omc_masterdata_reminder_sent_at")
              ?.startsWith("lt.")
          )
        ).toHaveLength(2);

        const rearmedClaimResult = rearmResults.find(
          (result) => result.status === "claimed"
        );
        expect(rearmedClaimResult?.claimTimestamp).toMatch(
          /^2026-08-29T07:00:0[01]\.000Z$/
        );

        const persistedRearmedMarker = await database.query<{
          marker: Date | null;
        }>(
          `SELECT omc_masterdata_reminder_sent_at AS marker
           FROM public.employees
           WHERE id = $1`,
          [employeeId]
        );
        expect(persistedRearmedMarker.rows[0].marker?.toISOString()).toBe(
          rearmedClaimResult?.claimTimestamp
        );

        const wrongRelease: ClaimedOmcReminderCandidate = {
          ...laterCandidate,
          claimTimestamp: wrongReleaseTimestamp,
        };
        const wrongReleaseStart = patchUrls.length;
        await expect(
          releaseOmcMasterdataReminderClaims([wrongRelease])
        ).resolves.toEqual({ releasedClaims: 0, releaseErrors: 0 });
        const wrongReleasePatches = patchUrls.slice(wrongReleaseStart);
        expect(wrongReleasePatches).toHaveLength(1);
        expectAssignmentScopedPatch(
          wrongReleasePatches[0],
          employeeId,
          laterOmcDateId
        );
        expect(
          wrongReleasePatches[0].searchParams.get(
            "omc_masterdata_reminder_sent_at"
          )
        ).toBe(`eq.${wrongReleaseTimestamp}`);

        const markerAfterWrongRelease = await database.query<{
          marker: Date | null;
        }>(
          `SELECT omc_masterdata_reminder_sent_at AS marker
           FROM public.employees
           WHERE id = $1`,
          [employeeId]
        );
        expect(markerAfterWrongRelease.rows[0].marker?.toISOString()).toBe(
          rearmedClaimResult?.claimTimestamp
        );

        const exactRelease: ClaimedOmcReminderCandidate = {
          ...laterCandidate,
          claimTimestamp: rearmedClaimResult!.claimTimestamp!,
        };
        const exactReleaseStart = patchUrls.length;
        await expect(
          releaseOmcMasterdataReminderClaims([exactRelease])
        ).resolves.toEqual({ releasedClaims: 1, releaseErrors: 0 });
        const exactReleasePatches = patchUrls.slice(exactReleaseStart);
        expect(exactReleasePatches).toHaveLength(1);
        expectAssignmentScopedPatch(
          exactReleasePatches[0],
          employeeId,
          laterOmcDateId
        );
        expect(
          exactReleasePatches[0].searchParams.get(
            "omc_masterdata_reminder_sent_at"
          )
        ).toBe(`eq.${rearmedClaimResult?.claimTimestamp}`);

        const markerAfterExactRelease = await database.query<{
          marker: Date | null;
        }>(
          `SELECT omc_masterdata_reminder_sent_at AS marker
           FROM public.employees
           WHERE id = $1`,
          [employeeId]
        );
        expect(markerAfterExactRelease.rows[0].marker).toBeNull();

        const evaluatedEmployee = employee(employeeId, laterOmcDateId);
        const evaluation = await evaluateOmcMasterdataCompletion(
          evaluatedEmployee,
          "2026-08-29"
        );
        expect(evaluation).toEqual({
          shouldNotify: true,
          missingFields: ["one"],
          omcDateValue: laterOmcDateValue,
          elapsedDays: 4,
        });
        const evaluatedCandidate: OmcReminderCandidate = {
          employee: evaluatedEmployee,
          omcDateValue: evaluation.omcDateValue!,
          elapsedDays: evaluation.elapsedDays!,
          missingFields: evaluation.missingFields,
        };

        const terminateUpdate = await database.query(
          `UPDATE public.employees
           SET is_terminated = true
           WHERE id = $1`,
          [employeeId]
        );
        expect(terminateUpdate.rowCount).toBe(1);

        const terminatedClaimStart = patchUrls.length;
        await expect(
          claimOmcMasterdataReminder(
            evaluatedCandidate,
            "2026-08-29T08:00:00.000Z"
          )
        ).resolves.toEqual({ status: "suppressed", claimTimestamp: null });
        const terminatedClaimPatches = patchUrls.slice(terminatedClaimStart);
        expect(terminatedClaimPatches).toHaveLength(2);
        for (const url of terminatedClaimPatches) {
          expectClaimPatch(url, employeeId, laterOmcDateId);
        }

        const markerAfterTermination = await database.query<{
          marker: Date | null;
        }>(
          `SELECT omc_masterdata_reminder_sent_at AS marker
           FROM public.employees
           WHERE id = $1`,
          [employeeId]
        );
        expect(markerAfterTermination.rows[0].marker).toBeNull();

        const archiveUpdate = await database.query(
          `UPDATE public.employees
           SET is_terminated = false, is_archived = true
           WHERE id = $1`,
          [employeeId]
        );
        expect(archiveUpdate.rowCount).toBe(1);

        const archivedClaimStart = patchUrls.length;
        await expect(
          claimOmcMasterdataReminder(
            evaluatedCandidate,
            "2026-08-29T09:00:00.000Z"
          )
        ).resolves.toEqual({ status: "suppressed", claimTimestamp: null });
        const archivedClaimPatches = patchUrls.slice(archivedClaimStart);
        expect(archivedClaimPatches).toHaveLength(2);
        for (const url of archivedClaimPatches) {
          expectClaimPatch(url, employeeId, laterOmcDateId);
        }

        const markerAfterArchival = await database.query<{
          marker: Date | null;
        }>(
          `SELECT omc_masterdata_reminder_sent_at AS marker
           FROM public.employees
           WHERE id = $1`,
          [employeeId]
        );
        expect(markerAfterArchival.rows[0].marker).toBeNull();
      } finally {
        fetchSpy?.mockRestore();
        restoreEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL", previousApiUrl);
        restoreEnvironmentVariable(
          "SUPABASE_SERVICE_ROLE_KEY",
          previousServiceRoleKey
        );
        const cleanupErrors: string[] = [];

        try {
          const employeeDelete = await database.query(
            "DELETE FROM public.employees WHERE id = $1",
            [employeeId]
          );
          if (employeeDelete.rowCount !== expectedEmployeeCleanupCount) {
            cleanupErrors.push(
              `employee cleanup removed ${employeeDelete.rowCount ?? "unknown"} rows; expected ${expectedEmployeeCleanupCount}`
            );
          }
        } catch (error) {
          cleanupErrors.push(
            `employee cleanup failed: ${error instanceof Error ? error.message : "unknown error"}`
          );
        }

        try {
          const importantDateDelete = await database.query(
            "DELETE FROM public.important_dates WHERE id = ANY($1::uuid[])",
            [[currentOmcDateId, laterOmcDateId]]
          );
          if (
            importantDateDelete.rowCount !== expectedImportantDateCleanupCount
          ) {
            cleanupErrors.push(
              `important-date cleanup removed ${importantDateDelete.rowCount ?? "unknown"} rows; expected ${expectedImportantDateCleanupCount}`
            );
          }
        } catch (error) {
          cleanupErrors.push(
            `important-date cleanup failed: ${error instanceof Error ? error.message : "unknown error"}`
          );
        }

        try {
          await database.end();
        } catch (error) {
          cleanupErrors.push(
            `database cleanup failed: ${error instanceof Error ? error.message : "unknown error"}`
          );
        }

        if (cleanupErrors.length > 0) {
          throw new Error(
            `Story 22.14 fixture cleanup failed: ${cleanupErrors.join("; ")}`
          );
        }
      }
    });
  }
);
