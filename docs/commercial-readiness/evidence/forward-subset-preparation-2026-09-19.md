# Offline forward-subset preparation — 2026-09-19

Status: **implementation in progress; production NO-GO**. Story 22.15 remains in-progress; Epic 23 remains on hold. This preparatory increment does not implement or authorize the production bootstrap operation.

## Source and change

Freshly fetched staging is PR #106 merge `7cbbb11e7f5038a14519d89f2de524e6463dbf98`; main remains `822350986f4c023948a7bbf490ddffc371185c4a`. The merge tree `cdd26e1c69c1fd9fc8701d80a18d3158671ef599` matches reviewed design head `36599803f96d617825fcaf9e3fca032135717700`. The isolated implementation starts from that staging commit.

`src/lib/release/prepare-forward-subset.mjs` materializes only the ordered execute files from an explicitly pinned, clean Git source. It verifies all 68 immutable migration files against Git bytes, excludes the 55 repair candidates, and creates an exclusive external artifact with Git blob identities, raw-byte SHA-256 values, source commit/tree and manifest hash. Verification rejects altered files, extra files, private CLI-link material, mismatched receipts and symlink/junction substitution. There is no database execution mode or hosted-runner integration. Historical SQL, the migration manifest, strict catalog, production apply block and production pause lock are unchanged.

The operator must independently obtain the reviewed full source SHA and approved absolute Git executable/hash. These are trusted inputs, not discoveries or approval claims made by this utility. A matching caller-supplied digest proves integrity relative to that pin; it does not establish that the owner approved the executable or commit. The receipt explicitly records `approvalAttested: false`, `executable: false` and `privateMaterialAllowed: false`. A future hosted wrapper must establish its own reviewed source/tooling pins and all admission gates; it must never treat this receipt as authorization. Git uses an absolute verified binary, disabled system/global configuration and filesystem monitor, and bounded read-only commands.

This artifact is **non-secret source only**, not the private CLI working copy required by the design. POSIX file modes do not attest a Windows DACL. No credentials, project links, target references or environment files may be added. Failed/incomplete artifacts are preserved and never automatically overwritten or deleted.

## Verification in progress

The initial focused regression run passed 25/25. A later 28-test attempt failed 26 tests because a Windows case-insensitive PATH restoration bug in the test harness contaminated subsequent fixture setup. The corrected harness passed **28/28, zero skipped/failed, exit 0, 54.19 seconds** before the final receipt-field additions. This is supporting evidence, not final-commit verification.

An early full `npx vitest run --maxWorkers=1` ended **3,478 passed, 33 skipped, two failed, exit 1, 714.70 seconds**. The two failures were strict catalog assertions in the inactive-authorization integration suite. It ran before final code and before the isolated fixture was prepared; it is not a passing release gate. TypeScript passed; lint reported zero errors and 296 existing warnings, also before the final code. Final exact-source suites, build, audit, review and remote checks remain pending.

That full run exposed an operational mistake: without a generated local test environment, the existing integration helper fell back to the already-running configured local database before lifecycle ownership was verified. Further database-dependent runs were stopped. The concurrency test contains committed synthetic setup and cleanup, including temporary active-admin changes; its cleanup did not report an error. A separate bounded read-only check found zero matching synthetic race rows in both application and Auth user tables. This is not a complete before/after restoration proof. No reset, adoption, stop or further write was attempted on that stack. Future test runs require explicit guarded fixture targets and must reject the configured-stack fallback before starting Vitest or Playwright.

No hosted database access, write, repair, cleanup, Vercel change, deployment, main merge or reopening occurred in this increment. The last production-pause hosted observation remains dated 2026-09-15, not a fresh verification.

## Remaining implementation gates

The reviewed [design](../30_production_forward_bootstrap_design.md) remains the authority for the future bootstrap. This increment belongs to its implementation work and cannot satisfy the implementation PR acceptance gate alone. Keep it draft until the applicable gates below are addressed or a separately reviewed scope decision explicitly isolates this non-executable component.

- Obtain a fresh bounded read-only production prerequisite profile: exact relation/column/constraint/index/policy/function/trigger candidates, unexpected-object counts/hashes, migration history, repayment aggregates, permission hashes and audit mapping/preservation aggregates. Persist only fixed labels, booleans, counts and hashes; never rows or raw definitions. Current separate diagnostic snapshots do not establish a complete atomic accepted profile.
- Reproduce only proved profile fields in a guarded synthetic local fixture. Unresolved function bodies, trigger attributes, FK/ACL variants and policy semantics remain unknown; do not fill them with canonical staging assumptions. Exercise exact-profile rejection, not broad exceptions.
- Implement the reviewed CLI-only bootstrap admission path, private working-copy controls, exact dry-run match, transaction/history boundary tests and uncertain-failure stop behavior. CLI stays 2.115.0. The current production non-dry-run block remains active.
- Prove the complete clean migration chain and the actual pre-forward fixture separately. The retained Realtime-capable fixture is useful infrastructure, not fresh proof. Run full Vitest, exact `npx playwright test`, TypeScript, lint, build, pause checks and applicable release checks at the final implementation.
- Preserve full traffic isolation before any future write, separate cleanup approval, strict final catalog and per-effect lineage proof for all 55 unsigned UNPROVED repair rows. History repair, isolation/settings, main merge, deployment and reopening remain separately gated. Standing authorization for reviewed required migrations does not waive prerequisites.
