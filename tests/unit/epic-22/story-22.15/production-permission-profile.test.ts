import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  canonicalPostgresJsonb,
  KNOWN_ROLES,
  REPAYMENT_COLUMNS,
  validatePermissionProfile,
} from '../../../../src/lib/release/production-permission-profile.mjs';

type Permission = { view: boolean; edit: boolean };

type RolePredicate = {
  role_present: boolean;
  role_is_object: boolean;
  key_count: number | null;
  unknown_predicate_key_count: number | null;
  view_is_boolean: boolean;
  view: boolean | null;
  edit_is_boolean: boolean;
  edit: boolean | null;
};

type ColumnProfile = {
  row_count: number;
  role_permissions_is_object: boolean;
  role_key_count: number | null;
  unknown_role_count: number | null;
  role_permissions_sha256: string | null;
  role_predicates: Record<string, RolePredicate>;
};

type PermissionProfile = {
  draft: boolean;
  executable: boolean;
  permissionBaseline: {
    rowCount: number;
    distinctColumnCount: number;
    nullColumnCount: number;
    nonObjectCount: number;
    unknownRoleEntryCount: number;
    invalidKnownRoleContractCount: number;
    rowsSha256: string;
  };
  columns: Record<string, ColumnProfile>;
};

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

function presentRole(view: boolean, edit: boolean): RolePredicate {
  return {
    role_present: true,
    role_is_object: true,
    key_count: 2,
    unknown_predicate_key_count: 0,
    view_is_boolean: true,
    view,
    edit_is_boolean: true,
    edit,
  };
}

function absentRole(): RolePredicate {
  return {
    role_present: false,
    role_is_object: false,
    key_count: null,
    unknown_predicate_key_count: null,
    view_is_boolean: false,
    view: null,
    edit_is_boolean: false,
    edit: null,
  };
}

function permissions(roles: readonly string[]): Record<string, Permission> {
  return Object.fromEntries(roles.map((role) => [role, {
    view: role === 'hr_admin' || role === 'recruiter',
    edit: role === 'hr_admin' || role === 'recruiter',
  }]));
}

function columnProfile(roles: readonly string[]): ColumnProfile {
  const map = permissions(roles);
  return {
    row_count: 1,
    role_permissions_is_object: true,
    role_key_count: roles.length,
    unknown_role_count: 0,
    role_permissions_sha256: sha256(canonicalPostgresJsonb(map)),
    role_predicates: Object.fromEntries(KNOWN_ROLES.map((role) => [
      role,
      map[role] ? presentRole(map[role].view, map[role].edit) : absentRole(),
    ])),
  };
}

function profile(): PermissionProfile {
  return {
    draft: true,
    executable: false,
    permissionBaseline: {
      rowCount: 61,
      distinctColumnCount: 61,
      nullColumnCount: 0,
      nonObjectCount: 0,
      unknownRoleEntryCount: 0,
      invalidKnownRoleContractCount: 0,
      rowsSha256: 'a'.repeat(64),
    },
    columns: {
      repayment_needed_omc: columnProfile(['hr_admin', 'recruiter', 'payroll', 'admin_limited']),
      repayment_needed_pe3: columnProfile(['hr_admin', 'recruiter', 'omc', 'payroll', 'admin_limited']),
    },
  };
}

