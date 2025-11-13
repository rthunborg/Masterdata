# Epic 11: Comprehensive Test Coverage

## Status

**Proposed**

---

## Epic Goal

Implement comprehensive automated test coverage for all critical business logic and user workflows to ensure system reliability, prevent regressions, and validate all acceptance criteria across existing features.

---

## Business Value

**Problem Statement:**
While the application has been developed with high code quality, comprehensive automated test coverage is currently lacking. Many critical business rules (capacity management, room assignment, termination workflows, prerequisite validation) rely primarily on manual testing. This creates risk of:

- Regressions when adding new features
- Bugs in edge cases not caught during manual testing
- Difficulty refactoring code confidently
- Time-consuming manual QA cycles
- Production issues from untested scenarios

**Value Proposition:**
Implementing comprehensive test coverage will:

1. **Reduce Production Bugs**: Catch issues before deployment through automated validation
2. **Enable Faster Development**: Developers can refactor confidently with safety net of tests
3. **Improve Code Quality**: Tests document expected behavior and edge cases
4. **Reduce QA Time**: Automated tests execute in minutes vs. hours of manual testing
5. **Prevent Regressions**: Ensure existing features continue working as new features are added
6. **Validate Complex Logic**: Test scenarios too complex/risky to test manually in production

**Target Metrics:**
- Overall test coverage: 80%+
- Critical business logic coverage: 95%+
- Integration test coverage for all API routes
- E2E test coverage for critical user journeys
- Test execution time: <5 minutes for full suite

---

## Scope

### In Scope

**Stories Included:**

1. **Story 11.1**: Capacity Management Test Suite (40 tests)
2. **Story 11.2**: Room Assignment Algorithm Test Suite (25 tests)
3. **Story 11.3**: Termination & Reactivation Workflow Tests (30 tests)
4. **Story 11.4**: Field Validation & Prerequisites Tests (20 tests)
5. **Story 11.5**: Date Format & Parsing Tests (15 tests)
6. **Story 11.6**: Integration Tests for API Routes (35 tests)
7. **Story 11.7**: End-to-End Critical User Journey Tests (10 tests)
8. **Story 11.8**: Performance & Concurrency Tests (15 tests)
9. **Story 11.9**: Data Integrity & Constraint Tests (10 tests)
10. **Story 11.10**: PE3 Validation & UI Component Tests (30 tests)
11. **Story 11.11**: Mobile Responsive UI Tests (15 tests)
12. **Story 11.12**: Employee Card Expansion Tests (10 tests)

**Test Types:**
- Unit tests (business logic, utilities, services)
- Integration tests (API routes, database operations, real-time sync)
- Component tests (React components, forms, modals)
- E2E tests (complete user workflows)
- Performance tests (load testing, concurrent operations)

### Out of Scope

- **Visual regression testing** (defer to future epic)
- **Cross-browser compatibility testing** (Swedish-only Chrome/Edge focus)
- **Mobile app testing** (web-only application)
- **Load testing beyond 100 concurrent users** (free-tier infrastructure)
- **Security penetration testing** (covered by separate security audit)

---

## Stories Overview

### Story 11.1: Capacity Management Test Suite

**Priority**: P0 (Critical)

**Goal**: Implement comprehensive tests for important dates capacity management (Story 8.7).

**Test Coverage:**
- Capacity defaults by category (ÖMC=20, Stena=99, PE3=1)
- Spot decrement/increment on assignment/removal
- Capacity limit enforcement (block when full)
- Concurrent assignment race conditions
- Visual indicator logic (full/almost full badges)
- API validation for capacity constraints
- Transaction atomicity (spots + assigned_employees)

**Estimated Tests**: 40 unit + integration tests

**Dependencies**: None

**Story Points**: 5

---

### Story 11.2: Room Assignment Algorithm Test Suite

**Priority**: P0 (Critical)

**Goal**: Implement comprehensive tests for ÖMC room assignment algorithm (Story 8.16 / FR40).

