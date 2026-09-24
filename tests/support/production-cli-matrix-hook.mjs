import { createHash } from 'node:crypto';

const TARGETS = new Set(['20260314000002', '20260615000000']);

/** Local synthetic fixture only. Sequence advancement survives the transaction
 * rollback that would erase an ordinary hook audit INSERT. Manual history-table
 * creation is setup, never proof of the CLI's history bootstrap behavior. */
export function buildHistoryFaultSetup({ targetVersion, mode }) {
  if (
    !TARGETS.has(targetVersion) ||
    !['reject', 'timeout'].includes(mode) ||
    (mode === 'timeout' && targetVersion !== '20260314000002')
  ) {
    throw new Error('Unsupported synthetic history fault');
  }
  const body = `BEGIN
  IF NEW.version = '${targetVersion}' THEN
    PERFORM nextval('cli_matrix_probe.history_fault_firings');
    ${mode === 'timeout' ? 'PERFORM pg_sleep(8);' : ''}
    RAISE EXCEPTION 'CLI_MATRIX_HISTORY_REJECT' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;`;
  const sql = `CREATE SCHEMA supabase_migrations;
CREATE TABLE supabase_migrations.schema_migrations (
  version text PRIMARY KEY, statements text[], name text
);
CREATE SCHEMA cli_matrix_probe;
CREATE SEQUENCE cli_matrix_probe.history_fault_firings;
CREATE FUNCTION cli_matrix_probe.reject_history() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $matrix_hook$${body}$matrix_hook$;
CREATE TRIGGER matrix_history_fault BEFORE INSERT ON supabase_migrations.schema_migrations
FOR EACH ROW EXECUTE FUNCTION cli_matrix_probe.reject_history();
REVOKE ALL ON SCHEMA cli_matrix_probe FROM PUBLIC;
`;
  return Object.freeze({
    sql,
    sha256: createHash('sha256').update(sql).digest('hex'),
    bodySha256: createHash('sha256').update(body).digest('hex'),
    targetVersion,
    mode,
    historyTableManuallyCreated: true,
  });
}

export const HISTORY_FAULT_OBSERVER_SQL = `SELECT
  (SELECT CASE WHEN is_called THEN last_value ELSE 0 END
    FROM cli_matrix_probe.history_fault_firings)::text AS firing_count,
  p.prosrc AS function_body,
  p.prosecdef = false AND p.provolatile = 'v' AND p.proparallel = 'u'
    AND p.proconfig = ARRAY['search_path=pg_catalog']::text[]
    AND pg_get_userbyid(p.proowner) = 'postgres' AS function_attributes_match,
  (SELECT count(*) = 1 FROM pg_trigger t
    WHERE t.tgrelid = 'supabase_migrations.schema_migrations'::regclass AND NOT t.tgisinternal) AS sole_trigger,
  EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgrelid = 'supabase_migrations.schema_migrations'::regclass
    AND t.tgname = 'matrix_history_fault' AND t.tgfoid = p.oid
    AND t.tgtype = 7 AND t.tgenabled = 'O' AND t.tgnargs = 0
    AND t.tgqual IS NULL AND t.tgconstraint = 0) AS trigger_matches
FROM pg_proc p WHERE p.oid = to_regprocedure('cli_matrix_probe.reject_history()');`;

export function interpretHistoryFaultObservation(setup, rows) {
  // Rows never leave this local parser. Only the closed, redacted projection is
  // returned; a missing/altered hook is not mistaken for an unobserved valid hook.
  const row = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
  const armed =
    !!row &&
    row.function_attributes_match === true &&
    row.sole_trigger === true &&
    row.trigger_matches === true &&
    typeof row.function_body === 'string' &&
    createHash('sha256').update(row.function_body).digest('hex') ===
      setup.bodySha256;
  const countValid =
    typeof row?.firing_count === 'string' &&
    /^(0|[1-9][0-9]{0,5})$/u.test(row.firing_count);
  const firingCount = countValid ? Number(row.firing_count) : null;
  return Object.freeze({
    armed,
    observed: armed && firingCount === 1,
    targetVersion: setup.targetVersion,
    firingCount,
    complete: armed && countValid,
  });
}
