# Story 16.2: API Endpoint for Change Detection

**Story:** As a developer, I want an API endpoint that returns which employees and columns have changed since a user's last active timestamp, so that the frontend can display change notifications.

**Status:** pending  
**Epic:** Epic 16: Employee Data Change Notifications

---

## Acceptance Criteria

### Criterion 1: API Endpoint Creation
- **Given** an authenticated user
- **When** they call `GET /api/employees/changes-since-last-active`
- **Then** the endpoint returns a JSON response with:
  - `changedEmployees`: Array of employee change objects
  - `totalCount`: Number of employees with changes
  - `userLastActive`: The timestamp used as baseline (user's last_active_at)
- **And** the endpoint requires authentication
- **And** the endpoint respects user role permissions

### Criterion 2: Change Detection Query
- **Given** a user's `last_active_at` timestamp
- **When** the API queries for changes
- **Then** it returns only changes where:
  - `changed_at > user.last_active_at`
  - `column_name IN (masterdata columns user has view permission for)`
  - `employee_id IN (non-archived employees user can see)`
- **And** it groups changes by employee (one entry per employee with list of changed columns)

### Criterion 3: Permission Filtering
- **Given** a user with role 'sodexo' who can only view 3 columns
- **When** changes are detected
- **Then** only changes to those 3 columns are included
- **And** changes to columns they don't have view access for are excluded
- **And** only masterdata columns are considered (custom columns excluded)

### Criterion 4: Response Structure
- **Given** the API response
- **When** it's returned
- **Then** the structure is:
```typescript
{
  changedEmployees: [
    {
      employeeId: "uuid",
      changedColumns: ["first_name", "email"],  // db_column_names
      lastChangeAt: "2025-01-15T10:00:00Z"  // Most recent change timestamp
    }
  ],
  totalCount: 3,
  userLastActive: "2025-01-10T08:00:00Z"
}
```

### Criterion 5: Empty Results Handling
- **Given** a user with no changes since last active
- **When** the API is called
- **Then** it returns `changedEmployees: []` and `totalCount: 0`
- **And** the response is still valid JSON
- **And** no errors are thrown

### Criterion 6: Performance
- **Given** a typical user (10-50 visible columns, 100-1000 employees)
- **When** the API query executes
- **Then** it completes in <500ms
- **And** the query uses appropriate indexes
- **And** the query doesn't cause database performance issues

### Criterion 7: Archived Employee Filtering
- **Given** changes to archived employees
- **When** the API queries for changes
- **Then** archived employees are excluded from results
- **And** only active (non-archived) employees are returned

---

## Technical Notes

### API Route Location
- File: `src/app/api/employees/changes-since-last-active/route.ts`
- Method: GET
- Authentication: Required (middleware handles this)

### Query Logic

```sql
SELECT DISTINCT
  ecc.employee_id,
  ARRAY_AGG(DISTINCT ecc.column_name) as changed_columns,
  MAX(ecc.changed_at) as last_change_at
FROM employee_column_changes ecc
INNER JOIN employees e ON e.id = ecc.employee_id
INNER JOIN column_config cc ON cc.db_column_name = ecc.column_name
WHERE ecc.changed_at > :user_last_active
  AND cc.is_masterdata = true
  AND cc.role_permissions->:user_role->>'view' = 'true'
  AND e.is_archived = false
  AND (get_user_role() IN ('sodexo', 'omc', 'payroll', 'toplux') OR get_user_role() = 'hr_admin')
GROUP BY ecc.employee_id
ORDER BY last_change_at DESC;
```

### Repository Method

Create method in `EmployeeRepository` or new `ChangeTrackingRepository`:

```typescript
async getChangesSinceLastActive(
  userId: string,
  lastActiveAt: string | null
): Promise<{
  changedEmployees: Array<{
    employeeId: string;
    changedColumns: string[];
    lastChangeAt: string;
  }>;
  totalCount: number;
  userLastActive: string | null;
}>
```

### Role Permission Check

- Get user's role from session
- Query `column_config` for columns where:
  - `is_masterdata = true`
  - `role_permissions[userRole].view = true`
- Use those `db_column_name` values to filter `employee_column_changes`

### Error Handling

- If `last_active_at` is null (user never logged in before), use a very old timestamp or return empty results
- Handle database errors gracefully
- Return appropriate HTTP status codes (200 for success, 401 for unauthorized, 500 for server errors)

---

## Tasks

- [ ] Create API route file: `src/app/api/employees/changes-since-last-active/route.ts`
- [ ] Create repository method for change query
- [ ] Implement SQL query with proper joins and filters
- [ ] Add role-based column permission filtering
- [ ] Add archived employee filtering
- [ ] Implement response formatting
- [ ] Add error handling
- [ ] Add authentication check
- [ ] Test with user who has changes
- [ ] Test with user who has no changes
- [ ] Test with different user roles (sodexo, omc, etc.)
- [ ] Test performance with realistic data volumes
- [ ] Add API documentation comments

---

## Prerequisites

- Story 16.1: Create Employee Column Changes Audit Table (audit table must exist)
- Story 6.7: Add Last Active Timestamp to User Table (last_active_at field must exist)
- Story 3.1: Column Configuration Data Model (column_config table must exist)
- Authentication middleware in place

---

## Testing Requirements

### Unit Tests
- Test repository method with various scenarios
- Test permission filtering logic
- Test response formatting

### Integration Tests
- Test API endpoint with authenticated user
- Test API endpoint with unauthenticated request (should return 401)
- Test with user who has changes
- Test with user who has no changes
- Test with different roles and column permissions
- Test archived employee filtering
- Test performance with realistic data

### Manual Testing
- Call API endpoint with Postman/curl
- Verify response structure matches specification
- Verify only visible columns are included
- Verify archived employees are excluded
- Verify performance is acceptable

