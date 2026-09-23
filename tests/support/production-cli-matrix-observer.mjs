import { createHash } from 'node:crypto';

const hash = (value) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

// The local runner returns only this closed projection. It never returns rows,
// permissions, audit entries, actor mappings, or arbitrary catalog values.
// Its catalog scope is deliberately limited to public base/partitioned tables
// and their directly associated public metadata; it is not a universal database
// catalog proof.
export const MATRIX_CATALOG_SNAPSHOT_SQL = `SELECT jsonb_build_object(
 'relations',coalesce((SELECT jsonb_agg(x ORDER BY x.table_name) FROM
   (SELECT r.relname table_name,r.relkind table_kind,r.relrowsecurity row_security,
     r.relforcerowsecurity force_row_security,pg_get_userbyid(r.relowner) owner,r.relacl::text table_acl
    FROM pg_class r JOIN pg_namespace n ON n.oid=r.relnamespace
    WHERE n.nspname='public' AND r.relkind IN ('r','p')) x), '[]'::jsonb),
 'columns', coalesce((SELECT jsonb_agg(x ORDER BY x.table_name,x.ordinal_position) FROM
   (SELECT table_name,column_name,ordinal_position,data_type,is_nullable,column_default
    FROM information_schema.columns WHERE table_schema='public') x), '[]'::jsonb),
 'constraints',coalesce((SELECT jsonb_agg(x ORDER BY x.table_name,x.name) FROM
   (SELECT r.relname table_name,c.conname name,pg_get_constraintdef(c.oid) definition,c.convalidated validated
    FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public') x), '[]'::jsonb),
 'indexes',coalesce((SELECT jsonb_agg(x ORDER BY x.tablename,x.indexname) FROM
   (SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public') x), '[]'::jsonb),
 'functions',coalesce((SELECT jsonb_agg(x ORDER BY x.signature) FROM
   (SELECT p.oid::regprocedure::text signature,pg_get_functiondef(p.oid) definition,p.proacl::text acl,
     pg_get_userbyid(p.proowner) owner FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.prokind IN ('f','p')) x), '[]'::jsonb),
 'triggers',coalesce((SELECT jsonb_agg(x ORDER BY x.table_name,x.name) FROM
   (SELECT c.relname table_name,t.tgname name,pg_get_triggerdef(t.oid) definition,t.tgenabled enabled,
     t.tgfoid::regprocedure::text function_signature
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND NOT t.tgisinternal) x), '[]'::jsonb),
 'policies',coalesce((SELECT jsonb_agg(x ORDER BY x.tablename,x.policyname) FROM
   (SELECT tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public') x), '[]'::jsonb)
) AS state;`;

export const MATRIX_PRESERVATION_SQL = `SELECT jsonb_build_object(
 'employees',coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id) FROM public.employees e), '[]'::jsonb),
 'users',coalesce((SELECT jsonb_agg(to_jsonb(u) ORDER BY u.id) FROM public.users u), '[]'::jsonb),
 'important_dates',coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.id) FROM public.important_dates d), '[]'::jsonb),
 'staffing_needs',coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id) FROM public.staffing_needs s), '[]'::jsonb),
 'staffing_needs_changelog',coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.id) FROM public.staffing_needs_changelog c), '[]'::jsonb),
 'permissions',coalesce((SELECT jsonb_agg(jsonb_build_array(c.id,c.db_column_name,c.role_permissions) ORDER BY c.id) FROM public.column_config c), '[]'::jsonb),
 'filters',coalesce((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.id) FROM public.user_filters f), '[]'::jsonb),
 'audit',coalesce((SELECT jsonb_agg(jsonb_build_array(c.id,c.employee_id,c.column_name,c.changed_at,
    CASE WHEN c.changed_by IS NULL THEN NULL ELSE
      (SELECT u.id FROM public.users u WHERE u.id=c.changed_by OR u.auth_user_id=c.changed_by) END) ORDER BY c.id)
    FROM public.employee_column_changes c), '[]'::jsonb),
 'unmapped_actors',(SELECT count(*) FROM public.employee_column_changes c WHERE c.changed_by IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM public.users u WHERE u.id=c.changed_by OR u.auth_user_id=c.changed_by))
) AS state;`;

