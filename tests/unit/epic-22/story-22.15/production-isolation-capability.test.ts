import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PassThrough } from 'node:stream';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROTECTED_PRODUCTION_ISOLATION_OPERATION, PROTECTED_PRODUCTION_ISOLATION_PACKAGE_KIND,
  classifyFixedPoolerExclusionProbe, fixedProductionIsolationModuleClosure,
  verifyProductionIsolationPacket, readProductionIsolationLine,
  verifyProductionIsolationSealReply } from '../../../../src/lib/release/protected-production-isolation-worker.mjs';

const nonce = 'a'.repeat(64);
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const workerSha = sha(readFileSync(path.resolve('src/lib/release/protected-production-isolation-worker.mjs')));
const project = 'p'.repeat(20);
const target = sha('hr-masterdata:production-target:v1:' + project);
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pkg = { schemaVersion: 1, kind: PROTECTED_PRODUCTION_ISOLATION_PACKAGE_KIND,
  sourceCommit: 'b'.repeat(40), sourceTree: 'c'.repeat(40), sourceManifestSha256: 'd'.repeat(64),
  files: [{ path: 'src/lib/release/protected-production-isolation-worker.mjs', sha256: workerSha }] };
const packageBytes = Buffer.from(JSON.stringify(pkg) + '\n');
const request = () => ({
  schemaVersion: 1, operation: PROTECTED_PRODUCTION_ISOLATION_OPERATION, nonce, workspace: path.resolve('.'),
  environment: { EXPECTED_SUPABASE_ENVIRONMENT: 'production', EXPECTED_SUPABASE_PROJECT_REF: project,
    EXPECTED_SUPABASE_TARGET_BINDING_SHA256: target, SUPABASE_DB_CONNECTION_MODE: 'session-pooler',
    EXPECTED_SUPABASE_POOLER_HOST: 'synthetic-private', SUPABASE_DB_URL: 'synthetic-private',
    SUPABASE_SSL_ROOT_CERT: 'synthetic-private', EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256: 'f'.repeat(64) },
  admission: { sourceCommit: pkg.sourceCommit, sourceTree: pkg.sourceTree, sourceManifestSha256: pkg.sourceManifestSha256,
    approvedPackageSha256: sha(packageBytes), rawModuleSha256: workerSha, toolchainSha256: '2'.repeat(64),
    targetBindingSha256: target, tlsAdmissionSha256: '3'.repeat(64), egressAdmissionSha256: '4'.repeat(64),
    isolationPlanSha256: '5'.repeat(64), managementApiCapabilitySha256: '6'.repeat(64) },
  runtime: { managementApiToken: 'synthetic-management', anonymousKey: 'synthetic-anonymous', serviceRoleKey: 'synthetic-service',
    controlAdmission: { schemaVersion: 1, kind: 'production-temporary-isolation-admission',
      sourceSha: pkg.sourceCommit, targetBindingSha256: target, isolationPlanSha256: '5'.repeat(64),
      operatorIpv4Cidr: '203.0.113.1/32', exclusionIpv4Cidr: '203.0.113.2/32', operatorIpv6EgressUnavailable: true },
    probeContext: { sourceSha: pkg.sourceCommit, sourceTree: pkg.sourceTree, sourceManifestSha256: pkg.sourceManifestSha256,
      targetBindingSha256: target, isolationPlanSha256: '5'.repeat(64), databaseRoleGraphSha256: '7'.repeat(64),
      trustedBackendProfileSha256: '8'.repeat(64), priorRealtimeServiceEnabled: true, priorRealtimeConfigSha256: '9'.repeat(64) },
    sourceOptions: { commit: pkg.sourceCommit, gitExecutable: path.resolve('synthetic-git.exe'), expectedGitSha256: 'a'.repeat(64) },
    psqlTool: { psqlExecutable: path.resolve('synthetic-psql.exe'), expectedPsqlSha256: 'b'.repeat(64),
      expectedPsqlVersion: 'psql (PostgreSQL) 17.6' } },
});
function signed(value: unknown) {
  const payload = Buffer.from(JSON.stringify(value));
  return JSON.stringify({ payload: payload.toString('base64'),
    signature: sign('RSA-SHA256', payload, privateKey).toString('base64') });
}
const verifyPacket = (value = request(), bytes = packageBytes) =>
  verifyProductionIsolationPacket(signed(value), nonce, publicKey, pkg, workerSha, bytes);

