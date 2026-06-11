# Dependencies, Subprocessors, And Licenses

Prepared: 2026-06-03

## SaaS And Service Dependencies

| Vendor/dependency | Type | Purpose | Processes personal data? | What data? | Environment | Evidence | License | Risk/comment | Include in DPA/subprocessor list? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Supabase | SaaS/database/auth/storage | PostgreSQL, Auth, RLS, Realtime, backup bucket | Yes | Users, employees, dates, backups, auth metadata | Production and staging environments verified; concrete regions held privately | `src/lib/supabase/*`, migrations, workflows, private Supabase metadata | Vendor terms | Core processor/subprocessor; transport/network/backup posture needs private review | Yes |
| Vercel | Hosting/functions/cron/logs | Next.js app/API/cron/logs | Yes/possible | Requests, logs, runtime env metadata | Prod/preview likely | `vercel.json`, README, private Vercel metadata/logs, private endpoint checks | Vendor terms | Project/deployment metadata verified privately; diagnostic exposure was a pre-remediation release gate; env scopes still need review | Yes |
| GitHub | SCM/CI/secrets | Source, workflows, backup execution | Yes/possible | CI logs, secrets, backup workflow data | Dev/CI | `.github/workflows`, private GitHub metadata | Vendor terms | Branch protection/CI verified; backup workflow touches production DB dumps; repository security posture needs private review | Yes/Unknown |
| SMTP provider | Email service | Sends notifications | Yes | Recipient email, employee names/fields/date reminders | Prod/test optional | `src/lib/services/email-service.ts`, `.env.example` | Vendor terms | Provider not identified from repo | Yes |
| npm registry/open-source packages | Software supply chain | Application dependencies | Usually no runtime personal data | N/A unless package phones home, not observed | Build/runtime | `package.json`, `pnpm-lock.yaml` | Mixed OSS | Vulnerability and license review needed | No/Unknown |

## Direct Runtime Dependencies

| Dependency | Purpose | License evidence | Risk/comment |
| --- | --- | --- | --- |
| `next` | App framework | `pnpm licenses list --prod`: MIT | Updated to `16.2.7`; current production audit reports no Next.js advisories |
| `react`, `react-dom` | UI | MIT | Standard |
| `@supabase/ssr`, `@supabase/supabase-js` | Auth/database/realtime client | MIT transitive in license list | `ws` transitive advisory reported |
| `@tanstack/react-query`, `@tanstack/react-table`, `@tanstack/react-virtual` | Data fetching/table/virtualization | MIT | Standard |
| `zod` | Validation | MIT | Strong validation dependency |
| `zustand` | Client state | MIT | Persists auth metadata to localStorage |
| `nodemailer` | SMTP email | MIT-0 | Residual moderate/low advisories risk-accepted pending Nodemailer 8 validation |
| `exceljs` | XLSX export | MIT but transitive licenses/advisories | High transitive advisories patched with pnpm overrides; residual `uuid` moderate advisory remains risk-accepted |
| `papaparse` | CSV import/export | MIT | CSV injection controls not specifically verified |
| Radix packages | UI primitives | MIT | Standard |
| `lucide-react` | Icons | ISC | Standard |
| `date-fns`, `date-fns-tz` | Date/time/timezone | MIT | Used for Stockholm calculations |

## License Findings

`pnpm licenses list --prod` showed mostly permissive licenses. Items needing procurement/legal review:

- `jszip`: `(MIT OR GPL-3.0-or-later)`.
- `@img/sharp-win32-x64`: `Apache-2.0 AND LGPL-3.0-or-later`.
- `buffers`: `Unknown`.
- `big-integer`: `Unlicense`.
- `pako`: `(MIT AND Zlib)`.

Recommended action: generate a complete third-party notice file from the final production lockfile and have legal review the license set.

## Security Audit Findings

Story 22.3 current `pnpm audit --prod` returns 3 residual production advisories after remediation:

- 0 critical
- 0 high
- 2 moderate
- 1 low

Patched areas include Next.js, `minimatch`/`brace-expansion`/`tmp` through `exceljs`, `ws` through Supabase realtime, and `postcss` through Next.js. Residual areas are Nodemailer and `uuid` through `exceljs`; both are tracked in `15_dependency_advisory_risk_register.md`.

## Potential Subprocessor Data Map

| Service | Data likely shared | Comment |
| --- | --- | --- |
| Supabase | Full application database, auth users, realtime events, backup bucket contents | Core data processor |
| Vercel | HTTP requests/responses, function logs, environment variables, deployment metadata | Logs may include personal data due console calls; checked staging deployment metadata/logs were readable |
| GitHub Actions | CI logs, secrets, backup job execution; potentially DB dump files during workflow runtime | Backup workflow handles production data; latest scheduled backup/partial restore succeeded |
| SMTP provider | Email content and recipients | Notifications may include employee name and missing fields |

## Recommended Procurement Actions

1. Confirm legal entity and contract owner for Supabase, Vercel, GitHub, and SMTP.
2. Create DPA/subprocessor list.
3. Document region/data transfer settings for production.
4. Keep dependency advisory risk register current and validate residual Nodemailer/ExcelJS remediation before enterprise use.
5. Generate final license report from exact production lockfile.
6. Review whether backup workflow through GitHub Actions is acceptable for customer data.
