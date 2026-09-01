import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { Client, type QueryResult } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  assertEpic22DatabaseFingerprint,
  assertEpic22EvidenceRequirement,
  formatEpic22SupabaseSkipDiagnostic,
  isEpic22DatabaseReachable,
  loadEpic22SupabaseTestEnvironment,
} from "../../../helpers/epic-22-supabase-test-environment";

const environment = loadEpic22SupabaseTestEnvironment();
const client = new Client({ connectionString: environment.dbUrl });
const databaseReachable = await isEpic22DatabaseReachable(environment.dbUrl);
const REQUIRE_DATABASE_EVIDENCE =
  process.env.REQUIRE_STORY_22_15_DB_EVIDENCE === "true";

if (!databaseReachable) {
  const diagnostic = formatEpic22SupabaseSkipDiagnostic(environment);
  assertEpic22EvidenceRequirement(
    databaseReachable,
    REQUIRE_DATABASE_EVIDENCE,
    "REQUIRE_STORY_22_15_DB_EVIDENCE",
    diagnostic
  );
  console.warn(diagnostic);
}

type Attempt =
  | { ok: true; result: QueryResult }
  | { ok: false; error: unknown };

type CatalogCheckRow = {
  check_name: string;
  passed: boolean | null;
  observed: unknown;
};

const catalogVerifierSource = readFileSync(
  "supabase/verify/production-baseline-catalog.sql",
  "utf8"
).replaceAll(":'catalog_phase'", "'post_apply'");
const story2215MigrationSource = readFileSync(
  "supabase/migrations/20260831200026_enforce_active_authorization_and_atomic_user_deletion.sql",
  "utf8"
);
const deleteAppUserDefinition = story2215MigrationSource.match(
  /CREATE OR REPLACE FUNCTION public\.delete_app_user\(p_user_id uuid\)[\s\S]*?\r?\n\$\$;/
)?.[0];

if (!deleteAppUserDefinition) {
  throw new Error("Story 22.15 delete_app_user definition is missing");
}

const weakenedDeleteAppUserDefinition = deleteAppUserDefinition.replace(
  /  SELECT id, role[\s\S]*?RAISE EXCEPTION 'Insufficient permission to delete user'[\s\S]*?  END IF;\r?\n/,
  ""
);

if (weakenedDeleteAppUserDefinition === deleteAppUserDefinition) {
  throw new Error("Story 22.15 active-HR authorization block was not found");
}

const mismatchedLockDeleteAppUserDefinition = deleteAppUserDefinition.replace(
  "'public.users.active_hr_admin_status'",
  "'PUBLIC.USERS.ACTIVE_HR_ADMIN_STATUS'"
);

if (mismatchedLockDeleteAppUserDefinition === deleteAppUserDefinition) {
  throw new Error("Story 22.15 advisory-lock key was not found");
}

function catalogVerifierSql(includeReadOnlyTransaction: boolean) {
  if (includeReadOnlyTransaction) return catalogVerifierSource;

  return catalogVerifierSource
    .replace("BEGIN TRANSACTION READ ONLY;", "")
    .replace(/\r?\nCOMMIT;\s*$/, "");
}

async function executeCatalogVerifier(
  database: Client,
  includeReadOnlyTransaction: boolean
) {
  const execution = (await database.query(
    catalogVerifierSql(includeReadOnlyTransaction)
  )) as unknown as QueryResult[] | QueryResult;
  const results = Array.isArray(execution) ? execution : [execution];
  const catalogResult = results.find((candidate) =>
    candidate.rows.some(
      (row: { check_name?: unknown }) => typeof row.check_name === "string"
    )
  );

  if (!catalogResult) {
    throw new Error("Catalog verifier returned no check rows");
  }

  return catalogResult.rows as CatalogCheckRow[];
}

const ids = {
  activeAdminAuth: randomUUID(),
  activeAdmin: randomUUID(),
  backupAdminAuth: randomUUID(),
  backupAdmin: randomUUID(),
  inactiveHrAuth: randomUUID(),
  inactiveHr: randomUUID(),
  activeExternalAuth: randomUUID(),
  activeExternal: randomUUID(),
  inactiveExternalAuth: randomUUID(),
  inactiveExternal: randomUUID(),
  employee: randomUUID(),
  filter: randomUUID(),
};

