import { createHash, createPublicKey, randomBytes, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ENVIRONMENT_KEYS = [
  'EXPECTED_SUPABASE_ENVIRONMENT', 'EXPECTED_SUPABASE_PROJECT_REF',
  'SUPABASE_DB_CONNECTION_MODE', 'EXPECTED_SUPABASE_POOLER_HOST',
  'SUPABASE_DB_URL', 'SUPABASE_SSL_ROOT_CERT',
  'EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256', 'SUPABASE_CLI_EXECUTABLE',
  'EXPECTED_SUPABASE_CLI_SHA256', 'SystemRoot', 'WINDIR', 'PATH',
];
const fail = () => { throw new Error('Protected dry run refused'); };
const exact = (value, keys) => value && !Array.isArray(value) &&
  typeof value === 'object' && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// Signature proves this fresh worker challenge was handled by the installed
// host. The installation owner/admin remains trusted; this is not protection
// against an administrator extracting the compiled host's signing key.
export function verifyDryRunPacket(text, nonce, publicKey) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 65536) fail();
  const envelope = JSON.parse(text);
  if (!exact(envelope, ['payload', 'signature']) ||
      ![envelope.payload, envelope.signature].every(v => typeof v === 'string' && /^[A-Za-z0-9+/]+={0,2}$/u.test(v))) fail();
  const bytes = Buffer.from(envelope.payload, 'base64');
  if (!verify('RSA-SHA256', bytes, publicKey, Buffer.from(envelope.signature, 'base64'))) fail();
  const request = JSON.parse(bytes.toString('utf8'));
  if (!exact(request, ['schemaVersion', 'operation', 'nonce', 'workspace', 'environment']) ||
      request.schemaVersion !== 1 || request.operation !== 'production-dry-run' || request.nonce !== nonce ||
      !/^[a-f0-9]{64}$/u.test(nonce) || typeof request.workspace !== 'string' || !path.isAbsolute(request.workspace) ||
      !exact(request.environment, ENVIRONMENT_KEYS) ||
      !Object.values(request.environment).every(v => typeof v === 'string' && !v.includes('\0')) ||
      request.environment.EXPECTED_SUPABASE_ENVIRONMENT !== 'production') fail();
  return request;
}

async function main() {
  if (process.argv.length !== 2) fail();
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const nonce = randomBytes(32).toString('hex');
  process.stdout.write(JSON.stringify({ kind: 'protected-dry-run-ready', nonce }) + '\n');
  let text = '';
  const timer = setTimeout(() => process.exit(1), 10000);
  for await (const chunk of process.stdin) {
    text += chunk.toString('utf8');
    if (Buffer.byteLength(text) > 65536) fail();
  }
  clearTimeout(timer);
  const publicKey = createPublicKey({ key: JSON.parse(readFileSync(path.join(root, 'bootstrap-origin.json'), 'utf8')), format: 'jwk' });
  const request = verifyDryRunPacket(text, nonce, publicKey);
  const packageBytes = readFileSync(path.join(root, 'toolchain-package.json'));
  const pkg = JSON.parse(packageBytes.toString('utf8'));
  if (pkg.kind !== 'offline-protected-dry-run-package' || pkg.schemaVersion !== 1) fail();
  const { parseExactProductionBootstrapDryRun } = await import('./production-bootstrap-admission.mjs');
  const { runReviewedSupabaseCli } = await import('../../../supabase/verify/run-reviewed-supabase-cli.mjs');
  let output = null;
  const status = await runReviewedSupabaseCli({
    args: ['db', 'push', '--reviewed-target', '--reviewed-environment', 'production', '--dry-run', '--include-all', '--skip-vault'],
    workspace: request.workspace,
    environment: request.environment,
    spawn: (executable, args, options) => {
      // The adapter only captures output; all production wrapper executable,
      // target and TLS checks remain the original defaults, without injection.
      const result = spawnSync(executable, args, { ...options, stdio: 'pipe', encoding: 'utf8', timeout: 45000, maxBuffer: 1024 * 1024 });
      if (!result.error && result.status === 0) output = (result.stdout ?? '') + (result.stderr ?? '');
      return result;
    },
  });
  if (status !== 0 || output === null) fail();
  const parsed = parseExactProductionBootstrapDryRun(output, pkg.plan);
  process.stdout.write(JSON.stringify({ schemaVersion: 1, kind: 'protected-production-dry-run',
    sourceCommit: pkg.sourceCommit, sourceTree: pkg.sourceTree, sourceManifestSha256: pkg.sourceManifestSha256,
    packageSha256: hash(packageBytes), outputSha256: parsed.outputSha256, versions: parsed.versions,
    planningOnly: true, authorizesApply: false, authorizesRepair: false, authorizesCleanup: false }) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { process.stderr.write('Protected production dry run refused.\n'); process.exitCode = 1; });
}
