export const POSTGRES_SYSTEM_IDENTIFIER_QUERY =
  'SELECT system_identifier::text AS system_identifier FROM pg_control_system()';

const SYSTEM_IDENTIFIER_PATTERN = /^[1-9][0-9]{0,18}$/u;
const DATABASE_NAME_PATTERN = /^[a-z_][a-z0-9_]{0,62}$/u;

function assertSystemIdentifier(value, label) {
  if (typeof value !== 'string' || !SYSTEM_IDENTIFIER_PATTERN.test(value)) {
    throw new Error(`${label} PostgreSQL system identifier is unavailable or invalid`);
  }
  return value;
}

export function requireGuardedPostgresSystemIdentifier(value) {
  return assertSystemIdentifier(value, 'Expected guarded');
}

export async function assertGuardedPostgresSystemIdentifier({
  adminClient,
  expectedSystemIdentifier,
}) {
  const expected = requireGuardedPostgresSystemIdentifier(expectedSystemIdentifier);
  const result = await adminClient.query(POSTGRES_SYSTEM_IDENTIFIER_QUERY);
  const rows = result?.rows;
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error('Observed PostgreSQL system identifier is unavailable or invalid');
  }
  const observed = assertSystemIdentifier(
    rows[0]?.system_identifier,
    'Observed'
  );
  if (observed !== expected) {
    throw new Error('Guarded PostgreSQL system identifier does not match the launcher record');
  }
  return observed;
}

export async function createGuardedFixtureDatabase({
  adminClient,
  expectedSystemIdentifier,
  databaseName,
}) {
  if (typeof databaseName !== 'string' || !DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error('Guarded fixture database name is unavailable or invalid');
  }
  await assertGuardedPostgresSystemIdentifier({
    adminClient,
    expectedSystemIdentifier,
  });
  await adminClient.query(`CREATE DATABASE ${databaseName} TEMPLATE template0`);
}
