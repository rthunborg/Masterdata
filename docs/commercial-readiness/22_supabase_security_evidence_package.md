# Supabase Security Evidence Package

Prepared: 2026-06-11

Story: 22.8

Scope: reviewable evidence for Supabase RLS policies, Auth posture, advisors, migration history, platform hardening posture, and known security risks. This file records summaries, counts, and command results only. It does not include database URLs, pooler URIs, Supabase project refs, key values, passwords, JWTs, cookies, real employee rows, or raw SQL/API output containing personal data. Production was accessed read-only through an authenticated Supabase CLI session; no production data or settings were modified by this story.

## RLS Policies

### Canonical Source

The canonical, reviewable RLS policy source is `supabase/migrations/` (56 versioned migration files). Key policy-defining migrations:

| Migration | What it defines |
| --- | --- |
| `20251027000000_initial_schema.sql` | Initial tables, RLS enablement, and base policies for `employees`, `column_config`, `users`, `important_dates` |
| `20251029000000_add_user_rls_policies.sql` | User-table self-read/self-update policies |
| `20251210000000_fix_employee_column_changes_rls.sql` | `employee_column_changes` authenticated insert/select policies |
| `20251210000002_update_rls_for_recruiter_crewing.sql` | Recruiter/crewing role coverage in employee/important-date policies |
| `20260130212612_create_user_filters.sql` | `user_filters` owner-scoped select/insert/update/delete policies |
| `20260313000001_add_staffing_needs.sql` | `staffing_needs` and `staffing_needs_changelog` policies |
| `20260607193000_fix_employee_column_changes_conflict_target.sql` | `employee_column_changes` repair/conflict-target hardening |

### Local Cross-Check Against `pg_policies` (2026-06-11)

The migration-defined policies were cross-checked against the local non-production Supabase stack (project id `hr-masterdata`, migrations applied via `supabase db reset`), reusing the Story 22.7 local-stack pattern. Production was not queried for this check.

| Table | Policies in `pg_policies` | RLS enabled |
| --- | --- | --- |
| `column_config` | 3 | yes |
| `employee_column_changes` | 2 | yes |
| `employees` | 2 | yes |
| `important_dates` | 2 | yes |
| `pe3_notifications_log` | 0 | yes (deny-by-default; service-role access only) |
| `staffing_needs` | 2 | yes |
| `staffing_needs_changelog` | 2 | yes |
| `user_filters` | 4 | yes |
| `users` | 5 | yes |
| **Total** | **22** | 9 tables |

`pe3_notifications_log` intentionally has RLS enabled with no policies, which denies all non-service-role access. This matches its use as a cron/service log table.

### Hosted Production Policy Posture (Delta Finding)

The production schema was reviewed through the 2026-05-28 nightly logical backup (`schema.sql`, DDL only — restored during the Story 22.8 drill, see `evidence/restore-drill-2026-06-11.md`). As of that snapshot, the hosted production database contained **26 policies**, not the 22 defined by migrations, and several names/definitions differed:

- Production `employees` has 6 policies including `HR Admin can do anything with employees`, `External parties can view active employees`, `Admin Limited can view all employees`, and `Admin Limited can update employees` — the Admin Limited and legacy HR Admin policies are not present in tracked migrations.
- Production `important_dates` has 3 policies including `Admin Limited can view important dates` and `HR Admin can read important dates`, which are not in migrations.
- Production `user_filters` has only 3 policies (read/insert/delete own) and is missing the `update own filters` policy that migrations define.
- Production `column_config` policy names differ from migration names (for example `Anyone can read column config` vs `Everyone can read column configs`).
- Production staffing policy names carry different suffixes (`staffing_needs_select_authenticated`, `staffing_needs_update_hr_admin_crewing`) than the migration-defined names.

This confirms hosted RLS policies have drifted from version-controlled migrations (policies were created or edited outside the migration flow). All hosted-policy observations in this section reflect the 2026-05-28 backup snapshot, not a live read of the production database — the same dashboard-era drift could have changed hosted policies again since; a live re-inventory is part of the Story 22.10 reconciliation. See Known Security Risks below and risk `R-023` in `11_risk_register_and_open_questions.md`.

