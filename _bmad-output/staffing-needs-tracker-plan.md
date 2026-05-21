# Implementation Plan: Crewing Staffing Needs Tracker

**Feature:** Enable Crewing to input staffing needs per location, with live progress tracking, audit history, and email notifications.
**Date:** 2026-03-13
**Status:** Ready for implementation

---

## Summary

Two new tracker cards in the dashboard stats bar (right of "Crewing Done") showing staffing fulfillment per location (Trelleborg / Göteborg). Crewing and HR Admin can edit the target headcount. All users can view the trackers. Full audit trail with tooltip (last change) and history modal (current year). Email notifications to HR on every change.

---

## Story 1: Database Schema & Migration

**File:** `supabase/migrations/20260313000001_add_staffing_needs.sql`

### Tables

**`staffing_needs`** — Config table, exactly 2 rows:

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `location` | `text` | NOT NULL, UNIQUE, CHECK (`location IN ('Trelleborg', 'Göteborg')`) |
| `headcount_need` | `integer` | NOT NULL, DEFAULT 0, CHECK (`headcount_need >= 0`) |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` |
| `updated_by` | `uuid` | FK → `users(id)`, NULL (null before first edit) |

Seed with two rows: `('Trelleborg', 0, now(), NULL)`, `('Göteborg', 0, now(), NULL)`.

**`staffing_needs_changelog`** — Append-only audit log:

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `location` | `text` | NOT NULL |
| `old_value` | `integer` | NOT NULL |
| `new_value` | `integer` | NOT NULL |
| `changed_by` | `uuid` | FK → `users(id)`, NOT NULL |
| `changed_at` | `timestamptz` | NOT NULL, DEFAULT `now()` |

### RLS Policies

**`staffing_needs`:**
- SELECT: All authenticated users (matches `get_user_role() IS NOT NULL`)
- UPDATE: `get_user_role() IN ('hr_admin', 'crewing')`
- No INSERT/DELETE (rows are seeded, never created/deleted by users)

**`staffing_needs_changelog`:**
- SELECT: All authenticated users
- INSERT: `get_user_role() IN ('hr_admin', 'crewing')` — or use service role client in API to bypass RLS for inserts (preferred, since the API controls insert logic)
- No UPDATE/DELETE

### Permission Change

Update `column_config` row for `crewing_done`: set Crewing's `role_permissions` from `{ "view": true, "edit": true }` to `{ "view": true, "edit": false }`.

```sql
UPDATE column_config
SET role_permissions = jsonb_set(
  role_permissions,
  '{crewing}',
  '{"view": true, "edit": false}'::jsonb
)
WHERE db_column_name = 'crewing_done';
```

### Indexes

- `staffing_needs_changelog`: Index on `(location, changed_at DESC)` for efficient history queries.

---

## Story 2: Repository

**File:** `src/lib/server/repositories/staffing-needs-repository.ts`

### Class: `StaffingNeedsRepository`

Follow the existing singleton pattern (`export const staffingNeedsRepository = new StaffingNeedsRepository()`).

**Methods:**

#### `getAll(): Promise<StaffingNeedWithProgress[]>`
Returns both locations with current headcount_need + computed "done" count.

- Query `staffing_needs` for both rows (need, updated_at, updated_by)
- For each location, count employees: `employees WHERE town_district = :location AND crewing_done = true AND is_archived = false`
- Join with `users` table to get the display name/email of `updated_by`
- Also fetch the latest changelog entry per location for the tooltip

Return shape:
```typescript
interface StaffingNeedWithProgress {
  location: string;
  headcount_need: number;
  done_count: number;
  updated_at: string;
  updated_by: { id: string; email: string } | null;
  last_change: {
    old_value: number;
    new_value: number;
    changed_by: { id: string; email: string };
    changed_at: string;
  } | null;
}
```

#### `updateNeed(location: string, newValue: number, userId: string): Promise<{ oldValue: number; newValue: number }>`
- Fetch current `headcount_need` for the location
- If `newValue === oldValue`, return early (no-op, no changelog, no email)
- Update `staffing_needs` SET `headcount_need = newValue`, `updated_at = now()`, `updated_by = userId`
- Insert changelog row: `{ location, old_value, new_value, changed_by: userId }`
- Return `{ oldValue, newValue }` for the email notification

#### `getHistory(location: string): Promise<StaffingNeedsChangelogEntry[]>`
- Query `staffing_needs_changelog` WHERE `location = :location` AND `changed_at >= start of current year (Stockholm TZ)`
- ORDER BY `changed_at DESC`
- Join `users` to get `changed_by` email
- Return array of changelog entries

---

## Story 3: API Endpoints

### `GET /api/staffing-needs`

**File:** `src/app/api/staffing-needs/route.ts`

- Auth: `requireAuthAPI(request)` — any authenticated user
- Calls `staffingNeedsRepository.getAll()`
- Returns `{ data: StaffingNeedWithProgress[], meta: { timestamp } }`

### `PUT /api/staffing-needs`

**File:** `src/app/api/staffing-needs/route.ts` (same file, PUT handler)

- Auth: `requireRoleAPI(['hr_admin', 'crewing'], request)`
- Validate body with Zod: `{ location: z.enum(['Trelleborg', 'Göteborg']), headcount_need: z.number().int().min(0) }`
- Use `parseOrError()` for validation
- Call `staffingNeedsRepository.updateNeed(location, headcount_need, user.id)`
- If no change (old === new), return success with no email
- If changed: trigger email notification (async, don't await — fire and forget)
- Return `{ data: { location, old_value, new_value }, meta: { timestamp } }`

**Email trigger logic (inside PUT handler or extracted to a service function):**
- Fetch HR recipients via `getHrAdminEmails()`
- Fetch the user's email for the "changed by" field
- Build email subject: `"Bemanningsbehov uppdaterat — {location}"`
- Build email body (text + HTML) with: location, old → new value, who changed, when
- Call `sendEmail({ to: recipients, subject, text, html })`

### `GET /api/staffing-needs/history`

**File:** `src/app/api/staffing-needs/history/route.ts`

- Auth: `requireAuthAPI(request)` — any authenticated user
- Query param: `?location=Trelleborg` or `?location=Göteborg`
- Validate location enum
- Calls `staffingNeedsRepository.getHistory(location)`
- Returns `{ data: StaffingNeedsChangelogEntry[], meta: { timestamp } }`

---

## Story 4: Types & Validation

**File:** `src/lib/types/staffing-needs.ts`

```typescript
export interface StaffingNeed {
  id: string;
  location: string;
  headcount_need: number;
  updated_at: string;
  updated_by: string | null;
}

