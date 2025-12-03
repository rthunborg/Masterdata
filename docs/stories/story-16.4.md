# Story 16.4: Change Notification Banner Component

**Story:** As an external party user, I want to see a dismissible banner showing how many employees have changes since my last login, so that I'm aware of updates before I start working.

**Status:** pending  
**Epic:** Epic 16: Employee Data Change Notifications

---

## Acceptance Criteria

### Criterion 1: Banner Display
- **Given** a user has changes since last login
- **When** they view the dashboard
- **Then** a banner appears at the top of the employee table
- **And** the banner displays: "Changes made to X employees since your last login on [date] at [time]. See highlighted fields below."
- **And** the banner is visually distinct (e.g., info/alert styling)
- **And** the banner includes a close/dismiss button (X icon)

### Criterion 2: Dismiss Functionality
- **Given** the banner is visible
- **When** the user clicks the dismiss button (X)
- **Then** the banner is hidden
- **And** the dismissal state is stored in sessionStorage
- **And** the banner remains hidden for the current session
- **And** the banner reappears on next login (new session)

### Criterion 3: No Changes State
- **Given** a user has no changes since last login
- **When** they view the dashboard
- **Then** the banner does not appear
- **And** no empty/zero-count banner is shown

### Criterion 4: Date/Time Formatting
- **Given** the `changesBaseline` timestamp
- **When** it's displayed in the banner
- **Then** it's formatted in a user-friendly way (e.g., "January 15, 2025 at 8:00 AM")
- **And** it uses the user's locale/timezone
- **And** it's clear and readable

### Criterion 5: Banner Styling
- **Given** the banner component
- **When** it's rendered
- **Then** it uses appropriate styling:
  - Info/alert color scheme (e.g., blue or amber)
  - Clear typography
  - Proper spacing and padding
  - Responsive design (works on mobile and desktop)
  - Accessible (proper contrast, ARIA labels)

### Criterion 6: Loading State
- **Given** changes are being fetched
- **When** the hook is in loading state
- **Then** the banner doesn't appear (or shows loading state)
- **And** once loading completes, banner appears if changes exist

### Criterion 7: Error State
- **Given** change fetching fails
- **When** an error occurs
- **Then** the banner doesn't appear (don't show misleading information)
- **And** error is handled gracefully (logged, not shown to user unless critical)

### Criterion 8: Banner Position
- **Given** the employee table/dashboard layout
- **When** the banner is displayed
- **Then** it appears above the employee table
- **And** it doesn't overlap other UI elements
- **And** it doesn't break responsive layout

---

## Technical Notes

### Component Structure

```typescript
interface ChangeNotificationBannerProps {
  totalCount: number;
  changesBaseline: string | null;
  onDismiss: () => void;
  isDismissed: boolean;
}

export function ChangeNotificationBanner({
  totalCount,
  changesBaseline,
  onDismiss,
  isDismissed
}: ChangeNotificationBannerProps) {
  if (isDismissed || totalCount === 0 || !changesBaseline) {
    return null;
  }

  const formattedDate = formatDate(changesBaseline);

  return (
    <div className="banner-container">
      <div className="banner-content">
        <span>Changes made to {totalCount} employees since your last login on {formattedDate}. See highlighted fields below.</span>
        <button onClick={onDismiss} aria-label="Dismiss banner">
          <XIcon />
        </button>
      </div>
    </div>
  );
}
```

### Dismissal State Management

- Use `sessionStorage` to persist dismissal state
- Key: `employee-changes-banner-dismissed`
- Value: `'true'` or timestamp
- Check on component mount
- Clear on new login (when `changesBaseline` changes)

### Date Formatting

- Use `next-intl` or `date-fns` for date formatting
- Format: "January 15, 2025 at 8:00 AM" (or locale-appropriate)
- Consider relative time: "2 days ago" if recent

### Styling

- Use shadcn/ui Alert or custom banner component
- Colors: Info blue or amber/yellow to match field highlights
- Responsive: Full width on mobile, contained on desktop
- Position: Above employee table, below filters/toolbar

### Integration

- Use in `dashboard/page.tsx` or `employee-table.tsx`
- Get data from `useEmployeeChanges()` hook
- Manage dismissal state in parent component or hook

---

## Tasks

- [ ] Create component file: `src/components/dashboard/change-notification-banner.tsx`
- [ ] Implement banner UI with message and dismiss button
- [ ] Implement date/time formatting
- [ ] Implement dismissal state with sessionStorage
- [ ] Add styling (responsive, accessible)
- [ ] Integrate with `useEmployeeChanges()` hook
- [ ] Add loading state handling
- [ ] Add error state handling
- [ ] Test banner display with changes
- [ ] Test banner dismissal
- [ ] Test banner doesn't show with no changes
- [ ] Test responsive design (mobile/desktop)
- [ ] Test accessibility (keyboard navigation, screen readers)
- [ ] Add translations (if multi-language support exists)

---

## Prerequisites

- Story 16.3: Frontend Change Tracking Hook (hook must exist)
- Story 2.1: Employee List Table View (dashboard/table must exist)
- UI component library (shadcn/ui or similar) for styling

---

## Testing Requirements

### Unit Tests
- Test banner renders with changes
- Test banner doesn't render with no changes
- Test dismissal functionality
- Test sessionStorage persistence
- Test date formatting

### Integration Tests
- Test banner integration with dashboard
- Test banner with `useEmployeeChanges()` hook
- Test dismissal state across page refreshes

### E2E Tests
- Test complete flow: login → see banner → dismiss → verify hidden
- Test banner reappears on new login
- Test banner with different change counts

### Manual Testing
- Verify banner appears with changes
- Verify banner dismisses correctly
- Verify banner doesn't appear with no changes
- Verify responsive design
- Verify accessibility (keyboard, screen reader)