Note for Story 22.7 readers: the documented `admin_limited` direct-DB-RLS limitation was based on migration-defined policies and remains correct for any environment built from migrations; the hosted production database additionally carries dashboard-era `Admin Limited` policies that migrations do not reproduce.

## Auth Settings

- Application sign-in uses Supabase Auth password authentication with an application-level active-user check (`src/app/api/auth/login/route.ts`, `src/lib/server/auth.ts`). Password hashing is handled by Supabase Auth per NFR8.
- No SSO or MFA is claimed or configured for the current working-pilot scope.
- Supabase security advisors (captured 2026-06-11, see below) report that **leaked-password protection is disabled** in the production project. This is a concrete, remediable Auth hardening item (enable HaveIBeenPwned checking).
- Session lifetime, MFA configuration, and remaining dashboard-only Auth settings were not verified in this story — no "verified privately" claim is made for them here. They are a documented gap owned by the technical owner, review by 2026-09-30; when a dashboard review happens, it should be recorded as a dated "verified privately on <date> by <operator role>" entry per the established evidence-index pattern.

## Supabase Advisors

Prior attempts were blocked (see evidence-index rows "Supabase MCP access verification" and "Supabase direct SQL attempt"). On 2026-06-11 the advisor access limitation was re-tested and is **resolved**: `npx supabase db advisors --linked` succeeded through an authenticated CLI session without requiring `SUPABASE_DB_PASSWORD`.

Redacted advisor summary for the production project (2026-06-11):

| Category | Level | Count | Rules |
| --- | --- | --- | --- |
| Security | WARN | 20 | `function_search_path_mutable` (11), `anon_security_definer_function_executable` (4), `authenticated_security_definer_function_executable` (4), `auth_leaked_password_protection` (1) |
| Performance | WARN | 63 | `multiple_permissive_policies` (54), `auth_rls_initplan` (9) |
| Any | ERROR | 0 | — |

Remediation status: none of the 83 warnings are remediated yet. The 20 security warnings are the priority follow-up (mutable function search paths and security-definer functions executable by `anon`/`authenticated` widen the attack surface; leaked-password protection should be enabled). Owner: technical owner. Review date: 2026-09-30. Remediation is filed as Story 22.10 (the policy-dedup work there also addresses most of the 54 `multiple_permissive_policies` performance warnings). Raw advisor output (which includes object names) is held privately and is not committed.

## Migration History

- `supabase/migrations/` contains **56 versioned migration files**. First (by version): `20250113000000_add_room_assignment_rpc.sql`. Latest: `20260607193000_fix_employee_column_changes_conflict_target.sql`. Migrations are version controlled per the architecture requirement.
- `npx supabase migration list --linked` was run successfully on 2026-06-11 against the production project: **the remote migration history is empty** — all 56 migrations are local-only and none are recorded in the hosted project's migration table.
- Consequence: the hosted production schema was not built through the tracked migration flow (consistent with the policy drift above and with risk `R-010`, the untracked `employee_column_changes` creation). The repository migration directory is the canonical schema source for any rebuilt environment; the hosted schema must be reconciled or baselined before migration-based deployments can be trusted.

## SSL, Network Restrictions, And PITR Posture

Verified read-only on 2026-06-11 through the authenticated CLI (`ssl-enforcement get`, `network-restrictions get`):

