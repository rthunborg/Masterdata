# Epic 17: External User UX Improvements

## Status

**Testing**

---

## Epic Goal

Improve the user experience for external party users (Sodexo, ÖMC, Payroll, Toplux) by addressing localization, functionality gaps, and UI issues identified through user feedback.

---

## Background

External party users have provided feedback on several UX issues that need to be addressed:

1. **Localization**: Custom column management UI is in English instead of Swedish
2. **Functionality gaps**: Missing delete button for custom columns, missing category color editing
3. **Export access**: External users should be able to export, but only fields they have view access for
4. **UI clutter**: Premade filters and navigation area not needed for external users
5. **Visual bugs**: Column alignment issues when users have limited viewable fields

This epic addresses all these issues to create a better, more localized experience for external users.

---

## Actors / Roles

- **External party users** (Sodexo, ÖMC, Payroll, Toplux) - primary beneficiaries
- **HR Admin users** - not affected by these changes (existing functionality preserved)

---

## Success Criteria

- All custom column management UI text is in Swedish for external users
- External users can delete their own custom columns
- External users can edit category colors when editing custom columns
- External users can export employees with field selection limited to their view permissions
- Premade filter dropdown is hidden for external users (search still works)
- Navigation area is hidden for external users (they only have dashboard access)
- Column alignment issue is fixed for external users with limited viewable fields

---

## Stories

1. [Story 17.1: Swedish Translations for Custom Column Management](./stories/story-17.1.md) - Localize all custom column UI text
2. [Story 17.2: Delete Functionality for Custom Columns](./stories/story-17.2.md) - Add delete button for user's own columns
3. [Story 17.3: Category Color Editing in Edit Column Modal](./stories/story-17.3.md) - Allow category color editing and remove columnTypeHint
4. [Story 17.4: Export Functionality for External Users](./stories/story-17.4.md) - Enable export with permission-based field filtering
5. [Story 17.5: Search Filter Improvements for External Users](./stories/story-17.5.md) - Remove premade filters dropdown, keep search
6. [Story 17.6: Remove Navigation Area for External Users](./stories/story-17.6.md) - Hide navigation bar for external users
7. [Story 17.7: Fix Column Alignment for External Users](./stories/story-17.7.md) - Fix vertical alignment issue with limited columns

---

## Suggested Sequencing

**Recommended Order:**

1. Story 17.1 (Translations) - Foundation for UI improvements
2. Story 17.2 (Delete) - Core functionality enhancement
3. Story 17.3 (Category color) - Additional edit modal feature
4. Story 17.4 (Export) - Major functionality addition
5. Story 17.5 (Filter improvements) - UI cleanup
6. Story 17.6 (Navigation removal) - UI cleanup
7. Story 17.7 (Alignment fix) - Bug fix

Stories 17.1-17.3 can be developed in parallel. Stories 17.5-17.7 are independent and can be done in any order.

---

## Dependencies

- **Prerequisites:**
  - Custom column management functionality (existing)
  - Export functionality (existing, but HR Admin only)
  - Search/filter functionality (existing)
  - Navigation layout (existing)
  - Employee table component (existing)
- **Builds Upon:**
  - Story 4.4: Organize Custom Columns by Category
  - Story 7.4: Column Management UX Enhancements
  - Story 13.6: General Export Button with Field Selection

---

## Non-Functional Requirements

- **Localization:** All Swedish translations must be added to translation files (messages/sv.json)
- **Backward Compatibility:** HR Admin functionality must remain unchanged
- **Performance:** No performance degradation from new features
- **Accessibility:** All new UI elements must be accessible (keyboard navigation, screen readers)

---

## Technical Architecture

### Translation System

- Use existing `useTranslations` hook from `@/lib/i18n`
- Add Swedish translations to `messages/sv.json`
- Ensure proper namespace usage (e.g., `modals`, `forms`, `tooltips`)

### Permission-Based Filtering

- Export field selection must filter based on `column_config.role_permissions[userRole].view`
- Only show fields user has view access for in export dialog

### Role-Based UI Rendering

- Use `user.role !== "hr_admin"` checks to conditionally render/hide UI elements
- Navigation area: Hide entire `<nav>` element for external users
- Filter dropdown: Conditionally render based on user role

---

## Out of Scope (for initial version)

- Multi-language support beyond Swedish (English remains default for HR Admin)
- Advanced export features beyond field selection
- Custom filter creation for external users
- Additional navigation customization

---

## Test Organization Requirements

- All new tests created for Epic 17 stories must be organized in folders named for the epic and story number
- Test folder structure: `tests/{test-type}/epic-17/story-17.X/` (e.g., `tests/unit/epic-17/story-17.1/`, `tests/integration/epic-17/story-17.1/`, `tests/e2e/epic-17/story-17.1/`)
- This organization ensures that when multiple developers work on different stories and push code/tests, it's easy to identify which tests belong to which story
- If tests fail, developers can quickly locate and fix tests related to their specific story

---

## Future Enhancements (Post-MVP)

- Additional localization for other UI areas
- More granular export permissions
- Custom filter creation for external users
- Enhanced column management features
