---
baseline_commit: 66ed64d111a6eec80aa36dfd0ab2ceed3b1aadfb
---

# Story 22.11: Enforce Non-Production Email Suppression

## Status

done

- **Priority:** P1
- **Story Points:** 2
- **Dependencies:** none functional. Pattern dependency on `22.2` (done) — reuse its non-production environment-detection. Unblocks `22.12` (removes the email-spam rationale for skipping `users` in the nightly staging refresh).
- **Canonical planning artifact:** `docs/sprint-artifacts/story-22.11.md`
- **Epic source:** `_bmad-output/planning-artifacts/epics.md` § "Story 22.11"

> **🚫 PRODUCTION-CHANGE FREEZE (owner directive, Epic 22):** Do **NOT** change production environment variables or production behavior in this story. This story's code change is **fail-safe by design**: production email delivery is unchanged (still delivers; the manual `DISABLE_EMAIL_DELIVERY` kill-switch still works). No production env var is added or required for the fix to work. AC4 audits **non-production** Vercel scopes (Preview/staging) only — see Task 4 for the freeze-safe boundary on that work.

## Story

As an operator,
I want outbound email delivery blocked by default in staging/preview (and any non-production) environment,
so that restored or test data in non-production environments can never trigger real notification emails to employees or users.

**Why this matters now:** Email suppression is currently **opt-in** — `src/lib/services/email-service.ts` skips SMTP only when `DISABLE_EMAIL_DELIVERY === 'true'` is explicitly set (`isEmailDeliveryDisabled()`, line 30-32). Any staging/preview deployment where that flag is unset **fails open** and will deliver real email if SMTP credentials are present. Vercel Preview/staging env scopes may currently carry real SMTP credentials. This same fear is why the nightly staging refresh deliberately skips the `users` table (Story 22.12 depends on closing it here). The fix flips the default to **fail-safe**: non-production suppresses unless an explicit, documented override is set.

## Acceptance Criteria

- [x] **AC1 (fail-safe default):** When the runtime is a recognized non-production context (e.g. `NEXT_PUBLIC_IS_STAGING` truthy, `VERCEL_ENV=preview`, `NODE_ENV` in `development`/`test`, or any other marker recognized by the Story 22.2 detection), `sendEmail` / `sendEmailToMultiple` suppress delivery by default — **no SMTP send**, returns a success-shaped result so callers don't error. Suppression is the default, not opt-in.
- [x] **AC2 (PII-free observability):** Each suppressed send is logged with **recipient count and a suppression reason only**. The log MUST NOT contain recipient email addresses, subject lines, or message bodies (no personal data). Staging behavior stays observable.
- [x] **AC3 (documented override + unchanged production):** A single, documented explicit override (`EMAIL_DELIVERY_OVERRIDE` truthy) re-enables delivery in a non-production context so a developer can capture mail to a safe local target (Mailpit per `compose.yaml`). **Production delivery behavior is unchanged** (still delivers by default), and the existing `DISABLE_EMAIL_DELIVERY` kill-switch still suppresses in any environment, including production. The override is documented in `.env.example`/env docs with a clear "only point SMTP at a local capture target" warning.
- [x] **AC4 (Preview SMTP env audit):** Vercel Preview/staging environment variables are audited so no real SMTP credentials remain in non-production scopes. The audit result is recorded as evidence with **key names only — no values** (values verified privately), linked from `docs/commercial-readiness/14_evidence_index.md` and tracked in `docs/commercial-readiness/17_blocker_remediation_tracker.md`. If a real credential is found in a non-production scope, the code fail-safe (AC1) already neutralizes the delivery risk; document the finding and the owner-confirmed remediation (rotate/remove) rather than acting unilaterally. **Dev-agent portion complete** (evidence note `evidence/preview-smtp-env-audit-2026-06-16.md` with SMTP key-name inventory + code fail-safe as standing mitigation, linked from `14_evidence_index.md`, tracked as `E-011` in `17_blocker_remediation_tracker.md`); the **Vercel scope verification + any rotate/remove is a tracked owner action item** because dashboard/env-scope access is not available to the dev agent (mirrors the Story 22.10 owner-action pattern).
- [x] **AC5 (tests):** Unit tests cover the suppression **decision** for: non-production default-deny, production allow, override-allow in non-production, and kill-switch wins in production. Tests inject env explicitly (do not rely on ambient `process.env`).