describe('Story 22.15 protected production isolation packet', () => {
  it('accepts exactly the signed fixed operation and emits only redacted binding facts', () => {
    const result = verifyPacket();
    expect(result).toEqual({ operation: PROTECTED_PRODUCTION_ISOLATION_OPERATION, sourceCommit: pkg.sourceCommit,
      sourceTree: pkg.sourceTree, sourceManifestSha256: pkg.sourceManifestSha256,
      targetBindingSha256: target, isolationPlanSha256: '5'.repeat(64), projectRef: project });
    expect(JSON.stringify(result)).not.toMatch(/synthetic-|managementApiToken|serviceRoleKey|operatorIpv4/);
  });
  it('pins raw package bytes rather than accepting a syntactically equal rewritten package', () => {
    expect(() => verifyPacket(request(), Buffer.from(JSON.stringify(pkg)))).toThrow();
    const value = request(); value.admission.approvedPackageSha256 = '1'.repeat(64);
    expect(() => verifyPacket(value)).toThrow();
  });
  it.each(['schemaVersion', 'operation', 'nonce', 'workspace', 'environment', 'admission', 'runtime'])(
    'rejects a missing signed %s field', key => {
      const value = request() as Record<string, unknown>; delete value[key];
      expect(() => verifyPacket(value as ReturnType<typeof request>)).toThrow();
    });
  it.each([
    ['migration operation', (value: ReturnType<typeof request>) => { value.operation = 'apply-forward-14'; }],
    ['SQL selection', (value: ReturnType<typeof request>) => { (value.runtime as Record<string, unknown>).sql = 'SELECT 1'; }],
    ['source import selection', (value: ReturnType<typeof request>) => { (value.runtime as Record<string, unknown>).module = '/external.mjs'; }],
    ['target mismatch', (value: ReturnType<typeof request>) => { value.admission.targetBindingSha256 = '7'.repeat(64); }],
    ['worker mismatch', (value: ReturnType<typeof request>) => { value.admission.rawModuleSha256 = '8'.repeat(64); }],
    ['same operator and exclusion', (value: ReturnType<typeof request>) => { value.runtime.controlAdmission.exclusionIpv4Cidr = value.runtime.controlAdmission.operatorIpv4Cidr; }],
    ['tool version absent', (value: ReturnType<typeof request>) => { value.runtime.psqlTool.expectedPsqlVersion = ''; }],
    ['prior Realtime disabled', (value: ReturnType<typeof request>) => { value.runtime.probeContext.priorRealtimeServiceEnabled = false; }],
    ['control source mismatch', (value: ReturnType<typeof request>) => { value.runtime.controlAdmission.sourceSha = 'a'.repeat(40); }],
    ['token header injection', (value: ReturnType<typeof request>) => { value.runtime.managementApiToken += '\n'; }],
  ])('refuses %s before importing any live capability', (_name, mutate) => {
    const value = request(); mutate(value); expect(() => verifyPacket(value)).toThrow();
  });
  it('refuses unsigned, wrong nonce, and noncanonical base64 envelopes', () => {
    const envelope = JSON.parse(signed(request())); envelope.signature = Buffer.alloc(256).toString('base64');
    expect(() => verifyProductionIsolationPacket(JSON.stringify(envelope), nonce, publicKey, pkg, workerSha, packageBytes)).toThrow();
    expect(() => verifyProductionIsolationPacket(signed(request()), 'b'.repeat(64), publicKey, pkg, workerSha, packageBytes)).toThrow();
    envelope.payload += '\n';
    expect(() => verifyProductionIsolationPacket(JSON.stringify(envelope), nonce, publicKey, pkg, workerSha, packageBytes)).toThrow();
  });
  it('has a fixed source module closure with no caller supplied callback or path', () => {
    expect(fixedProductionIsolationModuleClosure()).toEqual({
      controls: 'src/lib/release/production-isolation-controls.mjs',
      probes: 'src/lib/release/production-isolation-probes.mjs',
      liveAdapter: 'src/lib/release/production-isolation-live-adapter.mjs',
      database: 'src/lib/release/collect-production-isolation-database.mjs',
      platform: 'src/lib/release/production-platform-config.mjs',
    });
    expect(Object.isFrozen(fixedProductionIsolationModuleClosure())).toBe(true);
  });
  it.each(['', '\n', '\r\n'])('accepts an SSL-qualified HBA refusal with %j ending at the fixed boundary', ending => {
    const stderr = 'FATAL: no pg_hba.conf entry for host "synthetic-host", user "synthetic-user", database "postgres", SSL encryption' + ending;
    expect(classifyFixedPoolerExclusionProbe({ status: 2, signal: null, errorCode: null, stderr }))
      .toEqual({ denied: true, denialCause: 'network-restriction' });
  });
  it.each(['\nSSL certificate verification failed', '\nTLS handshake failed', '\nSSL SYSCALL error: EOF detected',
    '\npassword authentication failed', '\ncould not resolve host', '\nconnection timed out',
    '; SSL certificate verify failed', '; TLS handshake failed', '\nSSL encryption'])
    ('rejects a mixed SSL-qualified HBA diagnostic %j at the fixed boundary', diagnostic => {
      const stderr = 'FATAL: no pg_hba.conf entry for host "synthetic-host", user "synthetic-user", database "postgres", SSL encryption' + diagnostic;
      expect(() => classifyFixedPoolerExclusionProbe({ status: 2, signal: null, errorCode: null, stderr })).toThrow();
    });
  it('rejects an accessor-backed stderr before reading or normalizing it', () => {
    let reads = 0;
    const result = { status: 2, signal: null, errorCode: null,
      get stderr() { reads++; throw new Error('must not execute accessor'); } };
    expect(() => classifyFixedPoolerExclusionProbe(result)).toThrow('Protected production isolation refused');
    expect(reads).toBe(0);
  });
  it('accepts only explicit provider network denial, never authentication/TLS/timeout/spawn errors', () => {
    const baseline = { status: 2, signal: null, errorCode: null, stderr: 'FATAL: no pg_hba.conf entry for host' };
    expect(classifyFixedPoolerExclusionProbe(baseline)).toEqual({ denied: true, denialCause: 'network-restriction' });
    for (const change of [{ status: 0 }, { status: 256 }, { status: null }, { signal: 'SIGTERM' },
      { errorCode: 'ETIMEDOUT' }, { stderr: 'FATAL: network restriction' },
      { stderr: 'no pg_hba.conf entry; TLS certificate failed' }, { stderr: 'no pg_hba.conf entry; password authentication failed' },
      { stderr: 'no pg_hba.conf entry; could not resolve host' }]) {
      expect(() => classifyFixedPoolerExclusionProbe({ ...baseline, ...change })).toThrow();
    }
  });
});

