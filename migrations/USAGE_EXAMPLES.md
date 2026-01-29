# Usage Examples: Working with changed_by Field

This document provides examples of how to use the new `changed_by` field in the `employee_column_changes` table.

## Direct SQL Queries

### Get recent changes with user information
```sql
SELECT 
  ec.employee_id,
  ec.column_name,
  ec.changed_at,
  ec.changed_by,
  u.email as changed_by_email,
  u.role as changed_by_role,
  e.first_name,
  e.surname
FROM employee_column_changes ec
LEFT JOIN users u ON ec.changed_by = u.auth_user_id
LEFT JOIN employees e ON ec.employee_id = e.id
ORDER BY ec.changed_at DESC
LIMIT 20;
```

### Get all changes made by a specific user
```sql
SELECT 
  ec.column_name,
  ec.changed_at,
  e.first_name || ' ' || e.surname as employee_name,
  e.id as employee_id
FROM employee_column_changes ec
JOIN users u ON ec.changed_by = u.auth_user_id
JOIN employees e ON ec.employee_id = e.id
WHERE u.email = 'user@example.com'
ORDER BY ec.changed_at DESC;
```

### Get change statistics by user
```sql
SELECT 
  u.email,
  u.role,
  COUNT(*) as total_changes,
  COUNT(DISTINCT ec.employee_id) as employees_affected,
  MIN(ec.changed_at) as first_change,
  MAX(ec.changed_at) as last_change
FROM employee_column_changes ec
JOIN users u ON ec.changed_by = u.auth_user_id
GROUP BY u.email, u.role
ORDER BY total_changes DESC;
```

### Get audit trail for a specific employee
```sql
SELECT 
  ec.column_name,
  ec.changed_at,
  u.email as changed_by_email,
  u.role as changed_by_role
FROM employee_column_changes ec
LEFT JOIN users u ON ec.changed_by = u.auth_user_id
WHERE ec.employee_id = 'your-employee-uuid-here'
ORDER BY ec.changed_at DESC;
```

## Using the Repository Method

The `EmployeeRepository` now includes a helper method for getting audit history:

### TypeScript/API Route Example

```typescript
import { employeeRepository } from "@/lib/server/repositories/employee-repository";

// Get audit history for an employee
const auditHistory = await employeeRepository.getEmployeeAuditHistory(
  "employee-uuid-here"
);

// Returns:
// [
//   {
//     columnName: "first_name",
//     changedAt: "2026-01-29T10:30:00Z",
//     changedBy: "user-uuid",
//     changedByEmail: "admin@example.com"
//   },
//   ...
// ]
```

### API Route Example

Create a new API route to expose audit history:

```typescript
// src/app/api/employees/[id]/audit-history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import { requireEmployeeManagerAPI } from "@/lib/server/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require HR Admin or Recruiter role to view audit history
    await requireEmployeeManagerAPI();

    const { id } = await params;

    // Get audit history
    const history = await employeeRepository.getEmployeeAuditHistory(id);

    return NextResponse.json({
      data: history,
      meta: {
        timestamp: new Date().toISOString(),
        count: history.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to fetch audit history",
        },
      },
      { status: 500 }
    );
  }
}
```

## Frontend Component Example

Display audit history in a React component:

```typescript
// components/EmployeeAuditHistory.tsx
import { useEffect, useState } from 'react';
import { format } from 'date-fns';

interface AuditEntry {
  columnName: string;
  changedAt: string;
  changedBy: string | null;
  changedByEmail: string | null;
}

export function EmployeeAuditHistory({ employeeId }: { employeeId: string }) {
  const [history, setHistory] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch(`/api/employees/${employeeId}/audit-history`);
        const data = await response.json();
        setHistory(data.data || []);
      } catch (error) {
        console.error('Failed to fetch audit history:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [employeeId]);

  if (loading) {
    return <div>Loading audit history...</div>;
  }

  if (history.length === 0) {
    return <div>No changes recorded yet.</div>;
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Change History</h3>
      <div className="space-y-1">
        {history.map((entry, index) => (
          <div key={index} className="text-sm border-l-2 border-gray-300 pl-3 py-1">
            <div className="font-medium">{entry.columnName}</div>
            <div className="text-gray-600">
              Changed {format(new Date(entry.changedAt), 'PPpp')}
              {entry.changedByEmail && (
                <> by <span className="font-medium">{entry.changedByEmail}</span></>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Supabase Client Query Example

If you want to query directly from the client (with proper RLS):

```typescript
// Get changes with user info
const { data, error } = await supabase
  .from('employee_column_changes')
  .select(`
    column_name,
    changed_at,
    changed_by,
    users!employee_column_changes_changed_by_fkey (
      email,
      role
    )
  `)
  .eq('employee_id', employeeId)
  .order('changed_at', { ascending: false })
  .limit(50);

