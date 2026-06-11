# Dependency Advisory Risk Register

Prepared: 2026-06-05

Source evidence: `docs/commercial-readiness/evidence/dependency-audit-2026-06-05.md`

## Summary

Story 22.3 remediated all current critical and high production dependency advisories reported by `pnpm audit --prod`.

| Audit point | Critical | High | Moderate | Low | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Before remediation | 0 | 15 | 14 | 4 | 33 |
| After remediation | 0 | 0 | 2 | 1 | 3 |

## Remediated Production Advisories

| Package/path | Severity removed | Action |
| --- | --- | --- |
| `next` | High/moderate/low | Updated direct dependency to `16.2.7`. |
| `exceljs > minimatch` | High | Added pnpm overrides for patched 3.x and 5.x minimatch lines. |
| `exceljs > tmp` | High | Added pnpm override to `tmp 0.2.7`. |
| `exceljs > brace-expansion` | Moderate | Added pnpm overrides for patched 1.x and 2.x lines. |
| `@supabase/realtime-js > ws` | Moderate | Added pnpm override to `ws 8.21.0`. |
| `next > postcss` | Moderate | Added pnpm override to `postcss 8.5.15`. |

## Production Advisory Risk Register

| Package | Severity | Affected path | Reason not fixed | Owner | Target date | Compensating control | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `nodemailer` (`GHSA-vvjj-xcjg-gr5g`) | Moderate | `.>nodemailer` | Patch requires moving from Nodemailer 7.x to 8.x. Story 22.3 scope prioritized critical/high production remediation and avoided broad major-version churn. | Technical owner | 2026-06-12 | SMTP transport options are server-side environment configuration only; current code does not pass a user-controlled transport `name` option to `createTransport`. Validate Nodemailer 8 in a focused follow-up before enterprise use. | Residual risk accepted for controlled presentation. |
| `nodemailer` (`GHSA-c7w3-x93f-qmm8`) | Low | `.>nodemailer` | Same direct major-version upgrade as the moderate Nodemailer advisory. | Technical owner | 2026-06-12 | Current mail options do not pass a custom `envelope.size`; email sending remains server-side and authenticated workflow-triggered. Validate Nodemailer 8 in a focused follow-up. | Residual risk accepted for controlled presentation. |
| `uuid` (`GHSA-w5hq-g745-h8pq`) | Moderate | `.>exceljs>uuid` | `exceljs 4.4.0` brings `uuid 8.3.2`; forcing `uuid >=11.1.1` is a major transitive override with unknown ExcelJS compatibility. | Technical owner | 2026-06-14 | `exceljs` is used for authenticated server-side XLSX export. Do not expose UUID buffer APIs to user input; evaluate ExcelJS replacement or safe major transitive override before enterprise use. | Residual risk accepted for controlled presentation. |

## Dev-Only Advisory Register

`pnpm audit --dev --json` after production remediation still reports dev-tool advisories: 1 critical, 10 high, and 4 moderate. These are not production runtime advisories, but they should be addressed before enterprise-grade development governance.

