# Story 17.6: Remove Navigation Area for External Users

**Story:** As an external party user, I want the navigation area with page links to be hidden since I only have access to the dashboard, so that I have a cleaner interface without unnecessary navigation.

**Status:** Approved  
**Epic:** Epic 17: External User UX Improvements

---

## Acceptance Criteria

### Criterion 1: Navigation Area Hidden
- **Given** an external user is on any dashboard page
- **When** they view the page
- **Then** the gray navigation area (with "anställda" and other page links) is not shown
- **And** the navigation area is completely hidden (not just empty)

### Criterion 2: Header Preserved
- **Given** an external user is on the dashboard
- **When** they view the page
- **Then** the main header with logo and logout button is still visible
- **And** the header functionality is unchanged

### Criterion 3: Dashboard Content Visible
- **Given** an external user is on the dashboard
- **When** they view the page
- **Then** the dashboard content ("Personalhantering" and employee table) is visible
- **And** there is no awkward spacing where navigation was

### Criterion 4: HR Admin Unaffected
- **Given** an HR Admin user is on the dashboard
- **When** they view the page
- **Then** the navigation area is still visible and functional
- **And** all navigation links work as before

### Criterion 5: Layout Consistency
- **Given** the navigation area is hidden for external users
- **When** they view the page
- **Then** the layout is clean and consistent
- **And** there are no visual gaps or spacing issues
- **And** the page looks intentional and polished

---

## Technical Notes

### Component Location

The navigation area is in `src/app/dashboard/layout.tsx`:
- Lines 23-59: Navigation `<nav>` element
- Contains links to: dashboard, important-dates, admin/users, admin/columns
- Currently shows "anställda" link for all users
- Other links are conditionally shown for HR Admin only

### Conditional Rendering

Wrap the entire navigation in a role check:

```tsx
{/* Navigation - hidden on mobile, visible on desktop - HR Admin only */}
{user.role === "hr_admin" && (
  <nav className="bg-gray-100 border-b hidden lg:block">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex space-x-8">
        <Link
          href="/dashboard"
          className="border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
        >
          {t.navigation.employees}
        </Link>
        {/* ... other links ... */}
      </div>
    </div>
  </nav>
)}
```

### Layout Considerations

- Ensure no spacing issues when nav is hidden
- Verify main content area adjusts properly
- Check mobile layout (nav is already hidden on mobile with `hidden lg:block`)

### Testing

- Verify nav hidden for external users
- Verify nav visible for HR Admin
- Verify layout looks good without nav
- Test on different screen sizes

---

## Tasks

- [ ] Add role check to hide navigation area for external users
- [ ] Test layout with navigation hidden
- [ ] Test with external user role
- [ ] Test with HR Admin role (verify nav still shows)
- [ ] Verify no spacing/layout issues
- [ ] Test on mobile (should already be hidden, but verify)

---

## Prerequisites

- Dashboard layout component must exist
- User role system must be in place

---

## Testing Requirements

### Unit Tests
- Test conditional rendering based on user role
- Test navigation component

### Integration Tests
- Test navigation hidden for external users
- Test navigation visible for HR Admin
- Test layout rendering

### E2E Tests
- Test external user doesn't see navigation
- Test HR Admin sees navigation
- Test navigation links work for HR Admin

### Manual Testing
- Login as external user (sodexo, omc, etc.)
- Verify navigation area is not visible
- Verify header and dashboard content are visible
- Verify layout looks clean
- Login as HR Admin
- Verify navigation is visible
- Verify all navigation links work
- Test on different screen sizes

---

## Notes

- This is a simple UI cleanup - no functionality changes
- Navigation is already hidden on mobile (`hidden lg:block`), so this mainly affects desktop
- Consider if mobile navigation (MobileNav component) should also be updated

