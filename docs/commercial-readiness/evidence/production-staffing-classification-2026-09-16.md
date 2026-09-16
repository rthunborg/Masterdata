# Production staffing classification — 2026-09-16

Status: **NO-GO.** Story 22.15 remains in-progress and Epic 23 remains on hold. The pause status here relies on the recorded 2026-09-15 observation; this follow-up made no fresh Vercel inspection.

## Immutable candidate and scope

The current staging candidate is `6874ef20f5b8b3f9a5ac78a582c0ae1d7a580651`. It merged the independently reviewed, documentation-only PR #103 head `4d5cfe4ac350bf7ffd148d20991b9ae5b14670c0`; the merge tree matches the reviewed tree. Main remains `822350986f4c023948a7bbf490ddffc371185c4a`.

This record describes the production migration-history classification and its fail-closed CLI validation. The current wrapper permits the exact production dry run but intentionally rejects every production non-dry-run `db push` before executable, target, or TLS access. No migration SQL, catalog verifier behavior, hosted database, hosted setting, deployment, main branch, or production pause was changed. Local release gates for the resulting candidate remain pending.

## Staffing security-mode correction

The 2026-09-16 redacted production diagnosis observed `public.update_staffing_need(text, integer, uuid)` as `SECURITY INVOKER`. Immutable migration `20260314000001_add_update_staffing_need_rpc.sql` declares `SECURITY DEFINER`, so that migration's material effect is absent and cannot be repaired into production history.

`20260314000001` is therefore the first of the proposed **13 forward executes**, followed by `20260314000002_add_headcount_upper_bound.sql`. The latter remains execute-only because the exact lower-only `headcount_need >= 0` constraint is represented, while its upper-bound effect is not. The current plan is **55 repair candidates plus 13 executes**; it is not an executable production apply procedure.

This creates no accepted pre-apply catalog exception and does not relax the strict catalog. Before the staffing execute, a reviewed fail-closed per-function proof must bind the exact signature, owner, language, security mode, pinned settings, body predicates, and non-owner `EXECUTE` grants including grant options. The legacy definer interval remains fully isolated; no application, Data API, direct-database, Realtime, scheduled-job, worker, or external-consumer path may be restored during it. A partial apply stops the window with no automatic retry.

## Open gates

Strict `production_pre_apply` still fails seven of sixteen groups. The 55-row history-effect ledger remains unsigned. The separately proposed 48-filter cleanup remains outside migrations and needs its own exact approval after fresh evidence. Production traffic isolation and settings changes, history repair, main merge, deployment, and reopening remain separate owner decisions.

The bounded production read-only diagnostic ran at `2026-09-16T13:11:09.133Z` against candidate `6874ef20f5b8b3f9a5ac78a582c0ae1d7a580651` and manifest SHA-256 `d61d5cca0754f60e55dfea9ccfc4a8d4b39d0861aa3df732035fb12f4169ed01`; reviewed tooling, TLS, and three-way target binding passed, while `hostedWriteAttempted=false` and `repairProofsSigned=0`. It found an invoker staffing RPC with body MD5 `4fd2e46d83d008a31b7c54c8edb474f6`, matching neither the immutable 2026-03 nor later 2026-07 body; the hash identifies a representation only and is not semantic proof. This material unknown blocks exact staffing-profile evaluation, creates no accepted catalog state, and ends hosted diagnostics for this follow-up. The audit FK exactly maps the legacy identity representation: 202 non-null actors lack canonical application-ID matches, zero lack legacy matches, and no row was changed, so this is not evidence of data loss. All seven production policy-profile labels mismatch and require per-policy decomposition before any history-effect ledger row can be signed. The manifest observes **56 repair candidates plus 12 forward applies**; the **55 repairs plus 13 executes** plan remains a proposal that requires a separately reviewed safe staffing profile and is not established by this result. The redacted receipt is [recorded separately](production-detail-diagnosis-2026-09-16-redacted.json).

The in-progress local integration regression covers the old invoker state, immutable definer transition, and later caller-bound hardening; it passed 8/8 with zero skips in 6.48 seconds in the shared working tree. This focused result is not a final-head release gate. Full local gates, review, and all hosted proofs remain pending.
