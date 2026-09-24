import { createHash } from 'node:crypto';

export const POSTGRES_SYSTEM_IDENTIFIER_QUERY =
  'SELECT system_identifier::text AS system_identifier FROM pg_control_system()';

const SYSTEM_IDENTIFIER_PATTERN = /^[1-9][0-9]{0,18}$/u;
const SYSTEM_IDENTIFIER_SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const DATABASE_NAME_PATTERN = /^[a-z_][a-z0-9_]{0,62}$/u;

function assertSystemIdentifier(value, label) {
  if (typeof value !== 'string' || !SYSTEM_IDENTIFIER_PATTERN.test(value)) {
    throw new Error(
      `${label} PostgreSQL system identifier is unavailable or invalid`
    );
  }
  return value;
}

export function requireGuardedPostgresSystemIdentifier(value) {
  return assertSystemIdentifier(value, 'Expected guarded');
}

function requireGuardedPostgresSystemIdentifierSha256(value) {
  if (
    typeof value !== 'string' ||
    !SYSTEM_IDENTIFIER_SHA256_PATTERN.test(value)
  ) {
    throw new Error(
      'Expected guarded PostgreSQL system identifier SHA-256 is unavailable or invalid'
    );
  }
  return value;
}

function assertFixtureDatabaseName(databaseName) {
  if (
    typeof databaseName !== 'string' ||
    !DATABASE_NAME_PATTERN.test(databaseName)
  ) {
    throw new Error('Guarded fixture database name is unavailable or invalid');
  }
  return databaseName;
}

async function readObservedSystemIdentifier(adminClient) {
  let result;
  try {
    result = await adminClient.query(POSTGRES_SYSTEM_IDENTIFIER_QUERY);
  } catch {
    throw new Error(
      'Observed PostgreSQL system identifier is unavailable or invalid'
    );
  }

  const rows = result?.rows;
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error(
      'Observed PostgreSQL system identifier is unavailable or invalid'
    );
  }
  return assertSystemIdentifier(rows[0]?.system_identifier, 'Observed');
}

export async function assertGuardedPostgresSystemIdentifier({
  adminClient,
  expectedSystemIdentifier,
}) {
  const expected = requireGuardedPostgresSystemIdentifier(
    expectedSystemIdentifier
  );
  const observed = await readObservedSystemIdentifier(adminClient);
  if (observed !== expected) {
    throw new Error(
      'Guarded PostgreSQL system identifier does not match the launcher record'
    );
  }
  return observed;
}

export async function assertGuardedPostgresSystemIdentifierHash({
  adminClient,
  expectedSystemIdentifierSha256,
}) {
  const expected = requireGuardedPostgresSystemIdentifierSha256(
    expectedSystemIdentifierSha256
  );
  const observed = await readObservedSystemIdentifier(adminClient);
  const observedHash = createHash('sha256')
    .update(observed, 'utf8')
    .digest('hex');
  if (observedHash !== expected) {
    throw new Error(
      'Guarded PostgreSQL system identifier SHA-256 does not match the launcher record'
    );
  }
  return observedHash;
}

export async function createGuardedFixtureDatabase({
  adminClient,
  expectedSystemIdentifier,
  databaseName,
}) {
  assertFixtureDatabaseName(databaseName);
  await assertGuardedPostgresSystemIdentifier({
    adminClient,
    expectedSystemIdentifier,
  });
  await adminClient.query(`CREATE DATABASE ${databaseName} TEMPLATE template0`);
}

export async function createGuardedFixtureDatabaseWithHash({
  adminClient,
  expectedSystemIdentifierSha256,
  databaseName,
}) {
  assertFixtureDatabaseName(databaseName);
  await assertGuardedPostgresSystemIdentifierHash({
    adminClient,
    expectedSystemIdentifierSha256,
  });
  await adminClient.query(`CREATE DATABASE ${databaseName} TEMPLATE template0`);
}