## Tasks / Subtasks

- [x] **Task 1 — Single source of truth for non-production detection** (AC: 1)
  - [x] Reuse the canonical Story 22.2 predicate — do **NOT** duplicate the env list. The logic already exists as `isNonProductionExecution(env)` inside `src/lib/env/non-production-supabase-guard.ts` (lines 36-69), along with `normalize`/`isTruthyFlag` and `NON_PRODUCTION_ENV_VALUES`.
  - [x] **Recommended (chosen):** extracted `isNonProductionExecution`, `isTruthyFlag`, `normalize`, `NON_PRODUCTION_ENV_VALUES`, and the `GuardEnv` type into a shared module `src/lib/env/is-non-production.ts`, exported them, and `non-production-supabase-guard.ts` now imports them. Behavior-preserving — `validateNonProductionSupabaseEnvironment` is unchanged and `tests/unit/epic-22/story-22.2/non-production-supabase-guard.test.ts` passes unchanged (7/7 green).
  - [x] **Lower-churn alternative (not used):** the recommended shared-module extraction was implemented instead. Either way: one definition, imported by both.

- [x] **Task 2 — Add the fail-safe suppression decision to the email service** (AC: 1, 2, 3)
  - [x] In `src/lib/services/email-service.ts`, added an **exported pure function** `shouldSuppressEmailDelivery(env: Record<string, string | undefined> = process.env): { suppress: boolean; reason: string }`, unit-testable with injected env (mirrors the Story 22.2 `validateNonProductionSupabaseEnvironment(env)` pattern). Precedence implemented:
    1. `DISABLE_EMAIL_DELIVERY` truthy → `{ suppress: true, reason: 'kill-switch' }` (any environment, including production).
    2. else if `isNonProductionExecution(env)`:
       - `EMAIL_DELIVERY_OVERRIDE` truthy → `{ suppress: false, reason: 'non-production-override' }` (local Mailpit capture).
       - else → `{ suppress: true, reason: 'non-production-failsafe' }`.
    3. else (production) → `{ suppress: false, reason: 'production' }`.
  - [x] Uses `isTruthyFlag` (accepts `1`/`true`/`yes`) for all three flags; `DISABLE_EMAIL_DELIVERY=true` continues to work exactly as before.
  - [x] Replaced the `isEmailDeliveryDisabled()` gate in `sendEmail` with `shouldSuppressEmailDelivery()`. When `suppress` is true it logs PII-free `{ recipientCount, reason }` (no `to`/`subject`) and returns the success-shaped short-circuit `{ success: true, messageId: 'email-delivery-disabled' }` so all callers keep treating it as a no-op success.
  - [x] Updated `sendEmailToMultiple`: the inter-send delay is now gated on `!shouldSuppressEmailDelivery().suppress`, so suppressed batch runs don't sleep 1s per recipient.
  - [x] Suppression decision is computed **once** per `sendEmail` call.
  - [x] Bonus PII hardening (story-flagged as trivial/optional): the delivery-success log no longer logs `to`/`subject`, only `messageId` + `recipientCount`.

- [x] **Task 3 — Env documentation** (AC: 3)
  - [x] Updated `.env.example`: documented `EMAIL_DELIVERY_OVERRIDE` and `DISABLE_EMAIL_DELIVERY` in a new block after the SMTP config, and added a cross-reference note in the `NEXT_PUBLIC_IS_STAGING` block. States non-production suppresses by default; `EMAIL_DELIVERY_OVERRIDE=true` only when `SMTP_HOST` points at a local capture target (Mailpit); `DISABLE_EMAIL_DELIVERY` is the universal kill-switch.
  - [x] No Swedish i18n impact (no UI copy changes).

