import { readFileSync } from 'node:fs';

import { Client } from 'pg';
import { describe, expect, it } from 'vitest';

import { summarizeObservedPermissionBaseline } from '../../../../src/lib/release/collect-production-observed-profile.mjs';
import { PRODUCTION_OBSERVED_PROFILE_BASELINE } from '../../../../src/lib/release/production-observed-profile.mjs';
import { parseOneRedactedJsonLine } from '../../../../src/lib/release/production-profile-redaction.mjs';
import { assertGuardedPostgresSystemIdentifier } from '../../../support/guarded-postgres-fixture.mjs';

const fixtureValue = process.env.STORY_22_15_POST_APPLY_FIXTURE_DATABASE_URL;
const required = process.env.REQUIRE_STORY_22_15_POST_APPLY_DB_EVIDENCE === 'true';
if (required && !fixtureValue) throw new Error('Observed permission JSONB evidence requires the guarded local fixture');
const fixture = fixtureValue ? new URL(fixtureValue) : null;
if (fixture && (!['postgres:', 'postgresql:'].includes(fixture.protocol) ||
  fixture.hostname !== '127.0.0.1' || fixture.port !== '45432' ||
  !/^\/[a-z_][a-z0-9_]{0,62}$/.test(fixture.pathname))) {
  throw new Error('Observed permission JSONB evidence only permits the guarded local fixture');
}

// PostgreSQL, rather than a second JavaScript formatter, supplies this oracle.
// The parameters contain only fixed, already-redacted configuration hashes.
const fingerprintSql = `SELECT encode(sha256(convert_to(coalesce(
  jsonb_agg(jsonb_build_object(
    'role_permissions_sha256', entry.value->>'role_permissions_sha256',
    'column_name_md5', entry.value->>'column_name_md5'
  ) ORDER BY entry.ordinality)::text, '[]'), 'UTF8')), 'hex') AS fingerprint
FROM jsonb_array_elements($1::jsonb) WITH ORDINALITY AS entry(value, ordinality)`;

describe.skipIf(!fixture)('Story 22.15 guarded PostgreSQL permission fingerprint', () => {
  it('matches the historical 61-row hash and preserves SQL-provided row order', async () => {
    const rows = JSON.parse(readFileSync('tests/fixtures/production-permission-fingerprints-20260923.json', 'utf8'));
    const aggregate = structuredClone(PRODUCTION_OBSERVED_PROFILE_BASELINE.aggregate);
    const { rows_sha256: _fingerprint, ...counts } = aggregate.permission_baseline;
    const parsed = parseOneRedactedJsonLine(JSON.stringify({ ...aggregate,
      permission_baseline: { ...counts, rows },
    }), 'aggregate');
    const projected = summarizeObservedPermissionBaseline(parsed);
    const client = new Client({ connectionString: fixture!.href,
      connectionTimeoutMillis: 5000, statement_timeout: 5000, query_timeout: 7000 });
    try {
      await client.connect();
      await client.query('BEGIN TRANSACTION READ ONLY');
      await assertGuardedPostgresSystemIdentifier({ adminClient: client,
        expectedSystemIdentifier: process.env.STORY_22_15_GUARDED_POSTGRES_SYSTEM_IDENTIFIER });
      const canonical = await client.query(fingerprintSql, [JSON.stringify(rows)]);
      expect(canonical.rows[0].fingerprint).toBe('643a4e803cf7c607d939d370711430d70830b858f4a42e504bba36fbbdcf39f8');
      expect(projected.permission_baseline.rows_sha256).toBe(canonical.rows[0].fingerprint);
      const reversed = await client.query(fingerprintSql, [JSON.stringify([...rows].reverse())]);
      expect(reversed.rows[0].fingerprint).not.toBe(canonical.rows[0].fingerprint);
      const reversedParsed = parseOneRedactedJsonLine(JSON.stringify({ ...aggregate,
        permission_baseline: { ...counts, rows: [...rows].reverse() },
      }), 'aggregate');
      expect(summarizeObservedPermissionBaseline(reversedParsed).permission_baseline.rows_sha256)
        .toBe(reversed.rows[0].fingerprint);
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      await client.end().catch(() => {});
    }
  });
});
