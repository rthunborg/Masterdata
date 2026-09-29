import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import path from 'node:path';

const DIRECTORY = 'cutover-diagnostics.v1';
const CONTEXT_FILE = 'context.json';
const PHASES = Object.freeze(['dry-run', 'apply']);
const OPERATION = 'apply-forward-13';
const MAX_JOURNAL_BYTES = 8 * 1024 * 1024;
const MAX_RESULT_BYTES = 2 * 1024 * 1024;
const SHA40 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const CODE = /^[A-Za-z0-9_.-]{1,128}$/u;

const fail = () => {
  throw new Error('Protected cutover diagnostic refused');
};

const exact = (value, keys) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype &&
  Object.getOwnPropertySymbols(value).length === 0 &&
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());

const canonicalContext = (context) => {
  if (
    !exact(context, [
      'sourceSha',
      'sourceTree',
      'sourceManifestSha256',
      'targetBindingSha256',
      'nonce',
      'operation',
    ]) ||
    !SHA40.test(context.sourceSha) ||
    !SHA40.test(context.sourceTree) ||
    !SHA256.test(context.sourceManifestSha256) ||
    !SHA256.test(context.targetBindingSha256) ||
    !SHA256.test(context.nonce) ||
    context.operation !== OPERATION
  ) fail();
  return Object.freeze({
    sourceSha: context.sourceSha,
    sourceTree: context.sourceTree,
    sourceManifestSha256: context.sourceManifestSha256,
    targetBindingSha256: context.targetBindingSha256,
    nonce: context.nonce,
    operation: context.operation,
  });
};

const validPhase = (phase) => typeof phase === 'string' && PHASES.includes(phase);

const validResult = (result) =>
  exact(result, ['stdout', 'stderr', 'status', 'signal', 'errorCode', 'durationMs']) &&
  Buffer.isBuffer(result.stdout) &&
  Buffer.isBuffer(result.stderr) &&
  result.stdout.length <= MAX_RESULT_BYTES &&
  result.stderr.length <= MAX_RESULT_BYTES &&
  (result.status === null || Number.isSafeInteger(result.status)) &&
  (result.signal === null || (typeof result.signal === 'string' && CODE.test(result.signal))) &&
  (result.errorCode === null || (typeof result.errorCode === 'string' && CODE.test(result.errorCode))) &&
  Number.isSafeInteger(result.durationMs) &&
  result.durationMs >= 0;

function verifiedWorkspace(workspace) {
  if (typeof workspace !== 'string' || !path.isAbsolute(workspace) || path.resolve(workspace) !== workspace) fail();
  const canonical = fs.realpathSync(workspace);
  if (canonical !== workspace) fail();
  for (let current = workspace;; current = path.dirname(current)) {
    const ancestor = fs.lstatSync(current);
    if (!ancestor.isDirectory() || ancestor.isSymbolicLink()) fail();
    if (path.dirname(current) === current) break;
  }
  const stat = fs.lstatSync(canonical);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail();
  return canonical;
}

function verifiedPublicKey(publicKey) {
  if (
    !(publicKey instanceof crypto.KeyObject) ||
    publicKey.type !== 'public' ||
    publicKey.asymmetricKeyType !== 'rsa' ||
    publicKey.asymmetricKeyDetails?.modulusLength < 2048
  ) fail();
  return publicKey;
}

function verifiedPrivateKey(privateKey) {
  if (
    !(privateKey instanceof crypto.KeyObject) ||
    privateKey.type !== 'private' ||
    privateKey.asymmetricKeyType !== 'rsa' ||
    privateKey.asymmetricKeyDetails?.modulusLength < 2048
  ) fail();
  return privateKey;
}

function appendFully(fd, bytes) {
  let offset = 0;
  while (offset < bytes.length) {
    const written = fs.writeSync(fd, bytes, offset, bytes.length - offset);
    if (!Number.isSafeInteger(written) || written <= 0) fail();
    offset += written;
  }
  fs.fsyncSync(fd);
}

function writeExclusiveFile(file, bytes) {
  let fd;
  try {
    fd = fs.openSync(file, 'wx', 0o600);
    appendFully(fd, bytes);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function aad(context, phase, record) {
  return Buffer.from(JSON.stringify({ schemaVersion: 1, context, phase, record }), 'utf8');
}

function encryptedRecord({ publicKey, context, phase, record, payload }) {
  const key = crypto.randomBytes(32);
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(aad(context, phase, record));
    const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
    let ciphertext;
    try {
      ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    } finally {
      plaintext.fill(0);
    }
    const tag = cipher.getAuthTag();
    const wrappedKey = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      key
    );
    return Buffer.from(JSON.stringify({
      schemaVersion: 1,
      kind: 'protected-cutover-diagnostic-encrypted-record',
      wrappedKey: wrappedKey.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
    }) + '\n', 'utf8');
  } finally {
    key.fill(0);
  }
}

