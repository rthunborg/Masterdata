import { randomUUID } from "node:crypto";

import { Client } from "pg";
import { describe, expect, it } from "vitest";

import {
  assertEpic22DatabaseFingerprint,
  formatEpic22SupabaseSkipDiagnostic,
  isEpic22DatabaseReachable,
  loadEpic22SupabaseTestEnvironment,
} from "../../../helpers/epic-22-supabase-test-environment";

const environment = loadEpic22SupabaseTestEnvironment();
const databaseReachable = await isEpic22DatabaseReachable(environment.dbUrl);

if (!databaseReachable) {
  console.warn(formatEpic22SupabaseSkipDiagnostic(environment));
}

type AdminIdentity = { id: string; auth_user_id: string };

async function attemptDeactivation(
  dbUrl: string,
  actor: AdminIdentity,
  target: AdminIdentity
) {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE authenticated");
    await client.query(
      "SELECT set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated')::text, true)",
      [actor.auth_user_id]
    );
    await client.query("SELECT public.set_user_active_status($1, false)", [target.id]);
    await client.query("COMMIT");
    return { ok: true as const };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    return { ok: false as const, code: (error as { code?: string }).code };
  } finally {
    await client.end();
  }
}

describe.skipIf(!databaseReachable)("atomic user status transition", () => {
  it("serializes concurrent admin deactivations and preserves an active admin", async () => {
    const admin = new Client({ connectionString: environment.dbUrl });
    const fixtureIds = [randomUUID(), randomUUID()];
    const fixtureAuthIds = [randomUUID(), randomUUID()];

    await admin.connect();
    try {
      await assertEpic22DatabaseFingerprint(admin);
      await admin.query(
        `INSERT INTO public.users (id, auth_user_id, email, role, is_active)
         VALUES ($1, $2, $3, 'hr_admin', true), ($4, $5, $6, 'hr_admin', true)`,
        [
          fixtureIds[0],
          fixtureAuthIds[0],
          `story-22-13-concurrency-${fixtureIds[0]}@example.invalid`,
          fixtureIds[1],
          fixtureAuthIds[1],
          `story-22-13-concurrency-${fixtureIds[1]}@example.invalid`,
        ]
      );

      const admins: AdminIdentity[] = [
        { id: fixtureIds[0], auth_user_id: fixtureAuthIds[0] },
        { id: fixtureIds[1], auth_user_id: fixtureAuthIds[1] },
      ];
      const attempts = admins.map((actor, index) =>
        attemptDeactivation(
          environment.dbUrl,
          actor,
          admins[(index + 1) % admins.length]
        )
      );
      const results = await Promise.all(attempts);

      const active = await admin.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM public.users WHERE id = ANY($1::uuid[]) AND is_active = true",
        [fixtureIds]
      );
      expect(Number(active.rows[0].count)).toBe(1);
      expect(results.some((result) => !result.ok && result.code === "42501")).toBe(true);
      expect(results.some((result) => result.ok)).toBe(true);
    } finally {
      await admin.query("DELETE FROM public.users WHERE id = ANY($1::uuid[])", [fixtureIds]).catch(() => {});
      await admin.end();
    }
  });
});