async function asAuthenticated<T>(
  authUserId: string,
  assertion: () => Promise<T>
) {
  await client.query("RESET ROLE");
  await client.query("SET LOCAL ROLE authenticated");
  await client.query(
    "SELECT set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated')::text, true)",
    [authUserId]
  );
  try {
    return await assertion();
  } finally {
    await client.query("RESET ROLE");
  }
}

async function attempt(
  statement: string,
  params: unknown[] = []
): Promise<Attempt> {
  const savepoint = `sp_${randomUUID().replaceAll("-", "")}`;
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

async function expectCallerBoundDeleteDenied(
  authUserId: string,
  targetUserId: string
) {
  let deletionError: unknown = null;

  await asAuthenticated(authUserId, async () => {
    const savepoint = `sp_${randomUUID().replaceAll("-", "")}`;
    await client.query(`SAVEPOINT ${savepoint}`);

    try {
      try {
        await client.query("SELECT public.delete_app_user($1)", [targetUserId]);
      } catch (error) {
        deletionError = error;
        await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
      }
    } finally {
      await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`).catch(() => {});
      await client.query(`RELEASE SAVEPOINT ${savepoint}`).catch(() => {});
    }
  });

  expect((deletionError as { code?: string } | null)?.code).toBe("42501");

  const target = await client.query<{ id: string }>(
    "SELECT id FROM public.users WHERE id = $1",
    [targetUserId]
  );
  expect(target.rows).toEqual([{ id: targetUserId }]);

  const cleanup = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM public.app_user_auth_cleanup_outbox
     WHERE app_user_id = $1`,
    [targetUserId]
  );
  expect(cleanup.rows).toEqual([{ count: "0" }]);
}

function createStartBarrier(participantCount: number) {
  let arrived = 0;
  let release: (() => void) | undefined;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });

  return async () => {
    arrived += 1;
    if (arrived === participantCount) release?.();
    await ready;
  };
}

async function synchronizedTransactionAttempt(
  database: Client,
  authUserId: string,
  waitForStart: () => Promise<void>,
  statement: string,
  params: unknown[] = []
): Promise<Attempt> {
  await database.query("BEGIN");
  try {
    await database.query("SET LOCAL ROLE authenticated");
    await database.query(
      "SELECT set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated')::text, true)",
      [authUserId]
    );
    await waitForStart();
    const result = await database.query(statement, params);
    // Commit inside each participant task. This releases the transaction-level
    // advisory lock before the task resolves, so the blocked peer can continue.
    await database.query("COMMIT");
    return { ok: true, result };
  } catch (error) {
    await database.query("ROLLBACK").catch(() => {});
    return { ok: false, error };
  }
}

async function seedAuthUserOn(database: Client, id: string, email: string) {
  await database.query(
    `INSERT INTO auth.users (
       instance_id, id, aud, role, email, encrypted_password,
       email_confirmed_at, confirmation_token, recovery_token,
       email_change_token_new, email_change, raw_app_meta_data,
       raw_user_meta_data, created_at, updated_at, is_super_admin
     ) VALUES (
       '00000000-0000-0000-0000-000000000000', $1, 'authenticated',
       'authenticated', $2, '', now(), '', '', '', '', '{}'::jsonb,
       '{}'::jsonb, now(), now(), false
     )`,
    [id, email]
  );
}

async function seedFixtures() {
  for (const [authId, label] of [
    [ids.activeAdminAuth, "active-admin"],
    [ids.backupAdminAuth, "backup-admin"],
    [ids.inactiveHrAuth, "inactive-hr"],
    [ids.activeExternalAuth, "active-external"],
    [ids.inactiveExternalAuth, "inactive-external"],
  ] as const) {
    await seedAuthUserOn(client, authId, `${label}-${authId}@example.test`);
  }

  await client.query(
    `INSERT INTO public.users (id, auth_user_id, email, role, is_active)
     VALUES
       ($1, $2, $3, 'hr_admin', true),
       ($4, $5, $6, 'hr_admin', true),
       ($7, $8, $9, 'hr_admin', false),
       ($10, $11, $12, 'sodexo', true),
       ($13, $14, $15, 'sodexo', false)`,
    [
      ids.activeAdmin,
      ids.activeAdminAuth,
      `active-admin-${ids.activeAdmin}@example.test`,
      ids.backupAdmin,
      ids.backupAdminAuth,
      `backup-admin-${ids.backupAdmin}@example.test`,
      ids.inactiveHr,
      ids.inactiveHrAuth,
      `inactive-hr-${ids.inactiveHr}@example.test`,
      ids.activeExternal,
      ids.activeExternalAuth,
      `active-external-${ids.activeExternal}@example.test`,
      ids.inactiveExternal,
      ids.inactiveExternalAuth,
      `inactive-external-${ids.inactiveExternal}@example.test`,
    ]
  );

  await client.query(
    `INSERT INTO public.employees (
       id, first_name, surname, ssn, email, mobile, rank, gender,
       town_district, hire_date, is_archived, is_terminated, comments,
       one, talmundo, isps, photo, origo, loneiva, mail_lon,
       bankuppgifter, li, passport, kvitto_c17_18, c17, crewing_done,
       hotel_required, special_diet, diet_details
     ) VALUES (
       $1, 'Story', 'TwentyTwoFifteen', $2, $3, '+46700002215',
       'SEV', 'Woman', 'Göteborg', '2020-01-01', false, false, null,
       false, false, false, false, false, 1, false, false, false,
       false, false, false, false, false, false, null
     )`,
    [
      ids.employee,
      `221500-${ids.employee.slice(0, 4)}`,
      `employee-${ids.employee}@example.test`,
    ]
  );

  await client.query(
    `INSERT INTO public.user_filters (id, user_id, name, filters)
     VALUES ($1, $2, 'Inactive fixture', '[]'::jsonb)`,
    [ids.filter, ids.inactiveExternalAuth]
  );
}

describe.skipIf(!databaseReachable)(
  "Story 22.15 exact represented catalog contracts",
  () => {
    it("rejects weakened structures and exact-policy drift", async () => {
      const mutationClient = new Client({ connectionString: environment.dbUrl });
      const mutations = [
        {
          label: "missing headcount upper bound",
          checkName: "staffing_constraints_and_rls",
          sql: `ALTER TABLE public.staffing_needs
                  DROP CONSTRAINT staffing_needs_headcount_need_check;
                ALTER TABLE public.staffing_needs
                  ADD CONSTRAINT staffing_needs_headcount_need_check
                  CHECK (headcount_need >= 0);`,
        },
        {
          label: "extra saved-filter column",
          checkName: "user_filters_objects",
          sql: `ALTER TABLE public.user_filters
                  ADD COLUMN story_22_15_unexpected text;`,
        },
        {
          label: "missing saved-filter primary key",
          checkName: "user_filters_objects",
          sql: `ALTER TABLE public.user_filters
                  DROP CONSTRAINT user_filters_pkey;`,
        },
        {
          label: "saved-filter foreign key without cascade",
          checkName: "user_filters_objects",
          sql: `ALTER TABLE public.user_filters
                  DROP CONSTRAINT user_filters_user_id_fkey;
                ALTER TABLE public.user_filters
                  ADD CONSTRAINT user_filters_user_id_fkey
                  FOREIGN KEY (user_id) REFERENCES auth.users(id);`,
        },
        {
          label: "wrong saved-filter uniqueness columns",
          checkName: "user_filters_objects",
          sql: `ALTER TABLE public.user_filters
                  DROP CONSTRAINT unique_user_filter_name;
                ALTER TABLE public.user_filters
                  ADD CONSTRAINT unique_user_filter_name UNIQUE (id, name);`,
        },
        {
          label: "weakened saved-filter name check",
          checkName: "user_filters_objects",
          sql: `ALTER TABLE public.user_filters
                  DROP CONSTRAINT valid_name_length;
                ALTER TABLE public.user_filters
                  ADD CONSTRAINT valid_name_length
                  CHECK (char_length(name) <= 50);`,
        },
        {
          label: "wrong saved-filter expression index",
          checkName: "user_filters_objects",
          sql: `DROP INDEX public.idx_user_filters_name;
                CREATE INDEX idx_user_filters_name
                  ON public.user_filters(name);`,
        },
        {
          label: "unexpected saved-filter index",
          checkName: "user_filters_objects",
          sql: `CREATE INDEX story_22_15_unexpected_user_filters_index
                  ON public.user_filters(updated_at);`,
        },
        {
          label: "disabled saved-filter update trigger",
          checkName: "user_filters_objects",
          sql: `ALTER TABLE public.user_filters
                  DISABLE TRIGGER set_updated_at;`,
        },
        {
          label: "wrong saved-filter trigger-function behavior",
          checkName: "user_filters_trigger_function_contract",
          sql: `CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
                RETURNS trigger
                LANGUAGE plpgsql
                SECURITY INVOKER
                VOLATILE
                SET search_path = public, pg_temp
                AS $function$
                BEGIN
                  RETURN NEW;
                END;
                $function$;`,
        },
        {
          label: "delete function without active HR actor authorization",
          checkName: "story_22_15_phase_contracts",
          sql: weakenedDeleteAppUserDefinition,
        },
        {
          label: "delete function with a different advisory-lock key",
          checkName: "story_22_15_phase_contracts",
          sql: mismatchedLockDeleteAppUserDefinition,
        },
        {
          label: "PUBLIC cleanup-outbox SELECT grant",
          checkName: "story_22_15_phase_contracts",
          sql: `GRANT SELECT ON TABLE public.app_user_auth_cleanup_outbox
                TO PUBLIC;`,
        },
        {
          label: "PUBLIC cleanup-outbox TRUNCATE grant",
          checkName: "story_22_15_phase_contracts",
          sql: `GRANT TRUNCATE ON TABLE public.app_user_auth_cleanup_outbox
                TO PUBLIC;`,
        },
        {
          label: "SECURITY DEFINER function owned by an untrusted role",
          checkName: "story_22_15_phase_contracts",
          sql: `GRANT CREATE ON SCHEMA public TO authenticated;
                ALTER FUNCTION public.get_user_role()
                OWNER TO authenticated;`,
        },
        {
          label: "missing important-dates management policy",
          checkName: "represented_policy_contracts",
          sql: `DROP POLICY "HR Admin and Recruiter can manage important dates"
                  ON public.important_dates;`,
        },
        {
          label: "changed important-dates public-read predicate",
          checkName: "represented_policy_contracts",
          sql: `ALTER POLICY "Everyone can read important dates"
                  ON public.important_dates
                  USING (false);`,
        },
        {
          label: "regrouped employee-audit visibility predicate",
          checkName: "represented_policy_contracts",
          sql: `ALTER POLICY "Authorized roles can read visible employee changes"
                  ON public.employee_column_changes
                  USING (
                    (
                      EXISTS (
                        SELECT 1
                        FROM public.users AS caller
                        WHERE caller.auth_user_id = auth.uid()
                          AND caller.is_active = true
                          AND caller.role = ANY (
                            ARRAY['hr_admin', 'recruiter', 'sodexo', 'omc', 'payroll', 'toplux', 'crewing']
                          )
                      )
                      AND EXISTS (
                        SELECT 1
                        FROM public.employees AS visible_employee
                        WHERE visible_employee.id = employee_column_changes.employee_id
                      )
                      AND (SELECT public.get_user_role()) = ANY (
                        ARRAY['hr_admin', 'recruiter']
                      )
                    )
                    OR EXISTS (
                      SELECT 1
                      FROM public.column_config AS visible_column
                      WHERE lower(visible_column.db_column_name) =
                        lower(employee_column_changes.column_name)
                        AND visible_column.is_masterdata = true
                        AND COALESCE(
                          visible_column.role_permissions
                            -> (SELECT public.get_user_role())
                            ->> 'view',
                          'false'
                        ) = 'true'
                    )
                  );`,
        },
        {
          label: "unexpected important-dates read policy",
          checkName: "represented_policy_contracts",
          sql: `CREATE POLICY "Story 22.15 unexpected important dates read"
                  ON public.important_dates
                  FOR SELECT
                  TO authenticated
                  USING (true);`,
        },
        {
          label: "unexpected policy on unrelated public log table",
          checkName: "represented_policy_contracts",
          sql: `CREATE POLICY "Story 22.15 unexpected public policy"
                  ON public.pe3_notifications_log
                  FOR SELECT
                  TO authenticated
                  USING (true);`,
        },
        {
          label: "unrelated extra cannot compensate for a missing expected policy",
          checkName: "represented_policy_contracts",
          sql: `DROP POLICY "Everyone can read important dates"
                  ON public.important_dates;
                CREATE POLICY "Story 22.15 compensating public policy"
                  ON public.pe3_notifications_log
                  FOR SELECT
                  TO authenticated
                  USING (true);`,
        },
      ] as const;

      await mutationClient.connect();
      try {
        await assertEpic22DatabaseFingerprint(mutationClient);
        const baselineRows = await executeCatalogVerifier(mutationClient, true);
        expect(
          baselineRows.filter(({ passed }) => passed !== true),
          JSON.stringify(baselineRows, null, 2)
        ).toEqual([]);

        for (const mutation of mutations) {
          await mutationClient.query("BEGIN");
          try {
            await mutationClient.query(mutation.sql);
            const mutatedRows = await executeCatalogVerifier(
              mutationClient,
              false
            );
            const contract = mutatedRows.find(
              ({ check_name }) => check_name === mutation.checkName
            );
            expect(contract, mutation.label).toBeDefined();
            expect(
              contract?.passed,
              `${mutation.label}: ${JSON.stringify(contract?.observed)}`
            ).toBe(false);
          } finally {
            await mutationClient.query("ROLLBACK").catch(() => {});
          }
        }
      } finally {
        await mutationClient.end();
      }
    });
  }
);

describe.skipIf(!databaseReachable)(
  "Story 22.15 inactive authorization and atomic deletion",
  () => {
    beforeAll(async () => {
      await client.connect();
      await assertEpic22DatabaseFingerprint(client);
      await client.query("BEGIN");
      await seedFixtures();
    });

    afterAll(async () => {
      await client.query("RESET ROLE").catch(() => {});
      await client.query("ROLLBACK");
      await client.end();
    });

    it("executes the post-apply catalog verifier against PostgreSQL", async () => {
      const verifier = readFileSync(
        "supabase/verify/production-baseline-catalog.sql",
        "utf8"
      ).replaceAll(":'catalog_phase'", "'post_apply'");
      expect(verifier).not.toContain(":'catalog_phase'");
      const verifierClient = new Client({ connectionString: environment.dbUrl });
      await verifierClient.connect();
      try {
        await assertEpic22DatabaseFingerprint(verifierClient);
        const execution = (await verifierClient.query(verifier)) as unknown as
          | QueryResult[]
          | QueryResult;
        const results = Array.isArray(execution) ? execution : [execution];
        const result = results.find((candidate) =>
          candidate.rows.some(
            (row: { check_name?: unknown }) =>
              typeof row.check_name === "string"
          )
        );
        expect(result).toBeDefined();
        expect(
          result?.rows.filter(
            (row: { passed?: unknown }) => row.passed !== true
          ),
          JSON.stringify(result?.rows, null, 2)
        ).toEqual([]);
      } finally {
        await verifierClient.end();
      }
    });

    it("preserves active roles while returning NULL for inactive JWTs", async () => {
      await asAuthenticated(ids.activeAdminAuth, async () => {
        const role = await client.query<{ role: string | null }>(
          "SELECT public.get_user_role() AS role"
        );
        expect(role.rows).toEqual([{ role: "hr_admin" }]);
      });

      await asAuthenticated(ids.inactiveHrAuth, async () => {
        const role = await client.query<{ role: string | null }>(
          "SELECT public.get_user_role() AS role"
        );
        expect(role.rows).toEqual([{ role: null }]);

        const employees = await client.query(
          "SELECT id FROM public.employees WHERE id = $1",
          [ids.employee]
        );
        expect(employees.rows).toEqual([]);

        const staffing = await attempt(
          "SELECT * FROM public.update_staffing_need('Göteborg', 1, $1)",
          [ids.inactiveHr]
        );
        expect(staffing.ok).toBe(false);
        if (!staffing.ok) {
          expect((staffing.error as { code?: string }).code).toBe("42501");
        }
      });
    });

    it("denies inactive saved-filter CRUD but retains active-user CRUD", async () => {
      await asAuthenticated(ids.inactiveExternalAuth, async () => {
        const hidden = await client.query(
          "SELECT id FROM public.user_filters WHERE id = $1",
          [ids.filter]
        );
        expect(hidden.rows).toEqual([]);

        const insert = await attempt(
          `INSERT INTO public.user_filters (user_id, name, filters)
           VALUES ($1, 'Rejected', '[]'::jsonb)`,
          [ids.inactiveExternalAuth]
        );
        expect(insert.ok).toBe(false);

        const update = await client.query(
          "UPDATE public.user_filters SET name = 'Rejected' WHERE id = $1",
          [ids.filter]
        );
        const deletion = await client.query(
          "DELETE FROM public.user_filters WHERE id = $1",
          [ids.filter]
        );
        expect(update.rowCount).toBe(0);
        expect(deletion.rowCount).toBe(0);
      });

      await asAuthenticated(ids.activeExternalAuth, async () => {
        const created = await client.query<{ id: string }>(
          `INSERT INTO public.user_filters (user_id, name, filters)
           VALUES ($1, 'Active fixture', '[]'::jsonb) RETURNING id`,
          [ids.activeExternalAuth]
        );
        expect(created.rows).toHaveLength(1);
        const deleted = await client.query(
          "DELETE FROM public.user_filters WHERE id = $1",
          [created.rows[0].id]
        );
        expect(deleted.rowCount).toBe(1);
      });
    });

    it("keeps only the documented own-account and public-read exceptions", async () => {
      await asAuthenticated(ids.inactiveExternalAuth, async () => {
        const ownAccount = await client.query<{ id: string }>(
          "SELECT id FROM public.users WHERE auth_user_id = auth.uid()"
        );
        expect(ownAccount.rows).toEqual([{ id: ids.inactiveExternal }]);
        await expect(
          client.query("SELECT id FROM public.column_config LIMIT 1")
        ).resolves.toBeDefined();
        await expect(
          client.query("SELECT id FROM public.important_dates LIMIT 1")
        ).resolves.toBeDefined();
      });
    });

    it.each([
      ["active non-HR", ids.activeExternalAuth],
      ["inactive HR", ids.inactiveHrAuth],
    ])(
      "denies delete_app_user to an %s caller without changing target or outbox",
      async (_label, authUserId) => {
        await expectCallerBoundDeleteDenied(authUserId, ids.inactiveExternal);
      }
    );

    it("rolls back a foreign-key-blocked delete without deactivating the target", async () => {
      await client.query(
        `UPDATE public.staffing_needs
         SET updated_by = $1
         WHERE location = 'Göteborg'`,
        [ids.activeExternal]
      );

      await asAuthenticated(ids.activeAdminAuth, async () => {
        const deletion = await attempt(
          "SELECT public.delete_app_user($1)",
          [ids.activeExternal]
        );
        expect(deletion.ok).toBe(false);
        if (!deletion.ok) {
          expect((deletion.error as { code?: string }).code).toBe("23503");
        }
      });

      const target = await client.query<{ is_active: boolean }>(
        "SELECT is_active FROM public.users WHERE id = $1",
        [ids.activeExternal]
      );
      expect(target.rows).toEqual([{ is_active: true }]);
      const cleanup = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM public.app_user_auth_cleanup_outbox
         WHERE app_user_id = $1`,
        [ids.activeExternal]
      );
      expect(cleanup.rows).toEqual([{ count: "0" }]);
    });

    it("rejects a deleted admin as a stale actor and preserves the remaining active admin", async () => {
      const savepoint = `sp_${randomUUID().replaceAll("-", "")}`;
      await client.query(`SAVEPOINT ${savepoint}`);
      try {
        await asAuthenticated(ids.activeAdminAuth, async () => {
          const deletion = await client.query<{
            deleted: {
              cleanup_id: string;
              auth_user_id: string;
              cleanup_state: string;
            };
          }>("SELECT public.delete_app_user($1) AS deleted", [ids.backupAdmin]);

          expect(deletion.rows[0].deleted).toMatchObject({
            auth_user_id: ids.backupAdminAuth,
            cleanup_state: "pending",
          });
          expect(deletion.rows[0].deleted.cleanup_id).toMatch(
            /^[0-9a-f-]{36}$/i
          );

          const retry = await client.query<{
            deleted: {
              cleanup_id: string;
              auth_user_id: string;
              cleanup_state: string;
            };
          }>("SELECT public.delete_app_user($1) AS deleted", [ids.backupAdmin]);
          expect(retry.rows[0].deleted).toEqual(deletion.rows[0].deleted);
        });

        await asAuthenticated(ids.backupAdminAuth, async () => {
          const reciprocalDelete = await attempt(
            "SELECT public.delete_app_user($1)",
            [ids.activeAdmin]
          );
          expect(reciprocalDelete.ok).toBe(false);
          if (!reciprocalDelete.ok) {
            expect((reciprocalDelete.error as { code?: string }).code).toBe(
              "42501"
            );
          }
        });

        const admins = await client.query<{ id: string; is_active: boolean }>(
          `SELECT id, is_active
           FROM public.users
           WHERE id IN ($1, $2)
           ORDER BY id`,
          [ids.activeAdmin, ids.backupAdmin]
        );
        expect(admins.rows).toEqual([
          { id: ids.activeAdmin, is_active: true },
        ]);
      } finally {
        await client.query("RESET ROLE").catch(() => {});
        await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        await client.query(`RELEASE SAVEPOINT ${savepoint}`);
      }
    });

    it("serializes a synchronized two-client reciprocal final-admin delete/deactivate race", async () => {
      const race = {
        leftAuth: randomUUID(),
        leftApp: randomUUID(),
        rightAuth: randomUUID(),
        rightApp: randomUUID(),
      };
      const setup = new Client({ connectionString: environment.dbUrl });
      const left = new Client({ connectionString: environment.dbUrl });
      const right = new Client({ connectionString: environment.dbUrl });
      let setupConnected = false;
      let seedCommitted = false;
      let previousActiveAdminIds: string[] = [];
      let cleanupFailure: unknown = null;

      try {
        await setup.connect();
        setupConnected = true;
        await Promise.all([left.connect(), right.connect()]);

        await setup.query("BEGIN");
        try {
          const previous = await setup.query<{ id: string }>(
            `SELECT id
             FROM public.users
             WHERE role = 'hr_admin' AND is_active = true
             FOR UPDATE`
          );
          previousActiveAdminIds = previous.rows.map(({ id }) => id);
          await setup.query(
            `UPDATE public.users
             SET is_active = false
             WHERE role = 'hr_admin' AND is_active = true`
          );
          await seedAuthUserOn(
            setup,
            race.leftAuth,
            `story-22-15-race-left-${race.leftAuth}@example.test`
          );
          await seedAuthUserOn(
            setup,
            race.rightAuth,
            `story-22-15-race-right-${race.rightAuth}@example.test`
          );
          await setup.query(
            `INSERT INTO public.users (id, auth_user_id, email, role, is_active)
             VALUES
               ($1, $2, $3, 'hr_admin', true),
               ($4, $5, $6, 'hr_admin', true)`,
            [
              race.leftApp,
              race.leftAuth,
              `story-22-15-race-left-${race.leftApp}@example.test`,
              race.rightApp,
              race.rightAuth,
              `story-22-15-race-right-${race.rightApp}@example.test`,
            ]
          );
          await setup.query("COMMIT");
          seedCommitted = true;
        } catch (error) {
          await setup.query("ROLLBACK").catch(() => {});
          throw error;
        }

        const waitForStart = createStartBarrier(2);
        const [deleteAttempt, deactivateAttempt] = await Promise.all([
          synchronizedTransactionAttempt(
            left,
            race.leftAuth,
            waitForStart,
            "SELECT public.delete_app_user($1) AS result",
            [race.rightApp]
          ),
          synchronizedTransactionAttempt(
            right,
            race.rightAuth,
            waitForStart,
            "SELECT public.set_user_active_status($1, false) AS result",
            [race.leftApp]
          ),
        ]);

        const attempts = [deleteAttempt, deactivateAttempt];
        expect(attempts.filter(({ ok }) => ok)).toHaveLength(1);
        const rejected = attempts.find(({ ok }) => !ok);
        expect(rejected?.ok).toBe(false);
        if (rejected && !rejected.ok) {
          expect((rejected.error as { code?: string }).code).toBe("42501");
        }

        const remaining = await setup.query<{
          id: string;
          is_active: boolean;
        }>(
          `SELECT id, is_active
           FROM public.users
           WHERE id = ANY($1::uuid[])
           ORDER BY id`,
          [[race.leftApp, race.rightApp]]
        );
        expect(remaining.rows.filter(({ is_active }) => is_active)).toHaveLength(
          1
        );
      } finally {
        await Promise.all([
          left.end().catch(() => {}),
          right.end().catch(() => {}),
        ]);

        if (setupConnected && seedCommitted) {
          await setup.query("RESET ROLE").catch(() => {});
          await setup.query("BEGIN");
          try {
            if (previousActiveAdminIds.length > 0) {
              await setup.query(
                `UPDATE public.users
                 SET is_active = true
                 WHERE id = ANY($1::uuid[])`,
                [previousActiveAdminIds]
              );
            }
            await setup.query(
              `DELETE FROM public.app_user_auth_cleanup_outbox
               WHERE app_user_id = ANY($1::uuid[])`,
              [[race.leftApp, race.rightApp]]
            );
            await setup.query(
              `DELETE FROM public.users
               WHERE id = ANY($1::uuid[])`,
              [[race.leftApp, race.rightApp]]
            );
            await setup.query(
              `DELETE FROM auth.users
               WHERE id = ANY($1::uuid[])`,
              [[race.leftAuth, race.rightAuth]]
            );
            await setup.query("COMMIT");
          } catch (cleanupError) {
            await setup.query("ROLLBACK").catch(() => {});
            cleanupFailure = cleanupError;
          }
        }
        if (setupConnected) {
          await setup.end().catch((error) => {
            cleanupFailure ??= error;
          });
        }
        if (cleanupFailure) throw cleanupFailure;
      }
    });

    it("rejects deletion of the final active administrator without changing the row", async () => {
      const savepoint = `sp_${randomUUID().replaceAll("-", "")}`;
      await client.query(`SAVEPOINT ${savepoint}`);
      try {
        await client.query(
          "UPDATE public.users SET is_active = false WHERE id = $1",
          [ids.backupAdmin]
        );

        await asAuthenticated(ids.activeAdminAuth, async () => {
          const deletion = await attempt(
            "SELECT public.delete_app_user($1)",
            [ids.activeAdmin]
          );
          expect(deletion.ok).toBe(false);
          if (!deletion.ok) {
            expect((deletion.error as { code?: string }).code).toBe("42501");
          }
        });

        const remaining = await client.query<{ is_active: boolean }>(
          "SELECT is_active FROM public.users WHERE id = $1",
          [ids.activeAdmin]
        );
        expect(remaining.rows).toEqual([{ is_active: true }]);
      } finally {
        await client.query("RESET ROLE").catch(() => {});
        await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        await client.query(`RELEASE SAVEPOINT ${savepoint}`);
      }
    });
  }
);
