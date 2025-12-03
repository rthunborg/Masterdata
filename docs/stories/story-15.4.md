# Story 15.4: Dependency Analysis and Cleanup

**Story:** As a developer, I want to remove unused packages and update critical dependencies, so that the project bundle size is optimized and security vulnerabilities are minimized.

**Status:** Approved
**Epic:** Epic 15: Technical Debt Cleanup and Project Refactoring

---

## Acceptance Criteria

### Criterion 1: Unused Dependencies Removed

- **Given** `package.json`
- **When** I analyze dependencies (using `pnpm audit`, `depcheck`)
- **Then** unused packages are uninstalled
- **And** `pnpm-lock.yaml` is updated

### Criterion 2: Bundle Size Optimization

- **Given** the current bundle size
- **When** I remove heavy/unused libraries
- **Then** the production build size is reduced (or at least verified optimized)

---

## Technical Notes

- Use `npx depcheck` to find unused dependencies.
- Be careful with "dev dependencies" that might be used in scripts but not imported in code.
- Check for heavy libraries that can be replaced with lighter alternatives (e.g., date libraries, lodash functions).

---

## Tasks

- [ ] Run `npx depcheck` to identify unused packages.
- [ ] Uninstall confirmed unused packages.
- [ ] Run `pnpm audit` and fix high-severity vulnerabilities.
- [ ] Check bundle size using `next build` analysis.
- [ ] Commit updated `package.json` and `pnpm-lock.yaml`.

---

## Ready for Review/Deployment

**Test Suite Requirement (Epic 15):**

Before this story can be marked as **"Ready for Review"** or **"Ready for Deployment"**, the following must be satisfied:

- ✅ **Zero Failing Tests:** The entire test suite must have **0 failing tests**. Currently, all tests are passing, and this baseline must be maintained.

- ✅ **Refactoring-Related Test Failures:** If a test fails due to refactoring changes (e.g., removed dependencies, updated package versions):
  1. **Validate no bugs were introduced:** Verify that the functionality still works correctly despite the test failure.
  2. **Fix or adjust:** Either:
     - **Fix the bug** if the refactoring introduced a regression (e.g., accidentally removed a required dependency), OR
     - **Update the test** if the test is outdated and the refactoring is correct (e.g., test imports removed package, test needs updated mocks for new package version).

- ✅ **Test Execution:** Run the full test suite (`pnpm test` or equivalent) and confirm all tests pass before marking this story as ready.