**Test Coverage:**
- First employee for date gets room 1
- CHEF rank gets private room (next incremented)
- SEV rank sharing logic (same gender, 1 occupant)
- SEV rank new room when no match or room full
- Room recalculation on date change
- Hotel required flag changes
- Gender constraint enforcement
- Concurrent room assignment race conditions

**Estimated Tests**: 25 unit + integration tests

**Dependencies**: Story 11.1 (capacity management interacts with room assignment)

**Story Points**: 5

---

### Story 11.3: Termination & Reactivation Workflow Tests

**Priority**: P0 (Critical)

**Goal**: Implement comprehensive tests for employee termination and reactivation workflows (Stories 8.13, 8.14).

**Test Coverage:**
- Date field clearing on termination (stena/omc/pe3)
- Repayment field population (omc/pe3)
- Spot release on termination
- Assigned employees array updates
- Reactivation date restoration (when spots available)
- Reactivation warnings (spots unavailable, date deleted)
- Transaction atomicity (repayment + clear + spots)
- Preview/confirmation UI data accuracy

**Estimated Tests**: 30 unit + integration tests

**Dependencies**: Story 11.1 (termination releases capacity)

**Story Points**: 5

---

### Story 11.4: Field Validation & Prerequisites Tests

**Priority**: P1 (High)

**Goal**: Implement tests for conditional field editability and validation (Stories 8.4, 8.5, 8.1-8.3).

**Test Coverage:**
- Crewing/Done prerequisite enforcement (10 fields)
- Talmundo editability (depends on One field + 24hr timer)
- Gender/Rank enum constraints
- Lönenivå range validation (0-7)
- Visual status indicators (boolean fields)
- One field 24-hour timer logic
- API-level validation enforcement

**Estimated Tests**: 20 unit + integration tests

**Dependencies**: None

**Story Points**: 3

---

### Story 11.5: Date Format & Parsing Tests

**Priority**: P1 (High)

**Goal**: Implement tests for ÖMC two-day date formatting and parsing (Story 8.9).

**Test Coverage:**
- Format display "8-9 mars 2025" (Swedish)
- Input parsing ("8-9/3", "8-9 mars", ISO)
- Consecutive day validation
- Month/year boundary handling
- CSV import/export format preservation
- Database storage (start date only)

**Estimated Tests**: 15 unit tests (already 30 exist, add integration)

**Dependencies**: None

**Story Points**: 2

---

### Story 11.6: Integration Tests for API Routes

**Priority**: P1 (High)

**Goal**: Implement integration tests for all employee and important dates API routes.

**Test Coverage:**
- POST /api/employees (create with validations)
- PATCH /api/employees/[id] (update with constraints)
- POST /api/employees/[id]/terminate (termination workflow)
- POST /api/employees/[id]/reactivate (reactivation workflow)
- GET/POST /api/important-dates (CRUD operations)
- GET /api/important-dates/available-pe3 (uniqueness)
- POST /api/employees/export-crew-ready (export workflow)
- Error handling (400, 404, 409, 500)

**Estimated Tests**: 35 integration tests

**Dependencies**: Stories 11.1-11.5 (tests business logic integrated via APIs)

**Story Points**: 5

---

### Story 11.7: End-to-End Critical User Journey Tests

**Priority**: P1 (High)

**Goal**: Implement E2E tests for complete user workflows using Playwright or similar.

**Test Coverage:**
- Create employee → Assign dates → Verify capacity/room → Export
- Terminate employee → Verify spots released → Reactivate → Verify restoration
- Import employees via CSV → Verify capacity respected → Export results
- Complete prerequisites → Enable Crewing/Done → Export crew-ready
- Concurrent user scenarios (two admins assigning to last spot)

**Estimated Tests**: 10 E2E tests

**Dependencies**: Stories 11.1-11.6 (E2E tests validate integrated system)

**Story Points**: 5

---

### Story 11.8: Performance & Concurrency Tests

**Priority**: P2 (Medium)

