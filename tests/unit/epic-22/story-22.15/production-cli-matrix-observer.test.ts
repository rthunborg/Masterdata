import { describe, expect, it } from 'vitest';

import {
  MATRIX_CATALOG_SNAPSHOT_SQL,
  MATRIX_PRESERVATION_SQL,
  projectMatrixObservation,
} from '../../../support/production-cli-matrix-observer.mjs';

const catalog = {
  relations: [
    {
      table_name: 'staffing_needs',
      table_kind: 'r',
      row_security: false,
      force_row_security: false,
      owner: 'postgres',
      table_acl: null,
    },
  ],
  columns: [
    {
      table_name: 'column_config',
      column_name: 'is_checklist_item',
      ordinal_position: 9,
      data_type: 'boolean',
      is_nullable: 'NO',
      column_default: 'false',
    },
  ],
  constraints: [
    {
      table_name: 'staffing_needs',
      name: 'staffing_needs_headcount_need_check',
      definition:
        'CHECK (((headcount_need >= 0) AND (headcount_need <= 9999)))',
      validated: true,
    },
  ],
  indexes: [
    {
      tablename: 'user_filters',
      indexname: 'user_filters_pkey',
      indexdef: 'CREATE UNIQUE INDEX user_filters_pkey',
    },
  ],
  functions: [
    {
      signature: 'public.example()',
      definition: 'CREATE FUNCTION public.example()',
      acl: null,
      owner: 'postgres',
    },
  ],
  triggers: [
    {
      table_name: 'user_filters',
      name: 'user_filters_updated_at',
      definition: 'CREATE TRIGGER user_filters_updated_at',
      enabled: 'O',
      function_signature: 'public.example()',
    },
  ],
  policies: [
    {
      tablename: 'user_filters',
      policyname: 'authenticated_users',
      permissive: 'PERMISSIVE',
      roles: ['authenticated'],
      cmd: 'ALL',
      qual: null,
      with_check: null,
    },
  ],
};

const aggregates = {
  employees: 73,
  auditRows: 1025,
  auditNonNullActors: 202,
  columnConfig: 61,
  savedFilters: 48,
  savedFilterOrphans: 48,
  savedFilterEmptyNames: 0,
  savedFilterOverlengthNames: 0,
  repayment: {
    omcNull: 70,
    omcTrue: 2,
    omcFalse: 1,
    pe3Null: 70,
    pe3True: 2,
    pe3False: 1,
  },
};

const observationInput = () => ({
  catalog: structuredClone(catalog),
  preservation: {
    employees: [{ id: 'synthetic-employee', ssn: 'synthetic-only' }],
    permissions: [
      [
        'synthetic-config',
        'special_diet',
        { hr_admin: { view: true, edit: true } },
      ],
    ],
    filters: [
      {
        id: 'synthetic-filter',
        user_id: 'synthetic-user',
        name: 'Synthetic filter',
      },
    ],
    audit: [
      [
        'synthetic-audit',
        'synthetic-employee',
        'special_diet',
        '2026-01-01T00:00:00Z',
        null,
      ],
    ],
    unmapped_actors: 0,
  },
  aggregates: structuredClone(aggregates),
  history: ['20260314000001', '20260314000002'],
});

