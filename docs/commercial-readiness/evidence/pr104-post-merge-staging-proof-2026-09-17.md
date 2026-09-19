# PR #104 post-merge staging proof — 2026-09-17

Status: **PASS / READ ONLY**

## Identity

- Reviewed PR head: `0f8f8c15c371782f5115c1a57da124d8e664aeb6`
- Resulting staging merge: `1cb4b02108183eeec4fa61fa980c99f835933344`
- Previous staging parent: `6874ef20f5b8b3f9a5ac78a582c0ae1d7a580651`
- Reviewed-head tree and merge tree matched exactly.
- Main remained `822350986f4c023948a7bbf490ddffc371185c4a`.
- The clean detached checkout was `C:/DEV/hr-masterdata-pr104-merged-gate-20260917`.

## Binding and tooling

- The external package pinned the reviewed candidate, resulting merge, manifest raw bytes, all 68 migration file hashes, and the raw-byte and Git-blob identities of the six release dependencies.
- Manifest SHA-256: `92cdec724eb3e084997431ec407418d7fbbc41db08d78196dfd39307b74b60fb`.
- Migration inventory SHA-256: `61bbf4055222f5036ec5250c940725384853374e953a098ad9372f3c878f5d02`.
- Release dependency inventory SHA-256: `2dcbf02f7c22306aec764a5bab075c9fd83b4cab1cdff4e8520d4a12a0ee25cb`.
- Trusted Node `v24.19.0` SHA-256: `3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237`.
- Frozen install used pnpm `10.19.0` with the pinned lockfile.
- The package's parser and contract tests passed 11/11, with zero skips or failures.
- Approved Supabase CLI `2.115.0`, approved `psql`, SSL-root integrity, session-pooler mode, prior staging link identity, and three-way target binding all passed.

## Hosted results

- Migration history: 68 local / 68 hosted / no pending versions.
- Strict `post_apply` catalog: 16/16 passed.
- Advisors at the pinned CLI's WARN minimum: security 0; performance 3 `multiple_permissive_policies` WARN findings. The dated INFO and Management API coverage limitations still apply.
- Repayment aggregates, saved-filter aggregate, and all four permission hashes were unchanged from the reviewed applied baseline.
- Canonical audit aggregate remained 353 rows, 90 non-null `changed_by`, zero unmapped actors, and the same redacted history hash as the predecessor baseline.
- Every receipt records `hostedWriteAttempted: false`.

## Receipt hashes

| Receipt | SHA-256 |
|---|---|
| `pr104-staging-migration-post-2026-09-17-redacted.json` | `80dd2c92e699bdfcf115d53507bb70bfbe1185440c0f8d0e2b173eb9d50a945c` |
| `pr104-staging-advisors-post-2026-09-17-redacted.json` | `acb6908c9e980da85ab5a9cd7cfa6f66a9f34539da68198a9f7826b3459d42fd` |
| `pr104-staging-catalog-post-2026-09-17-redacted.json` | `a402cb38f8f383115054ecf80c5f752755133031f6c99c91c430662035d7c930` |
| `pr104-staging-aggregates-post-2026-09-17-redacted.json` | `33ec6838a067d5eed6d849dbd6230f1ef58b77f692a77cbd58f177d3b91d716e` |
| `pr104-staging-audit-post-2026-09-17-redacted.json` | `adc294070421c67c4ac55a86ff599d370e4d14ed2e3764721e5a4bd79f530f5c` |

No migration, history repair, cleanup, deployment, hosted setting change, production action, main merge, or reopening occurred. Story 22.15 remains in progress, Epic 23 remains on hold, and the production pause remains required.
