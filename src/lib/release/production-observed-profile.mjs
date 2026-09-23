const SOURCE_SHA = 'c31227ad68d91c0a471b611811bc618cbf3535a2';
const HASH40 = /^[a-f0-9]{40}$/u;
const HASH64 = /^[a-f0-9]{64}$/u;
const MAX_EVIDENCE_AGE_MS = 15 * 60 * 1000;
const freeze = (value) => Object.freeze(value);
const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
      if ('value' in descriptor) deepFreeze(descriptor.value);
    }
    Object.freeze(value);
  }
  return value;
};
const BASELINE = deepFreeze({
  "schemaGroups": {
    "schema_version": {
      "sha256": "6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b",
      "count": null
    },
    "scope": {
      "sha256": "854059568c6be8840c82dab4cf92182e605fe509970c1487300214e0d1f2cee3",
      "count": null
    },
    "public_schema_acl": {
      "sha256": "798cf79003c356128f08f18182e8751e9554b3d32b1e33e67bba2565a144b367",
      "count": 6
    },
    "unsupported_function_kind_count": {
      "sha256": "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9",
      "count": null
    },
    "tables": {
      "sha256": "dc094f08675ea894f760489d59cb67618e6aed77001d89af2e431319a00eb599",
      "count": 9
    },
    "columns": {
      "sha256": "b93b3910d1ce84c5f0a31b1be69bb2fde47f22cf2ca6db70a62780d11c6efc77",
      "count": 136
    },
    "constraints": {
      "sha256": "b405c5a049973f49df779ec433725b7b47964599e46555801abc844ddaae666e",
      "count": 39
    },
    "indexes": {
      "sha256": "627d6c08f04ce34becf286f89f282ca0662a211135f24adec164095ec4db39ef",
      "count": 83
    },
    "policies": {
      "sha256": "4d0c9ad614564015eb6d75e5e5848e3e6dbf47fd0b919b3fed4e6c5d745c46e7",
      "count": 26
    },
    "functions": {
      "sha256": "4cdb790e803d081de17ff162d1fe8be7f20ebd504e965f8fbaeabb547a43035f",
      "count": 11
    },
    "triggers": {
      "sha256": "c0681ed261c62e4cfbc021528b210c1cda1f6bc564ffe25615e70d768e6d87ae",
      "count": 4
    },
    "types": {
      "sha256": "6e4d61c9889cf3164a777038be7033b6720f56bdac2c6bf8413e48234059e56c",
      "count": 18
    },
    "sequences": {
      "sha256": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
      "count": 0
    },
    "auth_users_schema": {
      "sha256": "0120974844308218b992c8094c7822010dc94bf3dbffe861096774e7bdcb60a1",
      "count": 1
    }
  },
  "aggregate": {
    "history": {
      "row_count": null,
      "table_exists": false,
      "version_sha256": null
    },
    "staffing_data": {
      "out_of_range_headcount_count": 0
    },
    "repayment_data": {
      "omc_null_count": 70,
      "omc_true_count": 2,
      "pe3_null_count": 70,
      "pe3_true_count": 2,
      "omc_false_count": 1,
      "pe3_false_count": 1
    },
    "permission_rows": [
      {
        "db_column_name": "crewing_done",
        "role_key_count": 8,
        "role_permissions_sha256": "fec312252710e702dcff740859ca6f99a571f752e34393c04fab1a572845cae8",
        "role_permissions_is_object": true
      },
      {
        "db_column_name": "diet_details",
        "role_key_count": 6,
        "role_permissions_sha256": "978646910fff370c2e02c2050ee431c04b76239b61ac45ffee988d4918790883",
        "role_permissions_is_object": true
      },
      {
        "db_column_name": "repayment_needed_omc",
        "role_key_count": 4,
        "role_permissions_sha256": "647825e1b97318ea60b1c29ff5e97132b544c5db6b442797b87006d00479eb65",
        "role_permissions_is_object": true
      },
      {
        "db_column_name": "repayment_needed_pe3",
        "role_key_count": 5,
        "role_permissions_sha256": "070cec9b08e92fd3faa246e20eaba17de86710ae4a3e9a1f7f4f6b7d3d2676d3",
        "role_permissions_is_object": true
      },
      {
        "db_column_name": "special_diet",
        "role_key_count": 6,
        "role_permissions_sha256": "978646910fff370c2e02c2050ee431c04b76239b61ac45ffee988d4918790883",
        "role_permissions_is_object": true
      }
    ],
    "saved_filter_data": {
      "total_count": 48,
      "empty_name_count": 0,
      "row_identity_sha256": "b25b25ff02eaf7fa052b857e2b3865ef6945052629fd1743315ed25346d8db9b",
      "overlength_name_count": 0,
      "orphan_auth_reference_count": 48
    },
    "audit_preservation": {
      "row_count": 1025,
      "nonnull_actor_count": 202,
      "stable_fields_sha256": "1986bd7d3a71299e73486332f895020acf2a865790a8eb7683c7affc8e58d593",
      "unmapped_legacy_actor_count": 0,
      "unmapped_canonical_actor_count": 202
    },
    "permission_baseline": {
      "row_count": 61,
      "null_column_count": 0,
      "distinct_column_count": 61,
      "nonobject_permissions_count": 0,
      "rows_sha256": "f0ed65806763de0eb6653583b5d2dcf86f3c3a8c75cc5d2b070ca301bb5625b1"
    }
  },
  "strictCatalog": {
    "checkCount": 16,
    "failedChecks": [
      "dietary_columns_and_permissions",
      "represented_column_contracts",
      "represented_function_contracts",
      "represented_policy_contracts",
      "represented_trigger_contracts",
      "user_filters_objects",
      "user_filters_trigger_function_contract"
    ]
  }
});

