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

type DatabaseAttempt =
  | { ok: true; result: QueryResult }
  | { ok: false; error: unknown };

const ids = {
  hrAuth: randomUUID(),
  hrUser: randomUUID(),
  crewingAuth: randomUUID(),
  crewingUser: randomUUID(),
  inactiveCrewingAuth: randomUUID(),
  inactiveCrewingUser: randomUUID(),
  inactiveHrAuth: randomUUID(),
  inactiveHrUser: randomUUID(),
  sodexoAuth: randomUUID(),
  sodexoUser: randomUUID(),
  adminLimitedAuth: randomUUID(),
  adminLimitedUser: randomUUID(),
  activeEmployee: randomUUID(),
  archivedEmployee: randomUUID(),
  customConfig: randomUUID(),
};

const customColumnName = `story_22_13_${randomUUID().replaceAll("-", "")}`;
const client = new Client({ connectionString: dbUrl });

const databaseReachable = await isEpic22DatabaseReachable(dbUrl);

if (!databaseReachable) {
  console.warn(formatEpic22SupabaseSkipDiagnostic(testEnvironment));
}

async function asAuthenticatedUser<T>(
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

async function asServiceRole<T>(assertion: () => Promise<T>) {
  await client.query("RESET ROLE");
  await client.query("SET LOCAL ROLE service_role");
  await client.query(
    "SELECT set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true)"
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
): Promise<DatabaseAttempt> {
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

function expectDatabaseError(result: DatabaseAttempt, code: string) {
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect((result.error as { code?: string }).code).toBe(code);
  }
}

function expectPermissionDenied(result: DatabaseAttempt) {
  expectDatabaseError(result, "42501");
}

function expectRlsHidden(result: DatabaseAttempt) {
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.result.rowCount).toBe(0);
  }
}

