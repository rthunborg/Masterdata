# Story 15.3: Type Safety and Linting Improvements

**Story:** As a developer, I want to fix type errors, remove `any` types, and address linting warnings, so that the codebase is robust and self-documenting via types.

**Status:** Approved
**Epic:** Epic 15: Technical Debt Cleanup and Project Refactoring

---

## Acceptance Criteria

### Criterion 1: Linting and Type Check Cleanliness
- **Given** the codebase
- **When** I run `pnpm lint` and `tsc --noEmit`
- **Then** I see zero errors and reduced warnings
- **And** explicit `any` usage is minimized (replaced with proper interfaces or `unknown`)

### Criterion 2: Consistent Data Structures
- **Given** complex data structures (e.g., Employee, User)
- **When** I inspect their usage
- **Then** they are consistently typed across frontend and backend (API responses)

---

## Technical Notes
- Focus on `src/types` definition correctness.
- Check for `// @ts-ignore` or `// eslint-disable` comments and try to resolve the underlying issue.
- Ensure Zod schemas (if used) match TypeScript interfaces.

---

## Tasks
- [ ] Run `tsc --noEmit` to establish a baseline of type errors.
- [ ] Run `pnpm lint` to find linting issues.
- [ ] Search for usage of `: any` and replace with specific types.
- [ ] Review `// @ts-ignore` comments and attempt to fix.
- [ ] Ensure API response types in `src/types` match actual backend responses.

---

## Ready for Review/Deployment

**Test Suite Requirement (Epic 15):**

Before this story can be marked as **"Ready for Review"** or **"Ready for Deployment"**, the following must be satisfied:

- ✅ **Zero Failing Tests:** The entire test suite must have **0 failing tests**. Currently, all tests are passing, and this baseline must be maintained.

- ✅ **Refactoring-Related Test Failures:** If a test fails due to refactoring changes (e.g., type changes, interface updates, removed `any` types):
  1. **Validate no bugs were introduced:** Verify that the functionality still works correctly despite the test failure.
  2. **Fix or adjust:** Either:
     - **Fix the bug** if the refactoring introduced a regression, OR
     - **Update the test** if the test is outdated and the refactoring is correct (e.g., test uses old type definitions, test mocks need updated types).

- ✅ **Test Execution:** Run the full test suite (`pnpm test` or equivalent) and confirm all tests pass before marking this story as ready.

