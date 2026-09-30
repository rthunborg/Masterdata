# Observed Permission Fingerprint Correction — 2026-09-29

Story 22.15 remains **in-progress**, Epic 23 remains **on-hold**, and production remains **paused/no-go**. This record is a source and evidence correction plan. It authorizes no database read or write, cleanup, history repair, migration apply, setting change, deployment, main merge, or reopening.

## Immutable public provenance

| Date | Immutable identity | Public fact |
| --- | --- | --- |
| 2026-09-20 | Git commit ce52eedaf68d661e07a5aa5403eaeef4577bbe65; receipt blob 8bfb18aaa97c6aab53f423a1f3ea016e7f1ad8d7 | The committed redacted receipt records collection source aac11ff8527e5c6696f4cee7089ae86a7cbc87f2, tree 39defa5e7bbf7e4e0f78b91fc56ebf3f330dcdc1, 61 rows, zero null/non-object rows, the known repayment permission hashes, and rowsSha256 643a4e803cf7c607d939d370711430d70830b858f4a42e504bba36fbbdcf39f8. It declares query SHA-256 7fae1ff42fb49f33b1608a730f3ad71fd38d1e9e079251027c67c5cfb8ef7ed2. |
| 2026-09-20 | Supporting known query bytes repayment-permissions.sql, SHA-256 7fae1ff42fb49f33b1608a730f3ad71fd38d1e9e079251027c67c5cfb8ef7ed2 | The external support file hashes exactly to the receipt's declared query digest. It is supporting bytes, not a Git blob, so this record does not claim a Git object for the query itself. |
| 2026-09-23 | Git commit 3afb59cab6b0cdd1b3ca2c2a36b0b9336c149a77; observed-profile blob 903c36e352d8b1a59659322bb200912094c73682; cleanup-draft blob 44a7dd9139e0fca9bbb8536fa3bc3f8511770750; aggregate-SQL blob ff9324932abd26746bd3a9e8cbaef40fb4e83066 | This commit introduced the incorrect expected literal f0ed65806763de0eb6653583b5d2dcf86f3c3a8c75cc5d2b070ca301bb5625b1 in both strict observed-profile and cleanup preservation expectations. It also introduced the canonical PostgreSQL query: the two hashed row fields are aggregated in db_column_name NULLS FIRST, role_permissions::text NULLS FIRST order and hashed from PostgreSQL jsonb::text. |
| 2026-09-28 | Git commit d526531b1d2d295f0d5376fb2e9e649b5f92397a | The dated Realtime evidence records equal prior/current aggregate-group digest c52ede4d02dde84cb0d4738d55a5a9b780a39b063c5a098cde60deebdd92b32e. It corroborates stability only; it neither records the 61-row fingerprint nor proves query serialization. |
| 2026-09-29 | Redacted fifth rejection record SHA-256 e3445aae77f6075cd7ff4dd779d2d25a1982106c0b7582a09014b9a47ce75550 | The fifth read-only attempt produced PostgreSQL-jsonb fingerprint 643a4e803cf7c607d939d370711430d70830b858f4a42e504bba36fbbdcf39f8, with all disclosed schema, count, five known permission-row, and strict-failure comparisons matching. The record is explicitly non-admitting and contains no rows or target identifiers. |

## Findings and bounded correction

Two independent defects were found:

1. The validated aggregate carries permission_baseline.rows, whereas the strict assessor expects permission_baseline.rows_sha256. The projection fix must summarize the validated, already redacted rows using the exact PostgreSQL-jsonb representation and leave every other aggregate value unchanged.
2. The two September 23 expected literals are inconsistent with the September 20 source/tree-bound receipt, the September 23 canonical query, and the fifth read-only result. The replacement expected fingerprint is 643a4e803cf7c607d939d370711430d70830b858f4a42e504bba36fbbdcf39f8.

The narrow cleanup-draft source correction changes its current SHA-256 to dc2522077981fd51502b4ad5b5d2fb7b043da28fb73d59156a3ee8766c44ef16. Historical records that cite 39d3505a06402761b58480bbf608f9f52771d33dc28d9d09babf6e5cfa6941a2 remain historical evidence for the prior source bytes; they are not rewritten as evidence for this candidate.

The correction preserves the permission JSON, all migration SQL, the strict catalog SQL/verifier, the query ordering, and the original frozen Story 22.15 intent. The separately frozen projection follow-up keeps its previously recorded bad literal unchanged; this distinct follow-up owns the literal correction.

## Read-only diagnostic chronology

Five fresh native attempts exited 1; none produced an accepted profile or admission:

1. Attempts one through three failed before a usable accepted profile.
2. Attempt four wrote compact JSON candidate d617d5d1235f3fa3cb12b0eba95120496eb272fa4d9253d6f30d068318b9eb03. Compact JavaScript serialization is retained as a failed historical diagnostic, not a replacement baseline.
3. Attempt five used the exact PostgreSQL-jsonb formatter and produced 643a4e…; it remained rejected by the old expected literal and is retained as the redacted record above.

A separate successful three-GET platform inventory is limited to public booleans/counts/hashes. It reports readinessAssessed=false and privateOnly=UNKNOWN; it is not a readiness decision, a production proof, or authority for any action.

## Current verified local gates — 2026-09-29

Current implementation `00fd3081982ce41918f8656f21bd64c923cde901` passed fresh root-bound local gates: focused PostgreSQL-oracle 77/77 across five files with zero failures/skips (started 2026-09-29T15:20:32.822Z; 0.918s report; 1501ms wrapper; inherited byte-identically from verified-run-2); full Vitest 4516/4516 across 372 files with zero skips/failures, required matrix 8/8 and exit 0 (1424.46s report; 1433510ms wrapper); Playwright 163 passed, 47 individually matched historical skips, zero failures/errors, 210 cases and exit 0 (1033.8720819999999s report; 1037487ms wrapper); build exit 0 in 19460ms; TypeScript exit 0 in 13096ms; and ESLint exit 0 with zero errors and 304 warnings in 39017ms. The companion redacted local-only verification record is `production-observed-permission-verification-2026-09-29.{json,md}`.

Earlier evidence remains historical and non-admitting where recorded: collector-interval evidence at `188bcf64f9c9dcbb5791a5bd636583a83ba8e64e`; five native read-only failures; failed RUN2 (exit 1, nine failed files, one failed test, 4465 passed, 38 skipped; 1430634ms wrapper and 1411.80s report); early fixture preflight (exit 1, one collection-failed file, 40 passed tests and zero test failures); and the unbound inactive-authorization attempt (known one failure and ten skips, final counts and native exit unknown). The successful three-GET inventory remains limited to readinessAssessed=false and privateOnly=UNKNOWN.

Story 22.15 remains **in-progress**, Epic 23 remains **on-hold**, and production remains **paused/no-go**. Exact-head documentation review, CI, and authorized staging merge are upcoming conditional gates, not completed gates. After a reviewed staging merge, fresh read-only source/tool/target/TLS, observed-profile, staffing, and managed-principal evidence is required. Cleanup, history repair, migration apply, main merge, deployment, and reopening retain their separate gates; this update grants no hosted authority.
