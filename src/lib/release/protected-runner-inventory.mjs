import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { inspectForwardSource } from './prepare-forward-subset.mjs';

const SHA256 = /^[a-f0-9]{64}$/u;
const GIT_BLOB = /^[a-f0-9]{40}$/u;
const PACKAGE_INTEGRITY =
  'sha512-5QvjGxYVjxO59MGU2lHVYpRWBBtKHnlIAcSe1uNFCkkptUh63NFRj0FJQm7nR67puEruUci/ZkjmEFrjCAyP4A==';
const PAPAPARSE_PACKAGE_SHA256 =
  '33ffa1b7b9c33ceda14e25fb7d7080098fd258f80b6dea4b37e3de34029b75fd';
const PAPAPARSE_UMD_SHA256 =
  '10778b8bb3e20177c52febb99e18ec53fd97ce447f4716ca10e00bae18a98594';

const MODULES = Object.freeze([
  Object.freeze({
    path: 'src/lib/release/protected-bootstrap-worker.mjs',
    staticImports: Object.freeze(['node:crypto', 'node:url']),
    dynamicImports: Object.freeze([
      '../../../supabase/verify/run-reviewed-supabase-cli.mjs',
    ]),
  }),
  Object.freeze({
    path: 'supabase/verify/run-reviewed-supabase-cli.mjs',
    staticImports: Object.freeze([
      'node:child_process',
      'node:crypto',
      'node:fs',
      'node:path',
      'node:url',
      './verify-production-baseline-catalog.mjs',
      './verify-target-binding.mjs',
    ]),
    dynamicImports: Object.freeze([]),
  }),
  Object.freeze({
    path: 'supabase/verify/verify-production-baseline-catalog.mjs',
    staticImports: Object.freeze([
      'node:child_process',
      'node:crypto',
      'node:fs',
      'node:path',
      'node:url',
      'papaparse',
      './verify-target-binding.mjs',
    ]),
    dynamicImports: Object.freeze([]),
  }),
  Object.freeze({
    path: 'supabase/verify/verify-target-binding.mjs',
    staticImports: Object.freeze(['node:fs/promises', 'node:path', 'node:url']),
    dynamicImports: Object.freeze([]),
  }),
]);

const RECEIPT_KEYS = Object.freeze([
  'schemaVersion',
  'kind',
  'executable',
  'privateMaterialAllowed',
  'approvalAttested',
  'gitExecutableSha256',
  'sourceCommit',
  'sourceTree',
  'sourceManifestSha256',
  'lockfile',
  'modules',
  'dependency',
]);
const MODULE_RECEIPT_KEYS = Object.freeze([
  'path',
  'gitBlob',
  'sha256',
  'staticImports',
  'dynamicImports',
]);
const LOCK_RECEIPT_KEYS = Object.freeze([
  'path',
  'gitBlob',
  'sha256',
  'papaparseIntegrity',
]);
const DEPENDENCY_RECEIPT_KEYS = Object.freeze([
  'name',
  'version',
  'packagePath',
  'packageJsonSha256',
  'entryPath',
  'entrySha256',
]);

const fail = () => {
  throw new Error('Protected runner inventory verification failed');
};
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function regularFile(file) {
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) fail();
  return readFileSync(file);
}

function exactKeys(value, keys) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.getOwnPropertySymbols(value).length === 0 &&
    same(Object.keys(value).sort(), [...keys].sort())
  );
}

function isIdentifierBoundary(value, index) {
  return !/[A-Za-z0-9_$]/u.test(value[index] ?? '');
}

function skipQuoted(source, start) {
  const quote = source[start];
  let index = start + 1;
  while (index < source.length) {
    if (source[index] === '\\') {
      index += 2;
    } else if (source[index] === quote) {
      return index + 1;
    } else {
      index += 1;
    }
  }
  fail();
}

function isAllowedTemplateSubstitution(expression) {
  // The one method call is an exact reviewed catalog diagnostic. Everything
  // else is a bare identifier, a property chain, or a numeric array access.
  return (
    /^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*|\[\d+\])*$/u.test(
      expression
    ) || expression === 'evaluation.failedChecks.join(", ")'
  );
}

