# Story 15.2: Service Layer Refactoring and Consolidation

**Story:** As a developer, I want to consolidate overlapping service logic (e.g., column services), so that there is a single source of truth for business logic and reduced code duplication.

**Status:** Approved
**Epic:** Epic 15: Technical Debt Cleanup and Project Refactoring

---

## Acceptance Criteria

### Criterion 1: Service Consolidation
- **Given** multiple service files with similar responsibilities (e.g., `column-service.ts` vs `column-config-service.ts`)
- **When** I refactor them
- **Then** their functionality is merged into a logical structure (e.g., `services/columns/` or a single robust service)
- **And** duplicate methods are removed
- **And** all call sites are updated to use the new unified service

### Criterion 2: Admin Service Cleanup
- **Given** `admin-service.ts`
- **When** I review its contents
- **Then** I ensure it doesn't duplicate logic found in domain-specific services (e.g., `employee-service.ts`)
- **And** move logic to domain services where appropriate

---

## Technical Notes
- Analyze `src/lib/services` for overlap.
- Focus on: Column management, Employee updates, Date handling.
- Ensure proper error handling and typing in the refactored services.
- Update unit tests to reflect service changes.

---

## Tasks
- [ ] Audit `src/lib/services` for redundancy (especially column services).
- [ ] Plan the consolidated service structure.
- [ ] Merge `column-service.ts` and `column-config-service.ts` (if applicable).
- [ ] Review `admin-service.ts` for domain logic leakage.
- [ ] Update imports in the application to point to new services.
- [ ] Verify tests pass after refactoring.

---

## Ready for Review/Deployment

**Test Suite Requirement (Epic 15):**

Before this story can be marked as **"Ready for Review"** or **"Ready for Deployment"**, the following must be satisfied:

- ✅ **Zero Failing Tests:** The entire test suite must have **0 failing tests**. Currently, all tests are passing, and this baseline must be maintained.

- ✅ **Refactoring-Related Test Failures:** If a test fails due to refactoring changes (e.g., service consolidation, updated imports, changed method signatures):
  1. **Validate no bugs were introduced:** Verify that the functionality still works correctly despite the test failure.
  2. **Fix or adjust:** Either:
     - **Fix the bug** if the refactoring introduced a regression, OR
     - **Update the test** if the test is outdated and the refactoring is correct (e.g., test uses old service name, test needs updated mocks for consolidated service).

- ✅ **Test Execution:** Run the full test suite (`pnpm test` or equivalent) and confirm all tests pass before marking this story as ready.

