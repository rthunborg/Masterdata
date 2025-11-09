# Crew-Ready Export Feature Guide

## Overview

The Crew-Ready Export feature allows HR Admins to export employees who have completed all prerequisite onboarding requirements but have not yet been formally marked as "crew-ready." The export process automatically marks all exported employees as crew-ready in a single operation.

**Story**: 8.5 - Crewing/Done Field Conditional Logic  
**Feature Added**: 2025-11-09  
**Endpoint**: `POST /api/employees/export-crew-ready`

---

## Purpose

This feature streamlines the workflow of identifying and marking employees as ready for crew assignment. Instead of manually checking each employee and marking them individually, HR Admins can:

1. **Identify** all employees who meet all onboarding requirements
2. **Export** their information to CSV for record-keeping
3. **Mark** them all as crew-ready in a single action

---

## Prerequisites for Crew-Ready Status

An employee is eligible for crew-ready export when ALL of the following 10 prerequisites are true:

| Field             | Description                                 |
| ----------------- | ------------------------------------------- |
| **ISP**           | International Safety Passport certification |
| **Photo**         | Employee photo on file                      |
| **Origo**         | Origo system registration                   |
| **Mail**          | Email setup complete                        |
| **lön**           | Payroll setup complete                      |
| **Bankuppgifter** | Bank account details verified               |
| **LI**            | Life Insurance enrollment                   |
| **Passport**      | Passport verification complete              |
| **Kvitto C17/18** | Mandatory certification receipt             |
| **C17**           | Mandatory certification                     |

**AND** the employee's `Crewing/Done` field must be `false` or `null` (not already marked as crew-ready).

---

## How to Use

### Step 1: Navigate to Employee Table

1. Log in as an HR Admin
2. Navigate to the Dashboard (Employee Table view)

### Step 2: Export Crew-Ready Employees

1. Locate the **"Export & Mark Crew Ready"** button in the table toolbar (next to the crew status filter)
2. Click the button
3. The system will:
   - Identify all eligible employees
   - Generate a CSV file with their information
   - Automatically download the CSV file
   - Mark all exported employees as `crewing_done = true`
   - Display a success message with the count of exported employees
   - Refresh the table to show updated crew-ready statuses

### Step 3: Review Exported Data

The downloaded CSV file will be named:  
`crew_ready_employees_YYYY-MM-DD.csv`

**CSV Contains:**

- Employee ID, First Name, Surname, SSN
- Email, Mobile, Rank, Hire Date
- Status of all 10 prerequisite fields (Yes/No)
- "All Prerequisites Met" = Yes
- "Ready for Crew Assignment" = Yes

---

## What Happens After Export

### Automatic Actions

1. **Crewing/Done Field Updated**: All exported employees have their `crewing_done` field set to `true`
2. **Visual Indicators Updated**: Exported employees now display:
   - Green row highlighting in the table
   - Green checkmark badge in the Crewing/Done column
3. **Filter Updates**: Employees appear in "Crew Ready" filter results
4. **Real-Time Sync**: Changes are immediately visible to all users

### Manual Follow-Up (if needed)

- Review the CSV file for record-keeping
- Notify relevant departments of newly crew-ready employees
- Archive the CSV file according to your document retention policy

---

## Error Handling

### No Eligible Employees

**Message**: "No employees found with all prerequisites met but not yet marked as crew-ready"

**Meaning**: Either:

- All employees who meet prerequisites are already marked as crew-ready
- No employees currently meet all 10 prerequisite requirements

**Action**: Review employee prerequisite completion status and try again later.

### API Error

**Message**: "Failed to export crew-ready employees"

**Meaning**: A server error occurred during the export process.

**Action**:

1. Check your network connection
2. Verify you are logged in as HR Admin
3. Try again
4. Contact IT support if the problem persists

---

## Technical Details

### API Endpoint

**Endpoint**: `POST /api/employees/export-crew-ready`  
**Authentication**: Required (HR Admin only)  
**Method**: POST  
**Response**: CSV file (Content-Type: text/csv)

**Response Headers:**

- `Content-Disposition`: Filename with timestamp
- `X-Employees-Exported`: Count of exported employees
- `X-Timestamp`: Export timestamp (ISO 8601)

### Export Logic

```typescript
// Eligibility criteria
const isEligible = (employee: Employee) => {
  return (
    canEditCrewingDone(employee) && // All 10 prerequisites = true
    employee.crewing_done !== true // Not already crew-ready
  );
};
```

### Data Processing

1. **Fetch**: Retrieve all active employees (exclude archived and terminated)
2. **Filter**: Apply eligibility criteria
3. **Generate CSV**: Create CSV with all employee and prerequisite data
4. **Update**: Mark all exported employees as `crewing_done = true`
5. **Return**: Send CSV file with download headers

---

## Testing

### Integration Tests

Location: `tests/integration/export-crew-ready.test.ts`  
Tests: 12 comprehensive tests covering:

- Employee eligibility logic
- CSV data format and structure
- Business rule validation
- Edge cases (empty list, all crew-ready, etc.)

**Run tests:**

```bash
pnpm test tests/integration/export-crew-ready.test.ts
```

---

## Security & Permissions

- **HR Admin Only**: Only users with `hr_admin` role can access this feature
- **Authentication Required**: Must be logged in with valid session
- **Row-Level Security**: Supabase RLS policies enforce data access
- **Server-Side Validation**: All eligibility checks performed on server
- **No Client Bypass**: Export cannot be triggered without proper authentication

---

## Performance Considerations

- **Filtering**: O(n) complexity where n = number of active employees
- **Validation**: O(10) per employee (constant time)
- **Update**: Batch update using Promise.all for efficiency
- **Expected Performance**: <5 seconds for 1000 employees

---

## Frequently Asked Questions

### Q: What happens if I export the same employees twice?

**A**: Employees already marked as `crewing_done = true` are automatically excluded from subsequent exports. You cannot export the same employee twice.

### Q: Can I undo a crew-ready marking?

**A**: Yes, but it must be done manually. Edit the employee record and set `Crewing/Done` to `false`. Note: The field will become disabled again if any prerequisites are later set to false.

### Q: Can External Party users export crew-ready employees?

**A**: No. The export feature is restricted to HR Admin users only.

### Q: What if an employee's prerequisite status changes after export?

**A**: If a prerequisite field is set to `false` after the employee is marked as crew-ready, the `Crewing/Done` field becomes disabled (read-only) but the value remains `true`. This preserves the crew-ready status while preventing inconsistent data.

### Q: Is there an export history or audit log?

**A**: Not currently. This is a planned future enhancement (post-MVP). For now, retain the exported CSV files as your audit trail.

---

## Related Documentation

- [Story 8.5: Crewing/Done Field Conditional Logic](stories/8.5.crewing-done-field-conditional-logic.md)
- [Epic 8: Enhanced Employee Management Features](epic-8-enhanced-employee-management-features.md)
- [API Documentation](API_DOCUMENTATION.md)
- [User Guide](USER_GUIDE.md)

---

## Support

For technical issues or questions:

- **File Location**: `src/app/api/employees/export-crew-ready/route.ts`
- **Service Logic**: `src/lib/services/crewing-validation.ts`
- **UI Component**: `src/components/dashboard/employee-table.tsx`

For business process questions, contact your HR department.