function skipTemplateSubstitution(source, start) {
  let index = start;
  while (index < source.length) {
    if (source[index] === '\\') fail();
    if (source[index] === "'" || source[index] === '"') {
      index = skipQuoted(source, index);
      continue;
    }
    if (source[index] === '`' || source[index] === '{') fail();
    if (source[index] === '}') {
      const expression = source.slice(start, index).trim();
      if (!isAllowedTemplateSubstitution(expression)) fail();
      return index + 1;
    }
    index += 1;
  }
  fail();
}

function skipTemplate(source, start) {
  let index = start + 1;
  while (index < source.length) {
    if (source[index] === '\\') {
      index += 2;
      continue;
    }
    if (source[index] === '`') return index + 1;
    if (source[index] === '$' && source[index + 1] === '{') {
      index = skipTemplateSubstitution(source, index + 2);
      continue;
    }
    index += 1;
  }
  fail();
}

function skipTrivia(source, start) {
  let index = start;
  while (index < source.length) {
    if (/\s/u.test(source[index])) {
      index += 1;
      continue;
    }
    if (source.startsWith('//', index)) {
      const next = source.indexOf('\n', index + 2);
      index = next === -1 ? source.length : next + 1;
      continue;
    }
    if (source.startsWith('/*', index)) {
      const next = source.indexOf('*/', index + 2);
      if (next === -1) fail();
      index = next + 2;
      continue;
    }
    return index;
  }
  return index;
}

function quotedSpecifier(source, start) {
  const quote = source[start];
  if (quote !== "'" && quote !== '"') fail();
  let value = '';
  let index = start + 1;
  while (index < source.length) {
    if (source[index] === '\\') fail();
    if (source[index] === quote) return { value, next: index + 1 };
    if (source[index] === '\n' || source[index] === '\r') fail();
    value += source[index++];
  }
  fail();
}

function closePlainLocalExportList(source, start) {
  let index = start + 1;
  while (index < source.length) {
    // A re-export list can contain comments and quoted export names. The
    // fixed graph has neither, so refusing those forms prevents a delimiter
    // inside one from hiding a following `from` dependency.
    if (
      source.startsWith('//', index) ||
      source.startsWith('/*', index) ||
      source[index] === "'" ||
      source[index] === '"' ||
      source[index] === '`' ||
      source[index] === '{' ||
      source[index] === '\\'
    ) {
      fail();
    }
    if (source[index] === '}') return index;
    index += 1;
  }
  fail();
}

/**
 * This small scanner rejects JavaScript module syntax outside the fixed graph.
 * It is deliberately not a generic dependency resolver or a semantic parser.
 */
