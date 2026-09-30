# Staging v69 PR #123 merge, single-forward apply, and post-proof — 2026-09-30

## Bound source and merge

PR #123 reviewed head `540f020449902d9bb9384baa9ed53eac09d19671` passed Reviewbot at 2026-09-30T16:11:39Z and all three GitHub/Vercel checks. It merged as staging `c492c927224ed5a8f133c58b6fac2531c03e474b`; the merged tree exactly matches the reviewed head. Main remained `822350986f4c023948a7bbf490ddffc371185c4a`.

The manifest raw SHA-256 is `72817587a929e19ae507c9e806f2151f214d63465df8496258edde9f26ccc0f4`. Staging had no repair version. Its sole forward was `20260930091123_reconcile_staffing_updated_by_foreign_key.sql`, raw SHA-256 `e059d40217fd5763841224c3e0e3f6e5bb739bbb4c623140eb65864f4752e67b`.

## Bounded staging chronology

- Bound read-only preflight passed at 69 local migrations and 68 remote-history rows, with only `20260930091123` pending. Strict canonical catalog passed 16/16. Staffing preservation was 2 rows, 2 non-null actor values, zero public/Auth orphans, ordered hash `690be408c49fe8d4c01cabb86fba9a79`.
- The exact one-file dry run passed at 2026-09-30T16:35:06.555Z with native exit 0 and redacted output SHA-256 `bcaa022cfe3b559336ad1415c2d4f3b9b89a0ca066fee7fcf3794c10205b94a5`.
- The one-file staging apply receipt was captured at 2026-09-30T16:37:41.431Z with native exit 0 and redacted output SHA-256 `806ffafc03e93257a6c7932484071a7f64d8f90c0fff4208118950c89f893d57`. This capture time is not a database write-completion claim.
- Immediate independent history at 2026-09-30T16:38:21.817Z proved completion by that time: 69/69 history, no pending version, and no remote-only version.
- All six post phases passed. Staffing at 16:38:31.681Z exactly matched preflight. Advisors at 16:38:38.060Z had zero security WARN-or-higher findings and three known performance warnings. Aggregates and four permission hashes were unchanged at 16:38:48.278Z. Audit at 16:38:54.919Z was 354 rows, 91 non-null actors, zero unmapped actors, hash `bcd635f1b6219fcf5c7f063dfa0b3b37`. Strict `post_apply` catalog passed 16/16 at 16:39:01.644Z.

Receipts retain only redacted aggregates, booleans, hashes, and command classifications. They contain no connection values, credentials, hostnames, rows, or private records.

## Current boundary

Staging is 69/69 with no pending or remote-only migration. This was one authorized staging forward only: no staging history repair, cleanup, production database write, main merge, deployment, hosted setting change, or reopening occurred. A separate production read-only classification did occur as recorded below.

A fresh read-only two-GET Vercel pause inspection ran from 2026-09-30T16:53:44.024Z through 16:53:46.090Z. It confirmed the recorded pause target match, READY production state, disabled automatic assignment, and zero active cron definitions. Deployment functions and cron metadata were unenumerated; this result does not claim either count is zero.

Production remains paused/no-go. Its separate gates include seven unresolved strict catalog groups, the unsigned 55-row `UNPROVED` repair ledger, separately gated 48-filter cleanup, isolation and target admission, production repair/apply proof, main/deployment decisions, and a separate owner reopening decision. Story 22.15 remains in-progress and Epic 23 remains on hold.

## Limit

The apply command exit alone does not prove database completion; the conclusion uses the following immediate history proof. The fresh Vercel result is limited to the recorded target match, READY production state, automatic-assignment flag, and active-cron definitions; deployment functions and cron metadata were unenumerated.
## Fresh production read-only classification

The source-bound production observed interval was 2026-09-30T16:53:08.073Z through 16:53:21.890Z against source `c492c927224ed5a8f133c58b6fac2531c03e474b` and its reviewed tree. It matched the original seven strict catalog failures across 16 checks and is classified `profile_match_not_admission`.

The staffing collector recorded the FK reconciliation prerequisites at 16:53:49.902Z through 16:53:51.096Z: the reviewed `20260930091123` SET NULL profile and zero non-null/public/Auth-orphan counts. This proves a current technical prerequisite only; it is not execution authority. The managed-principal collector completed with one raw unknown login profile and two raw unknown backend profiles, with no other unknown profiles; it does not prove isolation or target-write admission.

