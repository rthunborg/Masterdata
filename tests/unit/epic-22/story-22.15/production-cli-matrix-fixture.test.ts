import { describe, expect, it } from 'vitest';

import {
  FORWARD_VERSIONS,
  MATRIX_FIXTURE_VARIANTS,
  PRODUCTION_CLI_MATRIX_BOOTSTRAP_SQL,
  SYNTHETIC_AGGREGATES,
  buildProductionCliMatrixFixture,
} from '../../../support/production-cli-matrix-fixture.mjs';

describe('Story 22.15 deterministic production CLI matrix fixture', () => {
  it('declares the exact immutable thirteen-version sequence', () => {
    expect(FORWARD_VERSIONS).toHaveLength(13);
    expect(FORWARD_VERSIONS).toEqual([...FORWARD_VERSIONS].sort());
  });

  it('builds a deterministic observed synthetic profile with the declared orphan boundary', () => {
    const first = buildProductionCliMatrixFixture();
    const second = buildProductionCliMatrixFixture();
    expect(first.sql).toBe(second.sql);
    expect(first.representation.sqlSha256).toBe(second.representation.sqlSha256);
    expect(first.representation.aggregates).toMatchObject({
      ...SYNTHETIC_AGGREGATES, savedFilters: 48, savedFilterOrphans: 48,
    });
    expect(first.representation.physicalPredicates.savedFilters).toEqual({
      total: 48, orphanAuthReferences: 48, emptyNames: 0, overlengthNames: 0,
    });
    expect(first.sql).toContain('Synthetic filter 48');
    expect(first.sql).toContain('synthetic-legacy-actor@example.invalid');
    expect(first.representation.bootstrapSqlSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('keeps the zero-filter derivative explicit and prevents it from being mistaken for cleanup proof', () => {
    const fixture = buildProductionCliMatrixFixture({ variant: 'postcleanup_zero_filters' });
    expect(fixture.representation.aggregates.savedFilters).toBe(0);
    expect(fixture.sql).toContain('Declared zero-filter synthetic derivative');
    expect(fixture.sql).not.toContain('INSERT INTO public.user_filters');
    expect(fixture.representation.coverage.limitations.join(' ')).toContain('semantic acceptance');
  });

  it('separates the column-absent implicit-history probe from representative variants', () => {
    const observed = buildProductionCliMatrixFixture({ variant: 'observed_orphans_48' });
    const implicit = buildProductionCliMatrixFixture({ variant: 'implicit_column_absent' });
    expect(observed.representation.physicalPredicates.implicitChecklistColumn).toEqual({
      syntheticChoice: 'present', status: 'present_noop_possible', usableForHistoryClassification: false,
    });
    expect(implicit.representation.physicalPredicates.implicitChecklistColumn).toEqual({
      syntheticChoice: 'absent', status: 'absent_before_apply', usableForHistoryClassification: true, afterApply: 'present_not_null_default_false',
    });
    expect(implicit.sql).toContain('DROP COLUMN IF EXISTS is_checklist_item');
    expect(implicit.representation.coverage.limitations.join(' ')).toContain('not a production-profile representation');
  });

  it.each(['', 'unknown', 'observed_orphans_49'])(
    'rejects an unavailable fixture variant: %p',
    (variant) => expect(() => buildProductionCliMatrixFixture({ variant })).toThrow('Production CLI matrix fixture variant is unavailable'),
  );

  it('makes fixture scope finite and contains no private loader dependency', () => {
    const fixture = buildProductionCliMatrixFixture();
    expect(MATRIX_FIXTURE_VARIANTS).toEqual(['observed_orphans_48', 'postcleanup_zero_filters', 'implicit_column_absent']);
    expect(fixture.sql).not.toMatch(/load-private|encrypted|production-schema|supabase\.co/i);
    expect(fixture.representation.coverage.productionRowsRead).toBe(false);
    expect(fixture.representation.coverage.productionPermissionJsonInferred).toBe(false);
    expect(fixture.representation.coverage.knownPermissionRows).toEqual(['special_diet', 'diet_details', 'crewing_done']);
    expect(PRODUCTION_CLI_MATRIX_BOOTSTRAP_SQL).toContain('CREATE TABLE IF NOT EXISTS public.employee_column_changes');
    expect(PRODUCTION_CLI_MATRIX_BOOTSTRAP_SQL).toContain('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    expect(PRODUCTION_CLI_MATRIX_BOOTSTRAP_SQL).toContain('REFERENCES public.users(auth_user_id)');
  });
});
