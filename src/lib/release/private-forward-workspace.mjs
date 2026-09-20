import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inspectForwardSource } from './prepare-forward-subset.mjs';

const ACL_SCRIPT = 'src/lib/release/private-forward-workspace.ps1';
const CONFIG = 'project_id = "hr-production-bootstrap-preparation"\n';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fail = () => { throw new Error('Private forward workspace verification failed'); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function noReparse(target) {
  for (let item = target; ; item = path.dirname(item)) {
    if (fs.existsSync(item) && fs.lstatSync(item).isSymbolicLink()) fail();
    if (path.dirname(item) === item) break;
  }
}

function boundary(options, sourceRoot) {
  const { privateRoot, destination } = options;
  if (![privateRoot, destination].every((v) => typeof v === 'string' && path.isAbsolute(v))) fail();
  noReparse(privateRoot); noReparse(destination);
  const root = fs.realpathSync.native(privateRoot);
  const dest = path.resolve(destination);
  if (root !== path.resolve(privateRoot) || path.dirname(dest) !== root) fail();
  const relative = path.relative(sourceRoot, dest);
  if (!relative || (!relative.startsWith('..' + path.sep) && !path.isAbsolute(relative))) fail();
  return { root, dest };
}

function access(options, source, operation, root, destination) {
  if (process.platform !== 'win32') {
    for (let parent = path.dirname(root); ; parent = path.dirname(parent)) {
      const stat = fs.statSync(parent);
      if ((stat.uid !== process.getuid() && stat.uid !== 0) || ((stat.mode & 0o022) !== 0 && (stat.mode & 0o1000) === 0)) fail();
      if (path.dirname(parent) === parent) break;
    }
    const check = (target, directory) => {
      noReparse(target);
      const stat = fs.lstatSync(target);
      if (stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0 || (directory && !stat.isDirectory())) fail();
    };
    check(root, true);
    if (operation === 'create') fs.mkdirSync(destination, { mode: 0o700 });
    check(destination, true);
    const visit = (dir) => { for (const name of fs.readdirSync(dir)) { const file = path.join(dir, name); check(file, false); if (fs.lstatSync(file).isDirectory()) visit(file); } };
    visit(destination);
    return;
  }
  const executable = options.windowsPowerShellExecutable;
  if (typeof executable !== 'string' || !path.isAbsolute(executable) || !/^[a-f0-9]{64}$/.test(options.expectedWindowsPowerShellSha256 ?? '')) fail();
  noReparse(executable);
  if (hash(fs.readFileSync(executable)) !== options.expectedWindowsPowerShellSha256) fail();
  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'private-forward-workspace.ps1');
  noReparse(script);
  if (!fs.readFileSync(script).equals(source.git(source.root, ['show', options.commit + ':' + ACL_SCRIPT]))) fail();
  const env = {};
  for (const key of ['SystemRoot', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP']) if (process.env[key]) env[key] = process.env[key];
  const result = spawnSync(executable, ['-NoProfile', '-NonInteractive', '-File', script], {
    input: JSON.stringify({ operation, root, destination }), env, encoding: 'utf8', windowsHide: true, shell: false, timeout: 15000, maxBuffer: 4096,
  });
  if (result.error || result.status !== 0 || result.stderr.trim()) fail();
  let proof; try { proof = JSON.parse(result.stdout); } catch { fail(); }
  if (!same(proof, { ok: true, private: true })) fail();
}

function receiptFor(source) {
  return { ...source.receipt, kind: 'private-forward-preparation', executable: false, privateMaterialAllowed: false, approvalAttested: false, targetBound: false };
}

export function preparePrivateForwardWorkspace(options) {
  const source = inspectForwardSource(options);
  const { root, dest } = boundary(options, source.root);
  access(options, source, 'create', root, dest);
  fs.mkdirSync(path.join(dest, 'supabase'), { mode: 0o700 });
  fs.mkdirSync(path.join(dest, 'supabase', 'migrations'), { mode: 0o700 });
  fs.writeFileSync(path.join(dest, 'supabase', 'config.toml'), CONFIG, { flag: 'wx', mode: 0o600 });
  for (const migration of source.receipt.migrations) {
    fs.writeFileSync(path.join(dest, 'supabase', 'migrations', migration.file), source.contents.get(migration.version), { flag: 'wx', mode: 0o600 });
  }
  access(options, source, 'verify', root, dest);
  inspectForwardSource(options);
  // Incomplete attempts are retained without a completed receipt; never reset or delete.
  fs.writeFileSync(path.join(dest, 'private-forward-subset.json'), JSON.stringify(receiptFor(source), null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return verifyPrivateForwardWorkspace(options);
}

export function verifyPrivateForwardWorkspace(options) {
  const source = inspectForwardSource(options);
  const { root, dest } = boundary(options, source.root);
  access(options, source, 'verify', root, dest);
  const entries = (dir) => fs.readdirSync(dir).sort();
  if (!same(entries(dest), ['private-forward-subset.json', 'supabase']) || !same(entries(path.join(dest, 'supabase')), ['config.toml', 'migrations']) || !same(entries(path.join(dest, 'supabase', 'migrations')), source.receipt.migrations.map((m) => m.file).sort())) fail();
  const regular = (file) => { if (!fs.lstatSync(file).isFile() || fs.lstatSync(file).isSymbolicLink()) fail(); return fs.readFileSync(file); };
  if (regular(path.join(dest, 'supabase', 'config.toml')).toString() !== CONFIG) fail();
  if (!same(JSON.parse(regular(path.join(dest, 'private-forward-subset.json'))), receiptFor(source))) fail();
  for (const migration of source.receipt.migrations) if (hash(regular(path.join(dest, 'supabase', 'migrations', migration.file))) !== migration.sha256) fail();
  return receiptFor(source);
}
