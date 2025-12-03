# Story 15.6: Documentation Update and Cleanup

**Story:** As a developer, I want to update project documentation (README, architecture docs), so that it accurately reflects the current state of the application after the cleanup.

**Status:** Approved
**Epic:** Epic 15: Technical Debt Cleanup and Project Refactoring

---

## Acceptance Criteria

### Criterion 1: Documentation Accuracy

- **Given** `README.md` and `docs/` folder
- **When** I update them
- **Then** obsolete instructions are removed
- **And** architecture diagrams (if any) are updated to reflect service consolidation
- **And** "Getting Started" guides are verified to work

### Criterion 2: Epic 15 Integration

- **Given** `epics.md`
- **When** I review it
- **Then** I ensure it is consistent with the dedicated Epic 15 files and status

---

## Technical Notes

- Review `docs/` for stale markdown files.
- Ensure `epics.md` structure is preserved but updated with this new epic.

---

## Tasks

- [ ] Review `README.md` for accuracy.
- [ ] Update architecture documentation in `docs/architecture/` if services changed significantly.
- [ ] Verify `docs/epics.md` matches `docs/epic-15.md`.
- [ ] Clean up any temp or notes files in `docs/`.

---

## Ready for Review/Deployment

**Test Suite Requirement (Epic 15):**

Before this story can be marked as **"Ready for Review"** or **"Ready for Deployment"**, the following must be satisfied:

- ✅ **Zero Failing Tests:** The entire test suite must have **0 failing tests**. Currently, all tests are passing, and this baseline must be maintained.

- ✅ **Refactoring-Related Test Failures:** If a test fails due to refactoring changes (e.g., documentation updates that affect test setup, removed test documentation):
  1. **Validate no bugs were introduced:** Verify that the functionality still works correctly despite the test failure.
  2. **Fix or adjust:** Either:
     - **Fix the bug** if the refactoring introduced a regression (e.g., accidentally removed test setup instructions that tests depend on), OR
     - **Update the test** if the test is outdated and the refactoring is correct (e.g., test references old documentation structure).

- ✅ **Test Execution:** Run the full test suite (`pnpm test` or equivalent) and confirm all tests pass before marking this story as ready.