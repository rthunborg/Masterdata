---
title: 'Story 22.15 follow-up: Correct the proven observed-permission fingerprint literal'
type: 'bugfix'
created: '2026-09-29'
status: 'in-progress'
baseline_commit: '3c6dd2fc24d8686787a95289eb00e50e9a753694'
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/docs/commercial-readiness/evidence/production-observed-permission-fingerprint-correction-2026-09-29.md'
---

<frozen-after-approval reason="separate, evidence-proven literal correction; the original Story 22.15 intent and the projection-only follow-up remain frozen">

## Intent

Correct only the proven expected permission-baseline fingerprint from f0ed65806763de0eb6653583b5d2dcf86f3c3a8c75cc5d2b070ca301bb5625b1 to 643a4e803cf7c607d939d370711430d70830b858f4a42e504bba36fbbdcf39f8. The correction is supported by the committed September 20 receipt/query digest, the September 23 canonical PostgreSQL query, and the later redacted non-admitting observation.

This follow-up is distinct from the projection-only follow-up. That follow-up must preserve its frozen literal while it corrects shape projection. This follow-up owns the two expected-literal changes and the resulting cleanup-draft source digest.

## Boundaries

Keep the PostgreSQL query text, ordering, permission JSON, all 68 migration SQL files, strict catalog SQL/verifier, historical receipt files, and original frozen Story 22.15 specification unchanged. Do not replace or delete failed compact or PostgreSQL-jsonb diagnostics. Do not claim a collection, suite, CI, review, merge, or hosted gate has passed until newly recorded evidence exists.

Story 22.15 stays in-progress; Epic 23 stays on-hold; production stays paused/no-go. No cleanup, repair, apply, setting change, deployment, main merge, reopening, or other hosted authority is added.

## Required implementation and verification

- Update only the strict observed-profile expected fingerprint and the cleanup preservation expected fingerprint.
- Recompute the cleanup source digest to dc2522077981fd51502b4ad5b5d2fb7b043da28fb73d59156a3ee8766c44ef16.
- Add a fixed, already-redacted 61-row configuration-hash-pair fixture that proves the exact PostgreSQL-jsonb result is 643a4e…, rejects f0ed…, preserves array order, and exposes no names, permission JSON, personal data, credentials, or target identifiers. The runtime collector must never persist rows.
- Verify the cleanup receipt rejects a changed fingerprint and the source-integrity check accepts only the recomputed digest. The guarded read-only PostgreSQL serialization-oracle test must execute under the required local fixture flag; a CI no-fixture skip is non-passing.
- Complete fresh focused and full local gates, TypeScript, zero-error lint, build, exact-head review, CI, and authorized staging merge before any later read-only proof is proposed.

</frozen-after-approval>