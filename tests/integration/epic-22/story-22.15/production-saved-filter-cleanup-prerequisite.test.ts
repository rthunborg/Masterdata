import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { Client, type QueryResult } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  assertGuardedPostgresSystemIdentifier,
  createGuardedFixtureDatabase,
  requireGuardedPostgresSystemIdentifier,
} from '../../../support/guarded-postgres-fixture.mjs';

const fixtureUrlValue = process.env.STORY_22_15_POST_APPLY_FIXTURE_DATABASE_URL;
const requireFixture =
  process.env.REQUIRE_STORY_22_15_SAVED_FILTER_CLEANUP_DB_EVIDENCE === 'true';
const guardedPostgresSystemIdentifier = fixtureUrlValue
  ? requireGuardedPostgresSystemIdentifier(
      process.env.STORY_22_15_GUARDED_POSTGRES_SYSTEM_IDENTIFIER
    )
  : null;

if (!fixtureUrlValue && requireFixture) {
  throw new Error(
    'REQUIRE_STORY_22_15_SAVED_FILTER_CLEANUP_DB_EVIDENCE requires a guarded local fixture URL'
  );
}

const fixtureUrl = fixtureUrlValue ? new URL(fixtureUrlValue) : null;
if (
  fixtureUrl &&
  (fixtureUrl.hostname !== '127.0.0.1' || fixtureUrl.port !== '45432')
) {
  throw new Error(
    'Story 22.15 saved-filter cleanup evidence only permits the guarded loopback fixture'
  );
}

if (!fixtureUrl) {
  console.warn(
    'Saved-filter cleanup SQL integration evidence is not configured; set the guarded fixture URL and launcher-supplied PostgreSQL system identifier, or REQUIRE_STORY_22_15_SAVED_FILTER_CLEANUP_DB_EVIDENCE=true to make it mandatory.'
  );
}

const cleanupPrerequisiteSql = readFileSync(
  'supabase/verify/production-saved-filter-cleanup-prerequisite.sql',
  'utf8'
);
const fixtureDatabaseName = `story_2215_cleanup_${randomUUID()
  .replaceAll('-', '')
  .slice(0, 20)}`;
const administrationUrl = fixtureUrl ? new URL(fixtureUrl) : null;
if (administrationUrl) administrationUrl.pathname = '/template1';

type Counts = {
  total: string;
  orphan_auth_references: string;
  empty_names: string;
  overlength_names: string;
};

async function readCounts(client: Client): Promise<Counts> {
  const result = (await client.query(cleanupPrerequisiteSql)) as
    | QueryResult<Counts>
    | QueryResult<Counts>[];
  const results = Array.isArray(result) ? result : [result];
  const countResult = results.find((entry) => entry.rows.length === 1);
  if (!countResult) {
    throw new Error('Saved-filter cleanup prerequisite returned no aggregate row');
  }
  return countResult.rows[0]!;
}

