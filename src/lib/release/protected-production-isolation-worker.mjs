import { createHash, createPublicKey, randomBytes, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PROTECTED_PRODUCTION_ISOLATION_OPERATION = 'temporary-production-isolation';
export const PROTECTED_PRODUCTION_ISOLATION_PACKAGE_KIND = 'offline-protected-production-isolation-package';
export const PRODUCTION_ISOLATION_PACKET_MAX_BYTES = 65_536;
const SHA256 = /^[a-f0-9]{64}$/u;
const GIT_SHA = /^[a-f0-9]{40}$/u;
const fail = () => { throw new Error('Protected production isolation refused'); };
const exact = (value, keys) => value !== null && !Array.isArray(value) && typeof value === 'object' &&
  Object.getPrototypeOf(value) === Object.prototype && Object.getOwnPropertySymbols(value).length === 0 &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)) &&
  Object.values(Object.getOwnPropertyDescriptors(value)).every(descriptor =>
    descriptor.enumerable === true && Object.hasOwn(descriptor, 'value'));
const hash = value => createHash('sha256').update(value).digest('hex');
const secret = value => typeof value === 'string' && value.length >= 8 && value.length <= 4096 && !/[\r\n\0]/u.test(value);
const ENVIRONMENT_KEYS = Object.freeze([
  'EXPECTED_SUPABASE_ENVIRONMENT', 'EXPECTED_SUPABASE_PROJECT_REF',
  'EXPECTED_SUPABASE_TARGET_BINDING_SHA256', 'SUPABASE_DB_CONNECTION_MODE',
  'EXPECTED_SUPABASE_POOLER_HOST', 'SUPABASE_DB_URL', 'SUPABASE_SSL_ROOT_CERT',
  'EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256',
]);
const ADMISSION_KEYS = Object.freeze([
  'sourceCommit', 'sourceTree', 'sourceManifestSha256', 'approvedPackageSha256',
  'rawModuleSha256', 'toolchainSha256', 'targetBindingSha256',
  'tlsAdmissionSha256', 'egressAdmissionSha256', 'isolationPlanSha256',
  'managementApiCapabilitySha256',
]);
const RUNTIME_KEYS = Object.freeze([
  'managementApiToken', 'anonymousKey', 'serviceRoleKey', 'controlAdmission',
  'probeContext', 'sourceOptions', 'psqlTool',
]);

export function fixedProductionIsolationModuleClosure() {
  return Object.freeze({
    controls: 'src/lib/release/production-isolation-controls.mjs',
    probes: 'src/lib/release/production-isolation-probes.mjs',
    liveAdapter: 'src/lib/release/production-isolation-live-adapter.mjs',
    database: 'src/lib/release/collect-production-isolation-database.mjs',
    platform: 'src/lib/release/production-platform-config.mjs',
  });
}

function validateRuntime(runtime, request) {
  if (!exact(runtime, RUNTIME_KEYS) || ![runtime.managementApiToken, runtime.anonymousKey, runtime.serviceRoleKey].every(secret)) fail();
  const { admission } = request;
  const shared = value => value.sourceSha === admission.sourceCommit &&
    value.targetBindingSha256 === admission.targetBindingSha256 && value.isolationPlanSha256 === admission.isolationPlanSha256;
  const controls = runtime.controlAdmission;
  if (!exact(controls, ['schemaVersion', 'kind', 'sourceSha', 'targetBindingSha256', 'isolationPlanSha256',
    'operatorIpv4Cidr', 'exclusionIpv4Cidr', 'operatorIpv6EgressUnavailable']) || controls.schemaVersion !== 1 ||
    controls.kind !== 'production-temporary-isolation-admission' || !shared(controls) ||
    controls.operatorIpv6EgressUnavailable !== true ||
    ![controls.operatorIpv4Cidr, controls.exclusionIpv4Cidr].every(value => typeof value === 'string' &&
      /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}\/32$/u.test(value)) ||
    controls.operatorIpv4Cidr === controls.exclusionIpv4Cidr || controls.exclusionIpv4Cidr === '0.0.0.0/32') fail();
  const context = runtime.probeContext;
  if (!exact(context, ['sourceSha', 'sourceTree', 'sourceManifestSha256', 'targetBindingSha256',
    'isolationPlanSha256', 'databaseRoleGraphSha256', 'trustedBackendProfileSha256',
    'priorRealtimeServiceEnabled', 'priorRealtimeConfigSha256']) || !shared(context) ||
    context.sourceTree !== admission.sourceTree || context.sourceManifestSha256 !== admission.sourceManifestSha256 ||
    context.priorRealtimeServiceEnabled !== true ||
    ![context.databaseRoleGraphSha256, context.trustedBackendProfileSha256, context.priorRealtimeConfigSha256].every(value => SHA256.test(value ?? ''))) fail();
  if (!exact(runtime.sourceOptions, ['commit', 'gitExecutable', 'expectedGitSha256']) ||
    runtime.sourceOptions.commit !== admission.sourceCommit || !path.isAbsolute(runtime.sourceOptions.gitExecutable ?? '') ||
    !SHA256.test(runtime.sourceOptions.expectedGitSha256 ?? '') ||
    !exact(runtime.psqlTool, ['psqlExecutable', 'expectedPsqlSha256', 'expectedPsqlVersion']) ||
    !path.isAbsolute(runtime.psqlTool.psqlExecutable ?? '') || !SHA256.test(runtime.psqlTool.expectedPsqlSha256 ?? '') ||
    !/^psql \(PostgreSQL\) [0-9][^\r\n]{0,100}$/u.test(runtime.psqlTool.expectedPsqlVersion ?? '')) fail();
}

