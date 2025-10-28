# Testing Strategy

## Testing Pyramid

```
        E2E Tests (5%)
       /              \
      Integration Tests (25%)
     /                    \
   Frontend Unit  Backend Unit (70%)
```

**Test Coverage Goals:**

- Overall: 70%+
- Business logic: 90%+
- UI components: 60%+
- API routes: 85%+

## Test Organization

### Frontend Tests

```
tests/
 unit/
    components/
       employee-table.test.tsx
       add-employee-modal.test.tsx
       role-preview-banner.test.tsx
    services/
       employee-service.test.ts
       column-service.test.ts
    hooks/
       use-auth.test.ts
       use-employees.test.ts
       use-view-state-tracker.test.ts
    utils/
        validation.test.ts
        format.test.ts
        change-detection.test.ts
```

### Backend Tests

```
tests/
 integration/
    api/
        employees.test.ts
        columns.test.ts
        auth.test.ts
        admin.test.ts
 unit/
    services/
       employee-service.test.ts
       column-service.test.ts
    repositories/
        employee-repository.test.ts
        column-repository.test.ts
```

### E2E Tests (Post-MVP)

```
tests/
 e2e/
     auth.spec.ts
     hr-admin-crud.spec.ts
     external-party-custom-columns.spec.ts
     real-time-sync.spec.ts
```

## Test Examples

### Frontend Component Test

```typescript
// tests/unit/components/employee-table.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { EmployeeTable } from "@/components/dashboard/employee-table";

describe("EmployeeTable", () => {
  it("renders employee list correctly", () => {
    const mockEmployees = [
      {
        id: "1",
        first_name: "John",
        surname: "Doe",
        email: "john@example.com",
      },
      {
        id: "2",
        first_name: "Jane",
        surname: "Smith",
        email: "jane@example.com",
      },
    ];

    render(
      <EmployeeTable employees={mockEmployees} columns={[]} onEdit={vi.fn()} />
    );

    expect(screen.getByText("John")).toBeInTheDocument();
    expect(screen.getByText("Jane")).toBeInTheDocument();
  });

  it("calls onEdit when cell is clicked", async () => {
    const mockOnEdit = vi.fn();
    const mockEmployees = [
      {
        id: "1",
        first_name: "John",
        surname: "Doe",
        email: "john@example.com",
      },
    ];

    render(
      <EmployeeTable
        employees={mockEmployees}
        columns={[]}
        onEdit={mockOnEdit}
      />
    );

    const emailCell = screen.getByText("john@example.com");
    fireEvent.click(emailCell);

    // Expect cell to enter edit mode
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
```

### Backend API Test

```typescript
// tests/integration/api/employees.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

describe("GET /api/employees", () => {
  let supabase: any;
  let authToken: string;

  beforeAll(async () => {
    // Setup test database and authenticate
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );
    const { data } = await supabase.auth.signInWithPassword({
      email: "test-hr@example.com",
      password: "testpassword",
    });
    authToken = data.session.access_token;
  });

  afterAll(async () => {
    // Cleanup
    await supabase.auth.signOut();
  });

  it("returns employee list for HR Admin", async () => {
    const response = await fetch("http://localhost:3000/api/employees", {
      headers: {
        Authorization: Bearer,
      },
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data).toBeInstanceOf(Array);
  });

  it("returns 401 for unauthenticated requests", async () => {
    const response = await fetch("http://localhost:3000/api/employees");
    expect(response.status).toBe(401);
  });
});
```

### E2E Test (Post-MVP)

```typescript
// tests/e2e/hr-admin-crud.spec.ts
import { test, expect } from "@playwright/test";

test("HR Admin can create and edit employee", async ({ page }) => {
  // Login
  await page.goto("http://localhost:3000/login");
  await page.fill('[name="email"]', "admin@example.com");
  await page.fill('[name="password"]', "adminpass");
  await page.click('button[type="submit"]');

  // Wait for dashboard
  await expect(page).toHaveURL("/dashboard");

  // Open Add Employee modal
  await page.click("text=Add Employee");
  await expect(page.locator("role=dialog")).toBeVisible();

  // Fill form
  await page.fill('[name="first_name"]', "Test");
  await page.fill('[name="surname"]', "Employee");
  await page.fill('[name="ssn"]', "123456-7890");
  await page.fill('[name="email"]', "test@example.com");
  await page.fill('[name="hire_date"]', "2025-01-15");

  // Submit
  await page.click("text=Save Employee");

  // Verify toast notification
  await expect(
    page.locator("text=Employee Test Employee created successfully")
  ).toBeVisible();

  // Verify employee appears in table
  await expect(page.locator("text=Test Employee")).toBeVisible();
});
```

