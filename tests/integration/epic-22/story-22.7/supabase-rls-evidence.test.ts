import { randomUUID } from "node:crypto";

import { Client, type QueryResult } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  assertEpic22DatabaseFingerprint,
  formatEpic22SupabaseSkipDiagnostic,
  isEpic22DatabaseReachable,
  loadEpic22SupabaseTestEnvironment,
} from "../../../helpers/epic-22-supabase-test-environment";

const testEnvironment = loadEpic22SupabaseTestEnvironment();
const dbUrl = testEnvironment.dbUrl;

type RlsAttempt =
  | { ok: true; result: QueryResult }
  | { ok: false; error: unknown };

const ids = {
  hrAuth: randomUUID(),
  recruiterAuth: randomUUID(),
  adminLimitedAuth: randomUUID(),
  crewingAuth: randomUUID(),
  sodexoAuth: randomUUID(),
  omcAuth: randomUUID(),
  payrollAuth: randomUUID(),
  topluxAuth: randomUUID(),
  hrUser: randomUUID(),
  recruiterUser: randomUUID(),
  adminLimitedUser: randomUUID(),
  crewingUser: randomUUID(),
  sodexoUser: randomUUID(),
  omcUser: randomUUID(),
  payrollUser: randomUUID(),
  topluxUser: randomUUID(),
  activeEmployee: randomUUID(),
  archivedEmployee: randomUUID(),
};

const client = new Client({ connectionString: dbUrl });

// This suite needs a reachable non-production Postgres (the local Supabase stack
// or a configured SUPABASE_DB_URL). Environments without one — e.g. CI's unit-test
// step, which has no .env.test / local DB — must skip cleanly rather than fail in
// beforeAll. Probe reachability once at load time and skip the suite if it fails.
const databaseReachable = await isEpic22DatabaseReachable(dbUrl);

if (!databaseReachable) {
  console.warn(formatEpic22SupabaseSkipDiagnostic(testEnvironment));
}

async function asServiceRole<T>(assertion: () => Promise<T>) {
  await client.query("RESET ROLE");
  await client.query("SET LOCAL ROLE service_role");

  try {
    return await assertion();
  } finally {
    await client.query("RESET ROLE");
  }
}

async function asAuthenticatedUser<T>(
  authUserId: string,
  assertion: () => Promise<T>
) {
  await client.query("RESET ROLE");
  await client.query("SET LOCAL ROLE authenticated");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [
    authUserId,
  ]);
  await client.query("SELECT set_config('request.jwt.claim.role', 'authenticated', true)");

  try {
    return await assertion();
  } finally {
    await client.query("RESET ROLE");
  }
}

async function attemptRlsQuery(
  statement: string,
  params: unknown[] = []
): Promise<RlsAttempt> {
  const savepoint = `sp_${randomUUID().replace(/-/g, "")}`;
  await client.query(`SAVEPOINT ${savepoint}`);
  try {
    const result = await client.query(statement, params);
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
    return { ok: true, result };
  } catch (error) {
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    await client.query(`RELEASE SAVEPOINT ${savepoint}`);
    return { ok: false, error };
  }
}

function expectDenied(attempt: RlsAttempt) {
  if (attempt.ok) {
    expect(attempt.result.rowCount).toBe(0);
  } else {
    expect(attempt.error).toBeDefined();
  }
}

async function seedRlsData() {
  await client.query(
    `
    INSERT INTO public.users (id, auth_user_id, email, role, is_active)
    VALUES
      ($1, $2, 'story-22-7-hr@example.test', 'hr_admin', true),
      ($3, $4, 'story-22-7-recruiter@example.test', 'recruiter', true),
      ($5, $6, 'story-22-7-admin-limited@example.test', 'admin_limited', true),
      ($7, $8, 'story-22-7-crewing@example.test', 'crewing', true),
      ($9, $10, 'story-22-7-sodexo@example.test', 'sodexo', true),
      ($11, $12, 'story-22-7-omc@example.test', 'omc', true),
      ($13, $14, 'story-22-7-payroll@example.test', 'payroll', true),
      ($15, $16, 'story-22-7-toplux@example.test', 'toplux', true)
    `,
    [
      ids.hrUser,
      ids.hrAuth,
      ids.recruiterUser,
      ids.recruiterAuth,
      ids.adminLimitedUser,
      ids.adminLimitedAuth,
      ids.crewingUser,
      ids.crewingAuth,
      ids.sodexoUser,
      ids.sodexoAuth,
      ids.omcUser,
      ids.omcAuth,
      ids.payrollUser,
      ids.payrollAuth,
      ids.topluxUser,
      ids.topluxAuth,
    ]
  );

  await client.query(
    `
    INSERT INTO public.employees (
      id,
      first_name,
      surname,
      ssn,
      email,
      mobile,
      rank,
      gender,
      town_district,
      hire_date,
      is_archived,
      is_terminated,
      comments,
      one,
      talmundo,
      isps,
      photo,
      origo,
      loneiva,
      mail_lon,
      bankuppgifter,
      li,
      passport,
      kvitto_c17_18,
      c17,
      crewing_done,
      hotel_required,
      special_diet,
      diet_details
    )
    VALUES
      ($1, 'Active', 'Employee', '220708-1001', 'active@example.test', '+46700000001', 'SEV', 'Woman', 'Göteborg', '2020-01-01', false, false, 'Private', false, false, false, false, false, 1, false, false, false, false, false, false, false, false, false, null),
      ($2, 'Archived', 'Employee', '220708-1002', 'archived@example.test', '+46700000002', 'SEV', 'Woman', 'Göteborg', '2020-01-01', true, false, 'Private', false, false, false, false, false, 1, false, false, false, false, false, false, false, false, false, null)
    `,
    [ids.activeEmployee, ids.archivedEmployee]
  );

  await client.query(
    `
    INSERT INTO public.staffing_needs (location, headcount_need, updated_at, updated_by)
    VALUES ('Göteborg', 0, now(), NULL)
    ON CONFLICT (location)
    DO UPDATE SET headcount_need = 0, updated_at = now(), updated_by = NULL
    `
  );
}

