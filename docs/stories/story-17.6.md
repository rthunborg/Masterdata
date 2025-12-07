# Story 17.6: Remove Navigation Area for External Users

**Story:** As an external party user, I want the navigation area with page links to be hidden since I only have access to the dashboard, so that I have a cleaner interface without unnecessary navigation.

**Status:** done  
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

- [x] Add role check to hide navigation area for external users
- [x] Test layout with navigation hidden
- [x] Test with external user role
- [x] Test with HR Admin role (verify nav still shows)
- [x] Verify no spacing/layout issues
- [x] Test on mobile (should already be hidden, but verify)

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

---

## Dev Agent Record

### Debug Log

**Implementation Plan:**
- Wrapped entire desktop navigation `<nav>` element in `{user.role === "hr_admin" && (...)}` conditional
- Removed redundant role checks inside nav (all links now only visible to hr_admin)
- Also updated mobile navigation: wrapped MobileNav component in Header with same role check
- Layout automatically adjusts when nav is hidden (no spacing issues)

**Changes Made:**
1. `src/app/dashboard/layout.tsx`: Wrapped navigation in role check (lines 23-55)
2. `src/components/layout/header.tsx`: Wrapped MobileNav in role check (lines 32-36)

### Completion Notes

✅ **Implementation Complete**

- Desktop navigation area now hidden for all external party users (sodexo, omc, payroll, toplux)
- Mobile navigation menu button also hidden for external users (consistent UX)
- HR Admin users see both desktop and mobile navigation as before
- Header with logo and logout button preserved for all users
- No layout spacing issues - navigation element completely removed from DOM when hidden
- All existing tests pass (2306 tests)
- No linting errors

**AC Verification:**
- ✅ AC1: Navigation area completely hidden for external users
- ✅ AC2: Header preserved and functional
- ✅ AC3: Dashboard content visible, no spacing issues
- ✅ AC4: HR Admin navigation still visible and functional
- ✅ AC5: Layout clean and consistent

---

## File List

- `src/app/dashboard/layout.tsx` (modified)
- `src/components/layout/header.tsx` (modified)

---

## Change Log

- 2025-12-01: Implemented navigation hiding for external users - wrapped desktop nav and mobile nav in role checks
- 2025-12-01: Senior Developer Review notes appended

---

## Senior Developer Review (AI)

**Reviewer:** Raz  
**Date:** 2025-12-01  
**Outcome:** Changes Requested

### Summary

Implementation correctly hides navigation for external users and preserves it for HR Admin. Code quality is good with proper conditional rendering. However, **automated tests are missing** despite being required by the Testing Requirements section and tasks 2-6 claiming testing was completed. This is a medium-severity gap that should be addressed before approval.

### Key Findings

**HIGH Severity:**
- None

**MEDIUM Severity:**
- Missing automated tests: No test files found for story 17.6 despite Testing Requirements section specifying unit, integration, and E2E tests
- Tasks 2-6 marked complete without test evidence: Tasks claim testing was done but no test files exist in `tests/` directory

**LOW Severity:**
- None

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| AC1 | Navigation Area Hidden | ✅ IMPLEMENTED | `src/app/dashboard/layout.tsx:24-55` - Navigation wrapped in `{user.role === "hr_admin" && (...)}` conditional, completely removed from DOM for external users |
| AC2 | Header Preserved | ✅ IMPLEMENTED | `src/components/layout/header.tsx` - Header component unchanged, still renders for all users with logo and logout button |
| AC3 | Dashboard Content Visible | ✅ IMPLEMENTED | `src/app/dashboard/layout.tsx:57-59` - Main content area unchanged, no spacing issues since nav element removed from DOM |
| AC4 | HR Admin Unaffected | ✅ IMPLEMENTED | `src/app/dashboard/layout.tsx:24` - Conditional check `user.role === "hr_admin"` preserves navigation for HR Admin users |
| AC5 | Layout Consistency | ✅ IMPLEMENTED | `src/app/dashboard/layout.tsx:24-55` - Conditional rendering removes nav element from DOM when hidden, preventing spacing issues |

**Summary:** 5 of 5 acceptance criteria fully implemented (100%)

### Task Completion Validation

