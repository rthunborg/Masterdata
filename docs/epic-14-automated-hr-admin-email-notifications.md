# Epic 14: Automated HR Admin Email Notifications

## Status

**In Planning**

---

## Epic Goal

Ensure HR admins are proactively notified about incomplete employee masterdata after ÖMC training, and about PE3 submission/cancellation deadlines, without manual tracking.

---

## Background

Following completion of core employee management features, HR admins need automated notifications to:
1. Follow up on employees who completed ÖMC training but haven't completed required masterdata fields
2. Be alerted about PE3 submission and cancellation deadlines to avoid missing critical administrative deadlines

Currently, HR admins must manually track these items, which is error-prone and time-consuming. This epic automates these notifications through a scheduled daily job that evaluates conditions and sends email notifications to all HR admin users.

---

## Actors / Roles

- **hr_admin users** (receive emails)
- **System scheduler / notification service** (runs checks and sends email)

---

## Trigger Schedule

A daily job runs weekdays at 07:00 Europe/Stockholm time.

The job evaluates notification rules and sends emails as needed.

---

## Out of Scope (for initial version)

- In-app notifications
- Custom schedules per-admin
- Weekend runs (unless later requested)

---

## Success Criteria

- HR admins receive timely email notifications when employees haven't completed masterdata 3 days after ÖMC
- HR admins receive consolidated email notifications on PE3 submission/cancellation deadline dates
- Notifications include clear, actionable information (employee names, missing fields, PE3 dates)
- System prevents duplicate notifications through idempotency markers
- Job execution is reliable, logged, and safe to re-run
- All notifications respect Europe/Stockholm timezone

---

## Stories

1. [Story 14.1: ÖMC + Masterdata Completion Follow-up](./stories/14.1.omc-masterdata-completion-follow-up.md)
2. [Story 14.2: PE3 Deadline Notifications (Submit / Cancel)](./stories/14.2.pe3-deadline-notifications.md)

---

## Suggested Sequencing

**Recommended Order:**
1. Story 14.1 (ÖMC Masterdata Follow-up) - Establishes notification infrastructure
2. Story 14.2 (PE3 Deadline Notifications) - Builds on notification system

Both stories can be developed in parallel if different developers are available, as they share the notification infrastructure but have different business logic.

---

## Dependencies

- **Prerequisites:**
  - Employee table with `omc_date` field
  - `important_dates` table with PE3 entries and deadline fields
  - User table with `hr_admin` role identification
  - Email service infrastructure (SMTP configuration)
- **Builds Upon:**
  - Epic 8: Enhanced Employee Management Features (ÖMC dates, masterdata fields)
  - Story 2.8: Important dates table (PE3 entries)
  - Authentication/authorization system (user roles)

---

## Non-Functional Requirements

- **Reliability:** Failures should be logged with enough detail to retry manually
- **Performance:** Job execution time should be short and safe to re-run
- **Idempotency:** Job must be idempotent (can be safely re-run without duplicate notifications)
- **Email Configuration:** Admin emails are pulled from users where role/tag = hr_admin and email IS NOT NULL
- **Email Sender:** Emails are sent from @enhancior.se domain
- **Timezone:** All date calculations use Europe/Stockholm timezone
- **Security:** Email credentials must be securely stored (environment variables, not in code)

---

## Implementation Notes

### Email Service Setup

**CRITICAL:** When implementing mail send outs, the developer must reach out to rasmus.thunborg@enhancior.se for complete domain and mail server credentials.

### Scheduled Job Infrastructure

The daily job can be implemented using:
- Supabase Edge Functions with cron triggers
- Next.js API routes with external cron service (e.g., Vercel Cron, GitHub Actions)
- Database functions with pg_cron extension (if available)

### Notification Markers

To prevent duplicate notifications, the system uses:
- `omc_masterdata_reminder_sent_at` timestamp on employees table
- `pe3_submit_notice_sent_for_date` and `pe3_cancel_notice_sent_for_date` tracking (can be in a separate notifications_log table)

### Required Boolean Fields

The system must maintain an explicit allowlist of required boolean masterdata fields (excluding `hotel_required` and `crew_done`). This ensures schema changes don't silently break logic.

---

## Notes

- This epic introduces automated notification capabilities that reduce manual tracking overhead
- Stories can be delivered incrementally - Story 14.1 can be deployed independently
- Email templates should be professional, clear, and actionable
- Consider future enhancements: in-app notifications, custom schedules, weekend runs

---

**Last Updated:** 2025-01-29  
**Author:** PM (via BMAD)