// Note: You'll need to add RLS policies to allow reading employee_column_changes
// based on your security requirements
```

## RLS Policy Example

If you want to expose audit history to users via RLS, add policies like:

```sql
-- Allow HR Admins and Recruiters to view all audit history
CREATE POLICY "HR can view all audit history" ON employee_column_changes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.role IN ('hr_admin', 'recruiter')
    )
  );

-- Allow users to view their own changes
CREATE POLICY "Users can view their own changes" ON employee_column_changes
  FOR SELECT
  TO authenticated
  USING (changed_by = auth.uid());
```

## Analytics Query Examples

### Most active users this month
```sql
SELECT 
  u.email,
  u.role,
  COUNT(*) as changes_this_month,
  COUNT(DISTINCT ec.employee_id) as employees_modified
FROM employee_column_changes ec
JOIN users u ON ec.changed_by = u.auth_user_id
WHERE ec.changed_at >= date_trunc('month', CURRENT_DATE)
GROUP BY u.email, u.role
ORDER BY changes_this_month DESC
LIMIT 10;
```

### Most frequently changed fields
```sql
SELECT 
  ec.column_name,
  COUNT(*) as total_changes,
  COUNT(DISTINCT ec.changed_by) as unique_users,
  COUNT(DISTINCT ec.employee_id) as unique_employees,
  MAX(ec.changed_at) as last_changed
FROM employee_column_changes ec
WHERE ec.changed_at >= NOW() - INTERVAL '30 days'
GROUP BY ec.column_name
ORDER BY total_changes DESC;
```

### Changes by time of day
```sql
SELECT 
  EXTRACT(HOUR FROM ec.changed_at) as hour_of_day,
  COUNT(*) as change_count,
  COUNT(DISTINCT ec.changed_by) as unique_users
FROM employee_column_changes ec
WHERE ec.changed_at >= NOW() - INTERVAL '7 days'
GROUP BY hour_of_day
ORDER BY hour_of_day;
```

## Monitoring and Alerts

### Detect unusual activity
```sql
-- Find users who made more than 100 changes in the last hour
SELECT 
  u.email,
  u.role,
  COUNT(*) as changes_last_hour
FROM employee_column_changes ec
JOIN users u ON ec.changed_by = u.auth_user_id
WHERE ec.changed_at >= NOW() - INTERVAL '1 hour'
GROUP BY u.email, u.role
HAVING COUNT(*) > 100
ORDER BY changes_last_hour DESC;
```

### Find employees with many recent changes (possible data quality issues)
```sql
SELECT 
  e.id,
  e.first_name,
  e.surname,
  COUNT(DISTINCT ec.column_name) as columns_changed,
  COUNT(*) as total_changes,
  MAX(ec.changed_at) as last_change
FROM employees e
JOIN employee_column_changes ec ON e.id = ec.employee_id
WHERE ec.changed_at >= NOW() - INTERVAL '24 hours'
GROUP BY e.id, e.first_name, e.surname
HAVING COUNT(DISTINCT ec.column_name) > 5
ORDER BY total_changes DESC;
```

## Best Practices

1. **Always include user context**: When displaying changes, show who made them and when
2. **Respect privacy**: Only show audit history to authorized users (HR Admin, Recruiters)
3. **Add timestamps**: Display changes in user's local timezone
4. **Filter by date range**: For large datasets, add date filters to improve performance
5. **Cache results**: Consider caching frequently accessed audit histories
6. **Monitor for anomalies**: Set up alerts for unusual activity patterns
7. **Document changes**: Use the column name mapping from `column_config` to display friendly names

## Future Enhancements

With `changed_by` now tracked, you can build:
- 📊 User activity dashboards
- 🔍 Advanced audit search and filtering
- 📧 Change notifications sent to specific users
- 📝 Compliance reports showing who accessed/modified data
- 🎯 User performance metrics (changes per day, accuracy, etc.)
- 🔒 Enhanced security monitoring