describe.skipIf(!databaseReachable)("Story 22.7 Supabase RLS evidence", () => {
  beforeAll(async () => {
    await client.connect();
    await assertEpic22DatabaseFingerprint(client);
    await client.query("BEGIN");
    await asServiceRole(seedRlsData);
  });

  afterAll(async () => {
    await client.query("ROLLBACK");
    await client.end();
  });

  it.each([
    ["Sodexo", ids.sodexoAuth],
    ["OMC", ids.omcAuth],
    ["Payroll", ids.payrollAuth],
    ["Toplux", ids.topluxAuth],
    ["Crewing", ids.crewingAuth],
  ])(
    "allows %s to read only non-archived employee rows and denies direct employee writes",
    async (_roleName, authId) => {
      await asAuthenticatedUser(authId, async () => {
        const read = await client.query<{ id: string }>(
          "SELECT id FROM public.employees ORDER BY first_name"
        );
        expect(read.rows.map((row) => row.id)).toEqual([ids.activeEmployee]);

        const write = await attemptRlsQuery(
          "UPDATE public.employees SET comments = 'changed by external' WHERE id = $1",
          [ids.activeEmployee]
        );
        expectDenied(write);
      });
    }
  );

  it("allows HR Admin and Recruiter employee manager writes where RLS permits them", async () => {
    await asAuthenticatedUser(ids.hrAuth, async () => {
      const write = await attemptRlsQuery(
        "UPDATE public.employees SET comments = 'changed by hr' WHERE id = $1",
        [ids.activeEmployee]
      );
      expect(write.ok).toBe(true);
      if (write.ok) expect(write.result.rowCount).toBe(1);
    });

    await asAuthenticatedUser(ids.recruiterAuth, async () => {
      const write = await attemptRlsQuery(
        "UPDATE public.employees SET comments = 'changed by recruiter' WHERE id = $1",
        [ids.activeEmployee]
      );
      expect(write.ok).toBe(true);
      if (write.ok) expect(write.result.rowCount).toBe(1);
    });
  });

  it("documents admin_limited as app-layer employee edit access without matching employee RLS", async () => {
    await asAuthenticatedUser(ids.adminLimitedAuth, async () => {
      const read = await client.query<{ id: string }>(
        "SELECT id FROM public.employees ORDER BY first_name"
      );
      expect(read.rows).toEqual([]);

      const write = await attemptRlsQuery(
        "UPDATE public.employees SET comments = 'changed by admin_limited' WHERE id = $1",
        [ids.activeEmployee]
      );
      expectDenied(write);
    });
  });

  it("allows Crewing, and not other external roles, to update staffing needs", async () => {
    await asAuthenticatedUser(ids.crewingAuth, async () => {
      const write = await attemptRlsQuery(
        "UPDATE public.staffing_needs SET headcount_need = headcount_need + 1 WHERE location = 'Göteborg'"
      );
      expect(write.ok).toBe(true);
      if (write.ok) expect(write.result.rowCount).toBe(1);
    });

    for (const authId of [
      ids.sodexoAuth,
      ids.omcAuth,
      ids.payrollAuth,
      ids.topluxAuth,
    ]) {
      await asAuthenticatedUser(authId, async () => {
        const write = await attemptRlsQuery(
          "UPDATE public.staffing_needs SET headcount_need = headcount_need + 1 WHERE location = 'Göteborg'"
        );
        expectDenied(write);
      });
    }
  });
});