export interface StaffingNeedWithProgress {
  location: string;
  headcount_need: number;
  done_count: number;
  updated_at: string;
  updated_by: { id: string; email: string } | null;
  last_change: {
    old_value: number;
    new_value: number;
    changed_by: { id: string; email: string };
    changed_at: string;
  } | null;
}

export interface StaffingNeedsChangelogEntry {
  id: string;
  location: string;
  old_value: number;
  new_value: number;
  changed_by: { id: string; email: string };
  changed_at: string;
}
```

**File:** `src/lib/validation/staffing-needs.ts`

```typescript
import { z } from 'zod';

export const updateStaffingNeedSchema = z.object({
  location: z.enum(['Trelleborg', 'Göteborg']),
  headcount_need: z.number().int().min(0),
});
```

---

## Story 5: Frontend — Tracker Cards + Tooltip

### Modify: `src/components/dashboard/employee-stats-bar.tsx`

- Import and render `<StaffingNeedsTracker />` after the Crewing Done tooltip block
- Pass `refreshToken` through so it refetches when the dashboard refreshes

### New: `src/components/dashboard/staffing-needs-tracker.tsx`

Container component that:
1. Fetches `GET /api/staffing-needs` on mount (and on `refreshToken` change)
2. Gets current user role from `useAuth()`
3. Renders two `<StaffingNeedsCard />` instances (one per location)
4. Manages state for edit modal and history modal (open/close, selected location)

### New: `src/components/dashboard/staffing-needs-card.tsx`

Single location card matching existing stat card styling, plus a progress bar:

```
┌─────────────────────────────────────┐
│ 📍 Göteborg        13/30 ✏️        │
│ ████████░░░░░░░░░░  43%            │
└─────────────────────────────────────┘
```

- Radix `Tooltip` wrapping the card (shows last change on hover)
- Tooltip content: "{user} ändrade från {old} till {new}, {date}" — or "Ingen ändring gjord" if no changes
- Click on card body → opens history modal for that location
- Pencil icon: conditionally rendered for `hr_admin` and `crewing` roles → opens edit modal
- Progress bar: simple div with percentage width, colored background (uses Tailwind)
- When `headcount_need === 0`: show "Ej angivet" (not set) instead of "0/0"

---

## Story 6: Frontend — Edit Modal

### New: `src/components/dashboard/edit-staffing-needs-modal.tsx`

Dialog following existing modal patterns (`Dialog`, `DialogContent`, `DialogHeader`, `DialogFooter`).

- Props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `currentNeeds: StaffingNeedWithProgress[]`, `onSuccess: () => void`
- Two number inputs (one per location), pre-filled with current values
- React Hook Form + Zod validation (`updateStaffingNeedSchema` for each field)
- On submit:
  - Call `PUT /api/staffing-needs` for each location that changed
  - Show `toast.success()` on success
  - Call `onSuccess()` to trigger refetch
  - Close modal
- Cancel button closes without saving

```
┌────────────────────────────────────────┐
│  Uppdatera bemanningsbehov             │
│                                        │
│  📍 Trelleborg     [ 25         ]      │
│  📍 Göteborg       [ 30         ]      │
│                                        │
│              [Avbryt]  [Spara]         │
└────────────────────────────────────────┘
```

---

## Story 7: Frontend — History Modal

### New: `src/components/dashboard/staffing-needs-history-modal.tsx`

Dialog that shows audit history for a specific location.

- Props: `open: boolean`, `onOpenChange: (open: boolean) => void`, `location: string | null`
- Fetches `GET /api/staffing-needs/history?location={location}` when opened
- Displays a scrollable list in reverse chronological order
- Each entry:
  ```
  2026-03-13 14:30  |  anna@company.se  |  25 → 30
  ```
- Empty state: "Inga ändringar under {currentYear}"
- Title: "Ändringshistorik — {location}"

---

## Story 8: Email Notification

### New: `src/lib/services/staffing-needs-notification.ts`

**Function:** `sendStaffingNeedsUpdateEmail(location, oldValue, newValue, changedByEmail)`

- Gets HR recipients via `getHrAdminEmails()`
- Exclude the user who made the change from recipients (they already know)
- Subject: `"Bemanningsbehov uppdaterat — {location}"`
- Body (plain text + HTML):
  ```
  Bemanningsbehov för {location} har uppdaterats.

  Plats: {location}
  Tidigare behov: {oldValue}
  Nytt behov: {newValue}
  Ändrat av: {changedByEmail}
  Tidpunkt: {timestamp}
  ```
- HTML version with clean formatting matching existing email patterns
- Call `sendEmail()` (single email to all recipients via `to` array)

---

## Story 9: i18n Translations

### Modify: `messages/sv.json`

Add a new `"staffingNeeds"` namespace:

```json
{
  "staffingNeeds": {
    "trackerLabel": "Bemanningsbehov",
    "notSet": "Ej angivet",
    "progress": "{done}/{need}",
    "tooltipLastChange": "{user} ändrade från {oldValue} till {newValue}",
    "tooltipNoChanges": "Ingen ändring gjord",
    "editModalTitle": "Uppdatera bemanningsbehov",
    "editModalDescription": "Ange önskat antal anställda per ort.",
    "historyModalTitle": "Ändringshistorik — {location}",
    "historyNoEntries": "Inga ändringar under {year}",
    "historyChangedBy": "Ändrat av",
    "historyFrom": "från",
    "historyTo": "till",
    "saveSuccess": "Bemanningsbehov uppdaterat",
    "saveError": "Misslyckades att uppdatera bemanningsbehov",
    "emailSubject": "Bemanningsbehov uppdaterat — {location}",
    "emailBodyLocation": "Plats",
    "emailBodyOldValue": "Tidigare behov",
    "emailBodyNewValue": "Nytt behov",
    "emailBodyChangedBy": "Ändrat av",
    "emailBodyTimestamp": "Tidpunkt"
  }
}
```

Also add to the existing `"dashboard"` namespace:
```json
{
  "dashboard": {
    "staffingNeedsTrelleborg": "📍 Trelleborg",
    "staffingNeedsGoteborg": "📍 Göteborg"
  }
}
```

---

## Role Utils Update

### Modify: `src/lib/utils/role-utils.ts`

Add a new permission helper:

```typescript
export function canEditStaffingNeeds(role: UserRole): boolean {
  return role === UserRole.HR_ADMIN || role === UserRole.CREWING;
}
```

---

## File Summary

| File | Action | Story |
|------|--------|-------|
| `supabase/migrations/20260313000001_add_staffing_needs.sql` | Create | 1 |
| `src/lib/types/staffing-needs.ts` | Create | 4 |
| `src/lib/validation/staffing-needs.ts` | Create | 4 |
| `src/lib/server/repositories/staffing-needs-repository.ts` | Create | 2 |
| `src/app/api/staffing-needs/route.ts` | Create | 3 |
| `src/app/api/staffing-needs/history/route.ts` | Create | 3 |
| `src/lib/services/staffing-needs-notification.ts` | Create | 8 |
| `src/components/dashboard/staffing-needs-tracker.tsx` | Create | 5 |
| `src/components/dashboard/staffing-needs-card.tsx` | Create | 5 |
| `src/components/dashboard/edit-staffing-needs-modal.tsx` | Create | 6 |
| `src/components/dashboard/staffing-needs-history-modal.tsx` | Create | 7 |
| `src/components/dashboard/employee-stats-bar.tsx` | Modify | 5 |
| `src/lib/utils/role-utils.ts` | Modify | 2 |
| `messages/sv.json` | Modify | 9 |

---

## Implementation Order

```
Story 1: DB Schema & Migration
    ↓
