# Production Dependency Audit Evidence — 2026-08-31

Revalidated: 2026-09-01 (filename retained as the original evidence-date identifier)

Candidate baseline: `bcb1a0e5bed3d06b9b7582320f491964ffc5a0b9`

Command: `pnpm audit --prod --json`

Evidence handling: package names, versions, advisory identifiers, and dependency paths only. No environment values, credentials, or production data are included.

## Production advisory summary

| Audit point | Critical | High | Moderate | Low | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Before Story 22.15 remediation | 0 | 15 | 11 | 2 | 28 |
| After Story 22.15 remediation | 0 | 0 | 1 | 0 | 1 |

Fresh post-remediation audit exit code on revalidation 2026-09-01: `1` (the registered moderate advisory remains).

## Remaining advisory

| Advisory | Package/path | Severity | Disposition |
| --- | --- | --- | --- |
| `GHSA-w5hq-g745-h8pq` / `CVE-2026-41907` | `.>exceljs>uuid` (`uuid 8.3.2`) | Moderate | Time-bounded acceptance in `15_dependency_advisory_risk_register.md`; authenticated server-side export control; review 2026-09-30. |

The audit reported `0` critical, `0` high, `1` moderate, and `0` low production vulnerabilities across 281 production dependencies. The full machine JSON is intentionally not committed because this concise redacted record is the durable evidence surface.
