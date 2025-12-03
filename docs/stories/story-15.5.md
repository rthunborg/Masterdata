# Story 15.5: Test Suite Optimization and Cleanup

**Story:** As a developer, I want to organize and clean up the test suite, so that tests are reliable, fast, and easy to maintain.

**Status:** Approved
**Epic:** Epic 15: Technical Debt Cleanup and Project Refactoring

---

## Acceptance Criteria

### Criterion 1: Obsolete Tests Removed
- **Given** the `tests` directory
- **When** I review the test files
- **Then** I remove any tests for features that no longer exist

### Criterion 2: Test Structure Alignment
- **Given** the new epic/story organization
- **When** I review test folders
- **Then** I ensure test folder structure matches the new epic/story organization

### Criterion 3: Flaky Test Resolution
- **Given** the test suite execution history
- **When** I identify flaky tests
- **Then** I resolve the underlying issues or properly skip/mock them if necessary

---

## Technical Notes
- Check `tests/unit`, `tests/integration`, `tests/e2e`.
- Remove any `.skip` tests that are permanently obsolete.
- Consolidate test utils if duplicated.

---

## Tasks
- [ ] Audit `tests/` folder for outdated test files.
- [ ] Remove tests for deleted components/features.
- [ ] Organize tests into `epic-XX/story-XX` folders if not already done.
- [ ] Run full test suite to identify flaky tests.
- [ ] Fix or document any failing tests.

---

## Ready for Review/Deployment

**Test Suite Requirement (Epic 15):**

Before this story can be marked as **"Ready for Review"** or **"Ready for Deployment"**, the following must be satisfied:

- ✅ **Zero Failing Tests:** The entire test suite must have **0 failing tests**. Currently, all tests are passing, and this baseline must be maintained.

- ✅ **Refactoring-Related Test Failures:** If a test fails due to refactoring changes (e.g., test organization, removed obsolete tests, fixed flaky tests):
  1. **Validate no bugs were introduced:** Verify that the functionality still works correctly despite the test failure.
  2. **Fix or adjust:** Either:
     - **Fix the bug** if the refactoring introduced a regression (e.g., accidentally removed a valid test, broke test setup), OR
     - **Update the test** if the test is outdated and the refactoring is correct (e.g., test structure needs updating, test needs new mocks after cleanup).

- ✅ **Test Execution:** Run the full test suite (`pnpm test` or equivalent) and confirm all tests pass before marking this story as ready.