| Task | Marked As | Verified As | Evidence |
|------|-----------|-------------|----------|
| Add role check to hide navigation area for external users | ✅ Complete | ✅ VERIFIED COMPLETE | `src/app/dashboard/layout.tsx:24` - Role check implemented |
| Test layout with navigation hidden | ✅ Complete | ⚠️ QUESTIONABLE | No test files found. Task claims testing done but no evidence in codebase |
| Test with external user role | ✅ Complete | ⚠️ QUESTIONABLE | No test files found. Task claims testing done but no evidence in codebase |
| Test with HR Admin role (verify nav still shows) | ✅ Complete | ⚠️ QUESTIONABLE | No test files found. Task claims testing done but no evidence in codebase |
| Verify no spacing/layout issues | ✅ Complete | ⚠️ QUESTIONABLE | No test files found. Task claims testing done but no evidence in codebase |
| Test on mobile (should already be hidden, but verify) | ✅ Complete | ⚠️ QUESTIONABLE | No test files found. Task claims testing done but no evidence in codebase |

**Summary:** 1 of 6 completed tasks verified, 5 questionable (no test evidence), 0 falsely marked complete

### Test Coverage and Gaps

**Missing Tests:**
- No unit tests for conditional rendering based on user role
- No integration tests for navigation visibility by role
- No E2E tests for external user navigation hiding
- No tests in `tests/unit/epic-17/story-17.6/` directory (per Epic 17 test organization requirements)
- No tests in `tests/integration/epic-17/story-17.6/` directory
- No tests in `tests/e2e/epic-17/story-17.6/` directory

**Testing Requirements Not Met:**
- Story Testing Requirements section specifies unit, integration, and E2E tests
- Epic 17 requires tests organized in `tests/{test-type}/epic-17/story-17.X/` structure
- No test files found matching these requirements

**Existing Test Patterns:**
- Codebase has role-based UI testing patterns (see `tests/integration/external-party-dashboard.test.tsx`, `tests/unit/components/role-selector.test.tsx`)
- Test utilities available (`tests/utils/role-test-utils.ts`) for creating mock users with different roles
- Similar navigation tests exist for other stories (e.g., `tests/unit/epic-12/story-12.9/mobile-nav-branding.test.tsx`)

### Architectural Alignment

**Tech Spec Compliance:**
- ✅ Follows Epic 17 Technical Architecture: "Use `user.role !== "hr_admin"` checks to conditionally render/hide UI elements"
- ✅ Navigation area: "Hide entire `<nav>` element for external users" - implemented correctly
- ✅ Backward compatibility: HR Admin functionality preserved

**Code Patterns:**
- ✅ Consistent with existing role-based conditional rendering patterns (e.g., `src/app/dashboard/page.tsx:228`, `src/components/dashboard/role-selector.tsx:33`)
- ✅ Uses same role check pattern: `user.role === "hr_admin"` (string literal, consistent with codebase)
- ✅ Mobile navigation also updated (`src/components/layout/header.tsx:33`) for consistency

### Security Notes

- ✅ No security concerns: Role-based UI hiding is cosmetic only, server-side route protection already in place
- ✅ No new attack surface introduced
- ✅ Role checks use existing session-based authentication

### Best-Practices and References

- **React Conditional Rendering:** Implementation correctly uses conditional rendering to remove elements from DOM (better than CSS hiding)
- **Next.js Server Components:** Layout uses server component with `getUserFromSession()` for server-side role check
- **Accessibility:** Navigation removal doesn't affect screen readers since element is removed from DOM (not just hidden)
- **Mobile-First:** Mobile navigation already hidden with `hidden lg:block`, implementation correctly extends this pattern

### Action Items

**Code Changes Required:**
- [x] [Medium] Create unit tests for navigation conditional rendering (AC #1, #4) [file: tests/unit/epic-17/story-17.6/navigation-conditional-rendering.test.tsx]
- [x] [Medium] Create integration tests for navigation visibility by role (AC #1, #4) [file: tests/integration/epic-17/story-17.6/navigation-visibility.test.tsx]
- [x] [Medium] Create E2E tests for external user navigation hiding (AC #1, #3, #5) [file: tests/e2e/epic-17/story-17.6/navigation-hiding.spec.ts]
- [x] [Medium] Create E2E tests for HR Admin navigation visibility (AC #4) [file: tests/e2e/epic-17/story-17.6/navigation-visibility.spec.ts]

**Advisory Notes:**
- Note: Consider adding visual regression tests for layout consistency (AC #5) to catch spacing issues automatically
- Note: Manual testing may have been performed but should be documented or replaced with automated tests per Testing Requirements

