# Epic 20: Advanced Employee Filtering

**Status:** In Progress
**Start Date:** 2026-01-29
**Target Completion:** TBD

## Overview

Implement a comprehensive filtering system for the employee dashboard that allows users to filter employees by any visible column, save frequently-used filters, and share filters via URL.

## Business Value

Users need an efficient way to:
1. Export employees matching specific criteria
2. View employees by specific date assignments (e.g., OMC date)
3. Filter on any available column in their view
4. Save and reuse common filter combinations
5. Share filtered views with colleagues via URL

## User Stories

- **As a user**, I want to click a filter button to open a filter panel, so I can apply complex filters to the employee list
- **As a user**, I want to filter by any column I have access to, so I can find specific employees quickly
- **As a user**, I want to save my frequently-used filters, so I don't have to recreate them every time
- **As a user**, I want to share a filtered view via URL, so colleagues can see the same filtered data
- **As a user**, I want a clear visual indicator when filters are active, so I know I'm viewing filtered data

## Technical Approach

- **Client-side filtering** (max ~100 employees, excellent performance)
- **URL-based filter sharing** (base64-encoded filter state in query params)
- **Per-user saved filters** (stored in new `user_filters` table)
- **Permission-aware** (only show columns user has read access to)
- **Desktop-first** (viewport-based feature detection)

## Stories

1. [Story 20.1](./story-20.1/story-20.1.md) - Remove Crew Ready Dropdown (1-2 pts)
2. [Story 20.2](./story-20.2/story-20.2.md) - Filter Panel UI (3-5 pts)
3. [Story 20.3](./story-20.3/story-20.3.md) - Filter Controls by Column Type (5-8 pts)
4. [Story 20.4](./story-20.4/story-20.4.md) - Filter Engine & State Management (5-8 pts)
5. [Story 20.5](./story-20.5/story-20.5.md) - Filter Visual Indicators (2-3 pts)
6. [Story 20.6](./story-20.6/story-20.6.md) - Saved Filters (5-8 pts)
7. [Story 20.7](./story-20.7/story-20.7.md) - Export Verification & Fixes (1-2 pts)

**Total Estimate:** 22-36 story points

## Architecture Decisions

### Client-Side vs Server-Side Filtering

**Decision:** Client-side filtering

**Rationale:**
- Max 100 employees in system (small dataset)
- Instant filtering response (no API latency)
- Column configs already fetched client-side
- Existing global search is client-side and works well
- Simplified state management

### URL State Management

**Decision:** Base64-encoded JSON in query params

**Format:** `/?filters=base64(JSON.stringify(FilterState[]))`

**Benefits:**
- Supports complex filter objects
- URL-safe encoding
- Easy serialization/deserialization
- Future-proof for multi-filter support

### Saved Filters Storage

**Decision:** New `user_filters` table with JSONB column

**Schema:**
```sql
CREATE TABLE user_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  filters jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);
```

## Acceptance Criteria (Epic Level)

- [ ] Users can click filter button to open slide-in panel
- [ ] Panel shows only columns user has read access to
- [ ] Each column type has appropriate filter controls (text search, boolean radio, date picker, etc.)
- [ ] Filters apply in real-time to employee table
- [ ] Active filters indicated visually (badge on button)
- [ ] "Clear Filter" button removes all active filters
- [ ] Users can save filters with custom names
- [ ] Saved filters appear in dropdown at top of panel
- [ ] Users can share filtered view via URL
- [ ] "Select All" checkbox only selects filtered employees
- [ ] Export respects filtered state
- [ ] Old crew ready dropdown removed
- [ ] Checkboxes (archived/terminated/repayment) remain unchanged

## Definition of Done

- [ ] All story acceptance criteria met
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] E2E tests for critical paths
- [ ] No linter errors
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Manual testing completed on dev environment
- [ ] Performance validated (<100ms filter application)

## Dependencies

- Existing column permission system (`column_config` table)
- Existing employee data fetching (`/api/employees`)
- Existing selection logic in employee table

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Filter complexity overwhelming users | Medium | Start with clean UI, accordion pattern for columns |
| Performance degradation with many filters | Low | Client-side filtering is fast for 100 rows; memoization |
| Breaking existing quick filter tests | Medium | Update tests as we remove old dropdown |
| URL length limits with complex filters | Low | Base64 compression keeps URLs reasonable |

## Related Epics

- Epic 13 (Crew Ready Export) - We're removing the crew ready dropdown from this epic
- Epic 17 (Role-Based UI) - Filter panel respects role-based column permissions

## Notes

- Keep existing checkbox filters (archived/terminated/repayment) - those are for special cases
- Remove dropdown filter (Alla anställda / Crew Ready / Inte Crew Ready)
- Desktop-only feature (mobile users rarely use the system)
- Real-time filter updates provide better UX than "Apply" button