export const MATRIX_AGGREGATES_SQL = `SELECT jsonb_build_object(
 'employees',(SELECT count(*) FROM public.employees),
 'auditRows',(SELECT count(*) FROM public.employee_column_changes),
 'auditNonNullActors',(SELECT count(*) FROM public.employee_column_changes WHERE changed_by IS NOT NULL),
 'auditDistinctNonNullActors',(SELECT count(DISTINCT changed_by) FROM public.employee_column_changes WHERE changed_by IS NOT NULL),
 'columnConfig',(SELECT count(*) FROM public.column_config),
 'staffingLocations',(SELECT count(*) FROM public.staffing_needs),
 'savedFilters',(SELECT count(*) FROM public.user_filters),
 'savedFilterOrphans',(SELECT count(*) FROM public.user_filters f WHERE NOT EXISTS(SELECT 1 FROM auth.users a WHERE a.id=f.user_id)),
 'savedFilterEmptyNames',(SELECT count(*) FROM public.user_filters WHERE char_length(name)=0),
 'savedFilterOverlengthNames',(SELECT count(*) FROM public.user_filters WHERE char_length(name)>50),
 'repayment',(SELECT jsonb_build_object('omcNull',count(*) FILTER(WHERE repayment_needed_omc IS NULL),
   'omcTrue',count(*) FILTER(WHERE repayment_needed_omc IS TRUE),'omcFalse',count(*) FILTER(WHERE repayment_needed_omc IS FALSE),
   'pe3Null',count(*) FILTER(WHERE repayment_needed_pe3 IS NULL),'pe3True',count(*) FILTER(WHERE repayment_needed_pe3 IS TRUE),
   'pe3False',count(*) FILTER(WHERE repayment_needed_pe3 IS FALSE)) FROM public.employees)
) AS counts;`;

const CATALOG_KEYS = Object.freeze([
  'relations',
  'columns',
  'constraints',
  'indexes',
  'functions',
  'triggers',
  'policies',
]);
const AGGREGATE_KEYS = Object.freeze([
  'employees',
  'auditRows',
  'auditNonNullActors',
  'auditDistinctNonNullActors',
  'columnConfig',
  'staffingLocations',
  'savedFilters',
  'savedFilterOrphans',
  'savedFilterEmptyNames',
  'savedFilterOverlengthNames',
  'repayment',
]);
const REPAYMENT_KEYS = Object.freeze([
  'omcNull',
  'omcTrue',
  'omcFalse',
  'pe3Null',
  'pe3True',
  'pe3False',
]);

const isRecord = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const hasExactKeys = (value, keys) =>
  isRecord(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));
const isCount = (value) => Number.isSafeInteger(value) && value >= 0;
const isNullableString = (value) => value === null || typeof value === 'string';
const isStringArray = (value) =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');
const isPublicRelationName = (value) =>
  typeof value === 'string' && /^[a-z_][a-z0-9_]{0,62}$/u.test(value);

