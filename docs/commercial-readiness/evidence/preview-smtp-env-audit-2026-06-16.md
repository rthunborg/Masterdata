# Preview/Staging SMTP Environment Audit — 2026-06-16

Story: 22.11 (AC4)

Privacy note: this record lists environment-variable **key names and presence only**. No values, secrets, SMTP credentials, hosts, project refs, recipient addresses, or personal data are recorded. Any value verification is done privately, consistent with the Story 22.8/22.9 evidence-redaction discipline.

## Purpose

Confirm that no **real** SMTP credentials remain usable for outbound delivery in non-production (Vercel Preview / staging) scopes, so restored or test data cannot trigger real notification emails to employees or users.

## SMTP-related keys in scope (key names only)

The email service (`src/lib/services/email-service.ts`) reads exactly these keys. The audit covers presence of each in the Vercel **Preview** and any **staging** environment scopes — never the values.

| Key | Role | Notes |
| --- | --- | --- |
| `SMTP_HOST` | SMTP server hostname | A real relay host here is the delivery risk being audited |
| `SMTP_PORT` | SMTP server port | Defaults to `587` in code if unset |
| `SMTP_USER` | SMTP username | Credential |
| `SMTP_PASSWORD` | SMTP password | Credential (secret) |
| `SMTP_FROM` | Sender address | Defaults to `noreply@enhancior.se` if unset |
| `SMTP_SECURE` | TLS toggle | Non-secret |
| `DISABLE_EMAIL_DELIVERY` | Universal kill-switch | Truthy suppresses in ANY environment, incl. production |
| `EMAIL_DELIVERY_OVERRIDE` | Non-production delivery override (Story 22.11) | Truthy re-enables delivery in non-production only; intended for local Mailpit capture |

## Standing mitigation (code fail-safe, AC1) — verified

Independent of what remains in any non-production scope, the Story 22.11 code change makes non-production delivery **fail-safe by default**:

- `shouldSuppressEmailDelivery(env)` (`src/lib/services/email-service.ts`) suppresses delivery whenever the runtime is non-production (per the canonical Story 22.2 `isNonProductionExecution` detection), unless `EMAIL_DELIVERY_OVERRIDE` is explicitly set. No SMTP send occurs; callers receive a success-shaped no-op.
- Production delivery behavior is unchanged. The `DISABLE_EMAIL_DELIVERY` kill-switch still suppresses in any environment.
- Suppression logs recipient **count and reason only** — no addresses, subjects, or bodies (AC2).

Verification: `tests/unit/epic-22/story-22.11/email-suppression.test.ts` (13 tests) covers non-production default-deny (`NEXT_PUBLIC_IS_STAGING`/`VERCEL_ENV=preview`/`NODE_ENV=test`), production allow, override-allow in non-production, kill-switch-wins, and the PII-free suppression log. Gates on 2026-06-16: `npx vitest run` (3074 passed / 30 skipped), `npx tsc --noEmit`, and `npx eslint` (0 errors) all exited 0.

**Net effect:** even if a real SMTP credential is still present in a Preview/staging scope, the code fail-safe neutralizes the delivery risk — a non-production deployment will not send unless an operator deliberately sets `EMAIL_DELIVERY_OVERRIDE` (which is documented to point only at a local capture target such as Mailpit).

## Audit outcome (Vercel scope verification)

| Item | Status |
| --- | --- |
| Code fail-safe (AC1) implemented + test-verified | **Done** (2026-06-16) |
| Non-production env docs (`EMAIL_DELIVERY_OVERRIDE`, kill-switch) | **Done** — `.env.example` |
| Vercel Preview/staging key-name inventory (which SMTP keys are present per scope) | **Done** (owner, 2026-06-16) — scopes verified directly in Vercel; per-scope key presence held in the private operator record (committed evidence keeps key names only, no values) |
| Rotate/remove any real SMTP credential found in a non-production scope | **Done** (owner, 2026-06-16) — a real SMTP credential present in a non-production scope was rotated/removed by the owner; the code fail-safe (AC1) remains as defense-in-depth |

This split mirrored how Story 22.10 handled hosted actions that need owner authorization: the dev-agent-executable work (code + docs + evidence) was completed and verified locally; the dashboard action that needs operator access and authorization was recorded as a tracked owner action item rather than performed unilaterally — and has now been completed by the owner (see below).

## Owner action items — CONCLUDED 2026-06-16

The owner verified the Vercel Preview/staging SMTP env scopes directly in Vercel on 2026-06-16. Outcome:

1. ✅ **Scope key-name inventory recorded (privately).** The presence of the SMTP keys above in the Preview and staging scopes was verified directly in Vercel; specifics are held in the private operator record (this evidence file keeps key names only, no values).
2. ✅ **Real non-production credential rotated/removed.** A real SMTP credential present in a non-production scope was rotated/removed by the owner. The AC1 code fail-safe was already blocking delivery, so this was defence-in-depth hardening rather than an active-incident fix.
3. **Risk register:** no new open-risk entry is required — the finding was remediated (credential rotated/removed), not left in place. SMTP provider/DPA scope remains tracked under the existing `R-013`.

**E-011 is concluded:** code fail-safe (test-verified) + owner scope verification + credential remediation are all complete.
