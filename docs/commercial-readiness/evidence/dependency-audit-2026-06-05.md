# Dependency Audit Evidence - 2026-06-05

Generated: 2026-06-05

Command: `pnpm audit --prod`

Exit code: `1`

Package manager: `pnpm 10.19.0`

## Production advisory summary

| Audit point | Critical | High | Moderate | Low | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Before Story 22.3 remediation | 0 | 15 | 14 | 4 | 33 |
| After Story 22.3 remediation | 0 | 0 | 2 | 1 | 3 |

## Remediation applied

| Package/path | Action | Result |
| --- | --- | --- |
| `next` | Updated direct production dependency from `16.1.6` to `16.2.7`. | Removed all current Next.js production advisories. |
| `exceljs > minimatch` | Added pnpm overrides for vulnerable `minimatch` 3.x and 5.x lines. | Removed high-severity minimatch ReDoS advisories. |
| `exceljs > brace-expansion` | Added pnpm overrides for vulnerable 1.x and 2.x lines. | Removed moderate brace-expansion advisories. |
| `exceljs > tmp` | Added pnpm override to `tmp 0.2.7`. | Removed high-severity tmp path traversal advisory. |
| `@supabase/realtime-js > ws` | Added pnpm override to `ws 8.21.0`. | Removed moderate ws advisory. |
| `next > postcss` | Added pnpm override to `postcss 8.5.15`. | Removed moderate postcss advisory. |

## Production residual risk

The final production audit has no critical or high advisories. The remaining production advisories are documented in `docs/commercial-readiness/15_dependency_advisory_risk_register.md`.

## Full audit output

```text
moderate - Nodemailer Vulnerable to SMTP Command Injection via CRLF in Transport name Option (EHLO/HELO)
Package: nodemailer
Vulnerable versions: <=8.0.4
Patched versions: >=8.0.5
Paths: .>nodemailer
More info: https://github.com/advisories/GHSA-vvjj-xcjg-gr5g

moderate - uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided
Package: uuid
Vulnerable versions: <11.1.1
Patched versions: >=11.1.1
Paths: .>exceljs>uuid
More info: https://github.com/advisories/GHSA-w5hq-g745-h8pq

low - Nodemailer has SMTP command injection due to unsanitized `envelope.size` parameter
Package: nodemailer
Vulnerable versions: <8.0.4
Patched versions: >=8.0.4
Paths: .>nodemailer
More info: https://github.com/advisories/GHSA-c7w3-x93f-qmm8

3 vulnerabilities found
Severity: 1 low | 2 moderate
```
