# Canonical Trigger ACL Prerequisite — 2026-09-15

Status: preparation only. No hosted write, deployment, setting change, history repair, or production reopening occurred.

## Cause

The isolated, guard-owned clean Supabase image applied the first 66 migrations and then stopped at immutable `20260910184841_reconcile_column_config_timestamp_and_audit_trigger.sql`. The canonical timestamp, function bodies, owners, bindings, and audit foreign-key profile were present. Its ACL precondition rejected only the platform's exact explicit non-owner `EXECUTE` extension:

- `public.update_updated_at_column()` had `PUBLIC`, `anon`, `authenticated`, and `service_role`.
- `public.track_employee_column_changes()` had `service_role`.

The canonical v67 branch expects `PUBLIC` only for the timestamp helper and no non-owner grant for the audit trigger. The redacted local blocker receipt records this as a fixture/image behavior; it does not describe a hosted observation.

## Reviewed reconciliation design

Supabase CLI 2.115.0 first generated the uncommitted migration as `20260915164637_reconcile_canonical_trigger_acl_prerequisite.sql`. Before commit, it was assigned the unused prerequisite version `20260910184840_reconcile_canonical_trigger_acl_prerequisite.sql`, immediately before immutable `20260910184841`. No existing migration file, version, or represented history was renamed, edited, or repaired.

The new migration accepts only complete profiles:

1. The documented historical no-`column_config.updated_at` staging profile, which it leaves unchanged for immutable v67 to reconcile.
2. The strict canonical profile, which is a no-op.
3. The complete canonical profile with only the documented Supabase ACL extension above, which it normalizes to the strict canonical grants.

It rejects mixed or partial ACLs, grant options, unknown grantees, altered owners, attributes, bodies, bindings, audit foreign keys, conflict indexes, or audit write side effects. It does not alter global default privileges, function definitions, rows, timestamps, or migration history.

## Required sequence and pending verification

The repository target is now 68 migrations. Staging remains **67/67** until a reviewed PR is merged and the new migration is applied through the reviewed staging-specific `--include-all` dry run and apply sequence. Before and after that apply, strict existing `post_apply` catalog proof must pass 16/16; no new catalog phase broadens the contract.

Production remains 56 repair candidates plus 12 forward applies. The new prerequisite is execute-only, ordered between `20260910115024` and immutable `20260910184841`, and must never be repaired as applied. Production repair, traffic isolation, hosted-setting, backup, deployment, main-merge, and reopening approvals remain separate. The production pause remains active.

No test count, tested commit, review result, or hosted result is claimed for this new correction. Those records are pending fresh verification of the exact final candidate.
