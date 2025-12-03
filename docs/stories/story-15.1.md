# Story 15.1: Audit and Remove Unused Code

**Story:** As a developer, I want to identify and remove unused code (components, hooks, utils, api routes), so that the codebase remains lean and easier to navigate.

**Status:** Approved
**Epic:** Epic 15: Technical Debt Cleanup and Project Refactoring

---

## Acceptance Criteria

### Criterion 1: Unused Files Identified and Removed
- **Given** the complete codebase
- **When** I run an analysis (using tools like `ts-prune` or manual audit)
- **Then** I identify files and exports that are never imported or used
- **And** I delete these files/exports
- **And** the application still builds and runs correctly (no regression)

### Criterion 2: Utility Function Cleanup
- **Given** unused `utils` files
- **When** I review `src/utils`
- **Then** I remove any utility functions that are duplicative or unused

### Criterion 3: Legacy Component Removal
- **Given** legacy components (e.g., old versions of modals or tables)
- **When** I identify them
- **Then** they are removed from the repository

---

## Technical Notes
- Use tools: `npx ts-prune`, `npx unimported` to find unused files.
- Manually check `src/components` for "V1", "Old", or commented-out code blocks.
- Check `src/app/api` for unused routes.
- Verify removal doesn't break dynamic imports or reflection-based usage (though unlikely in this stack).

---

## Tasks
- [ ] Install and run `ts-prune` or `unimported`.
- [ ] Audit `src/components` for unused files.
- [ ] Audit `src/utils` for dead code.
- [ ] Audit `src/lib` and `src/hooks` for unused exports.
- [ ] Delete identified unused files.
- [ ] Verify build (`pnpm build`).
- [ ] Verify core flows still work.

---

## Ready for Review/Deployment

**Test Suite Requirement (Epic 15):**

Before this story can be marked as **"Ready for Review"** or **"Ready for Deployment"**, the following must be satisfied:

- ✅ **Zero Failing Tests:** The entire test suite must have **0 failing tests**. Currently, all tests are passing, and this baseline must be maintained.

- ✅ **Refactoring-Related Test Failures:** If a test fails due to refactoring changes (e.g., removing unused code that tests were referencing):
  1. **Validate no bugs were introduced:** Verify that the functionality still works correctly despite the test failure.
  2. **Fix or adjust:** Either:
     - **Fix the bug** if the refactoring introduced a regression, OR
     - **Update the test** if the test is outdated and the refactoring is correct (e.g., test references removed code that should have been removed).

- ✅ **Test Execution:** Run the full test suite (`pnpm test` or equivalent) and confirm all tests pass before marking this story as ready.