The redacted aggregates retained an absent production migration-history table, 48 orphaned saved filters, zero empty or overlength filter names, audit 1,025 rows with 202 legacy mapped actors, the complete 61-entry permission baseline hash `643a4e803cf7c607d939d370711430d70830b858f4a42e504bba36fbbdcf39f8`, and repayment aggregates for each measured field of 70 null, 2 true, and 1 false (73 total). No production write, setting change, deployment, or reopening occurred.

The remaining order is unchanged: prove isolation and target admission, separately approve and perform the 48-filter cleanup, collect fresh post-cleanup proof, apply the 14 reviewed forwards, require strict catalog 16/16 and canonical-69 preservation proof, then separately review/adopt the 55 ledger rows and decide on repair, main, deployment, and reopening.
## Redacted receipt hash bindings

- `v69-forward-preflight-admission-redacted.json`: `5813defd36b6d39b57b4aca0ded1196e0ace47321182f4d982050cd391db01bf`
- `v69-forward-dry-run-redacted.json`: `47db4b9a6cbbd1a4e3978fbd18400c0467899c5ff21d3042076541b757068d55`
- `v69-forward-apply-redacted.json`: `09fd5a2acf804258b3e5ee03cbb5b5c7ced937a9233244dd82d909f41624c34a`
- `v69-migration-post-redacted.json`: `cae2ebd680bb38a33a6e0a1739803d30038bef057bf4f4107f2dd163c7a4eaa6`
- `v69-staffing-post-redacted.json`: `a79b4e46064c2667dc3cacad21fa361733cf8344216a091ed00eacc3d373e3ca`
- `v69-advisors-post-redacted.json`: `4e06c19e3c0abe7eef18a9d1457d73848ac51c592ae721cbe920cb3a03a946a0`
- `v69-aggregates-post-redacted.json`: `94799cbb15d848cb1c94311c9b56f0f8d8f72997cbcc4fc7a349459268c2c79f`
- `v69-audit-post-redacted.json`: `d1c8de9122812c2251a058485241f939264aaab5f4c62679a31b39e8131599f0`
- `v69-catalog-post-redacted.json`: `f8218cf4d0db27b2e83f8b6672608b3172e76051ed1d15c789a0a30cc57dc8a5`
- `current-vercel-pause-https-redacted.json`: `11c5f9572daf191223222ef3b784445b22c11278dde51a9ae5009d8d69e5544d`
- `production-source-collectors-redacted.json`: `102a680adc4bddcc4bb49d104bf611ce56661156c25f751c6173d9df3f4a54c6`
## Offline release package preparation

The source-bound offline package contains 14 forward migrations and 32 hash-listed files. Its descriptor SHA-256 is `e6b22c7309ea2aebd7c1d1c5d6c5075dd07212016cdea03dcf2889bd917e629d`, bound to staging `c492c927224ed5a8f133c58b6fac2531c03e474b`, reviewed tree `fce08211756d8f5b296b4bea2c8c95acd34482e8`, and the manifest hash above. Node is pinned to v24.19.0 and Supabase CLI to 2.115.0. [Public package receipt](production-offline-cutover-package-2026-09-30.json).

This is a non-executable preparation artifact: `executable=false`, `privateMaterialAllowed=false`, `approvalAttested=false`, and `hostedAccess=false`. No installation, protected packet, production apply, cleanup, or repair was performed. A computed digest does not supply independent operator approval. Local support checks passed two Node contracts and the actual Windows PowerShell 5.1 compatibility regression. Earlier support failures were local CLI-record/version-output handling failures before package creation; no hosted access occurred.
## Read-only probe-key capability

At 2026-09-30T17:55:25.829Z, the source-bound loader used the existing Supabase CLI credential for one Management API GET. It verified that exactly one project-bound, unexpired legacy anon key and one service-role key were available for the independent probes. The material remained in process memory; no plaintext or value-derived key hash was saved. Header, envelope, and provider-returned claim checks do not claim cryptographic JWT signature verification.

The source, reviewed tree, manifest, and target-binding hashes match this receipt. [Redacted capability receipt](production-api-key-capability-2026-09-30.json) records only those bindings and booleans. No database query, hosted write, setting change, Data API POST, Realtime control, cleanup, apply, or repair occurred in this capability check. It proves availability only; isolation and target-write admission remain open. Independent support contracts passed 10/10, zero failures/skips, in 82.0496ms; the reviewed local-only source preflight passed before credential access.
Receipt raw SHA-256: `cdc20f3249abc66fc354db3f98f88115c8d59ce3500591bd4d0c24b9e6477d5c`.
