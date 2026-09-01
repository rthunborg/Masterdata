# Dependency Advisory Risk Register

Prepared: 2026-08-31 (Story 22.15 refresh)

Revalidated: 2026-09-01

Source evidence: `docs/commercial-readiness/evidence/dependency-audit-2026-08-31.md`

## Summary

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

## Production Advisory Risk Register

| Package | Severity | Affected path | Reason not fixed | Owner | Review date | Compensating control | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `uuid 8.3.2` (`GHSA-w5hq-g745-h8pq`) | Moderate | `.>exceljs>uuid` | `exceljs 4.4.0` requires `uuid ^8.3.0`; forcing `uuid >=11.1.1` is an unsupported major transitive override. | Technical owner | 2026-09-30 | ExcelJS is used only for authenticated server-side XLSX export. The application does not expose UUID v3/v5/v6 buffer/offset APIs to user input. Recheck for an ExcelJS release with a patched UUID range or select a replacement before the review date. | Time-bounded acceptance for controlled production readiness; not an enterprise waiver. |

No Nodemailer risk remains registered: the direct package is now `9.1.0`, its types are aligned, and a non-network compatibility test exercises the application mail shape.

## Development Tooling

The 2026-08-31 Story 22.15 acceptance criterion is scoped to `pnpm audit --prod`. No fresh claim about dev-only advisory counts is made here. Development tooling must continue to run only on trusted source in local/CI contexts and should be audited separately before enterprise governance is claimed.

## Blocker Tracker Link

This register supplies the current dependency evidence for `R-002` and blocker `B-003`.
