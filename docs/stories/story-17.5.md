# Story 17.5: Search Filter Improvements for External Users

**Story:** As an external party user, I want to use the search filter functionality, but I don't need the premade filters dropdown, so that I have a cleaner interface focused on search.

**Status:** Approved  
**Epic:** Epic 17: External User UX Improvements

---

## Acceptance Criteria

### Criterion 1: Remove Premade Filters Dropdown
- **Given** an external user is on the dashboard
- **When** they view the filter area
- **Then** the dropdown with premade filters ("Alla anställda", "Crew Ready", "Inte Crew Ready") is not shown
- **And** the dropdown is completely hidden (not just disabled)

### Criterion 2: Search Functionality Preserved
- **Given** an external user is on the dashboard
- **When** they view the filter area
- **Then** the search input field is still visible and functional
- **And** search works as before (filters employees by search term)
- **And** search functionality is not affected by removing the dropdown

### Criterion 3: HR Admin Unaffected
- **Given** an HR Admin user is on the dashboard
- **When** they view the filter area
- **Then** the premade filters dropdown is still visible and functional
- **And** all existing filter functionality remains unchanged

### Criterion 4: Role-Based Conditional Rendering
- **Given** the employee table component
- **When** it renders filters
- **Then** it conditionally shows/hides the dropdown based on user role
- **And** the conditional logic is clear and maintainable

---

## Technical Notes

### Component Location

The premade filters dropdown is in `src/components/dashboard/employee-table.tsx`:
- Around line 1744-1768: Crew Ready filter Select component
- Contains: "Alla anställda", "Crew Ready", "Inte Crew Ready"

### Conditional Rendering

Wrap the filter dropdown in a role check:

```tsx
{/* Story 8.5: Crew-Ready Filter - HR Admin only */}
{isHRAdmin && (
  <Select
    value={crewReadyFilter}
    onValueChange={(value) => setCrewReadyFilter(value as 'all' | 'ready' | 'not-ready')}
  >
    <SelectTrigger className="w-[180px]" aria-label="Crew Status" data-testid="crew-status-filter">
      <SelectValue placeholder="Crew Status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Alla anställda</SelectItem>
      <SelectItem value="ready">Crew Ready</SelectItem>
      <SelectItem value="not-ready">Inte Crew Ready</SelectItem>
    </SelectContent>
  </Select>
)}
```

### Search Input

Ensure search input remains visible for all users:
- Search input should not be wrapped in role check
- Search functionality should work for all users

### Testing Considerations

- Verify dropdown is hidden for external users
- Verify dropdown is visible for HR Admin
- Verify search still works for external users
- Verify no layout issues when dropdown is hidden

---

## Tasks

- [ ] Add role check to hide premade filters dropdown for external users
- [ ] Verify search input remains visible and functional
- [ ] Test with external user role
- [ ] Test with HR Admin role (verify dropdown still shows)
- [ ] Test search functionality for external users
- [ ] Verify no layout/UI issues when dropdown is hidden

---

## Prerequisites

- Employee table component must exist
- Search functionality must exist
- User role system must be in place

---

## Testing Requirements

### Unit Tests
- Test conditional rendering based on user role
- Test search input is always visible

### Integration Tests
- Test dropdown hidden for external users
- Test dropdown visible for HR Admin
- Test search works for external users

### E2E Tests
- Test external user sees search but not dropdown
- Test HR Admin sees both search and dropdown
- Test search functionality works correctly

### Manual Testing
- Login as external user (sodexo, omc, etc.)
- Verify premade filters dropdown is not visible
- Verify search input is visible and works
- Login as HR Admin
- Verify dropdown is still visible
- Verify all filter functionality works

---

## Notes

- This is a simple UI cleanup - no functionality changes
- Ensure layout doesn't break when dropdown is removed
- Consider if other filters should also be hidden (e.g., archived, terminated filters)