/** Validates all signed private fields before the first source import or request. */
function verifiedRequest(text, nonce, publicKey, packageManifest, rawModuleSha256, packageBytes) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > PRODUCTION_ISOLATION_PACKET_MAX_BYTES ||
    typeof nonce !== 'string' || !SHA256.test(nonce) || !SHA256.test(rawModuleSha256 ?? '') ||
    !Buffer.isBuffer(packageBytes)) fail();
  const envelope = JSON.parse(text);
  if (!exact(envelope, ['payload', 'signature']) || ![envelope.payload, envelope.signature].every(value =>
    typeof value === 'string' && /^[A-Za-z0-9+/]+={0,2}$/u.test(value))) fail();
  const payload = Buffer.from(envelope.payload, 'base64');
  try {
    if (payload.toString('base64') !== envelope.payload ||
      !verify('RSA-SHA256', payload, publicKey, Buffer.from(envelope.signature, 'base64'))) fail();
    const request = JSON.parse(payload.toString('utf8'));
    if (!exact(request, ['schemaVersion', 'operation', 'nonce', 'workspace', 'environment', 'admission', 'runtime']) ||
      request.schemaVersion !== 1 || request.operation !== PROTECTED_PRODUCTION_ISOLATION_OPERATION ||
      request.nonce !== nonce || typeof request.workspace !== 'string' || !path.isAbsolute(request.workspace)) fail();
    const environment = request.environment;
    if (!exact(environment, ENVIRONMENT_KEYS) || !Object.values(environment).every(value =>
      typeof value === 'string' && value.length > 0 && !value.includes('\0')) ||
      environment.EXPECTED_SUPABASE_ENVIRONMENT !== 'production' ||
      !/^[a-z0-9]{20}$/u.test(environment.EXPECTED_SUPABASE_PROJECT_REF) ||
      environment.SUPABASE_DB_CONNECTION_MODE !== 'session-pooler' ||
      !SHA256.test(environment.EXPECTED_SUPABASE_TARGET_BINDING_SHA256)) fail();
    const admission = request.admission;
    if (!exact(admission, ADMISSION_KEYS) || !GIT_SHA.test(admission.sourceCommit ?? '') || !GIT_SHA.test(admission.sourceTree ?? '') ||
      !Object.entries(admission).filter(([key]) => key !== 'sourceCommit' && key !== 'sourceTree')
        .every(([, value]) => typeof value === 'string' && SHA256.test(value))) fail();
    if (!exact(packageManifest, ['schemaVersion', 'kind', 'sourceCommit', 'sourceTree', 'sourceManifestSha256', 'files']) ||
      packageManifest.schemaVersion !== 1 || packageManifest.kind !== PROTECTED_PRODUCTION_ISOLATION_PACKAGE_KIND ||
      !Array.isArray(packageManifest.files) || packageManifest.files.length < 1 || packageManifest.files.length > 512 ||
      !packageManifest.files.every(entry => exact(entry, ['path', 'sha256']) &&
        typeof entry.path === 'string' && !path.isAbsolute(entry.path) && !entry.path.includes('\\') &&
        !entry.path.split('/').some(part => !part || part === '.' || part === '..') && SHA256.test(entry.sha256 ?? '')) ||
      new Set(packageManifest.files.map(entry => entry.path)).size !== packageManifest.files.length) fail();
    if (hash(packageBytes) !== admission.approvedPackageSha256 ||
      JSON.stringify(JSON.parse(packageBytes.toString('utf8'))) !== JSON.stringify(packageManifest) ||
      admission.sourceCommit !== packageManifest.sourceCommit || admission.sourceTree !== packageManifest.sourceTree ||
      admission.sourceManifestSha256 !== packageManifest.sourceManifestSha256 ||
      admission.rawModuleSha256 !== rawModuleSha256 ||
      packageManifest.files.find(entry => entry.path === 'src/lib/release/protected-production-isolation-worker.mjs')?.sha256 !== rawModuleSha256 ||
      admission.targetBindingSha256 !== environment.EXPECTED_SUPABASE_TARGET_BINDING_SHA256 ||
      hash('hr-masterdata:production-target:v1:' + environment.EXPECTED_SUPABASE_PROJECT_REF) !== admission.targetBindingSha256) fail();
    validateRuntime(request.runtime, request);
    return request;
  } finally { payload.fill(0); }
}

