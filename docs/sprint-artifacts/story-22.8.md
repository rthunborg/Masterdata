# Story 22.8: Package Supabase Security Evidence and Run Restore Drill

## Status

done

- **Priority:** P1
- **Story Points:** 5
- **Dependencies:** `22.2`

## Description

As a security reviewer, I want Supabase security settings, migration history, and restore evidence packaged, so that security and backup claims are reviewable.

## Acceptance Criteria

- [x] AC1: Evidence package includes exported or documented RLS policies, Auth settings, Supabase advisors, migration history, and known security risks.
- [x] AC2: Supabase SSL, DB network restrictions, and PITR posture are hardened or formally risk-accepted with owner and review date.
- [x] AC3: A restore drill is run against a non-production target.
- [x] AC4: Restore drill documentation includes timestamp, operator, source, target, scope, result, validation checks, and follow-up issues.
- [x] AC5: No restore or evidence command exposes secrets in committed files.

## Technical Notes

- Use non-production targets only.
- Store screenshots sparingly and only when they add review value.
- Link evidence from the blocker tracker.

## Testing Requirements

**Estimated tests:** 1

- Restore validation checklist or script. Run automated tests if restore workflow changes code.

## Definition of Done

- Supabase evidence package exists.
- Restore drill is documented.
- Security exceptions have owners and dates.