| Control | Verified posture | Decision | Owner | Review date |
| --- | --- | --- | --- | --- |
| Database SSL enforcement | **Not enforced** | Risk-accepted for the working-pilot scope. Application access goes through HTTPS Data APIs; direct DB clients (backup workflow) negotiate TLS by default. Recommended hardening: enable SSL enforcement after confirming the nightly backup workflow's pooler connections use TLS. Not changed by this story (no production setting changes without explicit approval). | Technical/IT owner — Rasmus Thunborg (named 2026-06-12; formal customer-side confirmation pending) | 2026-09-30 |
| Database network restrictions | **Allow-all (IPv4 `0.0.0.0/0`, IPv6 `::/0`)** | Risk-accepted for the working-pilot scope. GitHub Actions runners (backup workflow) use dynamic IPs, so a static allowlist would break the nightly backup without a maintained IP strategy. Recommended hardening: restrict to required ranges or move backups to an environment with stable egress before enterprise use. | Technical/IT owner — Rasmus Thunborg (named 2026-06-12; formal customer-side confirmation pending) | 2026-09-30 |
| PITR / platform physical backups | **Not enabled** (paid Supabase feature; project remains on the current plan per NFR1) | Risk-accepted: GitHub nightly logical backups (14-day retention) are the verified backup mechanism, and the full restore drill is now verified (see `evidence/restore-drill-2026-06-11.md`). PITR is not enabled without explicit owner approval because it is a paid platform feature. Revisit if RPO under 24 hours becomes a contractual requirement. | Operations owner — Rasmus Thunborg (named 2026-06-12; formal customer-side confirmation pending) | 2026-09-30 |

These decisions update open items #7 and #8 in `08_security_overview.md` and risks `R-018`/`R-019` in `11_risk_register_and_open_questions.md`.

## Known Security Risks

Standing risks are tracked in `11_risk_register_and_open_questions.md` and `08_security_overview.md`; they are not duplicated here. Delta risks discovered during Story 22.8:

1. **Hosted RLS policy drift** — production has 26 policies vs 22 from migrations, with name and definition differences (new risk `R-023`; remediation filed as Story 22.10).
2. **Empty remote migration history** — hosted production records zero applied migrations; schema changes happened outside the tracked flow (hardens `R-010` from "gap" to "confirmed"; baseline filed as Story 22.10).
3. **Nightly backup gap** — the `db-backups` bucket holds 14 daily backups (2026-05-28 through 2026-06-11) but **2026-06-05 is missing**: the workflow run history confirms that run failed at the transient "Setup Supabase CLI" step without alerting (alerting filed as Story 22.12 under `R-007` follow-up).
4. **Auth/storage schemas are outside logical backup scope** — the nightly dump covers `public` schema only; login users (`auth.users`) are not restorable from it. A disaster recovery would need auth users re-provisioned (documented in the restore drill; affects RTO; scope decision filed as Story 22.12).
5. **Advisor warnings unremediated** — 20 security warnings (see above; filed as Story 22.10).
6. **roles.sql backup is minimal** — the role-only dump contains only `statement_timeout` settings for `anon`/`authenticated`/`authenticator` (managed-role permissions limit the dump); role recreation in a disaster relies on Supabase platform defaults plus migrations.

## Command Evidence

| Command (sanitized) | Date | Result |
| --- | --- | --- |
| Local `pg_policies` policy/RLS inventory via `psql` in the local stack DB container | 2026-06-11 | 22 policies, 9 RLS-enabled tables (table above) |
| `npx supabase db advisors --linked` | 2026-06-11 | Exit 0; 83 WARN (20 security, 63 performance), 0 ERROR |
| `npx supabase migration list --linked` | 2026-06-11 | Exit 0; 56 local migrations, remote history empty |
| `npx supabase ssl-enforcement get --project-ref <ref> --experimental` | 2026-06-11 | Exit 0; SSL not enforced |
| `npx supabase network-restrictions get --project-ref <ref> --experimental` | 2026-06-11 | Exit 0; allow-all IPv4/IPv6 |
| `npx supabase storage ls ss:///db-backups/backup/ --linked --experimental` | 2026-06-11 | Exit 0; 14 daily backups, 2026-06-05 missing |
| Full restore drill (download oldest backup, restore into local stack, validate, clean up) | 2026-06-11 | Success; see `evidence/restore-drill-2026-06-11.md` |

Project refs were passed via shell variables resolved at runtime and are not recorded in this package. The CLI link state created during evidence capture was removed afterwards (`supabase unlink`); `supabase/.temp/` contents are git-ignored except the already-tracked `supabase/.temp/cli-latest`, which was restored to its committed state.