export function inspectReviewedModuleImports(source) {
  if (typeof source !== 'string') fail();
  const statics = [];
  const dynamics = [];
  let index = 0;
  while (index < source.length) {
    const current = source[index];
    if (current === "'" || current === '"') {
      index = skipQuoted(source, index);
      continue;
    }
    if (current === '`') {
      index = skipTemplate(source, index);
      continue;
    }
    if (source.startsWith('//', index)) {
      const next = source.indexOf('\n', index + 2);
      index = next === -1 ? source.length : next + 1;
      continue;
    }
    if (source.startsWith('/*', index)) {
      const next = source.indexOf('*/', index + 2);
      if (next === -1) fail();
      index = next + 2;
      continue;
    }
    if (
      source.startsWith('require', index) &&
      isIdentifierBoundary(source, index - 1) &&
      isIdentifierBoundary(source, index + 'require'.length)
    ) {
      fail();
    }
    if (
      source.startsWith('export', index) &&
      isIdentifierBoundary(source, index - 1) &&
      isIdentifierBoundary(source, index + 'export'.length)
    ) {
      const cursor = skipTrivia(source, index + 'export'.length);
      // Re-export forms are module dependencies and do not belong in this
      // fixed closure. Plain local export lists remain ordinary declarations.
      if (source[cursor] === '*') fail();
      if (source[cursor] === '{') {
        const close = closePlainLocalExportList(source, cursor);
        const afterList = skipTrivia(source, close + 1);
        if (
          source.startsWith('from', afterList) &&
          isIdentifierBoundary(source, afterList - 1) &&
          isIdentifierBoundary(source, afterList + 'from'.length)
        ) {
          fail();
        }
        index = close + 1;
        continue;
      }
      index = cursor;
      continue;
    }
    if (
      !source.startsWith('import', index) ||
      !isIdentifierBoundary(source, index - 1) ||
      !isIdentifierBoundary(source, index + 'import'.length)
    ) {
      index += 1;
      continue;
    }

    let cursor = skipTrivia(source, index + 'import'.length);
    if (source[cursor] === '.') {
      if (!source.startsWith('.meta', cursor)) fail();
      index = cursor + '.meta'.length;
      continue;
    }
    if (source[cursor] === '(') {
      cursor = skipTrivia(source, cursor + 1);
      const parsed = quotedSpecifier(source, cursor);
      cursor = skipTrivia(source, parsed.next);
      if (source[cursor] !== ')') fail();
      dynamics.push(parsed.value);
      index = cursor + 1;
      continue;
    }
    if (source[cursor] === "'" || source[cursor] === '"') {
      const parsed = quotedSpecifier(source, cursor);
      statics.push(parsed.value);
      index = parsed.next;
      continue;
    }

    const from = /\sfrom\s+(['"])([^'"\\\r\n]+)\1/u.exec(
      source.slice(cursor)
    );
    if (!from || from.index === undefined) fail();
    const clause = source.slice(cursor, cursor + from.index);
    if (!/^[A-Za-z0-9_$*{},\s]+$/u.test(clause)) fail();
    statics.push(from[2]);
    index = cursor + from.index + from[0].length;
  }
  return { statics, dynamics };
}

export function assertReviewedModuleImports(
  source,
  { staticImports, dynamicImports } = {}
) {
  if (!Array.isArray(staticImports) || !Array.isArray(dynamicImports) ||
      [...staticImports, ...dynamicImports].some((value) => typeof value !== 'string')) {
    fail();
  }
  const discovered = inspectReviewedModuleImports(source);
  if (!same(discovered.statics, staticImports) || !same(discovered.dynamics, dynamicImports)) {
    fail();
  }
  return discovered;
}

function sourceModule({ root, git, commit, expected }) {
  const entry = git(root, ['ls-tree', commit, '--', expected.path])
    .toString('utf8')
    .trim();
  const match = /^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/u.exec(entry);
  if (!match || match[3] !== expected.path) fail();
  const gitBytes = git(root, ['cat-file', 'blob', match[2]]);
  if (!regularFile(path.join(root, expected.path)).equals(gitBytes)) fail();
  const discovered = assertReviewedModuleImports(gitBytes.toString('utf8'), expected);
  return Object.freeze({
    path: expected.path,
    gitBlob: match[2],
    sha256: sha256(gitBytes),
    staticImports: [...discovered.statics],
    dynamicImports: [...discovered.dynamics],
  });
}

function sourceLockfile({ root, git, commit }) {
  const entry = git(root, ['ls-tree', commit, '--', 'pnpm-lock.yaml'])
    .toString('utf8')
    .trim();
  const match = /^(100644|100755) blob ([a-f0-9]{40})\tpnpm-lock\.yaml$/u.exec(
    entry
  );
  if (!match) fail();
  const bytes = git(root, ['cat-file', 'blob', match[2]]);
  if (!regularFile(path.join(root, 'pnpm-lock.yaml')).equals(bytes)) fail();
  const lock = bytes.toString('utf8');
  const packageEntry = /^  papaparse@5\.5\.3:\r?\n    resolution: \{integrity: (sha512-[A-Za-z0-9+/]+={0,2})\}\r?$/mu.exec(
    lock
  );
  if (!packageEntry || packageEntry[1] !== PACKAGE_INTEGRITY) fail();
  return Object.freeze({
    path: 'pnpm-lock.yaml',
    gitBlob: match[2],
    sha256: sha256(bytes),
    papaparseIntegrity: PACKAGE_INTEGRITY,
  });
}

function installedPapa(root) {
  const packagePath = 'node_modules/papaparse/package.json';
  const entryPath = 'node_modules/papaparse/papaparse.js';
  const packageBytes = regularFile(path.join(root, packagePath));
  const entryBytes = regularFile(path.join(root, entryPath));
  let metadata;
  try {
    metadata = JSON.parse(packageBytes.toString('utf8'));
  } catch {
    fail();
  }
  if (
    !metadata ||
    typeof metadata !== 'object' ||
    metadata.name !== 'papaparse' ||
    metadata.version !== '5.5.3' ||
    metadata.main !== 'papaparse.js' ||
    sha256(packageBytes) !== PAPAPARSE_PACKAGE_SHA256 ||
    sha256(entryBytes) !== PAPAPARSE_UMD_SHA256
  ) {
    fail();
  }
  return Object.freeze({
    name: 'papaparse',
    version: '5.5.3',
    packagePath,
    packageJsonSha256: PAPAPARSE_PACKAGE_SHA256,
    entryPath,
    entrySha256: PAPAPARSE_UMD_SHA256,
  });
}

function validateModule(module, expected) {
  return (
    exactKeys(module, MODULE_RECEIPT_KEYS) &&
    module.path === expected.path &&
    GIT_BLOB.test(module.gitBlob ?? '') &&
    SHA256.test(module.sha256 ?? '') &&
    same(module.staticImports, expected.staticImports) &&
    same(module.dynamicImports, expected.dynamicImports)
  );
}

/**
 * Structural validation only. It cannot bless a modified checkout or installed
 * dependency; `inspectProtectedRunnerInventory` does that work independently.
 */
export function validateProtectedRunnerInventory(receipt) {
  if (
    !exactKeys(receipt, RECEIPT_KEYS) ||
    receipt.schemaVersion !== 1 ||
    receipt.kind !== 'offline-protected-runner-inventory' ||
    receipt.executable !== false ||
    receipt.privateMaterialAllowed !== false ||
    receipt.approvalAttested !== false ||
    !SHA256.test(receipt.gitExecutableSha256 ?? '') ||
    !GIT_BLOB.test(receipt.sourceCommit ?? '') ||
    !GIT_BLOB.test(receipt.sourceTree ?? '') ||
    !SHA256.test(receipt.sourceManifestSha256 ?? '') ||
    !exactKeys(receipt.lockfile, LOCK_RECEIPT_KEYS) ||
    receipt.lockfile.path !== 'pnpm-lock.yaml' ||
    !GIT_BLOB.test(receipt.lockfile.gitBlob ?? '') ||
    !SHA256.test(receipt.lockfile.sha256 ?? '') ||
    receipt.lockfile.papaparseIntegrity !== PACKAGE_INTEGRITY ||
    !Array.isArray(receipt.modules) ||
    receipt.modules.length !== MODULES.length ||
    !receipt.modules.every((module, index) => validateModule(module, MODULES[index])) ||
    !exactKeys(receipt.dependency, DEPENDENCY_RECEIPT_KEYS) ||
    !same(receipt.dependency, {
      name: 'papaparse',
      version: '5.5.3',
      packagePath: 'node_modules/papaparse/package.json',
      packageJsonSha256: PAPAPARSE_PACKAGE_SHA256,
      entryPath: 'node_modules/papaparse/papaparse.js',
      entrySha256: PAPAPARSE_UMD_SHA256,
    })
  ) {
    fail();
  }
  return Object.freeze({
    ...receipt,
    lockfile: Object.freeze({ ...receipt.lockfile }),
    modules: Object.freeze(
      receipt.modules.map((module) =>
        Object.freeze({
          ...module,
          staticImports: Object.freeze([...module.staticImports]),
          dynamicImports: Object.freeze([...module.dynamicImports]),
        })
      )
    ),
    dependency: Object.freeze({ ...receipt.dependency }),
  });
}

/**
 * Reads only public, immutable source and the fixed installed PapaParse UMD
 * module. The result is an offline receipt, never launch or target authority.
 */
export function inspectProtectedRunnerInventory(options = {}) {
  const first = inspectForwardSource(options);
  const modules = MODULES.map((expected) =>
    sourceModule({
      root: first.root,
      git: first.git,
      commit: options.commit,
      expected,
    })
  );
  const lockfile = sourceLockfile({
    root: first.root,
    git: first.git,
    commit: options.commit,
  });
  const dependency = installedPapa(first.root);

  // Re-run the existing clean, pinned-source proof after all local reads.
  const final = inspectForwardSource(options).receipt;
  if (
    first.receipt.sourceCommit !== final.sourceCommit ||
    first.receipt.sourceTree !== final.sourceTree ||
    first.receipt.sourceManifestSha256 !== final.sourceManifestSha256
  ) {
    fail();
  }
  return validateProtectedRunnerInventory({
    schemaVersion: 1,
    kind: 'offline-protected-runner-inventory',
    executable: false,
    privateMaterialAllowed: false,
    approvalAttested: false,
    gitExecutableSha256: first.receipt.gitExecutableSha256,
    sourceCommit: first.receipt.sourceCommit,
    sourceTree: first.receipt.sourceTree,
    sourceManifestSha256: first.receipt.sourceManifestSha256,
    lockfile,
    modules,
    dependency,
  });
}