async function seedSecurityFixtures() {
  await client.query(
    `
      INSERT INTO public.users (id, auth_user_id, email, role, is_active)
      VALUES
        ($1, $2, $3, 'hr_admin', true),
        ($4, $5, $6, 'crewing', true),
        ($7, $8, $9, 'crewing', false),
        ($10, $11, $12, 'hr_admin', false),
        ($13, $14, $15, 'sodexo', true),
        ($16, $17, $18, 'admin_limited', true)
    `,
    [
      ids.hrUser,
      ids.hrAuth,
      `story-22-13-hr-${ids.hrUser}@example.test`,
      ids.crewingUser,
      ids.crewingAuth,
      `story-22-13-crewing-${ids.crewingUser}@example.test`,
      ids.inactiveCrewingUser,
      ids.inactiveCrewingAuth,
      `story-22-13-inactive-${ids.inactiveCrewingUser}@example.test`,
      ids.inactiveHrUser,
      ids.inactiveHrAuth,
      `story-22-13-inactive-hr-${ids.inactiveHrUser}@example.test`,
      ids.sodexoUser,
      ids.sodexoAuth,
      `story-22-13-sodexo-${ids.sodexoUser}@example.test`,
      ids.adminLimitedUser,
      ids.adminLimitedAuth,
      `story-22-13-limited-${ids.adminLimitedUser}@example.test`,
    ]
  );

  await client.query(
    `
      INSERT INTO public.employees (
        id, first_name, surname, ssn, email, mobile, rank, gender,
        town_district, hire_date, is_archived, is_terminated, comments,
        one, talmundo, isps, photo, origo, loneiva, mail_lon,
        bankuppgifter, li, passport, kvitto_c17_18, c17, crewing_done,
        hotel_required, special_diet, diet_details
      )
      VALUES
        ($1, 'Story', 'Active', $3, $4, '+46700002213', 'SEV', 'Woman',
         'Göteborg', '2020-01-01', false, false, 'Before',
         false, false, false, false, false, 1, false,
         false, false, false, false, false, false, false, false, null),
        ($2, 'Story', 'Archived', $5, $6, '+46700002214', 'SEV', 'Woman',
         'Göteborg', '2020-01-01', true, false, 'Archived',
         false, false, false, false, false, 1, false,
         false, false, false, false, false, false, false, false, null)
    `,
    [
      ids.activeEmployee,
      ids.archivedEmployee,
      `221309-${ids.activeEmployee.slice(0, 4)}`,
      `active-${ids.activeEmployee}@example.test`,
      `221309-${ids.archivedEmployee.slice(0, 4)}`,
      `archived-${ids.archivedEmployee}@example.test`,
    ]
  );

  const permissions = {
    hr_admin: { view: true, edit: true },
    recruiter: { view: true, edit: true },
    sodexo: { view: true, edit: false },
    omc: { view: false, edit: false },
    payroll: { view: false, edit: false },
    toplux: { view: false, edit: false },
    crewing: { view: true, edit: false },
  };
  const updatedConfig = await client.query(
    `UPDATE public.column_config
     SET role_permissions = $1::jsonb
     WHERE db_column_name = 'comments' AND is_masterdata = true`,
    [JSON.stringify(permissions)]
  );
  if (updatedConfig.rowCount === 0) {
    await client.query(
      `INSERT INTO public.column_config
        (column_name, db_column_name, column_type, is_masterdata, role_permissions)
       VALUES ('Comments', 'comments', 'text', true, $1::jsonb)`,
      [JSON.stringify(permissions)]
    );
  }

  const hiddenPermissions = {
    hr_admin: { view: true, edit: true },
    recruiter: { view: true, edit: true },
    sodexo: { view: false, edit: false },
    omc: { view: false, edit: false },
    payroll: { view: false, edit: false },
    toplux: { view: false, edit: false },
    crewing: { view: false, edit: false },
  };
  const updatedHiddenConfig = await client.query(
    `UPDATE public.column_config
     SET role_permissions = $1::jsonb
     WHERE db_column_name = 'ssn' AND is_masterdata = true`,
    [JSON.stringify(hiddenPermissions)]
  );
  if (updatedHiddenConfig.rowCount === 0) {
    await client.query(
      `INSERT INTO public.column_config
        (column_name, db_column_name, column_type, is_masterdata, role_permissions)
       VALUES ('SSN', 'ssn', 'text', true, $1::jsonb)`,
      [JSON.stringify(hiddenPermissions)]
    );
  }

  await client.query(
    `INSERT INTO public.column_config
      (id, column_name, db_column_name, column_type, is_masterdata, role_permissions)
     VALUES (
       $1, 'Existing custom fixture', 'story_22_13_existing_custom', 'text', false,
       '{"sodexo":{"view":true,"edit":true}}'::jsonb
     )`,
    [ids.customConfig]
  );

  await client.query(
    `
      INSERT INTO public.employee_column_changes
        (employee_id, column_name, changed_at, changed_by)
      VALUES
        ($1, 'comments', now() - interval '2 minutes', $3),
        ($2, 'comments', now() - interval '1 minute', $3),
        ($1, 'ssn', now() - interval '30 seconds', $3)
    `,
    [ids.activeEmployee, ids.archivedEmployee, ids.hrUser]
  );

  await client.query(
    `INSERT INTO public.staffing_needs
       (location, headcount_need, updated_at, updated_by)
     VALUES ('Göteborg', 0, now(), NULL)
     ON CONFLICT (location)
     DO UPDATE SET headcount_need = 0, updated_at = now(), updated_by = NULL`
  );
}