describe.skipIf(!fixtureUrl)(
  'Story 22.15 saved-filter cleanup prerequisite SQL',
  () => {
    const adminClient = administrationUrl
      ? new Client({ connectionString: administrationUrl.toString() })
      : null;
    let fixtureClient: Client;

    async function resetRows() {
      await fixtureClient.query('TRUNCATE TABLE public.user_filters, auth.users');
    }

    beforeAll(async () => {
      if (!adminClient || !fixtureUrlValue) {
        throw new Error('Guarded fixture administration URL is unavailable');
      }
      await adminClient.connect();
      // The guarded launcher obtains this identifier from its exact registered
      // container through guard-selected docker exec. It must not derive it from this connection
      // or URL, since that would merely trust the server this test is about to
      // mutate. A mismatch prevents CREATE DATABASE.
      await createGuardedFixtureDatabase({
        adminClient,
        expectedSystemIdentifier: guardedPostgresSystemIdentifier,
        databaseName: fixtureDatabaseName,
      });

      const databaseUrl = new URL(fixtureUrlValue);
      databaseUrl.pathname = `/${fixtureDatabaseName}`;
      fixtureClient = new Client({ connectionString: databaseUrl.toString() });
      await fixtureClient.connect();
      await assertGuardedPostgresSystemIdentifier({
        adminClient: fixtureClient,
        expectedSystemIdentifier: guardedPostgresSystemIdentifier,
      });
      await fixtureClient.query(`
        CREATE SCHEMA auth;
        CREATE TABLE auth.users (id uuid PRIMARY KEY);
        CREATE TABLE public.user_filters (
          id uuid PRIMARY KEY,
          user_id uuid NOT NULL,
          name text NOT NULL,
          filters jsonb NOT NULL DEFAULT '[]'::jsonb
        );
      `);
    });

    afterAll(async () => {
      await fixtureClient?.end();
      await adminClient?.end();
    });

    it('reports a zero-row fixture and leaves it unchanged in a read-only transaction', async () => {
      const before = await fixtureClient.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM public.user_filters'
      );
      const counts = await readCounts(fixtureClient);
      const after = await fixtureClient.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM public.user_filters'
      );

      expect(counts).toEqual({
        total: '0',
        orphan_auth_references: '0',
        empty_names: '0',
        overlength_names: '0',
      });
      expect(after.rows).toEqual(before.rows);
    });

    it('counts 48 missing-owner references without returning their identities', async () => {
      await resetRows();
      await fixtureClient.query(`
        INSERT INTO public.user_filters (id, user_id, name, filters)
        SELECT md5('row-' || value)::uuid,
               md5('missing-owner-' || value)::uuid,
               'orphan',
               '[]'::jsonb
        FROM generate_series(1, 48) AS series(value)
      `);

      expect(await readCounts(fixtureClient)).toEqual({
        total: '48',
        orphan_auth_references: '48',
        empty_names: '0',
        overlength_names: '0',
      });
    });

    it('does not classify a valid owner and valid name as an invalid row', async () => {
      await resetRows();
      const userId = randomUUID();
      await fixtureClient.query('INSERT INTO auth.users (id) VALUES ($1)', [userId]);
      await fixtureClient.query(
        `INSERT INTO public.user_filters (id, user_id, name, filters)
         VALUES ($1, $2, 'valid', '[]'::jsonb)`,
        [randomUUID(), userId]
      );

      expect(await readCounts(fixtureClient)).toEqual({
        total: '1',
        orphan_auth_references: '0',
        empty_names: '0',
        overlength_names: '0',
      });
    });

    it.each([
      {
        label: 'empty name',
        name: '',
        expected: { empty_names: '1', overlength_names: '0' },
      },
      {
        label: '51-character name',
        name: 'x'.repeat(51),
        expected: { empty_names: '0', overlength_names: '1' },
      },
    ])('counts a valid-owner $label', async ({ name, expected }) => {
      await resetRows();
      const userId = randomUUID();
      await fixtureClient.query('INSERT INTO auth.users (id) VALUES ($1)', [userId]);
      await fixtureClient.query(
        `INSERT INTO public.user_filters (id, user_id, name, filters)
         VALUES ($1, $2, $3, '[]'::jsonb)`,
        [randomUUID(), userId, name]
      );

      expect(await readCounts(fixtureClient)).toEqual({
        total: '1',
        orphan_auth_references: '0',
        ...expected,
      });
    });

    it('permits an orphan and an empty-name count to overlap on the same row', async () => {
      await resetRows();
      await fixtureClient.query(
        `INSERT INTO public.user_filters (id, user_id, name, filters)
         VALUES ($1, $2, '', '[]'::jsonb)`,
        [randomUUID(), randomUUID()]
      );

      expect(await readCounts(fixtureClient)).toEqual({
        total: '1',
        orphan_auth_references: '1',
        empty_names: '1',
        overlength_names: '0',
      });
    });
  }
);
