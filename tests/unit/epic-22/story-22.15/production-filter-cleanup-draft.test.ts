import { describe, expect, it } from 'vitest';

import {
  evaluateProductionFilterCleanupDraftReceipt,
  PRODUCTION_FILTER_CLEANUP_DRAFT_SQL,
  PRODUCTION_FILTER_CLEANUP_DRAFT_SQL_SHA256,
  PRODUCTION_FILTER_CLEANUP_EXPECTED,
  verifyProductionFilterCleanupDraftSource,
} from '../../../../src/lib/release/production-filter-cleanup-draft.mjs';

const receipt = () => JSON.stringify({
  schemaVersion: 1,
  kind: 'production-filter-cleanup-draft',
  committedCleanupTransaction: true,
  transactionAssertedDeletedCount: 48,
  ...PRODUCTION_FILTER_CLEANUP_EXPECTED,
});

const nestedRecord = (value: Record<string, unknown>, key: string) =>
  value[key] as Record<string, unknown>;

describe('Story 22.15 production filter cleanup draft', () => {
  it('hash-binds the fixed two-phase SQL source', () => {
    expect(PRODUCTION_FILTER_CLEANUP_DRAFT_SQL_SHA256).toMatch(/^[a-f0-9]{64}$/u);
    expect(verifyProductionFilterCleanupDraftSource()).toBe(true);
    expect(() => verifyProductionFilterCleanupDraftSource(`${PRODUCTION_FILTER_CLEANUP_DRAFT_SQL}-- drift`))
      .toThrow('production_filter_cleanup_source_integrity_invalid');
    expect(PRODUCTION_FILTER_CLEANUP_DRAFT_SQL).not.toMatch(/^\\\\/mu);
  });

  it('locks the target and preservation relations, validates the exact orphan set, and deletes only its materialized target', () => {
    expect(PRODUCTION_FILTER_CLEANUP_DRAFT_SQL).toContain('BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;');
    for (const relation of [
      'public.user_filters IN ACCESS EXCLUSIVE MODE',
      'auth.users IN SHARE MODE',
      'public.users IN SHARE MODE',
      'public.employee_column_changes IN SHARE MODE',
      'public.employees IN SHARE MODE',
      'public.column_config IN SHARE MODE',
      'public.staffing_needs IN SHARE MODE',
    ]) {
      expect(PRODUCTION_FILTER_CLEANUP_DRAFT_SQL).toContain(`LOCK TABLE ${relation};`);
    }
    expect(PRODUCTION_FILTER_CLEANUP_DRAFT_SQL).toContain("WHERE NOT EXISTS (\n  SELECT 1\n  FROM auth.users AS auth_user");
    expect(PRODUCTION_FILTER_CLEANUP_DRAFT_SQL).toContain('story_2215_filter_cleanup_precondition_drift');
    expect(PRODUCTION_FILTER_CLEANUP_DRAFT_SQL).toContain('story_2215_filter_cleanup_target');
    expect(PRODUCTION_FILTER_CLEANUP_DRAFT_SQL).toContain('DELETE FROM public.user_filters AS saved_filter\n  USING pg_temp.story_2215_filter_cleanup_target AS target');
    expect(PRODUCTION_FILTER_CLEANUP_DRAFT_SQL).toContain('story_2215_filter_cleanup_delete_count_drift');
    expect(PRODUCTION_FILTER_CLEANUP_DRAFT_SQL).toContain("count(*) FILTER (WHERE db_column_name IS NULL)::bigint");
    expect(PRODUCTION_FILTER_CLEANUP_DRAFT_SQL).toContain("coalesce(jsonb_typeof(role_permissions), 'null') <> 'object'");
  });

  it('commits the single cleanup transaction before independently proving a zero-filter postcondition and preservation aggregates', () => {
    expect(PRODUCTION_FILTER_CLEANUP_DRAFT_SQL).toMatch(
      /story_2215_filter_cleanup_delete_count_drift[\s\S]*?COMMIT;[\s\S]*?BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;/u
    );
    expect(PRODUCTION_FILTER_CLEANUP_DRAFT_SQL).toContain('story_2215_filter_cleanup_postcondition_drift');
    expect(PRODUCTION_FILTER_CLEANUP_DRAFT_SQL).toContain('story_2215_filter_cleanup_post_preservation_drift');
    expect(PRODUCTION_FILTER_CLEANUP_DRAFT_SQL).toContain('4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945');
  });

  it('accepts only the fixed redacted receipt and keeps it evidence-only', () => {
    expect(evaluateProductionFilterCleanupDraftReceipt(receipt())).toMatchObject({
      disposition: 'verified_cleanup_receipt_not_authorization',
      authorizesCleanup: false,
      authorizesMigrationApply: false,
      transactionAssertedDeletedCount: 48,
    });
  });

  it('accepts one receipt surrounded by actual line breaks, while rejecting a second nonblank line', () => {
    expect(evaluateProductionFilterCleanupDraftReceipt(`\n${receipt()}\r\n`)).toMatchObject({
      disposition: 'verified_cleanup_receipt_not_authorization',
    });
    expect(() => evaluateProductionFilterCleanupDraftReceipt(`${receipt()}\n${receipt()}`))
      .toThrow('production_filter_cleanup_receipt_invalid');
  });

  it.each([
    ['wrong deleted count', (value: Record<string, unknown>) => { value.transactionAssertedDeletedCount = 47; }],
    ['a valid saved filter in the target snapshot', (value: Record<string, unknown>) => { nestedRecord(value, 'preCleanup').orphanAuthReferenceCount = 47; }],
    ['an empty saved-filter name in the target snapshot', (value: Record<string, unknown>) => { nestedRecord(value, 'preCleanup').emptyNameCount = 1; }],
    ['an overlength saved-filter name in the target snapshot', (value: Record<string, unknown>) => { nestedRecord(value, 'preCleanup').overlengthNameCount = 1; }],
    ['a remaining filter', (value: Record<string, unknown>) => { nestedRecord(value, 'postCleanup').totalCount = 1; }],
    ['a remaining orphan after the committed transaction', (value: Record<string, unknown>) => { nestedRecord(value, 'postCleanup').orphanAuthReferenceCount = 1; }],
    ['a changed orphan identity', (value: Record<string, unknown>) => { nestedRecord(value, 'preCleanup').rowIdentitySha256 = '0'.repeat(64); }],
    ['a preservation change', (value: Record<string, unknown>) => { nestedRecord(nestedRecord(value, 'preservation'), 'audit').rowCount = 1024; }],
    ['an unexpected receipt field', (value: Record<string, unknown>) => { value.authorized = true; }],
  ])('rejects %s', (_label, mutate) => {
    const value = JSON.parse(receipt());
    mutate(value);
    expect(() => evaluateProductionFilterCleanupDraftReceipt(JSON.stringify(value)))
      .toThrow('production_filter_cleanup_receipt_invalid');
  });

  it.each([
    '',
    '{',
    JSON.stringify({ kind: 'production-filter-cleanup-draft' }),
  ])('rejects malformed or incomplete output', (value) => {
    expect(() => evaluateProductionFilterCleanupDraftReceipt(value))
      .toThrow('production_filter_cleanup_receipt_invalid');
  });
});
