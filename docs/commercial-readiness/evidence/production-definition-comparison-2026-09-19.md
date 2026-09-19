# Production definition comparison — 2026-09-19

Status: **NO-GO / diagnostic evidence only.** Story 22.15 remains in-progress; Epic 23 remains on hold. No hosted write, cleanup, repair, setting change, deployment, main merge or reopening occurred. The existing production pause was not altered. Its last Vercel observation remains dated 2026-09-15; this work did not reverify Vercel.

## Source and scope

Fresh fetch reconfirmed staging `51f1adbf9cf3446dd2405bc4bee57cd22a005759` and main `822350986f4c023948a7bbf490ddffc371185c4a`, with no intervening commits. The staging candidate is the PR #105 merge of independently reviewed head `a3e7e21556b2014db82689c9d1ea77c31d22a950`; the recorded merge tree is `23d911f608cc8fefbb40f391f3884e045b277085`. The migration manifest SHA-256 is `92cdec724eb3e084997431ec407418d7fbbc41db08d78196dfd39307b74b60fb`: 68 repository versions, 55 provisional repair candidates and 13 execute candidates. Neither diagnosis changes these classifications or proves an entire ledger row.

Two bounded read-only observations are retained:

| Observation | UTC start | Runner duration | Exit | Receipt |
| --- | --- | --- | --- | --- |
| Policy components and staffing metadata/body representation | 2026-09-19T11:57:32.318Z | 9.094 s | 0 | [Components](production-policy-components-2026-09-19-redacted.json) |
| In-memory definition comparison against immutable March/July sources | 2026-09-19T12:22:32.502Z | 13.284 s | 0 | [Comparison](production-definition-comparison-2026-09-19-redacted.json) |

These are separate snapshots, not one atomic accepted catalog profile. Each independently verified the clean source checkout and migration identities, Supabase CLI 2.115.0 and approved psql 17.11 hashes/versions, certificate integrity, verify-full TLS and three-way target binding. The initial component attempt stopped locally at the private CLI-link directory ACL check before connection. A new private isolated checkout resolved that local issue without loosening permissions.

Each query used explicit `BEGIN TRANSACTION READ ONLY` / `ROLLBACK`, default read-only mode, a 20-second statement timeout, a three-second lock timeout and a 45-second process timeout. Definitions from the second query were compared in process memory and were not saved or printed. Persisted output contains hashes, fixed labels, known role booleans and source-vocabulary-limited token differences. Unknown identifiers/literals are hashed; bounded edit summaries can be truncated. `passed: true` means the diagnostic completed, **not** that a release catalog or semantic-equivalence proof passed. Both receipts record zero hosted writes and zero repair signatures.

## Findings and their limits

- Exactly seven policies cover the expected seven table/command pairs. No extra pair was found within these three tables; this is not a full-database policy inventory.
- The saved-filter SELECT, INSERT and DELETE policies use the single role `PUBLIC`, with no unknown role. Their ownership expressions match the expected `auth.uid() = user_id` token sequence. This does not itself grant anonymous row access: the role scope and the predicate are distinct parts of the contract. The missing UPDATE policy remains unresolved by this diagnosis.
- Staffing-needs and staffing-changelog SELECT policies are scoped to `authenticated` and have the single executable token `true` for `USING`. They therefore differ materially from the expected application-role predicate. No role invocation or access test was executed by this read-only work.
- Staffing-needs UPDATE is scoped to `authenticated`; its USING and explicit WITH CHECK have the same 52-token hash, `d96ff457456dff994d22cb6b6de8b68685680a4aa5fbabb2f259d3c25edf9c0c`. The expression differs from the expected role-helper call. The redacted differences include a users lookup, caller identity and active-user fields, but are truncated: they do not establish the complete predicate or its semantic equivalence.
- Staffing-changelog INSERT is scoped to `authenticated`; its WITH CHECK has 62 tokens and hash `cfc668758f0588a8bf93dbcebdd5ecba1aff1d4a51f112786faf81b9af5f6298`. Its redacted differences are also incomplete; do not infer a complete authorization proof from them.
- The earlier same-day staffing metadata snapshot observed an invoker function with the expected signature/return shape, postgres owner, plpgsql language, no settings, and four non-owner EXECUTE grantees (PUBLIC, anon, authenticated, service_role), with no grant options. Its body MD5 was `4fd2e46d83d008a31b7c54c8edb474f6`.
- The later lexical comparison confirms real executable-token differences, not only comments/whitespace: the production staffing body has 117 tokens with SHA-256 `5a60032cb4ce7971eb4cc5829c837dc85c983e2c8868e4c085f57213b89544cd`, versus 109 historical March tokens and 203 later July tokens. Token comparison is deliberately not semantic equivalence. No production body is accepted, and `20260314000001` remains execute-only.

The seven strict catalog groups last reported as failing remain open. This work did not rerun the full catalog, migration-history, data-preservation or advisor proofs, and did not sign any of the 55 ledger rows. The 48-filter cleanup remains a dated proposed aggregate; a fresh exact cleanup proof and separate approval are still required.

## Reconciliation consequence

The saved-filter historical CREATE migration cannot be replayed over the existing table, and its missing FK/check/index/trigger/policy effects cannot truthfully be marked applied just because a later migration would restore them. This makes the repair-first plan non-executable under its own proof requirements.

The [forward-bootstrap design](../30_production_forward_bootstrap_design.md) proposes a separately reviewed forward-first mechanism: materialize only the exact reviewed execute files, use normal CLI execution/history recording under full isolation, prove the resulting state, and only then consider per-version historical baselining with explicit supersession evidence. It is not implemented or authorized to run by this document. Do not restore weaker historical policies merely to manufacture an old-state proof.

The existing 13-file sequence still needs a local fixture reproducing the observed production profile. In particular, the strict final trigger migrations may reject its current function/FK/ACL variants. Any needed additional forward migration requires its own review; no guard or historical SQL may be weakened to make the fixture pass.

## Supporting verification

Lead-agent supporting-tool tests: component package **9/9**, zero skips/failures, exit 0, 87.0997 ms; definition-comparison package **17/17**, zero skips/failures, exit 0, 129.0087 ms. Tests cover target/tool/TLS sequencing, read-only SQL bounds, exact output shapes, unknown-value redaction, migration-plan rejection cases, lexical comments/quoting, and conservative rejection of unsupported forms. These are not application release-suite results. No full Vitest, Playwright, local migration chain or hosted fixture acceptance was rerun for this diagnosis.

Component SQL SHA-256: `7efba0414851415b267b3b90422eb984130ecd1e4c527a0ca08483d01f043e4a`.
Definition SQL SHA-256: `152fac3dd08b9311755f5a0c3e1fa8239b534dce9af15e558617bbe67a34c6cd`.
Comparator SHA-256: `c3a17c48c7a49202edab2b2034923fb07a0a50f1f35f8ef630b04d91a5d9005b`.

The reviewed local support packages are retained outside Git. Their source pins, exclusive-create receipts and strict redaction are supporting tools; release catalog phases still run only through the repository verifier. The comparator follows a conservative subset of [PostgreSQL lexical rules](https://www.postgresql.org/docs/17/sql-syntax-lexical.html), rejecting unsupported quote/prefix ambiguities rather than claiming equivalence. The current [Supabase changelog](https://supabase.com/changelog) and [RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) were checked; CLI 2.115.0 and all dependency versions remain unchanged.