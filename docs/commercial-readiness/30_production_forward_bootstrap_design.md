# Production Forward-Bootstrap Design

> **Status — 2026-09-19: non-executable design proposal.** This document records a potential way to establish the production migration baseline without replaying unsafe historical SQL or claiming that missing effects are already present. It authorizes no database, history, setting, deployment, main-merge, or reopening action. Production remains paused.

The current design source is PR #105 staging candidate `51f1adbf9cf3446dd2405bc4bee57cd22a005759`. A future implementation must bind its own final reviewed source SHA/tree; this dated candidate is not a release authorization.

## Problem and proposal boundary

The dated production observation recorded zero migration-history rows and seven failed strict catalog groups; it was not a refreshed complete proof at this design date. The current source proposes 55 history repairs and 13 forward executions, but normal `db push` cannot reach the later saved-filter reconciliation while the earlier unsafe `20260130212612_create_user_filters.sql` is unrecorded. That historical file must not be replayed over its existing table.

The proposed alternative is **forward-first bootstrapping**. It is not yet a safe or approved procedure. It would run only the existing 13 execute migrations through the normal reviewed Supabase CLI, from a separately materialized migration directory. It never runs raw `psql` DDL, manually inserts migration history, marks a forward version as repaired, or recreates weaker legacy policies solely to satisfy a ledger row.

The 13-file source set is the current proposed execute order from `supabase/migration-baseline-manifest.json`. A later reviewed reconciliation may change that proposal:

1. `20260314000001`
2. `20260314000002`
3. `20260614000000`
4. `20260615000000`
5. `20260709194903`
6. `20260710144000`
7. `20260710150000`
8. `20260831200026`
9. `20260909115242`
10. `20260910094517`
11. `20260910115024`
12. `20260910184840`
13. `20260910184841`

## Required reviewed implementation

A future code PR must add, test, and review a dedicated forward-bootstrap mode. It must bind an immutable full-repository source SHA/tree and a separate subset manifest containing the ordered file names, raw-byte SHA-256 values, and Git blob identities. The subset manifest must be derived from the immutable source and kept outside the asserted source identity so it is not self-referential.

Admission must fail closed in stages. Before executable verification, target access, or TLS access, validate the dedicated mode, standing authorization scope, immutable clean source identity, and exact subset plan locally. Then verify the approved executable versions and hashes, certificate integrity, verify-full TLS, and three-way target binding before performing the bounded read-only preflight. Before spawning any write-capable CLI operation, require fresh exact observed-state and prerequisite proofs, matching dry-run output, and evidence that the separately approved cleanup and isolation gates are satisfied. Unknown drift or incomplete proof stops admission. Standing authorization for reviewed required forward migrations remains applicable; this design adds no separate per-apply owner approval requirement.

The mode must create a disposable, access-controlled working copy containing only those byte-identical migration files, keep any CLI link and target material private, and use the normal reviewed Supabase CLI `db push` path. A dry run must print exactly the ordered 13-file set before any future apply. The CLI must record the applied forward migrations; the implementation must verify the relationship between committed effects and history rather than assume it. Any extra, missing, reordered, or changed file stops the operation.

Pinned CLI 2.115.0 must prove its history-recording and transaction behavior for these files before this design can be used; several immutable files contain explicit transaction boundaries. On any failure or uncertain result, stop, preserve redacted output, and inspect the current migration's physical effects and history through fresh connections before a reviewed continuation plan. Do not assume a recorded prefix fully describes physical state, retry automatically, or use history repair to pretend that a forward file applied.

## Preconditions and proof model

Before **any** write, including the separately gated cleanup of the 48 saved filters whose owners are absent, complete and prove database, Data API, Realtime, direct-client, and application traffic isolation. The seasonal pause is retained but is not sufficient technical isolation. Isolation must remain active through every forward migration, proof, and any later repair.

The forward subset must first pass against a guarded local fixture that reproduces the redacted production pre-forward profile, including zero initial history rows, all guard dependencies, and the seven dated failed catalog groups. A reviewed fixture-profile manifest must enumerate the exact admitted objects, attributes, data aggregates, known variants, and unknown-state rejection cases. A clean canonical chain is not enough. Rehearsals must cover successful prefixes and failures at each relevant transaction/history boundary. After a failure, distinguish original drift, a proved successful prefix, and uncertain current-file or partial effects using fresh physical-state and history evidence; leave ambiguous effects unclassified and prohibit automatic continuation. The current trigger attributes may fail the strict guards in `20260910184840` and `20260910184841`; that is a stop condition requiring an additional reviewed forward migration, never a weakened guard or history workaround. The saved-filter migration keeps its in-transaction zero-orphan/empty/overlength guard, so cleanup is a separate approval and must happen before a future subset apply.