## Notification System Testing

**Purpose:** Ensure change notifications appear correctly when masterdata updates affect external party filtered views.

**Test Coverage Areas:**

### Unit Tests - Change Detection Logic

```typescript
// tests/unit/utils/change-detection.test.ts
import { describe, it, expect } from "vitest";
import { detectViewImpact } from "@/lib/utils/change-detection";

describe("detectViewImpact", () => {
  it('returns "added" when employee enters view', () => {
    const oldEmployee = {
      id: "1",
      hire_date: "2024-12-01",
      first_name: "John",
    };
    const newEmployee = {
      id: "1",
      hire_date: "2025-01-15",
      first_name: "John",
    };
    const viewState = {
      visibleEmployeeIds: new Set(), // Employee wasn't visible before
      activeFilters: { hire_date: ">=2025-01-01" },
      activeSortColumn: null,
      activeSortDirection: null,
    };

    const result = detectViewImpact(oldEmployee, newEmployee, viewState);
    expect(result).toBe("added");
  });

  it('returns "removed" when employee leaves view', () => {
    const oldEmployee = {
      id: "1",
      hire_date: "2025-01-15",
      first_name: "John",
    };
    const newEmployee = {
      id: "1",
      hire_date: "2024-12-01",
      first_name: "John",
    };
    const viewState = {
      visibleEmployeeIds: new Set(["1"]), // Employee was visible before
      activeFilters: { hire_date: ">=2025-01-01" },
      activeSortColumn: null,
      activeSortDirection: null,
    };

    const result = detectViewImpact(oldEmployee, newEmployee, viewState);
    expect(result).toBe("removed");
  });

  it('returns "updated" when employee stays in view', () => {
    const oldEmployee = {
      id: "1",
      first_name: "John",
      hire_date: "2025-01-15",
    };
    const newEmployee = {
      id: "1",
      first_name: "Jonathan",
      hire_date: "2025-01-15",
    };
    const viewState = {
      visibleEmployeeIds: new Set(["1"]),
      activeFilters: { hire_date: ">=2025-01-01" },
      activeSortColumn: null,
      activeSortDirection: null,
    };

    const result = detectViewImpact(oldEmployee, newEmployee, viewState);
    expect(result).toBe("updated");
  });

  it("returns null when change does not affect view", () => {
    const oldEmployee = { id: "1", hire_date: "2024-10-01" };
    const newEmployee = { id: "1", hire_date: "2024-11-01" };
    const viewState = {
      visibleEmployeeIds: new Set(), // Employee not visible
      activeFilters: { hire_date: ">=2025-01-01" },
      activeSortColumn: null,
      activeSortDirection: null,
    };

    const result = detectViewImpact(oldEmployee, newEmployee, viewState);
    expect(result).toBeNull();
  });
});
```

### Unit Tests - ViewStateTracker Hook

```typescript
// tests/unit/hooks/use-view-state-tracker.test.ts
import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useViewStateTracker } from "@/lib/hooks/use-view-state-tracker";

describe("useViewStateTracker", () => {
  it("tracks visible employee IDs", () => {
    const employees = [
      { id: "1", first_name: "John", hire_date: "2025-01-01" },
      { id: "2", first_name: "Jane", hire_date: "2025-02-01" },
    ];

    const { result } = renderHook(() =>
      useViewStateTracker(employees, {}, null)
    );

    expect(result.current.visibleEmployeeIds.size).toBe(2);
    expect(result.current.visibleEmployeeIds.has("1")).toBe(true);
    expect(result.current.visibleEmployeeIds.has("2")).toBe(true);
  });

  it("updates visibleEmployeeIds when employees change", () => {
    const employees = [
      { id: "1", first_name: "John", hire_date: "2025-01-01" },
    ];

    const { result, rerender } = renderHook(
      ({ employees }) => useViewStateTracker(employees, {}, null),
      { initialProps: { employees } }
    );

    expect(result.current.visibleEmployeeIds.size).toBe(1);

    // Update employees (filter applied)
    const filteredEmployees = employees.filter(
      (e) => e.hire_date >= "2025-02-01"
    );
    rerender({ employees: filteredEmployees });

    expect(result.current.visibleEmployeeIds.size).toBe(0);
  });
});
```

### Integration Tests - Real-Time Notification Flow

