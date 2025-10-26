# External APIs

**No external third-party APIs required for MVP.**

The system relies entirely on Supabase platform APIs (database, auth, real-time, storage) which are accessed via Supabase JavaScript client library. All Supabase services are documented at https://supabase.com/docs.

**Post-MVP Considerations:**
- **Email Service** (SendGrid, Resend): For password reset emails and notifications
- **Analytics** (PostHog, Plausible): For usage analytics
- **Error Tracking** (Sentry): For production error monitoring

---