describe('isolation duplex line admission', () => {
  it('consumes one split CRLF line without waiting for stream closure and preserves stdin for the seal reply', async () => {
    const input = new PassThrough(); const first = readProductionIsolationLine(input);
    input.write('{"phase":'); input.write('1}\r\n');
    await expect(first).resolves.toBe('{"phase":1}');
    const second = readProductionIsolationLine(input); input.write('{"phase":2}\n');
    await expect(second).resolves.toBe('{"phase":2}'); input.destroy();
  });
  it.each(['\n', 'one\ntwo\n', '\ufffd'.repeat(65536)])('rejects empty/multiple/oversize input', async value => {
    const input = new PassThrough(); const promise = readProductionIsolationLine(input);
    input.write(value); await expect(promise).rejects.toThrow();
  });
  it('rejects early EOF and invalid UTF-8', async () => {
    const first = new PassThrough(); const p = readProductionIsolationLine(first); first.end('partial');
    await expect(p).rejects.toThrow();
    const second = new PassThrough(); const q = readProductionIsolationLine(second); second.write(Buffer.from([255, 10]));
    await expect(q).rejects.toThrow();
  });
  it('rejects a bounded input timeout', async () => {
    const input = new PassThrough(); await expect(readProductionIsolationLine(input, 5)).rejects.toThrow();
    expect(input.destroyed).toBe(true);
  });
  it('accepts only a matching signed nonce/correlation seal reply', () => {
    const correlation = 'c'.repeat(32);
    const value = { schemaVersion: 1, kind: 'protected-production-isolation-prior-state-seal', nonce,
      correlation, receipt: { encrypted: true, immutable: true } };
    expect(verifyProductionIsolationSealReply(signed(value), nonce, correlation, publicKey)).toEqual(value.receipt);
    expect(() => verifyProductionIsolationSealReply(signed(value), nonce, 'd'.repeat(32), publicKey)).toThrow();
    expect(() => verifyProductionIsolationSealReply(signed(value), 'b'.repeat(64), correlation, publicKey)).toThrow();
    expect(() => verifyProductionIsolationSealReply(signed({ ...value, sql: 'SELECT 1' }), nonce, correlation, publicKey)).toThrow();
  });
});