```typescript
// tests/integration/change-notifications.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { EmployeeTable } from "@/components/dashboard/employee-table";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
  },
}));

describe("Change Notifications Integration", () => {
  it("shows notification when employee enters filtered view", async () => {
    const mockRealtimeEvent = {
      eventType: "UPDATE",
      old: {
        id: "1",
        hire_date: "2024-12-01",
        first_name: "John",
        surname: "Doe",
      },
      new: {
        id: "1",
        hire_date: "2025-01-15",
        first_name: "John",
        surname: "Doe",
      },
    };

    render(
      <EmployeeTable employees={[]} filters={{ hire_date: ">=2025-01-01" }} />
    );

    // Simulate real-time event
    simulateRealtimeEvent(mockRealtimeEvent);

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(
        "1 new employee matches your filters: John Doe"
      );
    });
  });

  it("batches notifications for multiple simultaneous changes", async () => {
    const mockRealtimeEvents = [
      {
        eventType: "INSERT",
        new: { id: "1", hire_date: "2025-01-10", first_name: "Alice" },
      },
      {
        eventType: "INSERT",
        new: { id: "2", hire_date: "2025-01-12", first_name: "Bob" },
      },
      {
        eventType: "INSERT",
        new: { id: "3", hire_date: "2025-01-14", first_name: "Charlie" },
      },
    ];

    render(
      <EmployeeTable employees={[]} filters={{ hire_date: ">=2025-01-01" }} />
    );

    // Simulate bulk insert within 200ms window
    mockRealtimeEvents.forEach((event) => simulateRealtimeEvent(event));

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(
        "3 new employees match your filters"
      );
    });
  });

  it("does not show notification for user's own custom column edits", async () => {
    const mockRealtimeEvent = {
      eventType: "UPDATE",
      table: "sodexo_data", // Custom data table, not employees table
      old: { id: "1", data: { custom_field: "old_value" } },
      new: { id: "1", data: { custom_field: "new_value" } },
    };

    render(<EmployeeTable employees={[]} userRole="sodexo" />);

    simulateRealtimeEvent(mockRealtimeEvent);

    await waitFor(() => {
      expect(toast.info).not.toHaveBeenCalled();
    });
  });
});
```

### Performance Tests

```typescript
// tests/unit/hooks/use-view-state-tracker.performance.test.ts
import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useViewStateTracker } from "@/lib/hooks/use-view-state-tracker";
import { detectViewImpact } from "@/lib/utils/change-detection";

describe("Notification Performance", () => {
  it("notification logic executes in <100ms", () => {
    const employees = Array.from({ length: 1000 }, (_, i) => ({
      id: `${i}`,
      first_name: `Employee${i}`,
      hire_date: "2025-01-01",
    }));

    const { result } = renderHook(() =>
      useViewStateTracker(employees, {}, null)
    );

    const oldEmployee = {
      id: "500",
      hire_date: "2024-12-01",
      first_name: "Employee500",
    };
    const newEmployee = {
      id: "500",
      hire_date: "2025-01-15",
      first_name: "Employee500",
    };

    const startTime = performance.now();
    const notificationType = detectViewImpact(
      oldEmployee,
      newEmployee,
      result.current
    );
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(100);
    expect(notificationType).toBe("added");
  });
});
```

### Manual Testing Checklist

**Scenario 1: Employee Enters View**

- [ ] Login as Sodexo user
- [ ] Apply filter: hire_date >= 2025-01-01 (shows 10 employees)
- [ ] In separate browser, login as HR Admin
- [ ] Update employee hire_date: 2024-12-01 → 2025-01-15
- [ ] Verify Sodexo user sees: "1 new employee matches your filters: [Name]"
- [ ] Verify employee appears in Sodexo table
- [ ] Verify notification auto-dismisses after 5 seconds

**Scenario 2: Employee Leaves View**

- [ ] Login as ÖMC user with filter showing 5 employees
- [ ] HR Admin archives one of the visible employees
- [ ] Verify ÖMC user sees: "1 employee no longer matches your filters: [Name]"
- [ ] Verify employee disappears from ÖMC table

**Scenario 3: Employee Updated in View**

- [ ] Login as Payroll user viewing unfiltered table
- [ ] HR Admin updates email of visible employee
- [ ] Verify Payroll user sees: "Employee [Name] was updated (Email changed)"
- [ ] Verify employee row updates with highlight

**Scenario 4: Batched Notifications**

- [ ] Login as Toplux user with hire_date filter
- [ ] HR Admin imports CSV with 10 employees (5 match filter)
- [ ] Verify Toplux user sees: "5 new employees match your filters"
- [ ] Verify all 5 employees appear in table

**Scenario 5: Accessibility**

- [ ] Enable screen reader (NVDA/JAWS/VoiceOver)
- [ ] Trigger notification via HR Admin update
- [ ] Verify screen reader announces notification message
- [ ] Verify dismiss button is keyboard-accessible (Tab + Enter)

---

````
});
```

---
````