/** Public verification emits only binding facts, never private runtime fields. */
export function verifyProductionIsolationPacket(text, nonce, publicKey, packageManifest, rawModuleSha256, packageBytes) {
  const request = verifiedRequest(text, nonce, publicKey, packageManifest, rawModuleSha256, packageBytes);
  return Object.freeze({ operation: request.operation, sourceCommit: request.admission.sourceCommit,
    sourceTree: request.admission.sourceTree, sourceManifestSha256: request.admission.sourceManifestSha256,
    targetBindingSha256: request.admission.targetBindingSha256, isolationPlanSha256: request.admission.isolationPlanSha256,
    projectRef: request.environment.EXPECTED_SUPABASE_PROJECT_REF });
}

export function classifyFixedPoolerExclusionProbe(result) {
  const failureDiagnostics = typeof result?.stderr === 'string'
    ? result.stderr.replace(/^(.*\bno pg_hba\.conf entry[^\r\n]*), SSL encryption[ \t]*\r?$/gimu, '$1') : '';
  if (!exact(result, ['status', 'signal', 'errorCode', 'stderr']) ||
    !Number.isSafeInteger(result.status) || result.status <= 0 || result.status > 255 || result.signal !== null ||
    result.errorCode !== null || typeof result.stderr !== 'string' || Buffer.byteLength(result.stderr) > 8192 ||
    !/no pg_hba\.conf entry(?:\s|$)/iu.test(result.stderr) ||
    /(?:password|authentication|certificate|ssl|tls|timed?\s*out|connection refused|could not connect|dns|resolve|host not found)/iu.test(failureDiagnostics)) fail();
  return Object.freeze({ denied: true, denialCause: 'network-restriction' });
}

/** One bounded NDJSON line; stdin remains available for the fixed seal reply. */
export function readProductionIsolationLine(input, timeoutMs = 20_000) {
  if (!input?.on || !input?.removeListener || !input?.pause || !input?.resume ||
    !input?.destroy || !Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60_000) fail();
  return new Promise((resolve, reject) => {
    let bytes = Buffer.alloc(0); let settled = false;
    const finish = (error, text) => {
      if (settled) return; settled = true; clearTimeout(timer);
      input.pause(); input.removeListener('data', data); input.removeListener('error', closed);
      input.removeListener('end', closed); input.removeListener('close', closed);
      bytes.fill(0);
      if (error) { input.destroy(); reject(new Error('Protected production isolation refused')); }
      else resolve(text);
    };
    const closed = () => finish(true);
    const data = chunk => {
      try {
        const next = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        if (bytes.length + next.length > PRODUCTION_ISOLATION_PACKET_MAX_BYTES + 2) return finish(true);
        const previous = bytes; bytes = Buffer.concat([previous, next]); previous.fill(0);
        const end = bytes.indexOf(10);
        if (end === -1) return;
        if (end !== bytes.length - 1) return finish(true);
        const body = bytes.subarray(0, end > 0 && bytes[end - 1] === 13 ? end - 1 : end);
        if (body.length === 0 || body.length > PRODUCTION_ISOLATION_PACKET_MAX_BYTES) return finish(true);
        const text = body.toString('utf8');
        if (!Buffer.from(text, 'utf8').equals(body)) return finish(true);
        finish(false, text);
      } catch { finish(true); }
    };
    const timer = setTimeout(closed, timeoutMs);
    input.on('data', data); input.once('error', closed); input.once('end', closed); input.once('close', closed);
    input.resume();
  });
}