function assertCatalogEntry(kind, entry) {
  if (!isRecord(entry)) throw new Error('Incomplete local matrix catalog');

  const valid = {
    relations:
      hasExactKeys(entry, [
        'table_name',
        'table_kind',
        'row_security',
        'force_row_security',
        'owner',
        'table_acl',
      ]) &&
      isPublicRelationName(entry.table_name) &&
      ['r', 'p'].includes(entry.table_kind) &&
      typeof entry.row_security === 'boolean' &&
      typeof entry.force_row_security === 'boolean' &&
      typeof entry.owner === 'string' &&
      isNullableString(entry.table_acl),
    columns:
      hasExactKeys(entry, [
        'table_name',
        'column_name',
        'ordinal_position',
        'data_type',
        'is_nullable',
        'column_default',
      ]) &&
      isPublicRelationName(entry.table_name) &&
      typeof entry.column_name === 'string' &&
      Number.isSafeInteger(entry.ordinal_position) &&
      entry.ordinal_position > 0 &&
      typeof entry.data_type === 'string' &&
      typeof entry.is_nullable === 'string' &&
      isNullableString(entry.column_default),
    constraints:
      hasExactKeys(entry, ['table_name', 'name', 'definition', 'validated']) &&
      isPublicRelationName(entry.table_name) &&
      typeof entry.name === 'string' &&
      typeof entry.definition === 'string' &&
      typeof entry.validated === 'boolean',
    indexes:
      hasExactKeys(entry, ['tablename', 'indexname', 'indexdef']) &&
      isPublicRelationName(entry.tablename) &&
      typeof entry.indexname === 'string' &&
      typeof entry.indexdef === 'string',
    functions:
      hasExactKeys(entry, ['signature', 'definition', 'acl', 'owner']) &&
      typeof entry.signature === 'string' &&
      typeof entry.definition === 'string' &&
      isNullableString(entry.acl) &&
      typeof entry.owner === 'string',
    triggers:
      hasExactKeys(entry, [
        'table_name',
        'name',
        'definition',
        'enabled',
        'function_signature',
      ]) &&
      isPublicRelationName(entry.table_name) &&
      typeof entry.name === 'string' &&
      typeof entry.definition === 'string' &&
      typeof entry.enabled === 'string' &&
      typeof entry.function_signature === 'string',
    policies:
      hasExactKeys(entry, [
        'tablename',
        'policyname',
        'permissive',
        'roles',
        'cmd',
        'qual',
        'with_check',
      ]) &&
      isPublicRelationName(entry.tablename) &&
      typeof entry.policyname === 'string' &&
      typeof entry.permissive === 'string' &&
      isStringArray(entry.roles) &&
      typeof entry.cmd === 'string' &&
      isNullableString(entry.qual) &&
      isNullableString(entry.with_check),
  }[kind];

  if (!valid) throw new Error('Incomplete local matrix catalog');
}

function assertCatalog(catalog) {
  if (!hasExactKeys(catalog, CATALOG_KEYS)) {
    throw new Error('Incomplete local matrix catalog');
  }
  for (const key of CATALOG_KEYS) {
    if (!Array.isArray(catalog[key])) {
      throw new Error('Incomplete local matrix catalog');
    }
    catalog[key].forEach((entry) => assertCatalogEntry(key, entry));
  }
}

function assertAggregates(aggregates) {
  if (!hasExactKeys(aggregates, AGGREGATE_KEYS)) {
    throw new Error('Incomplete local matrix aggregates');
  }
  for (const key of AGGREGATE_KEYS) {
    if (key !== 'repayment' && !isCount(aggregates[key])) {
      throw new Error('Incomplete local matrix aggregates');
    }
  }
  if (
    !hasExactKeys(aggregates.repayment, REPAYMENT_KEYS) ||
    !REPAYMENT_KEYS.every((key) => isCount(aggregates.repayment[key]))
  ) {
    throw new Error('Incomplete local matrix aggregates');
  }
}

function assertPreservationSnapshot(preservation) {
  if (
    !hasExactKeys(preservation, [
      'employees',
      'users',
      'important_dates',
      'staffing_needs',
      'staffing_needs_changelog',
      'permissions',
      'filters',
      'audit',
      'unmapped_actors',
    ]) ||
    ![
      'employees',
      'users',
      'important_dates',
      'staffing_needs',
      'staffing_needs_changelog',
      'permissions',
      'filters',
      'audit',
    ].every((key) =>
      Array.isArray(preservation[key])
    ) ||
    !isCount(preservation.unmapped_actors)
  ) {
    throw new Error('Incomplete local matrix preservation snapshot');
  }
  if (
    !preservation.employees.every(isRecord) ||
    !preservation.users.every(isRecord) ||
    !preservation.important_dates.every(isRecord) ||
    !preservation.staffing_needs.every(isRecord) ||
    !preservation.staffing_needs_changelog.every(isRecord) ||
    !preservation.filters.every(isRecord) ||
    !preservation.permissions.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.length === 3 &&
        typeof entry[0] === 'string' &&
        typeof entry[1] === 'string' &&
        isRecord(entry[2])
    ) ||
    !preservation.audit.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.length === 5 &&
        entry.slice(0, 4).every((value) => typeof value === 'string') &&
        isNullableString(entry[4])
    )
  ) {
    throw new Error('Incomplete local matrix preservation snapshot');
  }
}