const ownObject = (value) => value !== null && typeof value === 'object'
  && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype
  && Object.getOwnPropertySymbols(value).length === 0;
const safeData = (value) =>
  Object.entries(Object.getOwnPropertyDescriptors(value)).every(
    ([key, descriptor]) => key === 'length' || (descriptor.enumerable && 'value' in descriptor)
  );
const exactKeys = (value, keys) => ownObject(value) && safeData(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
const same = (actual, expected) => {
  if (Object.is(actual, expected)) return true;
  if (Array.isArray(expected)) {
    return Array.isArray(actual)
      && Object.getPrototypeOf(actual) === Array.prototype
      && Object.getOwnPropertySymbols(actual).length === 0
      && Object.keys(actual).length === expected.length
      && actual.length === expected.length
      && safeData(actual)
      && expected.every((value, index) => same(actual[index], value));
  }
  if (!ownObject(expected) || !ownObject(actual) || !safeData(actual)
    || !exactKeys(actual, Object.keys(expected))) return false;
  return Object.keys(expected).every((key) => same(actual[key], expected[key]));
};
const fail = (code) => { throw new Error(code); };

function validateObservation(observation) {
  if (!exactKeys(observation, ['schemaVersion', 'kind', 'profilePhase', 'capturedAtUtc', 'sourceSha', 'baselineSourceSha', 'targetBindingSha256', 'schemaGroups', 'aggregate', 'strictCatalog'])) {
    fail('production_observed_profile_shape_invalid');
  }
  if (observation.schemaVersion !== 1 || observation.kind !== 'production-observed-profile'
    || !HASH40.test(observation.sourceSha) || observation.baselineSourceSha !== SOURCE_SHA
    || !HASH64.test(observation.targetBindingSha256)
    || !same(observation.schemaGroups, BASELINE.schemaGroups)
    || !same(observation.strictCatalog, BASELINE.strictCatalog)) {
    fail('production_observed_profile_baseline_mismatch');
  }
  const expectedAggregate = observation.profilePhase === 'pre_cleanup'
    ? BASELINE.aggregate
    : observation.profilePhase === 'post_cleanup'
      ? {
        ...BASELINE.aggregate,
        saved_filter_data: {
          ...BASELINE.aggregate.saved_filter_data,
          total_count: 0,
          orphan_auth_reference_count: 0,
          row_identity_sha256: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
        },
      }
      : null;
  if (!expectedAggregate || !same(observation.aggregate, expectedAggregate)) {
    fail('production_observed_profile_baseline_mismatch');
  }
  const capturedAt = Date.parse(observation.capturedAtUtc);
  if (!Number.isFinite(capturedAt) || new Date(capturedAt).toISOString() !== observation.capturedAtUtc) {
    fail('production_observed_profile_timestamp_invalid');
  }
  return capturedAt;
}

/**
 * Pure validation of a redacted observation. A matching profile is evidence
 * only; it never proves migration history effects, semantic equivalence, or
 * authority to apply a production change.
 */
export function assessProductionObservedProfile({ observation, expectedContext, now = new Date(), maxEvidenceAgeMs = MAX_EVIDENCE_AGE_MS } = {}) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) fail('production_observed_profile_clock_invalid');
  if (!Number.isSafeInteger(maxEvidenceAgeMs) || maxEvidenceAgeMs <= 0 || maxEvidenceAgeMs > MAX_EVIDENCE_AGE_MS) {
    fail('production_observed_profile_age_policy_invalid');
  }
  if (!exactKeys(expectedContext, ['sourceSha', 'targetBindingSha256'])
    || !HASH40.test(expectedContext.sourceSha) || !HASH64.test(expectedContext.targetBindingSha256)) {
    fail('production_observed_profile_context_invalid');
  }
  const capturedAt = validateObservation(observation);
  if (observation.sourceSha !== expectedContext.sourceSha || observation.targetBindingSha256 !== expectedContext.targetBindingSha256) {
    fail('production_observed_profile_context_mismatch');
  }
  if (capturedAt > now.getTime() || now.getTime() - capturedAt > maxEvidenceAgeMs) {
    fail('production_observed_profile_stale_or_future');
  }
  return freeze({
    schemaVersion: 1,
    kind: 'production-observed-profile-assessment',
    disposition: 'profile_match_not_admission',
    sourceSha: observation.sourceSha,
    observedAtUtc: observation.capturedAtUtc,
    targetBindingSha256: observation.targetBindingSha256,
    blockers: freeze(['historical_effect_not_proven', 'semantic_equivalence_not_proven', 'production_apply_not_authorized']),
  });
}

export const PRODUCTION_OBSERVED_PROFILE_BASELINE = BASELINE;
export const PRODUCTION_OBSERVED_PROFILE_SOURCE_SHA = SOURCE_SHA;
export const PRODUCTION_OBSERVED_PROFILE_MAX_AGE_MS = MAX_EVIDENCE_AGE_MS;