- [x] **Task 4 — Preview/staging SMTP env audit (evidence)** (AC: 4)
  - [x] Recorded the SMTP-related key inventory (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_SECURE`, `DISABLE_EMAIL_DELIVERY`, `EMAIL_DELIVERY_OVERRIDE`) as **key names + roles only — no values** in `docs/commercial-readiness/evidence/preview-smtp-env-audit-2026-06-16.md`.
  - [x] **Freeze-safe boundary honored:** the dev agent does not have Vercel dashboard/env-scope access, so the actual per-scope key presence verification and any rotate/remove are recorded as an **owner action item** (operator-assisted), with the AC1 code fail-safe documented as the standing mitigation — mirroring the Story 22.10 owner-action pattern. No production env var changed.
  - [x] Added the evidence note, linked it from `docs/commercial-readiness/14_evidence_index.md`, and added tracker row `E-011` in `docs/commercial-readiness/17_blocker_remediation_tracker.md`. `11_risk_register_and_open_questions.md` was intentionally **not** modified (no real non-production credential confirmed; existing `R-013` already covers SMTP provider/DPA).

- [x] **Task 5 — Unit tests** (AC: 5)
  - [x] New test file `tests/unit/epic-22/story-22.11/email-suppression.test.ts` (13 tests) exercises `shouldSuppressEmailDelivery(env)` with injected env: non-production default-deny (`NEXT_PUBLIC_IS_STAGING`/`VERCEL_ENV=preview`/`NODE_ENV=test`), production allow, override-allow in non-production, kill-switch-wins (production, and over override in non-prod), `1`/`true`/`yes` flag parsing, and junk-value handling.
  - [x] Asserts the suppressed-send log contains recipient **count** + reason but **not** any recipient address, subject, or body (AC2), via a `console.log` spy with env + spy restoration (hermetic). Also asserts the success-shaped return and that a suppressed `sendEmailToMultiple` batch schedules no `setTimeout` delay.
  - [x] **Full mandatory gates** (`src/` change), all run 2026-06-16: `npx vitest run` → EXIT:0 (3074 passed / 30 skipped); `npx tsc --noEmit` → EXIT:0; `npx eslint` → EXIT:0 (0 errors, 320 pre-existing warnings only). Playwright e2e not run: no UI/route change (server-side library only) and all callers mock the email service; per project memory full local e2e is environmentally unstable — not applicable to this change.

### Review Findings

Code review 2026-06-16 (3 adversarial layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor). Acceptance Auditor: all AC1–AC5 + the 5-row precedence table + production-change freeze + the Story 22.2 behavior-preserving refactor SATISFIED. 0 decision-needed, 1 patch, 2 deferred, 5 dismissed (incl. one false-positive High: the dropped `isTruthyFlag` import was verified harmless — the guard uses only `normalize`/`isNonProductionExecution`, `tsc`/`eslint` green).

- [ ] [Review][Patch] `recipientCount` undercounts a comma-separated string `to` to `1` [src/lib/services/email-service.ts:85, 147] — `Array.isArray(options.to) ? options.to.length : 1` reports `1` for a nodemailer-style `"a@x, b@y"` string. No current caller passes comma-strings (all use a single address or a `string[]`), and the success-path `recipients.length` shares the same semantics, so audit-log accuracy is only affected for an input shape that does not occur. Low priority; fix = normalize `to` to an address array before counting.
- [x] [Review][Defer] SMTP-failure (catch) path may log recipient PII via `error.message` [src/lib/services/email-service.ts:154-156] — deferred, pre-existing. The real-send catch logs `error.message`, which nodemailer can populate with rejected recipient addresses. Out of AC2 scope (AC2 governs *suppressed* sends) and only reachable on a real SMTP send failure; the catch block predates this story.
- [x] [Review][Defer] Unrecognized/blank environment fails open (delivers) [src/lib/env/is-non-production.ts:28-45] — deferred, by design. Production delivers by default per AC3, and the gap is not reachable on Vercel (always sets `VERCEL_ENV`/`NODE_ENV`). Optional future hardening = require a *positive* production marker to deliver (fail-closed on unknown env); deferred because flipping it could change production behavior and conflicts with the Epic 22 production-change freeze.

## Dev Notes

### Architecture / pattern constraints

- **All notification paths funnel through `sendEmail`.** The three notification services route every send through `email-service.ts`: `staffing-needs-notification.ts` calls `sendEmail` directly (line 71); `omc-masterdata-reminder.ts` (line 384-385) and `pe3-deadline-notifications.ts` (lines 396-397, 474-475) call `sendEmailToMultiple`, which itself loops over `sendEmail` (line 146). **Centralizing the gate in `sendEmail` covers every path** — do not add per-caller suppression. `sendEmailToMultiple` only additionally needs the delay-skip fix (Task 2).
- **No regression risk to existing tests.** Every test that touches the email service fully mocks it (`vi.mock('@/lib/services/email-service')` in the Epic 14 integration tests and the Epic 21 staffing test). They never execute the real `sendEmail`, so adding the gate inside the real implementation cannot break them. Verified: `tests/integration/epic-14/story-14.1/notification-service.test.ts`, `tests/integration/epic-14/story-14.2/pe3-notification-service.test.ts`, `tests/unit/epic-21/story-21.8/staffing-needs-notification.test.ts`.
- **`NODE_ENV=test` is non-production by the Story 22.2 detection** (`NON_PRODUCTION_ENV_VALUES` includes `test`). After this change the real `sendEmail` auto-suppresses under Vitest — which is desirable (tests must never send mail), and harmless because callers mock the service. This is exactly why AC5 tests must call `shouldSuppressEmailDelivery(env)` with **injected** env rather than mutating ambient `process.env`.
- **Suppression must return a success-shaped result.** Callers branch on `result.success`; the current suppressed return is `{ success: true, messageId: 'email-delivery-disabled' }`. Keep that contract so suppression is a silent no-op, not an error.

### Decision precedence (reference)

| Environment | `DISABLE_EMAIL_DELIVERY` | `EMAIL_DELIVERY_OVERRIDE` | Result |
|---|---|---|---|
| Production | unset | (any) | **Deliver** |
| Production | truthy | (any) | Suppress (`kill-switch`) |
| Non-production | unset | unset | Suppress (`non-production-failsafe`) |
| Non-production | unset | truthy | **Deliver** (`non-production-override` — Mailpit) |
| Non-production | truthy | truthy | Suppress (`kill-switch` wins) |

### PII / logging

- Reason strings (`kill-switch`, `non-production-failsafe`, `non-production-override`, `production`) are non-personal and safe to log.
- The current delivery success log (`email-service.ts` lines 108-112) also logs `to: recipients` and `subject`. Tightening it to log a recipient **count** instead is a small, in-file hardening consistent with AC2's intent — **optional/nice-to-have**, not required; no test asserts on it. Do not expand scope beyond suppression unless trivial.

### Env-detection contract (Story 22.2 source)

`isNonProductionExecution(env)` returns true when any of `NODE_ENV`/`APP_ENV`/`NEXT_PUBLIC_APP_ENV`/`VERCEL_ENV`/`DEPLOYMENT_ENV`/`NEXT_PUBLIC_DEPLOYMENT_ENV` ∈ `{development, test, staging, preview, presentation}`, OR any of `NEXT_PUBLIC_IS_STAGING`/`IS_STAGING`/`PRESENTATION_ENV`/`NEXT_PUBLIC_PRESENTATION_ENV` is truthy. Reuse it verbatim — do not invent a parallel list.

### Git / recent-work intelligence

Recent commits (`66ed64d`, `94835dc`, `b2dd306`, `88580dc`) concern column-refresh caching and e2e/Supabase reconciliation (Stories 22.9/22.10); none touched the email service. `email-service.ts` has been stable since Epic 14/21 — no in-flight conflicts expected on this file.

### Project Structure Notes

- New code lives under `src/lib/` per CLAUDE.md boundaries: shared env helper in `src/lib/env/`, email gate in the existing `src/lib/services/email-service.ts`.
- New tests under `tests/unit/epic-22/story-22.11/` follow the established `tests/unit/epic-22/story-22.2/` layout.
- Evidence docs under `docs/commercial-readiness/` follow the numbered-file convention; link new evidence from `00_index.md`/`14_evidence_index.md` as prior Epic 22 stories did.

### References

- [Story stub](docs/sprint-artifacts/story-22.11.md) — canonical AC/scope source
- [Epics § Story 22.11](_bmad-output/planning-artifacts/epics.md) — lines 283-297 (BDD acceptance criteria)
- [email-service.ts](src/lib/services/email-service.ts) — current opt-in gate (lines 30-32, 48-58, 137-161)
- [non-production-supabase-guard.ts](src/lib/env/non-production-supabase-guard.ts) — `isNonProductionExecution` / `isTruthyFlag` source (lines 36-69)
- [Story 22.2 test](tests/unit/epic-22/story-22.2/non-production-supabase-guard.test.ts) — injected-env test pattern to mirror
- [.env.example](.env.example) — SMTP block (lines 71-80), `NEXT_PUBLIC_IS_STAGING` block (lines 143-147)
- Callers: [staffing-needs-notification.ts:71](src/lib/services/staffing-needs-notification.ts), [omc-masterdata-reminder.ts:384](src/lib/services/omc-masterdata-reminder.ts), [pe3-deadline-notifications.ts:396](src/lib/services/pe3-deadline-notifications.ts)
- Evidence surfaces for AC4: [14_evidence_index.md](docs/commercial-readiness/14_evidence_index.md), [17_blocker_remediation_tracker.md](docs/commercial-readiness/17_blocker_remediation_tracker.md), [11_risk_register_and_open_questions.md](docs/commercial-readiness/11_risk_register_and_open_questions.md)
- Subprocessor context (SMTP relay = Google Workspace, from Story 22.9): [24_subprocessor_register.md](docs/commercial-readiness/24_subprocessor_register.md)

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context) — BMAD dev-story workflow (Lead Agent, inline implementation).

### Debug Log References

- `npx vitest run tests/unit/epic-22/story-22.11/email-suppression.test.ts tests/unit/epic-22/story-22.2/non-production-supabase-guard.test.ts` → 20 passed (13 new + 7 unchanged Story 22.2 guard).
- `npx vitest run` → EXIT:0, 3074 passed / 30 skipped (no regressions).
- `npx tsc --noEmit` → EXIT:0.
- `npx eslint` (full) → EXIT:0, 0 errors, 320 pre-existing warnings (all in unrelated files).
- `npx eslint` (changed files only) → EXIT:0, clean.

### Completion Notes List

- **Centralized fail-safe gate.** Added the exported pure decision `shouldSuppressEmailDelivery(env = process.env)` in `email-service.ts` and routed `sendEmail` (and the `sendEmailToMultiple` delay-skip) through it. Because all three notification services funnel through `sendEmail`, this one gate covers every outbound path — no per-caller changes needed.
- **Single source of truth.** Extracted the Story 22.2 detection (`isNonProductionExecution`, `isTruthyFlag`, `normalize`, `NON_PRODUCTION_ENV_VALUES`, `GuardEnv`) into `src/lib/env/is-non-production.ts`; both the Supabase guard and the email service import it. Behavior-preserving — Story 22.2 guard tests pass unchanged.
- **Precedence:** kill-switch (`DISABLE_EMAIL_DELIVERY`, any env) → non-production override (`EMAIL_DELIVERY_OVERRIDE`) / non-production fail-safe → production deliver. Production behavior is unchanged; no production env var added or required.
- **PII-free logging (AC2).** Suppressed sends log `{ recipientCount, reason }` only. Also hardened the delivery-success log (previously leaked `to` + `subject`) to `{ messageId, recipientCount }` — story-flagged as trivial/optional, done for consistency with AC2 intent.
- **Suppression contract preserved.** Suppressed result remains `{ success: true, messageId: 'email-delivery-disabled' }`, so callers branching on `result.success` keep treating it as a silent no-op. Under Vitest (`NODE_ENV=test`) the real `sendEmail` now auto-suppresses, which is desirable and harmless (callers mock the service); AC5 tests inject env rather than mutating ambient `process.env`.
- **AC4 dev/owner split.** Code fail-safe + evidence note (`evidence/preview-smtp-env-audit-2026-06-16.md`, key names only) + `14_evidence_index.md` link + `E-011` tracker row are complete. The Vercel Preview/staging per-scope key verification and any credential rotate/remove are a tracked **owner action item** — dashboard/env-scope access is not available to the dev agent — with the AC1 code fail-safe as the standing mitigation. No production change; consistent with the Epic 22 production-change freeze and the Story 22.10 owner-action precedent.
- **Unblocks Story 22.12.** Removes the email-spam rationale for skipping the `users` table in the nightly staging refresh.

### File List

- `src/lib/env/is-non-production.ts` (new) — shared non-production detection module.
- `src/lib/env/non-production-supabase-guard.ts` (modified) — imports detection from the shared module; duplicated definitions removed (behavior-preserving).
- `src/lib/services/email-service.ts` (modified) — `shouldSuppressEmailDelivery` fail-safe decision; PII-free suppression + success logging; `sendEmailToMultiple` delay-skip.
- `.env.example` (modified) — documented `EMAIL_DELIVERY_OVERRIDE` + `DISABLE_EMAIL_DELIVERY`; staging cross-reference note.
- `tests/unit/epic-22/story-22.11/email-suppression.test.ts` (new) — 13 unit tests (decision + PII-free log + batch delay-skip).
- `docs/commercial-readiness/evidence/preview-smtp-env-audit-2026-06-16.md` (new) — Preview/staging SMTP key-name audit + code-mitigation evidence.
- `docs/commercial-readiness/14_evidence_index.md` (modified) — added email fail-safe / SMTP audit evidence row; bumped Updated date.
- `docs/commercial-readiness/17_blocker_remediation_tracker.md` (modified) — added `E-011` tracker row; bumped Updated date.
- `_bmad-output/implementation-artifacts/22-11-enforce-non-production-email-suppression.md` (modified) — story status, task/AC checkboxes, Dev Agent Record, Change Log.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified) — story status ready-for-dev → in-progress → review.

## Change Log

| Date | Change |
| --- | --- |
| 2026-06-16 | Implemented Story 22.11: non-production email delivery is now fail-safe (suppressed by default) via a shared non-production detector and an exported `shouldSuppressEmailDelivery` decision in the email service; PII-free suppression/success logging; documented `EMAIL_DELIVERY_OVERRIDE`; added Preview/staging SMTP key-name audit evidence (`E-011`) with the code fail-safe as standing mitigation and Vercel scope verification left as an owner action item. 13 new unit tests; full gates green (`vitest`/`tsc`/`eslint` EXIT:0). Status → review. |
| 2026-06-16 | Code review (3 adversarial layers) PASSED: all AC1–AC5 + precedence + prod-freeze satisfied. 1 low patch fixed (`countRecipients` counts comma-separated `to` strings; +1 unit test → 14 total) and re-verified (`vitest` 3075 passed / `tsc` / `eslint` EXIT:0); 2 deferred (pre-existing SMTP catch-path PII; by-design fail-open on unrecognized env). Status → done. |
| 2026-06-16 | AC4 / `E-011` concluded: owner verified the Vercel Preview/staging SMTP env scopes and rotated/removed a real non-production SMTP credential that was present; code fail-safe remains as defense-in-depth. Evidence note + `14_evidence_index.md` + tracker `E-011` updated to closed (key names only; specific scope/values held privately). No new open-risk entry required (remediated, not left in place; SMTP provider/DPA stays under `R-013`). |
