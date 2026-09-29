---
title: 'Story 22.15 follow-up: Project the actual permission aggregate into its historical fingerprint'
type: 'bugfix'
created: '2026-09-29'
status: 'in-progress'
baseline_commit: '3c6dd2fc24d8686787a95289eb00e50e9a753694'
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/docs/commercial-readiness/27_supabase_cutover_runbook.md'
---

<frozen-after-approval reason="existing owner-authorized Story 22.15 investigation and fixes; production gates remain separate">

## Intent

**Problem:** The actual production aggregate parser returns `permission_baseline.rows`, while the strict observed-profile assessor requires `permission_baseline.rows_sha256`. The collector forwards the unprojected shape, so even a matching database is necessarily rejected. The historical fingerprint hashes PostgreSQL `jsonb_agg(...)::text`; compact JavaScript JSON is not equivalent.

**Approach:** Validate the actual query result, summarize only the permission-baseline rows into the existing historical fingerprint representation in memory, and send that exact summary to the unchanged strict assessor. Preserve SQL ordering and PostgreSQL serialization. Test the real parser contract and negative cases, then complete exact-source release verification.

## Boundaries & Constraints

**Always:** Implement in this isolated `codex/` checkout. Keep the historical permission fingerprint, all 68 migration files, manifest, cleanup SQL, strict catalog SQL/verifier, original frozen Story 22.15 specification, source/target/TLS checks and failure redaction unchanged. Story 22.15 remains in-progress; Epic 23 on hold; production paused/no-go. Root owns coordinated resource admission and release verification. Keep every incomplete gate explicit.

**Ask First:** Main merge, production writes, history repair, cleanup, deployment, settings changes or reopening require their separate existing owner gates. This follow-up adds no hosted authority.

**Never:** Accept unknown permission keys, discard mismatches, substitute a new baseline hash, sort fingerprints by unavailable raw keys, persist individual permission rows, change historical skips, launch unmanaged workloads, alter user-owned resources, or expose credentials/records/private deployment identifiers.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Actual query shape | Valid aggregate parsed by the real redactor, including permission fingerprint rows | Collector observation retains counts and replaces only `rows` with SHA-256 of exact PostgreSQL jsonb array text | Unchanged assessor remains authoritative and non-admitting |
| Serialization | Fixed public synthetic rows, including reversed object insertion order | PostgreSQL spaces and fixed key order; preserve array order | Never hash compact JSON or reorder rows |
| Drift | Changed permission hash, reversed row order or changed counts | Changed summary remains visible to strict comparison | Reject through unchanged baseline contract |
| Invalid input | Missing/extra fields, malformed hashes, inconsistent counts, sparse arrays, accessors/prototypes, split output | Refuse before projection/persistence | Generic redacted collector failure |
| Privacy | Valid result summarized in memory | Returned observation contains no permission-baseline row array or individual fingerprint keys | No raw rows, definitions or errors in receipts |

</frozen-after-approval>

## Code Map

- `src/lib/release/collect-production-observed-profile.mjs` — `runTwoPhaseObservedProfileAggregate` parses actual aggregate; `collectProductionObservedProfile` currently forwards it unchanged near line 453. Add a narrow validated projection at this boundary, using existing hash and plain-data checks where suitable.
- `src/lib/release/production-profile-redaction.mjs` — actual parser/`validateAggregateProfile` requires exact permission-baseline counts and `rows`; retain this read-only query contract.
- `src/lib/release/production-observed-profile.mjs` — unchanged strict assessor requires counts and `rows_sha256`; expected hash is `f0ed65806763de0eb6653583b5d2dcf86f3c3a8c75cc5d2b070ca301bb5625b1`.
- `src/lib/release/production-observed-aggregate.sql` lines 211–220 — row ordering uses raw column name then permissions text, both NULLS FIRST. Retain parser array order.
- `src/lib/release/production-filter-cleanup-draft.mjs` — preservation SQL proves historical canonicalization: SHA256 of `jsonb_agg(jsonb_build_object('column_name_md5',...,'role_permissions_sha256',...) ORDER BY ...)::text`. Render hash-string pairs with the shorter key first and spaces after colons/commas; use a narrow formatter rather than generalizing boolean-only `canonicalPostgresJsonb`.
- `tests/unit/epic-22/story-22.15/collect-production-observed-profile.test.ts` — existing clock test mocks the parser too loosely. Replace its aggregate with a valid synthetic fixture and add real-parser projection regression/negative cases. Preserve clock/source/process-boundary coverage.

## Tasks & Acceptance

**Execution:**
- [ ] Collector — add validated in-memory summary and wire it into actual observation; leave the strict assessor unchanged.
- [ ] Focused tests — red/green regression using the real aggregate parser, exact public PostgreSQL text/hash fixture, privacy and negative cases; preserve existing contracts.
- [ ] Root local gates — independent focused tests, exact `npx vitest run`, exact `npx playwright test`, TypeScript, zero-error lint and build at committed implementation; use the guard and required local DB/matrix/live evidence.
- [ ] Root evidence/status — publish exact source/counts/skips/durations and current limitation; synchronize applicable status/story/evidence surfaces without changing story/epic state.
- [ ] Root review — reviewed PR against staging with exact final-head checks, inline review and authorized staging merge; fresh source-bound read-only proofs follow that merge.

**Acceptance Criteria:**
- Given the actual validated aggregate, when collecting, then only the permission rows become the historical PostgreSQL-text hash and other aggregate groups retain identical values.
- Given any malformed or changed permission state, when validating/projecting/assessing, then the strict proof cannot pass by normalization.
- Given new code, when reporting implementation readiness, then new regression tests and all required fresh local gates have passed; prior PR121 results are historical, not substitutes.

## Spec Change Log

## Verification

You MUST write or update tests for every code change. Before reporting completion, run the full test suite (`npx vitest run` for unit tests, `npx playwright test` for e2e) and confirm all tests pass. If any test fails, fix it. Do not report done until exit code is 0. Root coordinates guarded resources and independently repeats the required gates before accepting implementation. Until that coordinated verification finishes, report prepared implementation only, with full gates explicitly pending.

## Non-Frozen Proven Literal Correction — 2026-09-29

The frozen projection-only scope above remains unchanged: it must not alter its recorded historical literal. A separate frozen follow-up owns the proven literal correction from f0ed65806763de0eb6653583b5d2dcf86f3c3a8c75cc5d2b070ca301bb5625b1 to 643a4e803cf7c607d939d370711430d70830b858f4a42e504bba36fbbdcf39f8 and the corresponding cleanup-draft source digest dc2522077981fd51502b4ad5b5d2fb7b043da28fb73d59156a3ee8766c44ef16. The provenance record binds the public Sep 20 receipt/query digest, Sep 23 literal introduction, limited Sep 28 stability digest, and Sep 29 non-admitting fifth read-only observation.

The runtime collector must never persist its rows. The new test-only fixture is a fixed, already-redacted 61-row configuration of hash pairs; it contains no names, permission JSON, personal data, credentials, or target identifiers. Its guarded read-only PostgreSQL serialization oracle must run under the required local fixture flag. A CI no-fixture skip is classified as non-passing and cannot replace that required local execution. No strict-assessor weakening or alternate data baseline is permitted. Full gates, review, CI, staging merge, and every production gate remain pending.