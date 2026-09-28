import { createPublicKey, randomBytes, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  assessProductionStaffingPreExecuteProof,
} from './production-staffing-pre-execute-contract.mjs';
import {
  PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS,
} from './production-bootstrap-admission.mjs';
import {
  assessProductionMaintenanceIsolation,
} from './production-isolation-gate.mjs';
import { assessProductionObservedProfile, productionTargetBindingSha256 } from './production-observed-profile.mjs';
import {
  createProtectedProductionCutoverExecutor,
} from '../../../supabase/verify/run-reviewed-supabase-cli.mjs';

const ENVIRONMENT_KEYS = [
  'EXPECTED_SUPABASE_ENVIRONMENT', 'EXPECTED_SUPABASE_PROJECT_REF',
  'SUPABASE_DB_CONNECTION_MODE', 'EXPECTED_SUPABASE_POOLER_HOST',
  'SUPABASE_DB_URL', 'SUPABASE_SSL_ROOT_CERT',
  'EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256', 'SUPABASE_CLI_EXECUTABLE',
  'EXPECTED_SUPABASE_CLI_SHA256', 'SystemRoot', 'WINDIR', 'PATH',
];
const SHA40 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const fail = () => { throw new Error('Protected production cutover refused'); };
const exact = (value, keys) => value && !Array.isArray(value) &&
  typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype &&
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());

export function verifyProtectedCutoverPacket(text, nonce, publicKey) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 65536) fail();
  const envelope = JSON.parse(text);
  if (!exact(envelope, ['payload', 'signature']) ||
      ![envelope.payload, envelope.signature].every((value) =>
        typeof value === 'string' && /^[A-Za-z0-9+/]+={0,2}$/u.test(value)
      )) fail();
  const payload = Buffer.from(envelope.payload, 'base64');
  if (!verify('RSA-SHA256', payload, publicKey, Buffer.from(envelope.signature, 'base64'))) fail();
  const request = JSON.parse(payload.toString('utf8'));
  if (!exact(request, [
    'schemaVersion', 'operation', 'nonce', 'workspace', 'environment',
    'sourceSha', 'sourceTree', 'sourceManifestSha256', 'targetBindingSha256',
    'staffingReceipt', 'isolationReceipts', 'isolationContext',
    'preForwardObservation', 'reviewRecords',
  ]) ||
    request.schemaVersion !== 1 ||
    request.operation !== 'apply-forward-13' ||
    request.nonce !== nonce ||
    !SHA256.test(nonce) ||
    typeof request.workspace !== 'string' || !path.isAbsolute(request.workspace) ||
    !exact(request.environment, ENVIRONMENT_KEYS) ||
    !Object.values(request.environment).every((value) => typeof value === 'string' && !value.includes('\0')) ||
    request.environment.EXPECTED_SUPABASE_ENVIRONMENT !== 'production' ||
    !SHA40.test(request.sourceSha ?? '') ||
    !SHA40.test(request.sourceTree ?? '') ||
    !SHA256.test(request.sourceManifestSha256 ?? '') ||
    !SHA256.test(request.targetBindingSha256 ?? '')
  ) fail();
  if (productionTargetBindingSha256(request.environment.EXPECTED_SUPABASE_PROJECT_REF) !== request.targetBindingSha256) fail();
  if (!exact(request.reviewRecords, ['backupRecordSha256', 'cleanupRecordSha256']) ||
      !Object.values(request.reviewRecords).every((value) => typeof value === 'string' && SHA256.test(value))) fail();
  if (request.preForwardObservation?.profilePhase !== 'post_cleanup') fail();
  try {
    const observed = assessProductionObservedProfile({
      observation: request.preForwardObservation,
      expectedContext: { sourceSha: request.sourceSha, targetBindingSha256: request.targetBindingSha256 },
    });
    if (observed.disposition !== 'profile_match_not_admission') fail();
  } catch { fail(); }
  const staffing = assessProductionStaffingPreExecuteProof(request.staffingReceipt, {
    sourceSha: request.sourceSha,
    sourceTree: request.sourceTree,
    sourceManifestSha256: request.sourceManifestSha256,
    targetBindingSha256: request.targetBindingSha256,
  });
  if (staffing.disposition !== 'staffing_pre_execute_proved_not_execution_authority') fail();
  if (
    request.isolationContext?.sourceSha !== request.sourceSha ||
    request.isolationContext?.targetBindingSha256 !== request.targetBindingSha256 ||
    request.isolationContext?.sourceTree !== request.sourceTree ||
    request.isolationContext?.sourceManifestSha256 !== request.sourceManifestSha256
  ) fail();
  const isolation = assessProductionMaintenanceIsolation(request.isolationReceipts, {
    expectedContext: request.isolationContext,
  });
  if (isolation.disposition !== 'isolation_proved_not_execution_authority') fail();
  return request;
}

async function main() {
  if (process.argv.length !== 2) fail();
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const nonce = randomBytes(32).toString('hex');
  process.stdout.write(JSON.stringify({ kind: 'protected-production-cutover-ready', nonce }) + '\n');
  let text = '';
  const timer = setTimeout(() => process.exit(1), 10000);
  for await (const chunk of process.stdin) {
    text += chunk.toString('utf8');
    if (Buffer.byteLength(text) > 65536) fail();
  }
  clearTimeout(timer);
  const publicKey = createPublicKey({
    key: JSON.parse(readFileSync(path.join(root, 'bootstrap-origin.json'), 'utf8')),
    format: 'jwk',
  });
  const request = verifyProtectedCutoverPacket(text, nonce, publicKey);
  const pkg = JSON.parse(readFileSync(path.join(root, 'toolchain-package.json'), 'utf8'));
  if (
    pkg.kind !== 'offline-protected-production-cutover-package' ||
    pkg.schemaVersion !== 1 ||
    pkg.sourceCommit !== request.sourceSha ||
    pkg.sourceTree !== request.sourceTree ||
    pkg.sourceManifestSha256 !== request.sourceManifestSha256 ||
    !Array.isArray(pkg.plan) ||
    JSON.stringify(pkg.plan.map((entry) => entry.version)) !== JSON.stringify(PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS)
  ) fail();

  const run = createProtectedProductionCutoverExecutor({
    packet: text,
    nonce,
    workspace: request.workspace,
  });
  // Revalidate immediately before the irrevocable child spawn. A signed
  // packet is evidence, not a reusable authority token: freshness and every
  // source/target/isolation/staffing predicate are checked again.
  verifyProtectedCutoverPacket(text, nonce, publicKey);
  const status = await run();
  if (status !== 0) fail();
  process.stdout.write(JSON.stringify({
    schemaVersion: 1,
    kind: 'protected-production-forward-13-attempt',
    sourceCommit: pkg.sourceCommit,
    sourceTree: pkg.sourceTree,
    sourceManifestSha256: pkg.sourceManifestSha256,
    targetBindingSha256: request.targetBindingSha256,
    versions: PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS,
    authorizesCleanup: false,
    authorizesRepair: false,
    authorizesMain: false,
    authorizesDeployment: false,
    authorizesReopen: false,
  }) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    process.stderr.write('Protected production cutover did not complete; database outcome requires read-only diagnosis. No automatic retry or repair.\n');
    process.exitCode = 1;
  });
}
