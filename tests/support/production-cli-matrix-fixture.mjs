import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Repository-owned input for the local CLI matrix.  It deliberately contains
 * synthetic values only.  It is a fixture identity, never a production
 * representation, cleanup authorization, or history-effect assertion.
 */
export const FORWARD_VERSIONS = Object.freeze([
  '20260314000001', '20260314000002', '20260614000000',
  '20260615000000', '20260709194903', '20260710144000',
  '20260710150000', '20260831200026', '20260909115242',
  '20260910094517', '20260910115024', '20260910184840',
  '20260910184841',
]);

export const MATRIX_FIXTURE_VARIANTS = Object.freeze([
  'observed_orphans_48',
  'postcleanup_zero_filters',
  'implicit_column_absent',
]);

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const REPOSITORY_ROOT = resolve(
  dirname(
    typeof import.meta.filename === 'string'
      ? import.meta.filename
      : fileURLToPath(import.meta.url)
  ),
  '../..'
);
const normalizedBodyMd5 = (value) => createHash('md5')
  .update(value.trim().replaceAll('\r\n', '\n')).digest('hex');
const literal = (value) => `'${String(value).replaceAll("'", "''")}'`;
const uuid = (label) => {
  const value = sha256(`story-22.15/production-cli-matrix/${label}`);
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-4${value.slice(13, 16)}-8${value.slice(17, 20)}-${value.slice(20, 32)}`;
};

export const SYNTHETIC_AGGREGATES = Object.freeze({
  employees: 73,
  repaymentNull: 70,
  repaymentTrue: 2,
  repaymentFalse: 1,
  auditRows: 1025,
  auditNonNullActors: 202,
  auditDistinctNonNullActors: 1,
  columnConfig: 61,
  staffingLocations: 2,
});

const canonicalPermissions = Object.freeze({
  hr_admin: { view: true, edit: true }, recruiter: { view: true, edit: true },
  sodexo: { view: false, edit: false }, omc: { view: false, edit: false },
  payroll: { view: false, edit: false }, toplux: { view: false, edit: false },
  crewing: { view: false, edit: false },
});
const dietaryPermissions = Object.freeze({
  hr_admin: { view: true, edit: true }, recruiter: { view: true, edit: false },
  sodexo: { view: true, edit: false }, omc: { view: true, edit: false },
  crewing: { view: true, edit: false }, admin_limited: { view: true, edit: false },
});
const crewingDonePermissions = Object.freeze({
  ...canonicalPermissions, crewing: { view: true, edit: false }, admin_limited: { view: true, edit: false },
});

const CONFIG_COLUMNS = Object.freeze([
  'first_name','surname','ssn','email','mobile','rank','gender','town_district','hire_date',
  'termination_date','termination_reason','comments','one','isps','photo','origo','loneiva',
  'mail_lon','bankuppgifter','li','passport','kvitto_c17_18','c17','stena_id_origo_nummer',
  'bestallning_gjord','fartyg','skickat_bestallning_till_fartyg_warehouse','mottaget',
  'kontaktat_medarbetare','uthamtat','mottagit_kort','skickat_kort_till_fartyg','ersatt',
  'klart_sign','notering','rotation','hotel_required','room_number_shared','joining_instructions_sent',
  'candidate_confirmed','seably_status','receipt_c17','certificate_c17','receipt_c18','certificate_c18',
  'omc_certificate','uploaded_in_crewsf','completed','one_marked_at','talmundo','loneiva_backup',
  'stena_date','omc_date','pe3_date','special_diet','diet_details','crewing_done',
  'repayment_needed_omc','repayment_needed_pe3','archived_at','is_anonymized',
]);

function publicFebruaryTriggerSource() {
  const source = readFileSync(resolve(REPOSITORY_ROOT, 'supabase/migrations/20260223000000_add_dietary_columns_to_change_trigger.sql'), 'utf8');
  const match = source.match(/CREATE OR REPLACE FUNCTION track_employee_column_changes\(\)[\s\S]*?\$\$ LANGUAGE plpgsql SECURITY DEFINER;/u);
  if (!match || normalizedBodyMd5(match[0].match(/\$\$([\s\S]*?)\$\$/u)?.[1] ?? '') !== 'f0397dc227d9cdee0f9045dfdd056121') {
    throw new Error('Production CLI matrix public February trigger source is unavailable or changed');
  }
  return match[0];
}
const FEBRUARY_TRIGGER_SQL = publicFebruaryTriggerSource();

function publicSource(path, expectedSha256) {
  const source = readFileSync(resolve(REPOSITORY_ROOT, path), 'utf8');
  if (sha256(source) !== expectedSha256) {
    throw new Error('Production CLI matrix public fixture source is unavailable or changed');
  }
  return source;
}
function extractPublicFunction(source, expression, label) {
  const match = source.match(expression);
  if (!match) throw new Error(`Production CLI matrix ${label} source is unavailable or changed`);
  return match[0];
}
const INITIAL_SCHEMA_SOURCE = publicSource(
  'supabase/migrations/20251027000000_initial_schema.sql',
  '8fe9902978d1c26acfddd410863951fe89e8baf22e0f3e68f9dec46306d93f44',
);
const INITIAL_TIMESTAMP_SQL = extractPublicFunction(
  INITIAL_SCHEMA_SOURCE,
  /CREATE OR REPLACE FUNCTION update_updated_at_column\(\)[\s\S]*?\$\$ LANGUAGE plpgsql;/u,
  'timestamp function',
);
if (normalizedBodyMd5(INITIAL_TIMESTAMP_SQL.match(/\$\$([\s\S]*?)\$\$/u)?.[1] ?? '') !== '45b9bb012d6413bfe2a994fcbebcc959') {
  throw new Error('Production CLI matrix timestamp function body is unavailable or changed');
}
const ROOM_FUNCTION_SOURCE = publicSource(
  'supabase/migrations/20251122150001_add_room_assignment_rpc.sql',
  '2f71ebd63689e3abc93c2d094596b1aa253920fe6ab8c7855c94a22d62d33fd7',
);
const RECALCULATE_ROOMS_SQL = extractPublicFunction(
  ROOM_FUNCTION_SOURCE,
  /CREATE OR REPLACE FUNCTION recalculate_rooms_for_date\([\s\S]*?\$\$ LANGUAGE plpgsql;/u,
  'recalculate rooms function',
);
const CALCULATE_ROOM_SQL = extractPublicFunction(
  ROOM_FUNCTION_SOURCE,
  /CREATE OR REPLACE FUNCTION calculate_room_number\([\s\S]*?\$\$ LANGUAGE plpgsql;/u,
  'calculate room function',
);

const BASE_EMPLOYEE_COLUMNS = new Set([
  'id','first_name','surname','ssn','email','mobile','rank','gender','town_district','hire_date',
  'termination_date','termination_reason','is_terminated','is_archived','comments','created_at','updated_at',
  'repayment_needed_omc','repayment_needed_pe3',
]);
const BOOTSTRAP_EMPLOYEE_COLUMNS = CONFIG_COLUMNS
  .filter((column) => !BASE_EMPLOYEE_COLUMNS.has(column))
  .map((column) => `  ${column} ${column === 'room_number_shared' || column === 'loneiva' ? 'integer' : ['stena_date','omc_date','pe3_date'].includes(column) ? 'uuid' : ['hire_date','termination_date'].includes(column) ? 'date' : ['one','isps','photo','origo','mail_lon','bankuppgifter','li','passport','kvitto_c17_18','c17','crewing_done','special_diet','hotel_required','candidate_confirmed','completed','is_anonymized'].includes(column) ? (column === 'special_diet' || column === 'crewing_done' ? 'boolean NOT NULL DEFAULT false' : 'boolean') : 'text'}`).join(',\n');

// Static, repository-owned bootstrap.  It creates an empty local schema; the
// fixture data is supplied separately by buildProductionCliMatrixFixture().
// It is intentionally never built from an encrypted capture or old migration.
export const PRODUCTION_CLI_MATRIX_BOOTSTRAP_SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS auth;
DO $$ BEGIN
  CREATE ROLE anon NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE ROLE service_role NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
$$;
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY, auth_user_id uuid UNIQUE, email text UNIQUE NOT NULL,
  role text NOT NULL, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), last_active_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY, first_name text NOT NULL, surname text NOT NULL, ssn text UNIQUE NOT NULL,
  email text, mobile text, rank text, gender text, town_district text, hire_date date NOT NULL,
  termination_date date, termination_reason text, is_terminated boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false, comments text, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), repayment_needed_omc boolean,
  repayment_needed_pe3 boolean,
${BOOTSTRAP_EMPLOYEE_COLUMNS}
);
CREATE TABLE IF NOT EXISTS public.column_config (
  id uuid PRIMARY KEY, column_name text NOT NULL, db_column_name text NOT NULL,
  column_type text NOT NULL, role_permissions jsonb NOT NULL, is_masterdata boolean NOT NULL,
  display_order integer NOT NULL, category text, category_color text
);
CREATE TABLE IF NOT EXISTS public.important_dates (
  id uuid PRIMARY KEY, updated_at timestamptz NOT NULL DEFAULT now(), deadline_submit text, deadline_cancel text
);
CREATE TABLE IF NOT EXISTS public.staffing_needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), location text NOT NULL UNIQUE CHECK (location IN ('Trelleborg','Göteborg')),
  headcount_need integer NOT NULL DEFAULT 0 CONSTRAINT staffing_needs_headcount_need_check CHECK (headcount_need >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid REFERENCES public.users(id)
);
CREATE TABLE IF NOT EXISTS public.staffing_needs_changelog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), location text NOT NULL, old_value integer NOT NULL,
  new_value integer NOT NULL, changed_by uuid NOT NULL REFERENCES public.users(id), changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_staffing_needs_changelog_location_date ON public.staffing_needs_changelog(location, changed_at);
CREATE TABLE IF NOT EXISTS public.user_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, name text NOT NULL, filters jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_filters_user_id_name_key UNIQUE (user_id, name),
  CONSTRAINT user_filters_name_check CHECK (char_length(name) <= 50)
);
CREATE INDEX IF NOT EXISTS idx_employees_repayment_omc ON public.employees(repayment_needed_omc);
CREATE INDEX IF NOT EXISTS idx_employees_repayment_pe3 ON public.employees(repayment_needed_pe3);
CREATE TABLE IF NOT EXISTS public.employee_column_changes (
  id uuid PRIMARY KEY, employee_id uuid NOT NULL REFERENCES public.employees(id), column_name text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(), changed_by uuid,
  CONSTRAINT employee_column_changes_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(auth_user_id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS employee_column_changes_employee_column_changed_at_key
  ON public.employee_column_changes(employee_id, column_name, changed_at);
CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE value text; BEGIN SELECT role INTO value FROM public.users WHERE auth_user_id=auth.uid() LIMIT 1; RETURN value; END $$;
-- Exact public initial function source, hash-bound above; this fixture does
-- not execute the historical migration.
${INITIAL_TIMESTAMP_SQL}
CREATE OR REPLACE FUNCTION public.update_user_filters_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;
-- Exact public February trigger source, hash-bound above; this fixture does
-- not execute the historical migration.
${FEBRUARY_TRIGGER_SQL}
-- Exact public room assignment definitions, hash-bound above; this fixture
-- declares the endpoint without replaying the historical migration.
${RECALCULATE_ROOMS_SQL}
${CALCULATE_ROOM_SQL}
GRANT EXECUTE ON FUNCTION public.recalculate_rooms_for_date(uuid), public.calculate_room_number(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_employee_column_changes() TO service_role;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_important_dates_updated_at BEFORE UPDATE ON public.important_dates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_track_employee_column_changes AFTER UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.track_employee_column_changes();
CREATE TRIGGER user_filters_updated_at BEFORE UPDATE ON public.user_filters FOR EACH ROW EXECUTE FUNCTION public.update_user_filters_updated_at();
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.column_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.important_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_column_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staffing_needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staffing_needs_changelog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_filters ENABLE ROW LEVEL SECURITY;
`;

function assertVariant(variant) {
  if (!MATRIX_FIXTURE_VARIANTS.includes(variant)) {
    throw new Error('Production CLI matrix fixture variant is unavailable');
  }
}

function configRows() {
  return CONFIG_COLUMNS.map((column, index) => {
    let permissions = canonicalPermissions;
    let type = 'text';
    let label = column.replaceAll('_', ' ');
    let order = index + 1;
    if (['one','isps','photo','origo','mail_lon','bankuppgifter','li','passport','kvitto_c17_18','c17','crewing_done','repayment_needed_omc','repayment_needed_pe3','special_diet','hotel_required','room_number_shared','candidate_confirmed','completed','is_anonymized'].includes(column)) type = 'boolean';
    if (['hire_date','termination_date','stena_date','omc_date','pe3_date'].includes(column)) type = 'date';
    if (column === 'loneiva' || column === 'room_number_shared') type = 'number';
    if (column === 'special_diet' || column === 'diet_details') { permissions = dietaryPermissions; label = column === 'special_diet' ? 'Specialkost' : 'Diet'; order = column === 'special_diet' ? 110 : 111; }
    if (column === 'crewing_done') { permissions = crewingDonePermissions; label = 'Crewing/Done'; order = 140; }
    if (column === 'repayment_needed_omc') { label = 'Återbetalningsskyldig ÖMC'; order = 141; }
    if (column === 'repayment_needed_pe3') { label = 'Återbetalningsskyldig PE3'; order = 142; }
    return `(${literal(uuid(`config/${column}`))}::uuid,${literal(label)},${literal(column)},${literal(type)},${literal(JSON.stringify(permissions))}::jsonb,true,${order})`;
  });
}

function employees() {
  return Array.from({ length: SYNTHETIC_AGGREGATES.employees }, (_, index) => {
    const state = index < 70 ? 'NULL' : index < 72 ? 'TRUE' : 'FALSE';
    return `(${literal(uuid(`employee/${index}`))}::uuid,${literal(`Seed${index + 1}`)},'Candidate',${literal(`900101-${String(1000 + index).slice(-4)}`)},'SEV','Man','2027-01-01'::date,${state},${state})`;
  });
}

function auditRows() {
  const legacyAuth = uuid('legacy-auth-user');
  return Array.from({ length: SYNTHETIC_AGGREGATES.auditRows }, (_, index) => {
    const timestamp = `2026-01-01T00:${String(Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}.${String(index).padStart(3, '0')}Z`;
    return `(${literal(uuid(`audit/${index}`))}::uuid,${literal(uuid(`employee/${index % SYNTHETIC_AGGREGATES.employees}`))}::uuid,${literal(`synthetic_column_${index}`)},${literal(timestamp)}::timestamptz,${index < 202 ? `${literal(legacyAuth)}::uuid` : 'NULL'})`;
  });
}

function filters(count) {
  return Array.from({ length: count }, (_, index) =>
    `(${literal(uuid(`filter/${index}`))}::uuid,${literal(uuid(`orphan-auth/${index}`))}::uuid,${literal(`Synthetic filter ${index + 1}`)},'[]'::jsonb)`,
  );
}

function importantDates() {
  return `(${literal(uuid('important-date/deadlines'))}::uuid,'2026-01-15T12:00:00Z'::timestamptz,'2027-02-01','2027-01-15')`;
}

function staffingChangelog(appUser) {
  return `(${literal(uuid('staffing-changelog/trelleborg'))}::uuid,'Trelleborg',8,10,${literal(appUser)}::uuid,'2026-01-16T12:00:00Z'::timestamptz)`;
}

/**
 * This SQL is a deterministic data/profile layer for a reviewed local
 * bootstrap schema.  It never reads a capture and does not run migrations.
 * The matrix harness supplies it only to a newly created guard-owned database.
 */
export function buildProductionCliMatrixFixture({ variant = 'observed_orphans_48' } = {}) {
  assertVariant(variant);
  const orphanCount = variant === 'observed_orphans_48' ? 48 : 0;
  const columnPresent = variant !== 'implicit_column_absent';
  const legacyAuth = uuid('legacy-auth-user');
  const appUser = uuid('legacy-app-user');
  const sql = [
    'BEGIN;',
    "SET LOCAL lock_timeout = '5s';",
    "SET LOCAL statement_timeout = '30s';",
    '-- Synthetic fixture only. No production capture, row, permission JSON, or identifier is used.',
    `ALTER TABLE public.column_config ${columnPresent ? 'ADD COLUMN IF NOT EXISTS is_checklist_item boolean NOT NULL DEFAULT false' : 'DROP COLUMN IF EXISTS is_checklist_item'};`,
    `INSERT INTO auth.users (id) VALUES (${literal(legacyAuth)}::uuid);`,
    `INSERT INTO public.users (id,auth_user_id,email,role,is_active) VALUES (${literal(appUser)}::uuid,${literal(legacyAuth)}::uuid,'synthetic-legacy-actor@example.invalid','hr_admin',true);`,
    `INSERT INTO public.employees (id,first_name,surname,ssn,rank,gender,hire_date,repayment_needed_omc,repayment_needed_pe3) VALUES\n${employees().join(',\n')};`,
    `INSERT INTO public.column_config (id,column_name,db_column_name,column_type,role_permissions,is_masterdata,display_order) VALUES\n${configRows().join(',\n')};`,
    `INSERT INTO public.important_dates (id,updated_at,deadline_submit,deadline_cancel) VALUES ${importantDates()};`,
    `INSERT INTO public.staffing_needs (id,location,headcount_need,updated_by) VALUES (${literal(uuid('staffing/trelleborg'))}::uuid,'Trelleborg',10,${literal(appUser)}::uuid),(${literal(uuid('staffing/goteborg'))}::uuid,'Göteborg',20,${literal(appUser)}::uuid);`,
    `INSERT INTO public.staffing_needs_changelog (id,location,old_value,new_value,changed_by,changed_at) VALUES ${staffingChangelog(appUser)};`,
    `INSERT INTO public.employee_column_changes (id,employee_id,column_name,changed_at,changed_by) VALUES\n${auditRows().join(',\n')};`,
    orphanCount === 0 ? '-- Declared zero-filter synthetic derivative.' : `INSERT INTO public.user_filters (id,user_id,name,filters) VALUES\n${filters(orphanCount).join(',\n')};`,
    'COMMIT;',
  ].join('\n');
  const physicalPredicates = Object.freeze({
    savedFilters: { total: orphanCount, orphanAuthReferences: orphanCount, emptyNames: 0, overlengthNames: 0 },
    implicitChecklistColumn: columnPresent
      ? { syntheticChoice: 'present', status: 'present_noop_possible', usableForHistoryClassification: false }
      : { syntheticChoice: 'absent', status: 'absent_before_apply', usableForHistoryClassification: true, afterApply: 'present_not_null_default_false' },
  });
  const representation = Object.freeze({
    schemaVersion: 1,
    kind: 'synthetic-production-cli-matrix-fixture',
    variant,
    sqlSha256: sha256(sql),
    bootstrapSqlSha256: sha256(PRODUCTION_CLI_MATRIX_BOOTSTRAP_SQL),
    aggregates: Object.freeze({ ...SYNTHETIC_AGGREGATES, savedFilters: orphanCount, savedFilterOrphans: orphanCount, savedFilterEmptyNames: 0, savedFilterOverlengthNames: 0 }),
    physicalPredicates,
    coverage: Object.freeze({
      syntheticOnly: true,
      productionRowsRead: false,
      productionPermissionJsonInferred: false,
      knownPermissionRows: Object.freeze(['special_diet', 'diet_details', 'crewing_done']),
      limitations: Object.freeze([
        'The remaining column_config permission maps, including repayment maps, are declared synthetic.',
        'Representation hashes detect fixture drift only; semantic acceptance requires fresh catalog and physical observations.',
        'Preservation projections cover the seeded public data rows only and are not a universal catalog or production-data proof.',
        'The observed and post-cleanup variants deliberately choose an existing is_checklist_item column, but this does not establish a production mapping; their implicit history-failure outcome is indeterminate.',
        'implicit_column_absent is a separate synthetic derivative and is not a production-profile representation.',
      ]),
    }),
  });
  return Object.freeze({ sql, representation });
}