describe.skipIf(!databaseReachable)(
  "Story 22.13 direct database authorization",
  () => {
    beforeAll(async () => {
      await client.connect();
      await assertEpic22DatabaseFingerprint(client);
      await client.query("BEGIN");
      await seedSecurityFixtures();
    });

    afterAll(async () => {
      await client.query("RESET ROLE").catch(() => {});
      await client.query("ROLLBACK");
      await client.end();
    });

    it("allows active HR Admin/Crewing staffing calls and rejects role or actor spoofing", async () => {
      await asAuthenticatedUser(ids.hrAuth, async () => {
        const result = await client.query(
          "SELECT * FROM public.update_staffing_need('Göteborg', 1, $1)",
          [ids.hrUser]
        );
        expect(result.rows[0]).toMatchObject({ old_value: 0, new_value: 1 });
      });

      await asAuthenticatedUser(ids.crewingAuth, async () => {
        const result = await client.query(
          "SELECT * FROM public.update_staffing_need('Göteborg', 2, $1)",
          [ids.crewingUser]
        );
        expect(result.rows[0]).toMatchObject({ old_value: 1, new_value: 2 });

        expectPermissionDenied(
          await attempt(
            "SELECT * FROM public.update_staffing_need('Göteborg', 3, $1)",
            [ids.hrUser]
          )
        );
      });

      await asAuthenticatedUser(ids.sodexoAuth, async () => {
        expectPermissionDenied(
          await attempt(
            "SELECT * FROM public.update_staffing_need('Göteborg', 3, $1)",
            [ids.sodexoUser]
          )
        );
        expectPermissionDenied(
          await attempt(
            `INSERT INTO public.column_config
              (column_name, db_column_name, column_type, is_masterdata, role_permissions)
             VALUES (
               'Forged system field', 'id', 'text', false,
               '{"sodexo":{"view":true,"edit":true}}'::jsonb
             )`
          )
        );
        expectRlsHidden(
          await attempt(
            `UPDATE public.column_config
             SET db_column_name = 'id'
             WHERE id = $1`,
            [ids.customConfig]
          )
        );
        expectRlsHidden(
          await attempt(
            "DELETE FROM public.column_config WHERE id = $1",
            [ids.customConfig]
          )
        );
      });
    });

    it("denies inactive privileged actors", async () => {
      await asAuthenticatedUser(ids.inactiveCrewingAuth, async () => {
        expectPermissionDenied(
          await attempt(
            "SELECT * FROM public.update_staffing_need('Göteborg', 4, $1)",
            [ids.inactiveCrewingUser]
          )
        );
      });

      await asAuthenticatedUser(ids.inactiveHrAuth, async () => {
        expectPermissionDenied(
          await attempt(
            `INSERT INTO public.column_config
              (column_name, db_column_name, column_type, is_masterdata, role_permissions)
             VALUES (
               'Inactive HR denied', 'story_22_13_inactive_hr', 'text', false,
               '{"hr_admin":{"view":true,"edit":true}}'::jsonb
             )`
          )
        );
      });
    });

    it("rechecks external presentation-edit permission inside the database update", async () => {
      await asAuthenticatedUser(ids.sodexoAuth, async () => {
        const allowed = await attempt(
          `SELECT (public.update_assigned_column_presentation(
             $1,
             '{"column_name":"Assigned label"}'::jsonb
           )).column_name`,
          [ids.customConfig]
        );
        expect(allowed.ok).toBe(true);
        if (allowed.ok) {
          expect(allowed.result.rows).toEqual([
            { column_name: "Assigned label" },
          ]);
        }
      });

      await client.query(
        `UPDATE public.column_config
         SET role_permissions = jsonb_set(
           role_permissions,
           '{sodexo,edit}',
           'false'::jsonb
         )
         WHERE id = $1`,
        [ids.customConfig]
      );

      await asAuthenticatedUser(ids.sodexoAuth, async () => {
        expectPermissionDenied(
          await attempt(
            `SELECT public.update_assigned_column_presentation(
               $1,
               '{"column_name":"Revoked label"}'::jsonb
             )`,
            [ids.customConfig]
          )
        );
      });
    });

    it("denies direct callers and keeps atomic service creation collision-safe", async () => {
      await asAuthenticatedUser(ids.hrAuth, async () => {
        expectPermissionDenied(
          await attempt(
            "SELECT public.add_custom_column_to_employees($1, 'BOOLEAN')",
            ["story_22_13_hr_denied"]
          )
        );
        expectPermissionDenied(
          await attempt(
            `SELECT public.create_employee_column_config(
              'HR direct denied', 'story_22_13_hr_denied', 'boolean', false,
              null, null, '{"hr_admin":{"view":true,"edit":true}}'::jsonb, false
            )`
          )
        );
      });

      await asAuthenticatedUser(ids.sodexoAuth, async () => {
        expectPermissionDenied(
          await attempt(
            "SELECT public.add_custom_column_to_employees($1, 'BOOLEAN')",
            ["story_22_13_sodexo_denied"]
          )
        );
        expectPermissionDenied(
          await attempt(
            `SELECT public.create_employee_column_config(
              'Sodexo direct denied', 'story_22_13_sodexo_denied', 'boolean', false,
              null, null, '{"sodexo":{"view":true,"edit":true}}'::jsonb, false
            )`
          )
        );
      });

      await asServiceRole(async () => {
        await client.query("SAVEPOINT atomic_custom_column");
        try {
          const created = await client.query<{
            config: Record<string, unknown>;
          }>(
            `SELECT public.create_employee_column_config(
              'Story 22.13 custom', $1, 'boolean', false, null, null,
              '{"hr_admin":{"view":true,"edit":true}}'::jsonb, false
            ) AS config`,
            [customColumnName]
          );
          expect(created.rows[0]?.config).toMatchObject({
            db_column_name: customColumnName,
            is_masterdata: false,
          });

          const physicalColumn = await client.query<{ data_type: string }>(
            `SELECT data_type
             FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = 'employees'
               AND column_name = $1`,
            [customColumnName]
          );
          expect(physicalColumn.rows).toEqual([{ data_type: "boolean" }]);

          expectDatabaseError(
            await attempt(
              `SELECT public.create_employee_column_config(
                'Collision', 'id', 'text', false, null, null,
                '{"hr_admin":{"view":true,"edit":true}}'::jsonb, false
              )`
            ),
            "42701"
          );
        } finally {
          await client.query("ROLLBACK TO SAVEPOINT atomic_custom_column");
          await client.query("RELEASE SAVEPOINT atomic_custom_column");
        }
      });

      const rolledBack = await client.query<{ config_count: string; column_count: string }>(
        `SELECT
           (SELECT count(*)::text FROM public.column_config WHERE db_column_name = $1) AS config_count,
           (SELECT count(*)::text FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = $1) AS column_count`,
        [customColumnName]
      );
      expect(rolledBack.rows[0]).toEqual({
        config_count: "0",
        column_count: "0",
      });
    });

    it("blocks direct users-table updates but preserves caller-bound activity", async () => {
      await asAuthenticatedUser(ids.sodexoAuth, async () => {
        for (const [column, value] of [
          ["role", "hr_admin"],
          ["is_active", false],
          ["email", `promoted-${ids.sodexoUser}@example.test`],
          ["auth_user_id", ids.hrAuth],
        ] as const) {
          expectPermissionDenied(
            await attempt(
              `UPDATE public.users SET ${column} = $2 WHERE id = $1`,
              [ids.sodexoUser, value]
            )
          );
        }

        const activity = await client.query<{ updated_at: string }>(
          "SELECT public.update_own_last_active_at()::text AS updated_at"
        );
        expect(activity.rows[0]?.updated_at).toBeTruthy();
      });

      const user = await client.query(
        `SELECT role, is_active, email, auth_user_id, last_active_at IS NOT NULL AS has_activity
         FROM public.users WHERE id = $1`,
        [ids.sodexoUser]
      );
      expect(user.rows[0]).toMatchObject({
        role: "sodexo",
        is_active: true,
        auth_user_id: ids.sodexoAuth,
        has_activity: true,
      });
    });

    it("rejects forged audit rows and scopes reads to visible employees and columns", async () => {
      await asAuthenticatedUser(ids.sodexoAuth, async () => {
        expectPermissionDenied(
          await attempt(
            `INSERT INTO public.employee_column_changes
               (employee_id, column_name, changed_by)
             VALUES ($1, 'comments', $2)`,
            [ids.activeEmployee, ids.sodexoUser]
          )
        );

        const visible = await client.query<{
          employee_id: string;
          column_name: string;
        }>(
          `SELECT DISTINCT employee_id, column_name
           FROM public.employee_column_changes
           WHERE employee_id IN ($1, $2)
             AND column_name IN ('comments', 'ssn')
           ORDER BY employee_id, column_name`,
          [ids.activeEmployee, ids.archivedEmployee]
        );
        expect(visible.rows).toEqual([
          { employee_id: ids.activeEmployee, column_name: "comments" },
        ]);
      });

      await asAuthenticatedUser(ids.adminLimitedAuth, async () => {
        const hidden = await client.query(
          "SELECT id FROM public.employee_column_changes"
        );
        expect(hidden.rows).toEqual([]);
      });
    });

    it("keeps trigger-owned audit writes working after INSERT is revoked", async () => {
      await asAuthenticatedUser(ids.hrAuth, async () => {
        const updated = await client.query(
          "UPDATE public.employees SET comments = 'After' WHERE id = $1",
          [ids.activeEmployee]
        );
        expect(updated.rowCount).toBe(1);
      });

      const audit = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM public.employee_column_changes
         WHERE employee_id = $1 AND column_name = 'comments'`,
        [ids.activeEmployee]
      );
      expect(Number(audit.rows[0]?.count)).toBeGreaterThanOrEqual(2);
    });
  }
);