Story 4: Types & Validation schemas
    ↓
Story 2: Repository
    ↓
Story 3: API Endpoints
    ↓
┌───────────────────┬────────────────┬────────────────┬─────────────────┐
│ Story 5: Cards +  │ Story 6: Edit  │ Story 7: Hist  │ Story 8: Email  │
│ Tooltip + StatsBar│ Modal          │ Modal          │ Notification    │
└───────────────────┴────────────────┴────────────────┴─────────────────┘
    ↓
Story 9: i18n (can be done alongside stories 5-8)
```

Stories 5-8 can be parallelized once the backend (1-4) is in place. Story 9 (i18n) should be woven in as each frontend component is built.

---

## Edge Cases to Handle

1. **`headcount_need = 0`** — Show "Ej angivet" instead of "0/0 0%"
2. **No changelog entries** — Tooltip shows "Ingen ändring gjord"
3. **Archived employees** — Excluded from done count (`is_archived = false`)
4. **Terminated employees** — The existing getSystemStats excludes archived but includes terminated. For staffing needs, we should also include terminated employees in the done count since `is_archived = false` is the only filter (matching the existing crewing_done behavior)
5. **Same value submitted** — No-op, no changelog entry, no email
6. **Concurrent edits** — Last write wins (acceptable for 2-4 users)
7. **Year boundary** — History modal only shows current year; old data stays in DB
8. **Email failure** — Log error but don't fail the PUT request (fire and forget)