describe('Story 22.15 production repayment permission profile', () => {
  it('reconstructs the observed four- and five-role shapes and verifies server jsonb hashes', () => {
    const raw = profile();
    const result = validatePermissionProfile(raw);

    expect(Object.keys(raw.columns)).toEqual(REPAYMENT_COLUMNS);
    expect(Object.keys(result.permissions.repayment_needed_omc)).toHaveLength(4);
    expect(Object.keys(result.permissions.repayment_needed_pe3)).toHaveLength(5);
    expect(result.canonicalPermissionSha256.repayment_needed_omc)
      .toBe(raw.columns.repayment_needed_omc.role_permissions_sha256);
    expect(canonicalPostgresJsonb({
      omc: { view: false, edit: false },
      hr_admin: { view: true, edit: true },
    })).toBe('{"omc": {"edit": false, "view": false}, "hr_admin": {"edit": true, "view": true}}');
  });

  it('permits an absent known role only in the strict all-null absence representation', () => {
    const raw = profile();
    expect(validatePermissionProfile(raw).permissions.repayment_needed_omc).not.toHaveProperty('omc');
    raw.columns.repayment_needed_omc.role_predicates.omc.view = false;
    expect(() => validatePermissionProfile(raw)).toThrow('permission_absent_predicate_invalid');
  });

  it.each([
    ['unknown role entries', (raw: PermissionProfile) => { raw.columns.repayment_needed_omc.unknown_role_count = 1; }, 'permission_role_map_invalid'],
    ['nested predicate keys', (raw: PermissionProfile) => {
      raw.columns.repayment_needed_omc.role_predicates.hr_admin.key_count = 3;
      raw.columns.repayment_needed_omc.role_predicates.hr_admin.unknown_predicate_key_count = 1;
    }, 'permission_predicate_invalid'],
    ['malformed boolean predicates', (raw: PermissionProfile) => {
      raw.columns.repayment_needed_omc.role_predicates.hr_admin.view_is_boolean = false;
      raw.columns.repayment_needed_omc.role_predicates.hr_admin.view = null;
    }, 'permission_predicate_invalid'],
    ['missing configuration row', (raw: PermissionProfile) => { raw.columns.repayment_needed_pe3.row_count = 0; }, 'permission_duplicate_or_missing_column'],
    ['duplicate configuration row', (raw: PermissionProfile) => { raw.columns.repayment_needed_pe3.row_count = 2; }, 'permission_duplicate_or_missing_column'],
    ['hash mismatch', (raw: PermissionProfile) => { raw.columns.repayment_needed_pe3.role_permissions_sha256 = '0'.repeat(64); }, 'permission_canonical_hash_mismatch_repayment_needed_pe3'],
  ])('rejects %s', (_label, mutate, error) => {
    const raw = profile();
    mutate(raw);
    expect(() => validatePermissionProfile(raw)).toThrow(error);
  });

  it.each([
    ['row count', (raw: PermissionProfile) => { raw.permissionBaseline.rowCount = 60; }],
    ['duplicate names', (raw: PermissionProfile) => { raw.permissionBaseline.distinctColumnCount = 60; }],
    ['null permissions', (raw: PermissionProfile) => { raw.permissionBaseline.nullColumnCount = 1; }],
    ['non-object permissions', (raw: PermissionProfile) => { raw.permissionBaseline.nonObjectCount = 1; }],
    ['unknown baseline roles', (raw: PermissionProfile) => { raw.permissionBaseline.unknownRoleEntryCount = 1; }],
    ['invalid baseline role contracts', (raw: PermissionProfile) => { raw.permissionBaseline.invalidKnownRoleContractCount = 1; }],
  ])('rejects a baseline with invalid %s', (_label, mutate) => {
    const raw = profile();
    mutate(raw);
    expect(() => validatePermissionProfile(raw)).toThrow('permission_baseline_contract_invalid');
  });

  it('keeps the repository collector read-only and limited to its fixed scope', () => {
    const sql = readFileSync(resolve('supabase/verify/production-permission-profile.sql'), 'utf8');
    const withoutLeadingComments = sql.replace(/^(?:\s*--[^\r\n]*(?:\r?\n|$))*/u, '');
    expect(withoutLeadingComments).toMatch(/^BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;/u);
    expect(sql).toMatch(/ROLLBACK;\s*$/u);
    expect(sql.match(/\('repayment_needed_(?:omc|pe3)'\)/gu)).toHaveLength(2);
    expect(sql.match(/\('(hr_admin|recruiter|sodexo|omc|payroll|toplux|crewing|admin_limited)'\)/gu)).toHaveLength(8);
    const executable = sql.replace(/--[^\r\n]*/gu, '').replace(/'(?:''|[^'])*'/gu, "''");
    expect(executable).not.toMatch(/\b(?:insert|update|delete|alter|create|drop|grant|revoke|truncate|copy|call|do)\b/iu);
  });

  it('does not accept arbitrary profile fields or raw values', () => {
    const raw = profile();
    raw.columns.repayment_needed_omc.role_predicates.omc = {
      ...raw.columns.repayment_needed_omc.role_predicates.omc,
      value: 'unredacted',
    } as RolePredicate;
    expect(() => validatePermissionProfile(raw)).toThrow('permission_predicate_shape_invalid');

    const withExtraField = profile() as PermissionProfile & { unexpected?: boolean };
    withExtraField.unexpected = true;
    expect(() => validatePermissionProfile(withExtraField)).toThrow('permission_profile_shape_invalid');
  });
});