function projectApprovedCounts(aggregates, preservation) {
  return Object.freeze({
    employees: aggregates.employees,
    auditRows: aggregates.auditRows,
    auditNonNullActors: aggregates.auditNonNullActors,
    auditDistinctNonNullActors: aggregates.auditDistinctNonNullActors,
    unmappedActors: preservation.unmapped_actors,
    columnConfig: aggregates.columnConfig,
    staffingLocations: aggregates.staffingLocations,
    savedFilters: aggregates.savedFilters,
    savedFilterOrphans: aggregates.savedFilterOrphans,
    savedFilterEmptyNames: aggregates.savedFilterEmptyNames,
    savedFilterOverlengthNames: aggregates.savedFilterOverlengthNames,
    repayment: Object.freeze({ ...aggregates.repayment }),
  });
}

export function projectMatrixObservation({
  catalog,
  preservation,
  aggregates,
  history,
}) {
  if (
    !Array.isArray(history) ||
    !history.every(
      (value, index) =>
        typeof value === 'string' &&
        /^\d{14}$/u.test(value) &&
        (index === 0 || history[index - 1] < value)
    )
  ) {
    throw new Error('Incomplete local matrix observation');
  }
  assertCatalog(catalog);
  assertPreservationSnapshot(preservation);
  assertAggregates(aggregates);

  const headcount = catalog.constraints.filter(
    (constraint) =>
      constraint.table_name === 'staffing_needs' &&
      constraint.name === 'staffing_needs_headcount_need_check'
  );
  const checklist = catalog.columns.filter(
    (column) =>
      column.table_name === 'column_config' &&
      column.column_name === 'is_checklist_item'
  );
  const userFilterFunctionSignatures = new Set(
    catalog.triggers
      .filter((trigger) => trigger.table_name === 'user_filters')
      .map((trigger) => trigger.function_signature)
  );
  const filterCatalog = Object.fromEntries(
    ['columns', 'constraints', 'indexes', 'triggers', 'policies']
      .map((key) => [
        key,
        catalog[key].filter(
          (item) =>
            item.table_name === 'user_filters' ||
            item.tablename === 'user_filters'
        ),
      ])
      .concat([
        [
          'functions',
          catalog.functions.filter((fn) =>
            userFilterFunctionSignatures.has(fn.signature)
          ),
        ],
      ])
  );
  const nonCurrentHeadcountCatalog = {
    ...catalog,
    constraints: catalog.constraints.filter(
      (constraint) =>
        !(
          constraint.table_name === 'staffing_needs' &&
          constraint.name === 'staffing_needs_headcount_need_check'
        )
    ),
  };
  const nonCurrentChecklistCatalog = {
    ...catalog,
    columns: catalog.columns.filter(
      (column) =>
        !(
          column.table_name === 'column_config' &&
          column.column_name === 'is_checklist_item'
        )
    ),
  };

  return Object.freeze({
    complete: true,
    history: Object.freeze([...history]),
    historyCount: history.length,
    historySha256: hash(history),
    catalogSha256: hash(catalog),
    preservationSha256: hash(preservation),
    savedFilterSha256: hash(filterCatalog),
    headcountSha256: hash(headcount),
    nonCurrentHeadcountSha256: hash(nonCurrentHeadcountCatalog),
    checklistSha256: hash(checklist),
    nonCurrentChecklistSha256: hash(nonCurrentChecklistCatalog),
    headcountPostcondition:
      headcount.length === 1 &&
      headcount[0].validated === true &&
      headcount[0].definition ===
        'CHECK (((headcount_need >= 0) AND (headcount_need <= 9999)))',
    checklistPostcondition:
      checklist.length === 1 &&
      checklist[0].data_type === 'boolean' &&
      checklist[0].is_nullable === 'NO' &&
      checklist[0].column_default === 'false',
    counts: projectApprovedCounts(aggregates, preservation),
  });
}