After a successful future bootstrap and strict final catalog proof, ledger rows may be signed only as **observed**, **reconstructed**, or **superseded** state-equivalence evidence. Each row must enumerate every material effect of the exact source migration, its precise state-equivalence predicate, independent pre- and post-forward evidence, applicable data-preservation evidence, and any exact ordered later forward lineage that reconstructs or supersedes that effect. Missing historical execution evidence must be stated explicitly. A catalog pass, representation fingerprint, or lexical match alone cannot establish semantic equivalence or sign a row. Any unsupported effect keeps the row UNPROVED. This supports a future history baseline; it does not claim that the historical migration originally executed. The existing 55-row ledger remains entirely unsigned and unproved until that work is complete.

## Gates and ordering

The implementation is proposed as these explicitly ordered, independently reviewed PRs. This scope split is part of PR #107 review; it does not waive the complete bootstrap acceptance gate:

1. **Design PR #106 (merged):** documentation and evidence pointers only.
2. **Offline preparation PR #107 (merged):** a non-executable source-only subset preparer, its negative regression cases, full local application/pause verification and synchronized evidence. Its receipt confers no approval, contains no target material, and cannot be used by the hosted runner. The dated 2026-09-19 record below is preserved as history; it is not a current review gate.
3. **Preparation/rehearsal component:** the bounded captured-schema reconstruction, synthetic 13-file rehearsal, redacted repayment permission-profile collection, and portable private-workspace/admission controls. It must retain failed observations, reject incomplete or unsafe states, and document exact coverage limits. Before any target materialization, it must prove a trusted owner chain with narrowly accepted operating-system owners and a negative untrusted-parent-owner case. Before its own merge, it requires full local suites and all other applicable quality gates, an exact-head review, and synchronized evidence. It is always blocked from a target until the next component is reviewed.
4. **Future bootstrap implementation PR:** the complete guarded admission path, production-profile fixture coverage, pinned-CLI transaction/history and uncertain-failure tests, cleanup/isolation collectors, exact dry-run matching, production-fixture migration proof, full local suites, and synchronized runbook/policy changes. The current production non-dry-run block remains unchanged until this separate implementation passes review. Only then may a future hosted operation be proposed under all existing gates.

Standing authorization covers reviewed required forward migration applies after their prerequisites pass. It does not cover the separate cleanup, traffic-isolation/settings changes, history repair, main merge, deployment, or reopening decisions. The current production non-dry-run block remains in force until an implementation PR changes it under review.

Evidence for the observed policy/function differences is recorded separately in [production definition comparison](evidence/production-definition-comparison-2026-09-19.md). This design does not classify those differences as equivalent or accepted.

## Implementation progress — 2026-09-19

The design PR #106 merged at staging `7cbbb11e7f5038a14519d89f2de524e6463dbf98`. The first implementation component is an offline, source-only subset preparer. It is not the dedicated bootstrap mode or the private CLI working copy. PR #107 proposes independent review of this non-executable component while retaining every complete-bootstrap acceptance gate above. The refreshed 01abdf7 component evidence records 3,519 passing Vitest tests and 163 passed / 47 classified skipped Playwright tests; the prior 856c933 receipts remain historical evidence. The [preparation evidence](evidence/forward-subset-preparation-2026-09-19.md) records its trusted-input boundary, completed component checks, and outstanding production-profile, CLI transaction/history and final review gates. Production apply remains blocked.

## Preparation/rehearsal component — 2026-09-20

PR #107 review status is historical and superseded by the later staging baseline at `aac11ff8527e5c6696f4cee7089ae86a7cbc87f2`; it is not a pending acceptance gate for this component. Local work retained failed schema reconstructions 1–4, then matched 14/14 captured groups on attempt 5. The declared synthetic post-cleanup derivative applied the unchanged 13-file subset and passed strict 16/16. The separate redacted production permission collection recorded an unchanged 61-row baseline and the two repayment-map hashes with four and five represented roles. Current candidate `7473bb2e829966a71e52bcbeff6f24e5dc094c9f` passed full Vitest 3,563/3,563, TypeScript, zero-error ESLint, and its named staging-preview build; exact Playwright passed 163 tests with 47 individually classified skips and zero failures/errors; final exact-head review remains pending. These facts support preparation only: all 55 repair-ledger rows remain UNPROVED and unsigned, no cleanup/isolation collector is implemented, and no target bootstrap is complete. [Evidence](evidence/production-bootstrap-preparation-2026-09-20.md).