**Goal**: Implement performance benchmarks and concurrency tests.

**Test Coverage:**
- Table rendering with 1000+ employees (<2s)
- Capacity assignment with 100 concurrent requests
- Room assignment with 50 concurrent requests
- CSV export of 1000 employees (<10s)
- Modal with 100+ assigned employees (pagination)
- Real-time sync latency (<2s)

**Estimated Tests**: 15 performance/load tests

**Dependencies**: Story 11.6 (uses API routes for load testing)

**Story Points**: 3

---

### Story 11.9: Data Integrity & Constraint Tests

**Priority**: P2 (Medium)

**Goal**: Implement tests for database constraints and data consistency.

**Test Coverage:**
- remaining_spots never negative (DB constraint)
- remaining_spots <= max_spots (DB constraint)
- Gender enum constraint enforcement
- Rank enum constraint enforcement
- PE3 date uniqueness constraint
- Foreign key integrity (dates, employees)
- Transaction rollback scenarios
- Atomic operation verification (spots + array updates)

**Estimated Tests**: 10 integration tests

**Dependencies**: Story 11.1, 11.6

**Story Points**: 2

---

### Story 11.10: PE3 Validation & UI Component Tests

**Priority**: P1 (High)

**Goal**: Implement tests for PE3 date validation rules, form UI components, field positioning, and new requirements.

**Test Coverage:**
- PE3 time field mandatory validation
- Auto-population of description from date + time
- Important Dates form field ordering (time after date picker)
- Employee creation hotel field positioning and defaults
- Column settings display name text wrapping
- Form validation integration workflows

**Estimated Tests**: 30 component + integration tests

**Dependencies**: Stories 8.10, 8.15, 9.5 (existing implementations to test)

**Story Points**: 3

---

### Story 11.11: Mobile Responsive UI Tests

**Priority**: P2 (Medium)

**Goal**: Implement automated tests for mobile responsive layouts and button positioning.

**Test Coverage:**
- Dashboard button positioning on mobile (Add Employee, Import)
- Important Dates "Add Date" button visibility on mobile
- User Settings "Add User" button visibility on mobile
- Column Settings "Create Column" button visibility on mobile
- Envelope icon visibility toggle in User Settings
- Touch target size validation (44px minimum)
- Button wrapping/stacking on narrow screens (320px, 375px, 768px)

**Estimated Tests**: 15 component/visual tests

**Dependencies**: Stories 9.1, 9.4 (mobile responsive implementations)

**Story Points**: 3

---

### Story 11.12: Employee Card Expansion Tests

**Priority**: P2 (Medium)

**Goal**: Implement tests for employee card "More" expansion functionality and field visibility.

**Test Coverage:**
- "More" button shows all employee fields
- Vertical scrolling in expanded view
- Inline editing for editable fields in expansion
- Field visibility based on role permissions
- Expansion state persistence during updates
- Max-height and overflow behavior

**Estimated Tests**: 10 component tests

**Dependencies**: Story 9.4 (employee card expansion implementation)

**Story Points**: 2

---

## Technical Implementation Notes

### Testing Framework Stack

**Current (Already Configured):**
- **Vitest**: Fast unit/integration test runner
- **React Testing Library**: Component testing
- **Supabase Test Helpers**: Database mocking/fixtures

**To Add:**
- **Playwright** (or Cypress): E2E testing framework
- **Artillery** (or k6): Performance/load testing tool
- **MSW (Mock Service Worker)**: API mocking for isolated tests

### Test Organization

