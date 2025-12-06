# Epic 16: Employee Data Change Notifications

## Status

**Approved**

---

## Epic Goal

Enable external party users (Sodexo, ÖMC, Payroll, Toplux) to be notified when masterdata fields they can view have been changed since their last login, preventing mistakes and time loss from missing updates to employees they are processing.

---

## Background

Currently, external party users often miss when HR admins update employee information (e.g., email, name, or other masterdata fields). This leads to:
- Time lost processing outdated information
- Mistakes made due to working with incorrect data
- Frustration when changes aren't discovered until later

This epic implements a change tracking system that:
1. Tracks column-level changes to masterdata fields
2. Notifies users on login about changes to fields they have view access to
3. Highlights changed fields visually in the employee table
4. Shows a dismissible banner with summary information

---

## Actors / Roles

- **External party users** (Sodexo, ÖMC, Payroll, Toplux) - receive change notifications
- **HR Admin users** - make changes that trigger notifications
- **System** - tracks changes and displays notifications

---

## Success Criteria

- Users see a clear banner on login showing how many employees have changes since their last login
- Changed fields are visually highlighted in the employee table (soft yellow/amber color)
- Only masterdata columns are tracked (custom columns excluded)
- Only columns the user has view permission for are shown in notifications
- Highlights persist until next login or page refresh
- Banner is dismissible (session-based, not persistent)
- System does not store duplicate data (GDPR compliant)
- Performance is acceptable: change detection completes in <500ms on login (not required to be instantaneous - changes may appear within a few minutes after being made)

---

## Stories

1. [Story 16.1: Create Employee Column Changes Audit Table](./stories/story-16.1.md) - Database schema and trigger
2. [Story 16.2: API Endpoint for Change Detection](./stories/story-16.2.md) - Backend change query service
3. [Story 16.3: Frontend Change Tracking Hook](./stories/story-16.3.md) - React hook and state management
4. [Story 16.4: Change Notification Banner Component](./stories/story-16.4.md) - Dismissible banner UI
5. [Story 16.5: Field Highlighting in Employee Table](./stories/story-16.5.md) - Visual field highlighting

---

## Suggested Sequencing

**Recommended Order:**
1. Story 16.1 (Database schema) - Foundation for all other stories
2. Story 16.2 (API endpoint) - Backend service layer
3. Story 16.3 (Frontend hook) - State management layer
4. Story 16.4 (Banner component) - User-facing notification
5. Story 16.5 (Field highlighting) - Visual change indicators

Stories 16.4 and 16.5 can be developed in parallel once 16.3 is complete.

---

## Dependencies

- **Prerequisites:**
  - `employees` table with `updated_at` trigger
  - `users` table with `last_active_at` field
  - `column_config` table with `is_masterdata` and `role_permissions`
  - Employee table component with inline editing
- **Builds Upon:**
  - Story 6.7: Add Last Active Timestamp to User Table
  - Story 3.1: Column Configuration Data Model
  - Story 2.1: Employee List Table View
  - Story 4.4: Inline Editing for Masterdata Fields

---

## Non-Functional Requirements

- **Performance:** Change detection query should complete in <500ms for typical user (10-50 visible columns, 100-1000 employees). Changes do not need to be instantaneous - it's acceptable if changes appear within a few minutes after being made. No performance monitoring/alerting required for this feature.
- **GDPR Compliance:** No duplicate data storage - only change events are tracked, not field values
- **Scalability:** Audit table should handle high change frequency without performance degradation
- **Privacy:** Only show changes for columns user has view permission for
- **User Experience:** Highlights should be noticeable but not intrusive (soft yellow/amber color)
- **Data Retention:** Consider retention policy for audit table (out of scope for MVP, but design should allow for future cleanup)

---

## Technical Architecture

### Change Tracking Approach

**Option Selected:** Audit table approach (lightweight, GDPR-friendly)

- **Table:** `employee_column_changes`
  - Tracks: `employee_id`, `column_name` (db_column_name), `changed_at`, `changed_by` (optional)
  - Indexed on: `changed_at`, `employee_id`, `column_name`
- **Trigger:** PostgreSQL trigger on `employees` table UPDATE
  - Compares OLD vs NEW for all masterdata columns
  - Inserts row in audit table for each changed column
- **Query:** On login, fetch changes where:
  - `changed_at > user.last_active_at` (captured at login time)
  - `column_name IN (user's visible masterdata columns)`
  - `employee_id IN (non-archived employees user can see)`

### Frontend Flow

1. **On Dashboard Load (First Time in Session):**
   - Capture current `user.last_active_at` as `changesBaseline` once per session
   - Store baseline in sessionStorage (shared across all tabs in same session)
   - If `last_active_at` is null (first-time user), return empty results (no highlights)
   - Fetch changes via API endpoint using baseline
   - Store changes in React state/hook

2. **Banner Display:**
   - Show dismissible banner with count: "Changes made to X employees since your last login on [date]"
   - Banner dismissible via sessionStorage (persists during session, resets on new login)
   - Once dismissed, banner stays hidden for the session (no way to re-show it)

3. **Field Highlighting:**
   - Map `db_column_name` from changes to displayed columns
   - Apply soft yellow/amber background to changed fields
   - Highlights persist for the entire session (survive page refreshes, cleared on next login)

4. **On Page Refresh (Same Session):**
   - Reuse existing `changesBaseline` from sessionStorage (don't re-capture)
   - Re-fetch changes with same baseline
   - Update highlights (maintains session persistence)

---

## Out of Scope (for initial version)

- Real-time change notifications (Supabase subscriptions) - changes only detected on login/refresh
- Per-field dismissal tracking (too complex for value provided)
- Historical change viewing (only shows changes since last login)
- Change details modal (which user made change, when exactly)
- Email notifications for changes
- Change tracking for custom columns (only masterdata)
- Backfilling historical changes (only tracks from deployment forward)

---

## Test Organization Requirements

- All new tests created for Epic 16 stories must be organized in folders named for the epic and story number
- Test folder structure: `tests/{test-type}/epic-16/story-16.X/` (e.g., `tests/unit/epic-16/story-16.1/`, `tests/integration/epic-16/story-16.1/`, `tests/e2e/epic-16/story-16.1/`)
- This organization ensures that when multiple developers work on different stories and push code/tests, it's easy to identify which tests belong to which story
- If tests fail, developers can quickly locate and fix tests related to their specific story

---

## Future Enhancements (Post-MVP)

- Real-time change notifications via Supabase subscriptions
- Change history modal showing all changes to an employee
- Email notifications for critical changes
- Change tracking for custom columns
- Per-user notification preferences
- Change analytics dashboard for HR admins

