# Story 22.15 Trigger Reconciliation Preparation — 2026-09-10

## Status and boundary

This is a read-only diagnosis and forward-migration preparation record. The diagnosis was captured at `2026-09-10T18:50:27.989Z` on staging commit `fb8580920f4237b41272a2e263b2147a54c61b31`; it exposed no employee rows and made no hosted change.

The completed PR #98 correction is historical baseline evidence: staging history is currently 66/66. Repository migration `20260910184841_reconcile_column_config_timestamp_and_audit_trigger.sql` is the proposed 67th version. Its staging plan is repair `[]` and one forward execute; it must never be repaired as applied. Production remains provisional at 57 repairs plus 10 forward applies after a fresh production inventory. Story 22.15 remains in progress, Epic 23 is on hold, and the production pause remains active.

## Read-only observed state

| Surface | Observation | Forward-only treatment |
| --- | --- | --- |
| `column_config.updated_at` | Absent. | Add nullable timestamp metadata with `DEFAULT now()`; that default initializes metadata for existing rows and does not reconstruct historical timestamps. |
| `column_config` timestamp trigger | Absent. | Create the missing trigger. |
| `display_order`, visibility, and indexes | `display_order` is integer, `NOT NULL`, `DEFAULT 0`; visibility/indexes are present and valid. | Preserve valid objects. |
| Audit conflict index | One expected unique conflict index; duplicate groups `0`. | Preserve; no duplicate cleanup. |
| `track_employee_column_changes` | Current body matches the older February form, inserts `auth.uid()` directly despite the `public.users` foreign key, and does not match the documented June correction. | Restore the June audit body. |
| Shared timestamp function | Body differs only by newline normalization; token sequence, invoker posture, and pinned search path are correct. | Preserve semantics while normalizing redundant timestamp ACLs to `PUBLIC` only. |
| Function grants | Timestamp function has redundant API-role grants; audit function has a service-role grant. | Keep timestamp execution `PUBLIC` only and limit the audit service-role grant to its owner-only intended posture. |

The diagnosis source is the redacted support artifact `C:\DEV\hr-masterdata-trigger-support-20260910\trigger-diagnosis-redacted.json` (SQL SHA-256 `5643d64929004f2a82a95c0822b59ff71f0b041a8af1c43230c25787390ee04a`).

## Reconciliation contract

Historical migrations remain immutable. The new migration preserves every valid represented object, adds the missing timestamp column and trigger, restores the represented June audit function body, and narrows the redundant ACLs. It performs no existing-row cleanup and no migration-history repair.

`staging_trigger_reconciliation_pre_apply` is the new strict phase. It accepts only the documented observed variants above. The strict post-apply profile has 16 checks: the prior 15 checks plus `represented_trigger_contracts`. The prior 66-version 15-check result is historical pre-trigger evidence only; it does not validate this 67-version change or full-schema equivalence.

## Pending evidence and authorization

Focused 67-version local verification has passed: strict catalog/reapply is 16/16 in 1.45 seconds, and guarded post-apply integration is 3/3 in 3.63 seconds (the existing foreign-key `23503` case, corrected actor behavior, timestamp contract, and refusal rollback). Full new-candidate unit, integration, Playwright, lint/type, review, and hosted staging post-apply evidence remain pending. No hosted apply is claimed here.

Standing authorization covers merging reviewed PRs into staging and required reviewed migration applies, including production applies after all production prerequisites pass. Fixture writes, history repair, main merges, deployments, hosted setting changes, and production reopening still require separate authorization. No production action is authorized by this preparation record.