```
tests/
├── unit/
│   ├── services/
│   │   ├── date-capacity.test.ts (✅ exists - 26 tests)
│   │   ├── room-assignment.test.ts (NEW - Story 11.2)
│   │   ├── termination-workflow.test.ts (NEW - Story 11.3)
│   │   └── crewing-validation.test.ts (✅ exists - 39 tests)
│   ├── utils/
│   │   ├── omc-date-formatter.test.ts (✅ exists - 30 tests)
│   │   └── validation-helpers.test.ts (NEW - Story 11.4)
│   └── components/
│       ├── capacity-badge.test.tsx (NEW - Story 11.1)
│       └── room-assignment-preview.test.tsx (NEW - Story 11.2)
├── integration/
│   ├── api/
│   │   ├── employees.test.ts (NEW - Story 11.6)
│   │   ├── important-dates.test.ts (NEW - Story 11.6)
│   │   └── termination.test.ts (NEW - Story 11.3)
│   ├── date-capacity-concurrency.test.ts (✅ exists - 8 tests)
│   ├── room-assignment-concurrency.test.ts (NEW - Story 11.2)
│   └── real-time-sync.test.ts (NEW - Story 11.6)
├── e2e/
│   ├── employee-lifecycle.spec.ts (NEW - Story 11.7)
│   ├── date-assignment.spec.ts (NEW - Story 11.7)
│   └── concurrent-users.spec.ts (NEW - Story 11.7)
└── performance/
    ├── table-rendering.bench.ts (NEW - Story 11.8)
    ├── capacity-load.bench.ts (NEW - Story 11.8)
    └── export-performance.bench.ts (NEW - Story 11.8)
```

### CI/CD Integration

**Test Execution Strategy:**
- **PR Checks**: Unit + Integration tests (fast feedback, <2 min)
- **Merge to Main**: Full suite including E2E (<5 min)
- **Nightly**: Performance tests + extended scenarios
- **Pre-deployment**: Full regression suite

**Coverage Requirements:**
- Unit tests: 80% overall, 95% for services
- Integration tests: All API routes covered
- E2E tests: Critical user journeys covered
- Block merge if coverage drops below threshold

### Test Data Management

**Approach:**
- **Fixtures**: JSON/SQL files with test data
- **Factories**: Helper functions to generate test entities
- **Database Seeding**: Consistent seed data for integration tests
- **Cleanup**: After-each hooks to reset database state

**Example Factories:**
```typescript
// tests/helpers/employee-factory.ts
export function createTestEmployee(overrides = {}) {
  return {
    first_name: 'Test',
    surname: 'Employee',
    ssn: '199001011234',
    rank: 'SEV',
    gender: 'Man',
    hire_date: '2025-01-01',
    hotel_required: false,
    ...overrides
  };
}

// tests/helpers/date-factory.ts
export function createTestOMCDate(overrides = {}) {
  return {
    category: 'ÖMC Dates',
    date_value: '2025-03-08',
    date_description: '8-9 mars',
    max_spots: 20,
    remaining_spots: 20,
    ...overrides
  };
}
```

---

## Acceptance Criteria (Epic-Level)

1. **Test Coverage Goals Met:**
   - ✅ Overall coverage ≥ 80%
   - ✅ Service layer coverage ≥ 95%
   - ✅ API route coverage ≥ 90%
   - ✅ Critical business logic coverage = 100%

2. **Test Suite Performance:**
   - ✅ Unit tests execute in <30 seconds
   - ✅ Integration tests execute in <2 minutes
   - ✅ Full suite (unit + integration + E2E) executes in <5 minutes

3. **CI/CD Integration:**
   - ✅ Tests run automatically on every PR
   - ✅ Coverage reports generated and tracked
   - ✅ Failing tests block merge to main branch

4. **Test Quality:**
   - ✅ All tests follow consistent naming conventions
   - ✅ Tests are isolated (no interdependencies)
   - ✅ Tests use fixtures/factories (no hardcoded data)
   - ✅ Flaky tests identified and fixed (99%+ reliability)

5. **Documentation:**
   - ✅ Testing guide created (how to write/run tests)
   - ✅ Test coverage report available in CI
   - ✅ Each story has test examples in Dev Notes

---

## Dependencies

**Epic Dependencies:**
- None (testing can begin immediately on existing code)