| Package | Severity | Affected path | Reason not fixed | Owner | Target date | Compensating control | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `vitest` (`GHSA-5xrq-8626-4rwp`) | Critical | `.>vitest` | Requires test-runner upgrade to `>=4.1.0`, outside production dependency remediation scope. | Technical owner | 2026-06-10 | Do not expose Vitest UI/API server to the network; use CLI `vitest run` only in local/CI contexts. | Open dev-only risk. |
| `vite` (`GHSA-v2wj-q39q-566r`) | High | `.>@vitejs/plugin-react>vite` | Requires coordinated Vite/plugin upgrade to `>=7.3.2` and browser-test regression validation. | Technical owner | 2026-06-10 | Do not expose Vite dev server to the network; Next.js app uses Next runtime in production. | Open dev-only risk. |
| `vite` (`GHSA-p9ff-h696-f583`) | High | `.>@vitejs/plugin-react>vite` | Requires coordinated Vite/plugin upgrade to `>=7.3.2` and browser-test regression validation. | Technical owner | 2026-06-10 | Do not expose Vite dev server to the network; Next.js app uses Next runtime in production. | Open dev-only risk. |
| `vite` (`GHSA-4w7w-66w2-5vf9`) | Moderate | `.>@vitejs/plugin-react>vite` | Requires coordinated Vite/plugin upgrade to `>=7.3.2` and browser-test regression validation. | Technical owner | 2026-06-10 | Do not expose Vite dev server to the network; Next.js app uses Next runtime in production. | Open dev-only risk. |
| `rollup` (`GHSA-mw96-cpmx-2vgc`) | High | `.>@vitejs/plugin-react>vite>rollup` | Requires coordinated Vite/Rollup tooling upgrade to `>=4.59.0`, outside production dependency remediation scope. | Technical owner | 2026-06-10 | Build/test tooling should run only on trusted source in local/CI contexts. | Open dev-only risk. |
| `minimatch` (`GHSA-3ppc-4f35-3m26`) | High | `.>eslint-config-next>typescript-eslint>@typescript-eslint/typescript-estree>minimatch` | Requires dev-tool transitive upgrade to `>=9.0.6` or an additional dev override. | Technical owner | 2026-06-10 | Do not process untrusted glob patterns in exposed services. | Open dev-only risk. |
| `minimatch` (`GHSA-7r86-cg39-jmmj`) | High | `.>eslint-config-next>typescript-eslint>@typescript-eslint/typescript-estree>minimatch` | Requires dev-tool transitive upgrade to `>=9.0.7` or an additional dev override. | Technical owner | 2026-06-10 | Do not process untrusted glob patterns in exposed services. | Open dev-only risk. |
| `minimatch` (`GHSA-23c5-xmqv-rm74`) | High | `.>eslint-config-next>typescript-eslint>@typescript-eslint/typescript-estree>minimatch` | Requires dev-tool transitive upgrade to `>=9.0.7` or an additional dev override. | Technical owner | 2026-06-10 | Do not process untrusted glob patterns in exposed services. | Open dev-only risk. |
| `picomatch` (`GHSA-c2c7-rcm5-vvqj`) | High | `.>eslint-config-next>@next/eslint-plugin-next>fast-glob>micromatch>picomatch` | Requires dev-tool transitive upgrade to `>=2.3.2` or an additional dev override. | Technical owner | 2026-06-10 | Do not process untrusted glob patterns in exposed services. | Open dev-only risk. |
| `picomatch` (`GHSA-c2c7-rcm5-vvqj`) | High | `.>@vitejs/plugin-react>vite>picomatch` | Requires coordinated Vite/plugin upgrade to `picomatch >=4.0.4`. | Technical owner | 2026-06-10 | Do not expose Vite dev server to the network; do not process untrusted glob patterns. | Open dev-only risk. |
| `picomatch` (`GHSA-3v7f-55p6-f55p`) | Moderate | `.>eslint-config-next>@next/eslint-plugin-next>fast-glob>micromatch>picomatch` | Requires dev-tool transitive upgrade to `>=2.3.2` or an additional dev override. | Technical owner | 2026-06-10 | Do not process untrusted glob patterns in exposed services. | Open dev-only risk. |
| `picomatch` (`GHSA-3v7f-55p6-f55p`) | Moderate | `.>@vitejs/plugin-react>vite>picomatch` | Requires coordinated Vite/plugin upgrade to `picomatch >=4.0.4`. | Technical owner | 2026-06-10 | Do not expose Vite dev server to the network; do not process untrusted glob patterns. | Open dev-only risk. |
| `flatted` (`GHSA-25h7-pfq9-p65f`) | High | `.>eslint>file-entry-cache>flat-cache>flatted` | Requires ESLint cache dependency upgrade to `flatted >=3.4.0`, outside production dependency remediation scope. | Technical owner | 2026-06-10 | Run lint only on trusted source in local/CI contexts. | Open dev-only risk. |
| `flatted` (`GHSA-rf6f-7fwh-wjgh`) | High | `.>eslint>file-entry-cache>flat-cache>flatted` | Requires ESLint cache dependency upgrade to `flatted >=3.4.2`, outside production dependency remediation scope. | Technical owner | 2026-06-10 | Run lint only on trusted source in local/CI contexts. | Open dev-only risk. |
| `ajv` (`GHSA-2g4f-4pwh-qvx6`) | Moderate | `.>eslint>ajv` | Requires ESLint transitive upgrade to `ajv >=6.14.0`, outside production dependency remediation scope. | Technical owner | 2026-06-10 | Run lint only on trusted source in local/CI contexts. | Open dev-only risk. |

## Blocker Tracker Link

This register updates blocker `R-002` in `docs/commercial-readiness/11_risk_register_and_open_questions.md`.
