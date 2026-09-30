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
  assessProductionCutoverReceiptOrdering,
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
export const PROTECTED_CUTOVER_PREPARATION_TIMEOUT_MS = 60_000;
export const PROTECTED_CUTOVER_PACKET_TIMEOUT_MS = 10_000;
export const PROTECTED_CUTOVER_PACKET_MAX_BYTES = 65_536;
const fail = () => { throw new Error('Protected production cutover refused'); };
const exact = (value, keys) => value && !Array.isArray(value) &&
  typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype &&
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());

function checkedElapsed(startedAt, limit, now) {
  const current = now();
  if (!Number.isFinite(current) || !Number.isFinite(startedAt) || current < startedAt || current - startedAt >= limit) fail();
  return current;
}

export function readProtectedCutoverPacket(input, {
  now = Date.now,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
} = {}) {
  if (!input || typeof input.on !== 'function' || typeof input.removeListener !== 'function' ||
      typeof input.pause !== 'function' || typeof input.resume !== 'function' || typeof input.destroy !== 'function') fail();
  let preparationStartedAt;
  try { preparationStartedAt = now(); } catch {
    try { input.destroy(); } catch { }
    fail();
  }
  if (!Number.isFinite(preparationStartedAt)) {
    try { input.destroy(); } catch { }
    fail();
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    let preparationTimer;
    let packetTimer;
    let packetStartedAt;
    let totalBytes = 0;
    const chunks = [];

    const cleanup = () => {
      if (preparationTimer !== undefined) clearTimer(preparationTimer);
      if (packetTimer !== undefined) clearTimer(packetTimer);
      input.removeListener('data', onData);
      input.removeListener('end', onEnd);
      input.removeListener('error', onError);
      input.removeListener('close', onClose);
    };
    const rejectInput = () => {
      if (settled) return;
      settled = true;
      cleanup();
      try { input.destroy(); } catch { }
      reject(new Error('Protected production cutover refused'));
    };
    const resolveInput = (text) => {
      if (settled) return;
      settled = true;
      cleanup();
      input.pause();
      resolve(text);
    };
    const onData = (chunk) => {
      try {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        if (bytes.length === 0) return;
        if (packetStartedAt === undefined) {
          packetStartedAt = checkedElapsed(preparationStartedAt, PROTECTED_CUTOVER_PREPARATION_TIMEOUT_MS, now);
          clearTimer(preparationTimer);
          preparationTimer = undefined;
          packetTimer = setTimer(rejectInput, PROTECTED_CUTOVER_PACKET_TIMEOUT_MS);
        }
        totalBytes += bytes.length;
        if (totalBytes > PROTECTED_CUTOVER_PACKET_MAX_BYTES) fail();
        chunks.push(bytes);
      } catch { rejectInput(); }
    };
    const onEnd = () => {
      try {
        if (packetStartedAt === undefined) fail();
        checkedElapsed(packetStartedAt, PROTECTED_CUTOVER_PACKET_TIMEOUT_MS, now);
        resolveInput(Buffer.concat(chunks, totalBytes).toString('utf8'));
      } catch { rejectInput(); }
    };
    const onError = () => rejectInput();
    const onClose = () => rejectInput();

    preparationTimer = setTimer(rejectInput, PROTECTED_CUTOVER_PREPARATION_TIMEOUT_MS);
    input.on('data', onData);
    input.once('end', onEnd);
    input.once('error', onError);
    input.once('close', onClose);
    input.resume();
  });
}

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
    request.operation !== 'apply-forward-14' ||
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
  if (!exact(request.reviewRecords, ['backupRecordSha256', 'cleanupRecordSha256', 'cleanupStartedAtUtc', 'cleanupCompletedAtUtc']) ||
      !SHA256.test(request.reviewRecords.backupRecordSha256) ||
      !SHA256.test(request.reviewRecords.cleanupRecordSha256) ||
      typeof request.reviewRecords.cleanupStartedAtUtc !== 'string' ||
      typeof request.reviewRecords.cleanupCompletedAtUtc !== 'string') fail();
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
  const ordering = assessProductionCutoverReceiptOrdering({
    reviewRecords: request.reviewRecords,
    preForwardObservation: request.preForwardObservation,
    staffingReceipt: request.staffingReceipt,
    isolationReceipts: request.isolationReceipts,
  });
  if (ordering.disposition !== 'cutover_receipt_order_proved_not_execution_authority') fail();
  return request;
}

export async function runProtectedProductionCutoverWorker({
  input = process.stdin,
  output = process.stdout,
  argv = process.argv,
  root = fileURLToPath(new URL('../../../', import.meta.url)),
  randomBytesFn = randomBytes,
  readFile = readFileSync,
  publicKeyFactory = createPublicKey,
  verifyPacket = verifyProtectedCutoverPacket,
  executorFactory = createProtectedProductionCutoverExecutor,
  readPacket = readProtectedCutoverPacket,
} = {}) {
  if (!Array.isArray(argv) || argv.length !== 2) fail();
  const nonce = randomBytesFn(32).toString('hex');
  output.write(JSON.stringify({ kind: 'protected-production-cutover-ready', nonce }) + '\n');
  const text = await readPacket(input);
  const publicKey = publicKeyFactory({
    key: JSON.parse(readFile(path.join(root, 'bootstrap-origin.json'), 'utf8')),
    format: 'jwk',
  });
  const request = verifyPacket(text, nonce, publicKey);
  const pkg = JSON.parse(readFile(path.join(root, 'toolchain-package.json'), 'utf8'));
  if (
    pkg.kind !== 'offline-protected-production-cutover-package' ||
    pkg.schemaVersion !== 1 ||
    pkg.sourceCommit !== request.sourceSha ||
    pkg.sourceTree !== request.sourceTree ||
    pkg.sourceManifestSha256 !== request.sourceManifestSha256 ||
    !Array.isArray(pkg.plan) ||
    JSON.stringify(pkg.plan.map((entry) => entry.version)) !== JSON.stringify(PRODUCTION_FORWARD_BOOTSTRAP_VERSIONS)
  ) fail();

  const run = executorFactory({
    packet: text,
    nonce,
    workspace: request.workspace,
  });
  // Revalidate immediately before the irrevocable child spawn. A signed
  // packet is evidence, not a reusable authority token: freshness and every
  // source/target/isolation/staffing predicate are checked again.
  verifyPacket(text, nonce, publicKey);
  const status = await run();
  if (status !== 0) fail();
  output.write(JSON.stringify({
    schemaVersion: 1,
    kind: 'protected-production-forward-14-attempt',
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
  runProtectedProductionCutoverWorker().catch(() => {
    process.stderr.write('Protected production cutover did not complete; database outcome requires read-only diagnosis. No automatic retry or repair.\n');
    process.exitCode = 1;
  });
}
