import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = dirname(fileURLToPath(import.meta.url));
const root = resolve(source, '../..');
const approvedOutputPrefix = 'output/production-pause';

function comparable(path) {
  const normalized = path.replace(/\\/g, '/');
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

export function relativePathSegments(value) {
  return relative(root, resolve(root, value))
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean);
}

export function resolveOutputDirectory(value = process.env.PRODUCTION_PAUSE_OUTPUT_DIR ?? 'output/production-pause') {
  const output = resolve(root, value);
  const local = comparable(relative(root, output));
  if (local !== approvedOutputPrefix && !local.startsWith(`${approvedOutputPrefix}-`)) {
    throw new Error('Production pause output must stay in this checkout under output/production-pause.');
  }
  return output;
}

function assertNoLinkedAncestor(output) {
  const realRoot = realpathSync(root);
  // Use the caller's exact segment casing to inspect the filesystem. On a
  // case-sensitive filesystem, lowercasing here could inspect `output` while
  // rmSync later receives `Output`, allowing a linked ancestor to be missed.
  const segments = relativePathSegments(relative(root, output));
  let current = root;
  let expected = realRoot;

  for (const segment of segments) {
    current = resolve(current, segment);
    expected = resolve(expected, segment);
    if (!existsSync(current)) continue;

    if (lstatSync(current).isSymbolicLink() || comparable(realpathSync(current)) !== comparable(expected)) {
      throw new Error('Production pause output must not traverse a symlink or junction.');
    }
  }
}

function assertPausedLock() {
  const lock = JSON.parse(readFileSync(resolve(source, 'production-pause-lock.json'), 'utf8'));
  if (!lock || lock.version !== 1 || lock.state !== 'paused' || typeof lock.purpose !== 'string') {
    throw new Error('Production pause lock is missing or invalid; refusing static artifact build.');
  }
}

function listFiles(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    const name = `${prefix}${entry.name}`;
    return entry.isDirectory() ? listFiles(path, `${name}/`) : [name];
  });
}

export function buildPauseArtifact(value) {
  assertPausedLock();
  const deployment = resolveOutputDirectory(value);
  assertNoLinkedAncestor(deployment);
  const output = resolve(deployment, '.vercel/output');
  const assets = resolve(output, 'static/assets');

  // This exact, checkout-confined directory is generated output. Remove it so stale
  // functions or linkage metadata can never survive from an earlier build.
  rmSync(deployment, { recursive: true, force: true });
  mkdirSync(assets, { recursive: true });

  const theme = readFileSync(resolve(root, 'src/app/globals.css'), 'utf8').match(/:root\s*\{[\s\S]*?\n\}/)?.[0];
  if (!theme) throw new Error('Application design tokens not found.');

  writeFileSync(resolve(assets, 'pause.css'), `${theme}\n${readFileSync(resolve(source, 'pause.css'), 'utf8')}`);
  cpSync(resolve(source, 'index.html'), resolve(output, 'static/index.html'));
  cpSync(resolve(root, 'src/app/favicon.ico'), resolve(output, 'static/favicon.ico'));
  writeFileSync(resolve(output, 'static/unavailable.json'), JSON.stringify({ error: 'SITE_PAUSED', message: 'Stena Season is taking a break until further notice.' }));
  writeFileSync(resolve(output, 'static/robots.txt'), 'User-agent: *\nDisallow: /\n');
  cpSync(resolve(source, 'output-config.json'), resolve(output, 'config.json'));
  writeFileSync(resolve(deployment, 'vercel.json'), JSON.stringify({ crons: [] }, null, 2));

  const expected = ['.vercel/output/config.json', '.vercel/output/static/assets/pause.css', '.vercel/output/static/favicon.ico', '.vercel/output/static/index.html', '.vercel/output/static/robots.txt', '.vercel/output/static/unavailable.json', 'vercel.json'];
  const actual = listFiles(deployment).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error('Production pause artifact contains an unexpected file.');
  }
  if (existsSync(resolve(output, 'functions')) || existsSync(resolve(deployment, '.vercel/project.json'))) {
    throw new Error('Production pause artifact must not contain functions or Vercel linkage metadata.');
  }

  return deployment;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Static production-pause artifact built: ${buildPauseArtifact()}`);
}
