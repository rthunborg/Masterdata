import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { inspectForwardSource } from './prepare-forward-subset.mjs';

const SHA40 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const fail = () => { throw new Error('Production collector source binding refused'); };

const exact = (value, keys) => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype &&
  Object.getOwnPropertySymbols(value).length === 0 &&
  JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()) &&
  Object.values(Object.getOwnPropertyDescriptors(value)).every(
    (descriptor) => descriptor.enumerable && Object.hasOwn(descriptor, 'value')
  );

function regularFileBytes(file) {
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) fail();
  return readFileSync(file);
}

function sourceClaims(source, receipt) {
  if (
    !exact(source, ['sourceSha', 'sourceTree', 'sourceManifestSha256']) ||
    !SHA40.test(source.sourceSha) ||
    !SHA40.test(source.sourceTree) ||
    !SHA256.test(source.sourceManifestSha256) ||
    source.sourceSha !== receipt.sourceCommit ||
    source.sourceTree !== receipt.sourceTree ||
    source.sourceManifestSha256 !== receipt.sourceManifestSha256
  ) fail();
  return Object.freeze({
    sourceSha: receipt.sourceCommit,
    sourceTree: receipt.sourceTree,
    sourceManifestSha256: receipt.sourceManifestSha256,
  });
}

function verifiedPath({ root, git, receipt, relative }) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || relative.includes('\\')) fail();
  const expected = path.resolve(root, relative);
  const raw = git(root, ['show', `${receipt.sourceCommit}:${relative}`]);
  if (!regularFileBytes(expected).equals(raw)) fail();
  return Object.freeze({ relative, path: expected, bytes: raw });
}

/**
 * Binds a public production collector to fixed files from a clean, pinned
 * checkout. Caller claims are compared to inspected Git facts; they never
 * approve local source or query bytes by themselves.
 */
export function bindProductionCollectorSource({
  workspace,
  source,
  sourceOptions,
  moduleUrl,
  moduleRelative,
  sourceRelatives,
  sqlRelatives,
} = {}) {
  if (
    typeof moduleUrl !== 'string' ||
    typeof moduleRelative !== 'string' ||
    !Array.isArray(sourceRelatives) ||
    sourceRelatives.length === 0 ||
    !Array.isArray(sqlRelatives) ||
    sqlRelatives.length === 0 ||
    new Set(sourceRelatives).size !== sourceRelatives.length ||
    new Set(sqlRelatives).size !== sqlRelatives.length ||
    !sourceRelatives.includes(moduleRelative) ||
    !sqlRelatives.every((relative) => sourceRelatives.includes(relative))
  ) fail();

  if (
    !exact(sourceOptions, ['commit', 'gitExecutable', 'expectedGitSha256']) ||
    typeof sourceOptions.commit !== 'string' ||
    typeof sourceOptions.gitExecutable !== 'string' ||
    typeof sourceOptions.expectedGitSha256 !== 'string'
  ) fail();

  const inspected = inspectForwardSource({ workspace, ...sourceOptions });
  const claims = sourceClaims(source, inspected.receipt);
  const verified = new Map(sourceRelatives.map((relative) => [
    relative,
    verifiedPath({ ...inspected, relative }),
  ]));
  const collectorModule = verified.get(moduleRelative);
  const loadedModule = fileURLToPath(moduleUrl);
  if (path.resolve(loadedModule) !== collectorModule.path || realpathSync(loadedModule) !== collectorModule.path) fail();
  const helperPath = path.resolve(inspected.root, 'src/lib/release/production-collector-source-binding.mjs');
  if (
    path.resolve(fileURLToPath(import.meta.url)) !== helperPath ||
    realpathSync(fileURLToPath(import.meta.url)) !== helperPath
  ) fail();

  const sql = new Map();
  for (const relative of sqlRelatives) {
    const entry = verified.get(relative);
    const text = entry.bytes.toString('utf8');
    if (!Buffer.from(text, 'utf8').equals(entry.bytes)) fail();
    sql.set(relative, text);
  }

  return Object.freeze({
    workspace: inspected.root,
    source: claims,
    sql: Object.freeze(Object.fromEntries(sql)),
    // A final clean inspection detects source mutation during tool/target
    // preflight without replacing the original verified input buffers.
    recheck() {
      const final = bindProductionCollectorSource({
        workspace,
        source: claims,
        sourceOptions,
        moduleUrl,
        moduleRelative,
        sourceRelatives,
        sqlRelatives,
      });
      for (const relative of sqlRelatives) {
        if (final.sql[relative] !== sql.get(relative)) fail();
      }
      return true;
    },
  });
}
