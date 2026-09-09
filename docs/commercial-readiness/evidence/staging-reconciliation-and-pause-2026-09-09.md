# Staging reconciliation and durable production pause — 2026-09-09

Status: preparation in progress. Story 22.15 remains **in-progress**; Epic 23 remains **on hold**. No hosted write, history repair, deployment, hosted setting change, staging/main merge, or reopening occurred in this preparation.

## Authoritative Git baseline

Fresh fetch: staging `8c82bd8f4cc3c5076b2b6a37f4ced209bd8cba1c`, main `822350986f4c023948a7bbf490ddffc371185c4a`, PR #95 reviewed head `6a13898ec54c62632562c8504360ef9361b53ea5`. All match the owner-supplied state; no intervening commits. PR #95 was already explicitly authorized and merged. Isolated work uses `codex/story-22-15-reconcile-pause`. Earlier PR #95 local/remote tests remain historical evidence, not proof for this change.

## Fresh bounded staging preflight

Capture 2026-09-09T11:50:34.872Z from the unchanged staging baseline. The CurrentUser encrypted input blob hash, approved CLI **2.115.0** path/version/hash, approved psql path/version/hash, CA integrity, exact session-pooler mode, prior CLI link and three-way staging binding passed again. No credentials or private target values were printed. SQL used an explicit READ ONLY transaction, default_transaction_read_only=on, verified TLS root/hostname, 15-second statement timeout, 3-second lock timeout, and ROLLBACK. SQL SHA-256: `2ad23bcbcbb26fe263c06cb01dc740d25bb5b4bd8c61288aeeb512b2a557390a`.

| Saved-filter prerequisite | Count |
| --- | ---: |
| Total saved filters | 0 |
| Orphan auth.users references | 0 |
| Empty names | 0 |
| Names longer than 50 characters | 0 |

No row cleanup is needed for the observed snapshot. These predicates must be freshly re-proven at the reviewed pre-apply gate; they are not permanent facts.

| Repayment flag | True | False | NULL |
| --- | ---: | ---: | ---: |
| ÖMC | 0 | 1 | 32 |
| PE3 | 1 | 0 | 32 |

| Fixed column | Config rows | MD5 of permission JSON |
| --- | ---: | --- |
| diet_details | 1 | 608d8d6a5846555a137171568d7b82a5 |
| special_diet | 1 | 608d8d6a5846555a137171568d7b82a5 |
| repayment_needed_omc | 1 | 02b8319f6f054191fe4131b27e060f98 |
| repayment_needed_pe3 | 1 | 3a274a1d25cd34f07f378195bb080f29 |

A bounded name-equivalence query at 11:54:47Z confirmed `user_filters_user_id_name_key`, `user_filters_name_check`, and `user_filters_updated_at`; query SHA-256 `46f3e3b82f2a47fc8e3a41d4c373edf322b95646085fadd082b45eaa2c034b8c`. No row values were read. This supplements the prior redacted 15-check catalog failure and predicate-level diagnosis, not a passing release gate.

## Reconciliation decisions

- Preserve immutable historical migrations and all staging repayment/permission hashes. Preserve the documented admin_limited dietary view access without edit access. A clean database receives the same exact six-role dietary contract through the new forward migration; production remains subject to fresh inventory and an explicitly reviewed permission delta.
- Forward version `20260909115242` drops the filters default, canonicalizes UNIQUE/CHECK/trigger names, validates the auth.users cascade FK and nonempty/50-character name constraint, and creates the two exact standalone indexes. No historical CREATE TABLE replay, purge/reset, or data cleanup.
- Rebind the saved-filter timestamp trigger to the canonical invoker function with pinned search path. The pre-apply exception recognizes only the observed alias/body/attributes and exact shape. Post-apply requires the canonical contract.
- Canonicalize redundant room-function direct ACLs to PUBLIC + authenticated, preserving effective execution through PUBLIC. This is representation reconciliation, not a claim of broader function equivalence.
- Revised manifest: 64 versions; staging one repair then six applies; production candidate 57 catalog-proven repairs then seven applies. The new version is forward-only and cannot be repaired as applied. Every hosted gate remains separate.

## Fresh production-pause inspection

Read-only Vercel dashboard inspection completed around 12:03 UTC. The current Production Deployment panel's private deployment-ID hash matched the recorded pause ID. The production environment's Auto-Assign Custom Production Domains checkbox was off. The Cron Jobs page showed the empty onboarding state with no configured jobs. No values were revealed, buttons toggled, or settings saved. The connector's project summary does not expose the complete target/settings record, so the missing fields were verified through the authenticated dashboard; a summary of the latest preview is not production-target proof.

The original untracked pause deployment remains unchanged. Versioned preparation adds a portable static artifact, committed paused lock, production-build refusal/ignore safeguards, and empty root cron definitions. Platform-admin promotions/prebuilt uploads bypass source controls and remain explicit owner gates. These observations must be repeated before any approved production-target operation.

## Local verification and remaining gates

Pinned dependency installation with frozen lockfile and lifecycle scripts disabled passed. An agent-owned PostgreSQL 17.11 instance was started through the trusted resource guard on a distinct loopback port. An empty local Supabase auth schema was read from the healthy user-owned local stack; all original 63 immutable migration files replayed successfully in the fresh isolated database. The shared stack was not reset, stopped, adopted, or reconfigured. The full 64-file chain was then verified by cloning that freshly replayed 63-file database, applying the new forward migration and local parity seed, and invoking the reviewed catalog-verifier entrypoint with a strictly loopback-only test adapter: all 15 post-apply checks passed. The disposable clone was dropped and its absence verified. This is local SQL proof, not hosted target/TLS or migration-history proof. Full-suite, exact-commit, final review and turn cleanup evidence remain pending.

Supabase changelog checked 2026-09-09. Relevant current notices include public-table exposure/grant changes, extension version pinning, and Realtime schema restrictions. This change adds no table/API exposure, creates no extension version pin, and changes no Realtime schema. CLI remains 2.115.0. Sources: [changelog](https://supabase.com/changelog), [table exposure](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).

Required remaining sequence: finish local gates and exact-head reviews -> explicit staging-merge authorization -> immutable merged staging checkout -> repeat reviewed read-only proofs -> separate single-history-repair authorization -> immediate history verification -> separate exact six-version apply authorization -> staging validation -> separate production inventory/rollout gates. Production reopening is never implied by database readiness.

## Newly detected dependency gate

Fresh `pnpm audit --prod --json` on 2026-09-09 exited 1: **0 critical / 3 high / 3 moderate**. The prior 0-high/1-moderate result is historical. Two high findings affect Browserslist 4.28.1, and one high affects Sharp 0.35.3. New moderate findings affect baseline-browser-mapping 2.9.19 and Nodemailer 9.1.0, alongside the prior UUID advisory. No dependency version was changed. Targeted fixes are awaiting owner direction because this is a material finding beyond the focused reconciliation/pause change. The release audit gate is failed, not waived.

Primary advisory records: [Browserslist cache growth](https://github.com/advisories/GHSA-c83g-rgw3-j3cx), [Browserslist custom stats](https://github.com/advisories/GHSA-73wf-gq98-2v4g), [Sharp/libheif](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c). Proposed bounded fix versions are Browserslist >=4.28.7, Sharp 0.35.4, baseline-browser-mapping >=2.11.0 and Nodemailer 9.1.1, followed by fresh audit and all affected gates. Supabase CLI remains 2.115.0.