const canonicalUtc = (value) => {
  if (typeof value !== 'string') return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
    ? value
    : null;
};

function strictBase64(value, maximum) {
  if (typeof value !== 'string' || (value !== '' && !/^[A-Za-z0-9+/]+={0,2}$/u.test(value))) fail();
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length > maximum || bytes.toString('base64') !== value) fail();
  return bytes;
}

function decodeRecord({ privateKey, context, phase, record, line }) {
  let envelope;
  try { envelope = JSON.parse(line); } catch { fail(); }
  if (!exact(envelope, ['schemaVersion', 'kind', 'wrappedKey', 'iv', 'tag', 'ciphertext']) ||
      envelope.schemaVersion !== 1 ||
      envelope.kind !== 'protected-cutover-diagnostic-encrypted-record') fail();
  const wrappedKey = strictBase64(envelope.wrappedKey, 1024);
  const iv = strictBase64(envelope.iv, 12);
  const tag = strictBase64(envelope.tag, 16);
  const ciphertext = strictBase64(envelope.ciphertext, MAX_JOURNAL_BYTES);
  if (iv.length !== 12 || tag.length !== 16) fail();
  let key;
  let plaintext;
  try {
    key = crypto.privateDecrypt({
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    }, wrappedKey);
    if (key.length !== 32) fail();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(aad(context, phase, record));
    decipher.setAuthTag(tag);
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8'));
  } catch {
    fail();
  } finally {
    if (plaintext) plaintext.fill(0);
    if (key) key.fill(0);
  }
}

function decodeStarted(payload) {
  if (!exact(payload, ['startedAtUtc']) || !canonicalUtc(payload.startedAtUtc)) fail();
  return Object.freeze({ kind: 'started', startedAtUtc: payload.startedAtUtc });
}

function decodeCompleted(payload) {
  if (!exact(payload, [
    'completedAtUtc', 'stdoutBase64', 'stderrBase64', 'status', 'signal', 'errorCode', 'durationMs',
  ]) ||
  !canonicalUtc(payload.completedAtUtc) ||
  !validResult({
    stdout: strictBase64(payload.stdoutBase64, MAX_RESULT_BYTES),
    stderr: strictBase64(payload.stderrBase64, MAX_RESULT_BYTES),
    status: payload.status,
    signal: payload.signal,
    errorCode: payload.errorCode,
    durationMs: payload.durationMs,
  })) fail();
  return Object.freeze({
    kind: 'completed',
    completedAtUtc: payload.completedAtUtc,
    stdout: strictBase64(payload.stdoutBase64, MAX_RESULT_BYTES),
    stderr: strictBase64(payload.stderrBase64, MAX_RESULT_BYTES),
    status: payload.status,
    signal: payload.signal,
    errorCode: payload.errorCode,
    durationMs: payload.durationMs,
  });
}

function recoverPhase({ directory, phase, privateKey, context }) {
  const file = path.join(directory, `${phase}.enc`);
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_JOURNAL_BYTES) fail();
  const bytes = fs.readFileSync(file);
  if (bytes.length !== stat.size) fail();
  if (bytes.length === 0) return Object.freeze({ phase, records: Object.freeze([]), unknown: false });
  const text = bytes.toString('utf8');
  const completeLines = text.endsWith('\n') ? text.slice(0, -1).split('\n') : text.split('\n').slice(0, -1);
  if (completeLines.length === 0 || completeLines.some((line) => line.length === 0) || completeLines.length > 2) fail();
  const records = [decodeStarted(decodeRecord({ privateKey, context, phase, record: 'started', line: completeLines[0] }))];
  if (completeLines.length === 2) {
    records.push(decodeCompleted(decodeRecord({ privateKey, context, phase, record: 'completed', line: completeLines[1] })));
  }
  const partialTail = !text.endsWith('\n');
  if (partialTail && records.length !== 1) fail();
  return Object.freeze({ phase, records: Object.freeze(records), unknown: records.length === 1 });
}

const terminalOutcomeUnknown = (records) => records.some((record) =>
  record.kind === 'completed' &&
  (record.status === null || record.signal !== null || record.errorCode !== null ||
    (record.phase === 'apply' && record.status !== 0))
);

/** Reads only the non-secret authenticated-context descriptor from a fixed journal root. */
export function readProtectedCutoverDiagnosticContext({ workspace } = {}) {
  try {
    const root = verifiedWorkspace(workspace);
    const directory = path.join(root, DIRECTORY);
    const directoryStat = fs.lstatSync(directory);
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) fail();
    const file = path.join(directory, CONTEXT_FILE);
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4096) fail();
    const bytes = fs.readFileSync(file);
    if (bytes.length !== stat.size) fail();
    const descriptor = JSON.parse(bytes.toString('utf8'));
    if (!exact(descriptor, ['schemaVersion', 'kind', 'context']) ||
        descriptor.schemaVersion !== 1 ||
        descriptor.kind !== 'protected-cutover-diagnostic-context') fail();
    return canonicalContext(descriptor.context);
  } catch {
    fail();
  }
}

