# Story 22.11: Enforce Non-Production Email Suppression

## Status

backlog

- **Priority:** P1
- **Story Points:** 2
- **Dependencies:** none (relates to `22.2` non-production guard)

## Description

As an operator, I want outbound email delivery blocked by default in staging/preview environments, so that restored or test data in non-production environments can never trigger real notification emails to employees or users.

Current behavior fails open: `src/lib/services/email-service.ts` suppresses delivery only when `DISABLE_EMAIL_DELIVERY === 'true'` is explicitly set. Any staging/preview deployment without that flag — combined with real SMTP credentials in the Preview environment scope — can send real emails. This fear is also why the nightly staging refresh deliberately skips the `users` table (see Story 22.12).

## Acceptance Criteria

- [ ] AC1: When `NEXT_PUBLIC_IS_STAGING` is truthy (or another recognized non-production context applies), email delivery is suppressed by default — fail-safe, not opt-in.
- [ ] AC2: Suppressed sends are logged (recipient count/notification type only — no personal data in logs) so staging behavior remains observable.
- [ ] AC3: A documented explicit override exists for safe local capture targets (e.g. Mailpit per `compose.yaml`), and production delivery behavior is unchanged.
- [ ] AC4: Vercel Preview/staging environment variables are audited: no real SMTP credentials remain in non-production scopes (values verified privately; only key names documented).
- [ ] AC5: Unit tests cover suppression in staging, normal delivery in production, and the override path.

## Technical Notes

- Reuse the Story 22.2 environment-detection conventions (`NEXT_PUBLIC_IS_STAGING` already feeds `src/lib/env/non-production-supabase-guard.ts`).
- Keep the existing `DISABLE_EMAIL_DELIVERY` flag working as a manual kill-switch in any environment.
- Update `.env.example` / env docs for any new variable; Swedish i18n not affected (no UI copy).

## Testing Requirements

**Estimated tests:** 3

- Unit tests for the suppression decision (staging default-deny, production allow, override allow).
- Full gates mandatory (`src/` changes).

## Definition of Done

- Fail-safe suppression implemented with tests; Preview SMTP env audit recorded; full gates pass.