/** Signed seal receipt cannot be substituted across a run or correlation. */
export function verifyProductionIsolationSealReply(text, nonce, correlation, publicKey) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > PRODUCTION_ISOLATION_PACKET_MAX_BYTES) fail();
  const envelope = JSON.parse(text);
  if (!exact(envelope, ['payload', 'signature']) || typeof envelope.payload !== 'string' || typeof envelope.signature !== 'string') fail();
  const bytes = Buffer.from(envelope.payload, 'base64');
  try {
    if (bytes.toString('base64') !== envelope.payload || !verify('RSA-SHA256', bytes, publicKey, Buffer.from(envelope.signature, 'base64'))) fail();
    const value = JSON.parse(bytes.toString('utf8'));
    if (!exact(value, ['schemaVersion', 'kind', 'nonce', 'correlation', 'receipt']) ||
      value.schemaVersion !== 1 || value.kind !== 'protected-production-isolation-prior-state-seal' ||
      value.nonce !== nonce || value.correlation !== correlation) fail();
    return value.receipt;
  } finally { bytes.fill(0); }
}

async function main() {
  if (process.argv.length !== 2) fail();
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const nonce = randomBytes(32).toString('hex');
  process.stdout.write(JSON.stringify({ kind: 'protected-production-isolation-ready', nonce }) + '\n');
  const packageBytes = readFileSync(path.join(root, 'toolchain-package.json'));
  const publicKey = createPublicKey({ key: JSON.parse(readFileSync(path.join(root, 'bootstrap-origin.json'), 'utf8')), format: 'jwk' });
  const request = verifiedRequest(await readProductionIsolationLine(process.stdin, 60_000), nonce, publicKey,
    JSON.parse(packageBytes.toString('utf8')), hash(readFileSync(fileURLToPath(import.meta.url))), packageBytes);
  const modules = {};
  for (const [key, relative] of Object.entries(fixedProductionIsolationModuleClosure())) {
    const file = path.join(request.workspace, ...relative.split('/'));
    const entry = JSON.parse(packageBytes.toString('utf8')).files.find(item => item.path === relative);
    if (!entry || hash(readFileSync(file)) !== entry.sha256) fail();
    modules[key] = await import(pathToFileURL(file).href);
  }
  const runnerPath = path.join(request.workspace, 'src/lib/release/run-production-isolation-live.mjs');
  const entry = JSON.parse(packageBytes.toString('utf8')).files.find(item => item.path === 'src/lib/release/run-production-isolation-live.mjs');
  if (!entry || hash(readFileSync(runnerPath)) !== entry.sha256) fail();
  const { runFixedProductionIsolationLive } = await import(pathToFileURL(runnerPath).href);
  const sealPriorState = async ({ context, priorState }) => {
    const correlation = randomBytes(16).toString('hex');
    const line = JSON.stringify({ kind: 'seal-prior-state', nonce, correlation,
      context: { sourceSha: context.sourceSha, targetBindingSha256: context.targetBindingSha256,
        isolationPlanSha256: context.isolationPlanSha256 }, priorState });
    if (Buffer.byteLength(line) > PRODUCTION_ISOLATION_PACKET_MAX_BYTES) fail();
    process.stdout.write(line + '\n');
    return verifyProductionIsolationSealReply(await readProductionIsolationLine(process.stdin), nonce, correlation, publicKey);
  };
  const receipt = await runFixedProductionIsolationLive({ request, modules, sealPriorState });
  process.stdout.write(JSON.stringify({ kind: 'protected-production-isolation-complete', ...receipt }) + '\n');
  process.stdin.destroy();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    process.stderr.write('Protected production isolation did not complete. Production remains paused.\n');
    process.stdin.destroy();
    process.exitCode = 1;
  });
}