/**
 * Decrypts fixed, bounded private journals in memory only. It launches no
 * process and writes nothing. These records are forensic evidence only and
 * never authorize a retry: missing or abnormal terminal state is unknown.
 */
export function recoverProtectedCutoverDiagnostics({ workspace, privateKey, context } = {}) {
  try {
    const root = verifiedWorkspace(workspace);
    const key = verifiedPrivateKey(privateKey);
    const boundContext = canonicalContext(context);
    const directory = path.join(root, DIRECTORY);
    const directoryStat = fs.lstatSync(directory);
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) fail();
    if (JSON.stringify(readProtectedCutoverDiagnosticContext({ workspace: root })) !== JSON.stringify(boundContext)) fail();
    const dryRun = recoverPhase({ directory, phase: 'dry-run', privateKey: key, context: boundContext });
    const apply = recoverPhase({ directory, phase: 'apply', privateKey: key, context: boundContext });
    if (apply.records.length > 0 && dryRun.records.length !== 2) fail();
    const records = Object.freeze([
      ...dryRun.records.map((record) => Object.freeze({ phase: 'dry-run', ...record })),
      ...apply.records.map((record) => Object.freeze({ phase: 'apply', ...record })),
    ]);
    const outcome = dryRun.unknown || apply.unknown || terminalOutcomeUnknown(records)
      ? 'outcome_unknown'
      : dryRun.records.length === 0 && apply.records.length === 0
        ? 'no_recorded_attempt'
        : apply.records.length === 0
          ? 'dry_run_only'
          : 'terminal_records_complete';
    return Object.freeze({
      schemaVersion: 1,
      kind: 'protected-cutover-diagnostic-recovery',
      outcome,
      authorizesRetry: false,
      diagnosticRecords: records,
    });
  } catch {
    fail();
  }
}

/**
 * Reserves encrypted diagnostic journals before a protected CLI attempt. This
 * records forensic bytes only; it neither invokes a CLI nor returns diagnostics.
 */
export function createProtectedCutoverDiagnosticSink({ workspace, publicKey, context } = {}) {
  try {
    const root = verifiedWorkspace(workspace);
    const key = verifiedPublicKey(publicKey);
    const boundContext = canonicalContext(context);
    const directory = path.join(root, DIRECTORY);
    fs.mkdirSync(directory, { mode: 0o700 });
    const stat = fs.lstatSync(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) fail();
    writeExclusiveFile(path.join(directory, CONTEXT_FILE), Buffer.from(JSON.stringify({
      schemaVersion: 1,
      kind: 'protected-cutover-diagnostic-context',
      context: boundContext,
    }), 'utf8'));

    const handles = new Map();
    try {
      for (const phase of PHASES) {
        handles.set(phase, fs.openSync(path.join(directory, `${phase}.enc`), 'wx', 0o600));
      }
    } catch {
      for (const fd of handles.values()) {
        try { fs.closeSync(fd); } catch { /* fail closed below */ }
      }
      fail();
    }

    const state = new Map(PHASES.map((phase) => [phase, 'reserved']));
    const journalBytes = new Map(PHASES.map((phase) => [phase, 0]));
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      let failed = false;
      for (const fd of handles.values()) {
        try { fs.closeSync(fd); } catch { failed = true; }
      }
      if (failed) fail();
    };
    const append = (phase, record, payload) => {
      try {
        const bytes = encryptedRecord({
          publicKey: key,
          context: boundContext,
          phase,
          record,
          payload,
        });
        if (bytes.length > MAX_JOURNAL_BYTES || journalBytes.get(phase) + bytes.length > MAX_JOURNAL_BYTES) fail();
        appendFully(handles.get(phase), bytes);
        journalBytes.set(phase, journalBytes.get(phase) + bytes.length);
      } catch {
        try { close(); } catch { /* stable error below */ }
        fail();
      }
    };
    return Object.freeze({
      start(phase) {
        if (closed || !validPhase(phase) || state.get(phase) !== 'reserved' ||
            (phase === 'apply' && state.get('dry-run') !== 'completed')) fail();
        append(phase, 'started', { startedAtUtc: new Date().toISOString() });
        state.set(phase, 'started');
      },
      complete(phase, result) {
        if (closed || !validPhase(phase) || state.get(phase) !== 'started' || !validResult(result)) fail();
        append(phase, 'completed', {
          completedAtUtc: new Date().toISOString(),
          stdoutBase64: result.stdout.toString('base64'),
          stderrBase64: result.stderr.toString('base64'),
          status: result.status,
          signal: result.signal,
          errorCode: result.errorCode,
          durationMs: result.durationMs,
        });
        state.set(phase, 'completed');
      },
      close,
    });
  } catch {
    fail();
  }
}
