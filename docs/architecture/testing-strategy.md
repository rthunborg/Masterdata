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
    utils/
        validation.test.ts
        format.test.ts
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
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EmployeeTable } from '@/components/dashboard/employee-table';

describe('EmployeeTable', () => {
  it('renders employee list correctly', () => {
    const mockEmployees = [
      { id: '1', first_name: 'John', surname: 'Doe', email: 'john@example.com' },
      { id: '2', first_name: 'Jane', surname: 'Smith', email: 'jane@example.com' },
    ];

    render(<EmployeeTable employees={mockEmployees} columns={[]} onEdit={vi.fn()} />);

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
  });

  it('calls onEdit when cell is clicked', async () => {
    const mockOnEdit = vi.fn();
    const mockEmployees = [
      { id: '1', first_name: 'John', surname: 'Doe', email: 'john@example.com' },
    ];

    render(<EmployeeTable employees={mockEmployees} columns={[]} onEdit={mockOnEdit} />);

    const emailCell = screen.getByText('john@example.com');
    fireEvent.click(emailCell);

    // Expect cell to enter edit mode
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
```

### Backend API Test

```typescript
// tests/integration/api/employees.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('GET /api/employees', () => {
  let supabase: any;
  let authToken: string;

  beforeAll(async () => {
    // Setup test database and authenticate
    supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
    const { data } = await supabase.auth.signInWithPassword({
      email: 'test-hr@example.com',
      password: 'testpassword',
    });
    authToken = data.session.access_token;
  });

  afterAll(async () => {
    // Cleanup
    await supabase.auth.signOut();
  });

  it('returns employee list for HR Admin', async () => {
    const response = await fetch('http://localhost:3000/api/employees', {
      headers: {
        Authorization: Bearer ,
      },
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.data).toBeInstanceOf(Array);
  });

  it('returns 401 for unauthenticated requests', async () => {
    const response = await fetch('http://localhost:3000/api/employees');
    expect(response.status).toBe(401);
  });
});
```

### E2E Test (Post-MVP)

```typescript
// tests/e2e/hr-admin-crud.spec.ts
import { test, expect } from '@playwright/test';

test('HR Admin can create and edit employee', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3000/login');
  await page.fill('[name="email"]', 'admin@example.com');
  await page.fill('[name="password"]', 'adminpass');
  await page.click('button[type="submit"]');

  // Wait for dashboard
  await expect(page).toHaveURL('/dashboard');

  // Open Add Employee modal
  await page.click('text=Add Employee');
  await expect(page.locator('role=dialog')).toBeVisible();

  // Fill form
  await page.fill('[name="first_name"]', 'Test');
  await page.fill('[name="surname"]', 'Employee');
  await page.fill('[name="ssn"]', '123456-7890');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="hire_date"]', '2025-01-15');

  // Submit
  await page.click('text=Save Employee');

  // Verify toast notification
  await expect(page.locator('text=Employee Test Employee created successfully')).toBeVisible();

  // Verify employee appears in table
  await expect(page.locator('text=Test Employee')).toBeVisible();
});
```

---