describe('production CLI matrix observer projection', () => {
  it('returns only the approved counts, postconditions, and digests', () => {
    const result = projectMatrixObservation(observationInput());

    expect(result).toMatchObject({
      complete: true,
      history: ['20260314000001', '20260314000002'],
      historyCount: 2,
      headcountPostcondition: true,
      checklistPostcondition: true,
      counts: { ...aggregates, unmappedActors: 0 },
    });
    expect(Object.keys(result).sort()).toEqual([
      'catalogSha256',
      'checklistPostcondition',
      'checklistSha256',
      'complete',
      'counts',
      'headcountPostcondition',
      'headcountSha256',
      'history',
      'historyCount',
      'historySha256',
      'nonCurrentChecklistSha256',
      'nonCurrentHeadcountSha256',
      'preservationSha256',
      'savedFilterSha256',
    ]);
    expect(Object.keys(result.counts).sort()).toEqual([
      'auditNonNullActors',
      'auditRows',
      'columnConfig',
      'employees',
      'repayment',
      'savedFilterEmptyNames',
      'savedFilterOrphans',
      'savedFilterOverlengthNames',
      'savedFilters',
      'unmappedActors',
    ]);
    expect(JSON.stringify(result)).not.toContain('public.example()');
    expect(JSON.stringify(result)).not.toContain('authenticated_users');
    expect(JSON.stringify(result)).not.toContain('synthetic-employee');
    expect(JSON.stringify(result)).not.toContain('Synthetic filter');
    for (const value of [
      result.historySha256,
      result.catalogSha256,
      result.savedFilterSha256,
      result.headcountSha256,
      result.nonCurrentHeadcountSha256,
      result.checklistSha256,
      result.nonCurrentChecklistSha256,
      result.preservationSha256,
    ]) {
      expect(value).toMatch(/^[a-f0-9]{64}$/u);
    }
  });

  it.each([
    (input) => {
      delete input.catalog.columns;
    },
    (input) => {
      input.catalog.functions = null;
    },
    (input) => {
      input.catalog.triggers = {};
    },
    (input) => {
      input.catalog.relations[0].table_acl = 1;
    },
    (input) => {
      input.catalog.privateValue = 'secret';
    },
    (input) => {
      input.catalog.constraints[0].table_name = 'public.staffing_needs';
    },
  ])(
    'rejects missing, incomplete, or non-canonical catalog arrays',
    (mutate) => {
      const input = observationInput();
      mutate(input);
      expect(() => projectMatrixObservation(input)).toThrow(
        'Incomplete local matrix catalog'
      );
    }
  );

  it.each([
    (input) => {
      input.preservation = { permissions: [] };
    },
    (input) => {
      input.preservation.audit = [{}];
    },
    (input) => {
      input.preservation.permissions = [['id', 'column', 'not-an-object']];
    },
    (input) => {
      input.preservation.privateValue = 'secret';
    },
    (input) => {
      input.preservation.unmapped_actors = -1;
    },
  ])(
    'rejects incomplete, malformed, or arbitrary preservation data',
    (mutate) => {
      const input = observationInput();
      mutate(input);
      expect(() => projectMatrixObservation(input)).toThrow(
        'Incomplete local matrix preservation snapshot'
      );
    }
  );

  it.each([
    (input) => {
      input.aggregates.privateValue = 1;
    },
    (input) => {
      delete input.aggregates.savedFilters;
    },
    (input) => {
      input.aggregates.auditRows = '1025';
    },
    (input) => {
      input.aggregates.repayment.omcTrue = -1;
    },
    (input) => {
      input.aggregates.repayment.arbitrary = 0;
    },
  ])('rejects unexpected or unsafe aggregate shapes and values', (mutate) => {
    const input = observationInput();
    mutate(input);
    expect(() => projectMatrixObservation(input)).toThrow(
      'Incomplete local matrix aggregates'
    );
  });

  it('uses stable relation names and complete arrays in the catalog query', () => {
    expect(MATRIX_CATALOG_SNAPSHOT_SQL).toContain('r.relname table_name');
    expect(MATRIX_CATALOG_SNAPSHOT_SQL).toContain('c.relname table_name');
    expect(MATRIX_CATALOG_SNAPSHOT_SQL).not.toContain(
      'conrelid::regclass::text table_name'
    );
    expect(MATRIX_CATALOG_SNAPSHOT_SQL).not.toContain(
      'tgrelid::regclass::text table_name'
    );
    expect(MATRIX_CATALOG_SNAPSHOT_SQL.match(/'\[\]'::jsonb/gu)).toHaveLength(
      7
    );
    expect(MATRIX_PRESERVATION_SQL).toContain('role_permissions');
    expect(MATRIX_PRESERVATION_SQL).toContain('to_jsonb');
    expect(MATRIX_PRESERVATION_SQL.match(/'\[\]'::jsonb/gu)).toHaveLength(4);
  });

  it('projects a post-cleanup fixture with no preservation rows', () => {
    const input = observationInput();
    input.preservation = {
      employees: [],
      permissions: [],
      filters: [],
      audit: [],
      unmapped_actors: 0,
    };
    input.aggregates = {
      ...input.aggregates,
      employees: 0,
      auditRows: 0,
      auditNonNullActors: 0,
      savedFilters: 0,
      savedFilterOrphans: 0,
      repayment: {
        omcNull: 0,
        omcTrue: 0,
        omcFalse: 0,
        pe3Null: 0,
        pe3True: 0,
        pe3False: 0,
      },
    };

    expect(projectMatrixObservation(input)).toMatchObject({
      complete: true,
      counts: {
        employees: 0,
        auditRows: 0,
        savedFilters: 0,
        unmappedActors: 0,
      },
    });
  });

  it.each([
    ['20260314000002', '20260314000001'],
    ['20260314000001', '20260314000001'],
    ['not-a-version'],
  ])(
    'rejects history that is not exact, ordered, unique public versions: %j',
    (...history) => {
      const input = observationInput();
      input.history = history;
      expect(() => projectMatrixObservation(input)).toThrow(
        'Incomplete local matrix observation'
      );
    }
  );

  it('keeps non-current digests stable when only an expected target row changes', () => {
    const headcountChanged = observationInput();
    headcountChanged.catalog.constraints[0].definition =
      'CHECK ((headcount_need >= 0))';
    const checklistChanged = observationInput();
    checklistChanged.catalog.columns[0].ordinal_position = 100;
    checklistChanged.catalog.columns[0].column_default = null;

    const baseline = projectMatrixObservation(observationInput());
    const headcount = projectMatrixObservation(headcountChanged);
    const checklist = projectMatrixObservation(checklistChanged);

    expect(headcount.nonCurrentHeadcountSha256).toBe(
      baseline.nonCurrentHeadcountSha256
    );
    expect(checklist.nonCurrentChecklistSha256).toBe(
      baseline.nonCurrentChecklistSha256
    );
    expect(headcount.headcountSha256).not.toBe(baseline.headcountSha256);
    expect(checklist.checklistSha256).not.toBe(baseline.checklistSha256);
  });

  it('invalidates both non-current target digests when public relation RLS or ACL changes', () => {
    const rlsChanged = observationInput();
    rlsChanged.catalog.relations[0].row_security = true;
    const aclChanged = observationInput();
    aclChanged.catalog.relations[0].table_acl =
      '{postgres=arwdDxt/postgres,authenticated=r/postgres}';

    const baseline = projectMatrixObservation(observationInput());
    const rls = projectMatrixObservation(rlsChanged);
    const acl = projectMatrixObservation(aclChanged);

    for (const observed of [rls, acl]) {
      expect(observed.nonCurrentHeadcountSha256).not.toBe(
        baseline.nonCurrentHeadcountSha256
      );
      expect(observed.nonCurrentChecklistSha256).not.toBe(
        baseline.nonCurrentChecklistSha256
      );
    }
  });

  it('includes the function referenced by a saved-filter trigger in its digest', () => {
    const changed = observationInput();
    changed.catalog.functions[0].definition =
      'CREATE FUNCTION public.example() ALTERED';

    expect(projectMatrixObservation(changed).savedFilterSha256).not.toBe(
      projectMatrixObservation(observationInput()).savedFilterSha256
    );
  });
});
