# Dependency Advisory Risk Register

> **Current dependency-remediation evidence - 2026-10-01.** Candidate 3f26418027590609ed3ed7b88b38376d62efd489 upgrades next, @next/bundle-analyzer, and eslint-config-next from 16.3.3 to 16.3.6; upgrades Nodemailer from 9.1.1 to 10.0.13 and removes @types/nodemailer because Nodemailer supplies its types; floors brace-expansion to 1.1.21 and 2.1.7; and keeps ExcelJS exactly at 4.4.0 with a reviewed three-line local Node-only patch replacing its two UUID-v4 calls with node:crypto.randomUUID(). The scoped exceljs@4.4.0 > uuid: '-' override removes UUID 8. Fresh pinned pnpm 10.19.0 audit --prod --json exits 0 with 0 critical, 0 high, 0 moderate, 0 low, and 0 informational findings across 280 production dependencies and is bound to the renewed source/package identity b2b787870b3fddd0e8bb10d9c3354038a8ed422e49c21d138547be04d0622fb7. Frozen installation, TypeScript, zero-error lint, renewed pause safeguards, focused compatibility (3f26418027590609ed3ed7b88b38376d62efd489: 12 passed, 0 skipped, 0 failed, 54.29s), full Vitest, and Playwright pass according to the bound receipt. The prior 471c22f full-Vitest result failed and remains historical evidence only. This does not claim an upstream-supported or browser-bundle ExcelJS upgrade: exceljs/dist/* remains unsupported and requires separate remediation. Passing local gates grants no package, hosted, deployment, main, or reopening approval. Production remains paused/no-go; Story 22.15 in-progress; Epic 23 on hold. Controller/isolation and drain, separately approved 48-filter cleanup, 14 forwards, strict 16/16 and canonical-69 preservation, owner-ledger adoption and separately approved 55-row repair, and separate final main/deployment/reopening approvals remain open. [Current evidence](evidence/production-dependency-remediation-2026-10-01.md).

Prepared: 2026-08-31 (Story 22.15 refresh)

Revalidated: 2026-09-10 — narrow remediation returns to the accepted residual threshold; fresh local gates passed; result-only-documentation-head checks open

Source evidence: `docs/commercial-readiness/evidence/dependency-audit-2026-08-31.md`

## Historical development-inclusive audit follow-up — 2026-09-15

The current candidate production-scoped `pnpm audit --prod --json` exits `0` with **0 critical / 0 high / 0 moderate** across 280 production dependencies. The October 1 1-critical/6-high/6-moderate capture and expired UUID acceptance remain historical evidence below. The candidate is restricted to the recorded Next, Nodemailer, brace-expansion, and Node-only ExcelJS remediation; it does not authorize a browser-bundle ExcelJS path or release admission.

## Historical release gate — 2026-09-10; superseded by the October 1 failure

The 2026-09-09 failure remains historical evidence: **0 critical / 3 high / 3 moderate / 0 low**, exit 1. A narrow compatible patch on 2026-09-10 updates Nodemailer `9.1.0`→`9.1.1`, Sharp `0.35.3`→`0.35.4`, and the compatible workspace floors for Browserslist `4.28.7`, baseline-browser-mapping `2.11.0`, and Sharp `0.35.4`. The post-patch `pnpm audit --prod --json` result is **0 critical / 0 high / 1 moderate / 0 low**, exit 1 solely for the existing `exceljs`→`uuid 8.3.2` (`GHSA-w5hq-g745-h8pq`) residual. Its existing acceptance ends 2026-09-30; no new waiver was added and no incompatible UUID major override was used. Fresh full local gates passed on c27a9ee7543b681fb9424484ee3caf7b402a33c7: Vitest 3,442 passed with zero skips; Playwright 163 passed / 47 individually classified skips / zero failures or errors; both exact commands exited 0. Named staging preview build, TypeScript and zero-error lint passed. Exact timings and report integrity are recorded in the dated preparation evidence. Story 22.15 remains in-progress and Epic 23 remains on hold. This result-only documentation commit must receive fresh CI, Vercel, and Reviewbot verification after push; those future checks are open. Hosted repair/apply, staging/main merges, production deployment/settings, and reopening remain separately owner-gated. See [dated remediation evidence](evidence/staging-reconciliation-and-pause-2026-09-09.md#dependency-remediation-evidence--2026-09-10).

## Historical remediation summary — 2026-09-01

Story 22.15 refreshed the production audit after the candidate had regressed to 28 advisories, including 15 high-severity findings. Three reviewed upgrade batches remove every critical/high production advisory. The only retained production advisory is the ExcelJS transitive UUID moderate risk below.

| Audit point | Critical | High | Moderate | Low | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Candidate `bcb1a0e5bed3d06b9b7582320f491964ffc5a0b9` before Story 22.15 | 0 | 15 | 11 | 2 | 28 |
| Story 22.15 remediated lockfile | 0 | 0 | 1 | 0 | 1 |

`pnpm audit --prod --json` exits `1` because pnpm treats the accepted moderate finding as a non-clean audit. The acceptance gate is zero critical/high plus the single specifically registered residual, not a blanket exit-code waiver.

## Implemented Upgrade Batches

| Batch | Changes | Verification scope |
| --- | --- | --- |
| 1 — framework patches and transitive floors | Next `16.2.12` checkpoint; `brace-expansion` `1.1.18`/`2.1.4`; PostCSS `8.5.23`; Nanoid `3.3.18`; Babel Core `7.29.6` | Audit delta plus application unit/integration suite |
| 2 — SMTP compatibility | Nodemailer `9.1.0`; `@types/nodemailer` `8.0.1` | Non-network transport compatibility and Story 22.14 reminder/delivery regressions |
| 3 — framework/native alignment | Next, ESLint config, and bundle analyzer `16.3.3`; Sharp `0.35.3` | Type-check, lint, production build, Vitest, and Playwright |

The repository records the final Batch 3 state; the intermediate Next `16.2.12` checkpoint was used only to isolate the audit delta before the coordinated framework/native upgrade.

Completed verification as of 2026-09-01: type-check exited `0`; lint exited `0` with zero errors; a clean 63-migration local reset passed; Story 22.15 live database passed 11/11, Story 22.14 PostgREST passed 1/1, and live export passed 5/5; final fresh full Vitest exited `0` with 317/317 files and 3,342/3,342 tests passing with zero skips; exact full Playwright exited `0` with 163 passed / 47 classified skips / 0 failed; the Next `16.3.3` production build passed; and the fresh production audit remained at 0 critical / 0 high / 1 moderate / 0 low across 281 dependencies.

Batch 3's local verification scope is complete. The 47 Playwright skips are not counted as passing: 9 require an explicitly authorized non-production notification-capture run and 38 are obsolete/superseded or deterministic-fixture coverage debt. Remote review and hosted staging/production verification remain separate release gates.

## Current Production Advisory Risk Register — 2026-10-01

## Historical failed-audit capture - 2026-10-01

The 13 provider findings below are historical paths from the failed 1/6/6 capture. They remain retained for traceability; the current candidate fresh audit is zero-finding and its full local suites pass. Do not read their pre-remediation package versions or OPEN labels as current state. Final-head review/required PR checks must be recorded for the exact merge candidate, and production remains paused/no-go.

| Package | Severity | Affected path | Reason not fixed | Owner | Review date | Compensating control | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `uuid 8.3.2` (`GHSA-w5hq-g745-h8pq`) | Moderate | `.>exceljs>uuid` | `exceljs 4.4.0` requires `uuid ^8.3.0`; forcing `uuid >=11.1.1` is an unsupported major transitive override. | Technical owner | 2026-09-30 | ExcelJS is used only for authenticated server-side XLSX export. The application does not expose UUID v3/v5/v6 buffer/offset APIs to user input. Recheck for an ExcelJS release with a patched UUID range or select a replacement before the review date. | Acceptance expired 2026-09-30; no renewal. Prior acceptance was limited to controlled production readiness and was not an enterprise waiver. |
| `nodemailer 9.1.1` (`GHSA-6vj9-mwq6-2f5v`) | Moderate | `.>nodemailer` | New audit finding; targeted remediation and compatibility verification pending. Provider patched range: `>=10.0.2`. | Technical owner (R-002) | 2026-10-01 | Current production pause only; no runtime reachability/exploitability proof or risk waiver. | OPEN — B-003/R-002 release blocker. |
| `nodemailer 9.1.1` (`GHSA-8vvx-rff5-p5rq`) | Moderate | `.>nodemailer` | New audit finding; targeted remediation and compatibility verification pending. Provider patched range: `>=10.0.2`. | Technical owner (R-002) | 2026-10-01 | Current production pause only; no runtime reachability/exploitability proof or risk waiver. | OPEN — B-003/R-002 release blocker. |
| `brace-expansion 1.1.18` (`GHSA-q2hr-2g5m-vwhr`) | Moderate | `.>exceljs>archiver>archiver-utils>glob>minimatch>brace-expansion` | New audit finding; targeted remediation and compatibility verification pending. Provider patched range: `>=1.1.21`. | Technical owner (R-002) | 2026-10-01 | Current production pause only; no runtime reachability/exploitability proof or risk waiver. | OPEN — B-003/R-002 release blocker. |
| `brace-expansion 2.1.4` (`GHSA-q2hr-2g5m-vwhr`) | Moderate | `.>exceljs>archiver>readdir-glob>minimatch>brace-expansion` | New audit finding; targeted remediation and compatibility verification pending. Provider patched range: `>=2.1.7`. | Technical owner (R-002) | 2026-10-01 | Current production pause only; no runtime reachability/exploitability proof or risk waiver. | OPEN — B-003/R-002 release blocker. |
| `brace-expansion 1.1.18` (`GHSA-qhr7-859c-m2p7`) | High | `.>exceljs>archiver>archiver-utils>glob>minimatch>brace-expansion` | New audit finding; targeted remediation and compatibility verification pending. Provider patched range: `>=1.1.20`. | Technical owner (R-002) | 2026-10-01 | Current production pause only; no runtime reachability/exploitability proof or risk waiver. | OPEN — B-003/R-002 release blocker. |
| `brace-expansion 2.1.4` (`GHSA-qhr7-859c-m2p7`) | High | `.>exceljs>archiver>readdir-glob>minimatch>brace-expansion` | New audit finding; targeted remediation and compatibility verification pending. Provider patched range: `>=2.1.6`. | Technical owner (R-002) | 2026-10-01 | Current production pause only; no runtime reachability/exploitability proof or risk waiver. | OPEN — B-003/R-002 release blocker. |
| `brace-expansion 1.1.18` (`GHSA-6j4f-fj2g-mc7p`) | High | `.>exceljs>archiver>archiver-utils>glob>minimatch>brace-expansion` | New audit finding; targeted remediation and compatibility verification pending. Provider patched range: `>=1.1.19`. | Technical owner (R-002) | 2026-10-01 | Current production pause only; no runtime reachability/exploitability proof or risk waiver. | OPEN — B-003/R-002 release blocker. |
| `brace-expansion 2.1.4` (`GHSA-6j4f-fj2g-mc7p`) | High | `.>exceljs>archiver>readdir-glob>minimatch>brace-expansion` | New audit finding; targeted remediation and compatibility verification pending. Provider patched range: `>=2.1.5`. | Technical owner (R-002) | 2026-10-01 | Current production pause only; no runtime reachability/exploitability proof or risk waiver. | OPEN — B-003/R-002 release blocker. |
| `nodemailer 9.1.1` (`GHSA-g57g-f23g-4646`) | Moderate | `.>nodemailer` | New audit finding; targeted remediation and compatibility verification pending. Provider patched range: `>=10.0.9`. | Technical owner (R-002) | 2026-10-01 | Current production pause only; no runtime reachability/exploitability proof or risk waiver. | OPEN — B-003/R-002 release blocker. |
| `nodemailer 9.1.1` (`GHSA-v53p-9fqp-m79j`) | High | `.>nodemailer` | New audit finding; targeted remediation and compatibility verification pending. Provider patched range: `>=10.0.6`. | Technical owner (R-002) | 2026-10-01 | Current production pause only; no runtime reachability/exploitability proof or risk waiver. | OPEN — B-003/R-002 release blocker. |
| `next 16.3.3` (`GHSA-vcvr-r3jv-pc5j`) | Critical | `.>next` | New audit finding; targeted remediation and compatibility verification pending. Provider patched range: `>=16.3.6`. | Technical owner (R-002) | 2026-10-01 | Current production pause only; no runtime reachability/exploitability proof or risk waiver. | OPEN — B-003/R-002 release blocker. |
| `nodemailer 9.1.1` (`GHSA-prgh-xp8r-p3m5`) | High | `.>nodemailer` | New audit finding; targeted remediation and compatibility verification pending. Provider patched range: `>=10.0.5`. | Technical owner (R-002) | 2026-10-01 | Current production pause only; no runtime reachability/exploitability proof or risk waiver. | OPEN — B-003/R-002 release blocker. |

Historical 2026-09-01 conclusion: Nodemailer was `9.1.0`. The 2026-09-10 narrow patch raises it to `9.1.1`; its types remain aligned and the non-network compatibility test remains the compatibility evidence.

## Development Tooling

The 2026-08-31 Story 22.15 acceptance criterion is scoped to `pnpm audit --prod`. No fresh claim about dev-only advisory counts is made here. Development tooling must continue to run only on trusted source in local/CI contexts and should be audited separately before enterprise governance is claimed.

## Blocker Tracker Link

This register supplies the current dependency evidence for `R-002` and blocker `B-003`.