**Story Dependencies:**
- Story 11.2 depends on 11.1 (room assignment uses capacity)
- Story 11.3 depends on 11.1 (termination releases capacity)
- Story 11.6 depends on 11.1-11.5 (API tests validate business logic)
- Story 11.7 depends on 11.1-11.6 (E2E tests validate integrated system)
- Story 11.8 depends on 11.6 (performance tests use API routes)
- Story 11.9 depends on 11.1, 11.6 (constraint tests validate data integrity)
- Story 11.10 depends on Stories 8.10, 8.15, 9.5 (tests existing implementations)
- Story 11.11 depends on Stories 9.1, 9.4 (tests mobile responsive implementations)
- Story 11.12 depends on Story 9.4 (tests employee card expansion)

**External Dependencies:**
- Playwright installation (for E2E tests)
- CI/CD pipeline configuration (GitHub Actions or similar)
- Test database setup (Supabase local instance or test environment)

---

## Risks & Mitigations

### Risk 1: Test Suite Execution Time
**Risk**: Full test suite takes >10 minutes, slowing down development workflow.

**Mitigation**:
- Parallelize test execution (Vitest supports this)
- Use test sharding in CI (split tests across multiple runners)
- Optimize slow tests (mock external dependencies)
- Run E2E tests only on merge to main (not every PR)

### Risk 2: Flaky Tests
**Risk**: Tests intermittently fail due to timing issues, real-time subscriptions, or race conditions.

**Mitigation**:
- Use proper wait/retry logic in E2E tests
- Mock real-time subscriptions in unit/integration tests
- Use deterministic test data (no random values)
- Implement test retry logic (max 3 retries for E2E)
- Monitor and fix flaky tests immediately

### Risk 3: Test Maintenance Burden
**Risk**: Tests break frequently when refactoring code, slowing development.

**Mitigation**:
- Write tests against interfaces/contracts (not implementation)
- Use test helpers/factories to centralize test data
- Keep tests simple and focused (one concept per test)
- Update tests as part of story completion (not separate)

### Risk 4: Coverage vs. Quality Trade-off
**Risk**: Focus on hitting coverage % leads to low-quality tests that don't catch bugs.

**Mitigation**:
- Emphasize edge case testing (not just happy path)
- Code review tests same as production code
- Require tests to document expected behavior (BDD style)
- QA reviews test coverage as part of gate checks

---

## Success Metrics

**Quantitative:**
1. **Test Coverage**: 80%+ overall, 95%+ for services (tracked via CI)
2. **Test Execution Time**: <5 min full suite (measured in CI)
3. **Test Reliability**: 99%+ pass rate (flaky test rate <1%)
4. **Bug Detection**: 80%+ of bugs caught by automated tests (vs. manual QA)
5. **Regression Prevention**: 0 regressions in tested code paths

**Qualitative:**
1. **Developer Confidence**: Team feels confident refactoring code with test safety net
2. **Faster Development**: New features developed faster with automated validation
3. **Reduced QA Time**: Manual QA cycles reduced from 2 days to 0.5 days
4. **Better Documentation**: Tests serve as executable documentation of behavior

---

## Change Log

| Date       | Version | Description                  | Author             |
| ---------- | ------- | ---------------------------- | ------------------ |
| 2025-11-13 | 1.0     | Epic 11 created              | Sarah (PO)         |

---

## Related Documentation

- [TEST_CASES_MASTER_LIST.md](../TEST_CASES_MASTER_LIST.md) - Comprehensive test case catalog
- [Story 8.7](stories/8.7.important-dates-capacity-management.md) - Capacity management implementation
- [Story 8.16](epic-8-enhanced-employee-management-features.md#story-816-ömc-room-assignment-algorithm) - Room assignment algorithm
- [Story 8.13](stories/8.13.terminated-employee-repayment-tracking.md) - Repayment tracking
- [Story 8.14](stories/8.14.termination-date-clear-logic-spot-management.md) - Termination workflow
- [Story 8.5](stories/8.5.crewing-done-field-conditional-logic.md) - Crewing/Done prerequisites
- [Testing Strategy](architecture/testing-strategy.md) - Project testing approach
