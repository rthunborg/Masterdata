import { createHash } from 'node:crypto';
import {
  PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS as versions,
  parseExactProductionBootstrapDryRun,
} from '../../src/lib/release/production-bootstrap-admission.mjs';

export const CLI_MATRIX_CASES = Object.freeze({
  observed_guard_stop: Object.freeze({
    prefix: 8,
    target: versions[8],
    mode: 'guard',
  }),
  postcleanup_success: Object.freeze({
    prefix: 13,
    target: null,
    mode: 'success',
  }),
  explicit_history_write_failure: Object.freeze({
    prefix: 1,
    target: versions[1],
    mode: 'reject',
  }),
  implicit_history_write_failure: Object.freeze({
    prefix: 3,
    target: versions[3],
    mode: 'reject',
  }),
  trigger_profile_stop_184840: Object.freeze({
    prefix: 11,
    target: versions[11],
    mode: 'guard',
  }),
  trigger_profile_stop_184841: Object.freeze({
    prefix: 12,
    target: versions[12],
    mode: 'guard',
  }),
  explicit_history_write_timeout: Object.freeze({
    prefix: 1,
    target: versions[1],
    mode: 'timeout',
  }),
});

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const digest = (value) =>
  typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);

export function verifyPendingMatrixDryRun(output, migrations, history) {
  if (
    typeof output !== 'string' ||
    !Array.isArray(history) ||
    history.length >= versions.length ||
    !same(history, versions.slice(0, history.length))
  ) {
    throw new Error('Invalid local matrix pending history');
  }
  // Reuse the reviewed exact thirteen-file parser, supplying only the already
  // independently observed prefix. Any extra, missing or reordered child file
  // still fails that parser. This is labelled suffix proof, not full CLI output.
  const prefix = migrations
    .slice(0, history.length)
    .map((m) => m.file)
    .join('\n');
  parseExactProductionBootstrapDryRun(prefix + '\n' + output, migrations);
  return Object.freeze({
    kind: 'pending_suffix_dry_run',
    pendingVersions: versions.slice(history.length),
    outputSha256: createHash('sha256').update(output).digest('hex'),
  });
}

/** Pure interpretation of independently collected facts, never an admission to
 * execute, retry, repair, or continue. No child output or connection data enters
 * the result. Incomplete observations cannot establish transaction semantics. */
export function classifyCliMatrixResult(caseName, facts) {
  const spec = Object.hasOwn(CLI_MATRIX_CASES, caseName)
    ? CLI_MATRIX_CASES[caseName]
    : null;
  if (!spec) throw new Error('Unknown local CLI matrix case');
  const result = (classification) =>
    Object.freeze({
      caseName,
      classification,
      syntheticOnly: true,
      mayContinue: false,
      mayRepair: false,
      retainDatabase: true,
    });
  if (
    spec.mode === 'timeout' ||
    !facts ||
    facts.child?.kind !== 'exit' ||
    !Number.isInteger(facts.child.code) ||
    facts.child.code < 0 ||
    facts.observerComplete !== true ||
    !Array.isArray(facts.history) ||
    !digest(facts.beforeCurrentSha256) ||
    !digest(facts.afterCurrentSha256) ||
    typeof facts.preservationMatched !== 'boolean' ||
    typeof facts.currentPostcondition !== 'boolean' ||
    typeof facts.catalogMatched !== 'boolean'
  ) {
    return result('uncertain_current_file');
  }
  if (
    facts.sourceMatched !== true ||
    facts.guardIdentityMatched !== true ||
    facts.dryRunUnchanged !== true ||
    facts.dryRunOrderMatched !== true ||
    !same(facts.history, versions.slice(0, spec.prefix)) ||
    !facts.preservationMatched
  )
    return result('ambiguous_stop');

  if (spec.mode === 'success') {
    return result(
      facts.child.code === 0 &&
        facts.currentPostcondition &&
        facts.strictCatalogPassed === true
        ? 'proven_complete_local_rehearsal'
        : 'ambiguous_stop'
    );
  }
  if (facts.child.code === 0) return result('ambiguous_stop');
  const unchanged = facts.beforeCurrentSha256 === facts.afterCurrentSha256;
  if (spec.mode === 'guard') {
    return result(
      facts.guardErrorVersion === spec.target &&
        unchanged &&
        facts.catalogMatched &&
        facts.guardErrorMatched === true
        ? 'proven_rejected_before_current_effect'
        : 'ambiguous_stop'
    );
  }
  if (
    facts.hook?.armed !== true ||
    facts.hook.observed !== true ||
    facts.hook.targetVersion !== spec.target ||
    facts.hook.firingCount !== 1 ||
    facts.hook.unexpectedFiringCount !== 0 ||
    facts.hook.errorMatched !== true
  ) {
    return result('ambiguous_stop');
  }
  // A no-op cannot distinguish a rollback from a commit. Require a genuinely
  // distinct, independently specified postcondition rather than guessing from
  // BEGIN/COMMIT text or from the process exit code.
  if (facts.beforeAlreadySatisfiedPostcondition !== false)
    return result('ambiguous_stop');
  if (unchanged && !facts.currentPostcondition && facts.catalogMatched)
    return result('rolled_back_unrecorded_current');
  if (
    !unchanged &&
    !facts.catalogMatched &&
    facts.currentPostcondition &&
    facts.onlyExpectedCurrentChange === true
  ) {
    return result('committed_unrecorded_current');
  }
  return result('ambiguous_stop');
}
