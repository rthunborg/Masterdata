# Core Workflows

## Workflow 1: User Authentication and Session Management

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant NextJS as Next.js App
    participant API as /api/auth/login
    participant SupaAuth as Supabase Auth
    participant DB as PostgreSQL (users)

    User->>Browser: Enter email/password
    Browser->>NextJS: Load login page
    User->>Browser: Submit login form
    Browser->>API: POST /api/auth/login
    API->>SupaAuth: signInWithPassword(email, password)
    SupaAuth->>SupaAuth: Verify credentials

    alt Authentication Success
        SupaAuth-->>API: { user, session }
        API->>DB: SELECT * FROM users WHERE id = user.id
        DB-->>API: User record with role
        API->>Browser: Set session cookie
        API-->>Browser: { user, role }
        Browser->>NextJS: Redirect to /dashboard
        NextJS->>Browser: Render dashboard for role
    else Authentication Failed
        SupaAuth-->>API: Error: Invalid credentials
        API-->>Browser: 401 Unauthorized
        Browser->>User: Display error message
    end
```

## Workflow 2: HR Admin Creates Employee

```mermaid
sequenceDiagram
    actor HRAdmin as HR Admin
    participant Table as Table Component
    participant Modal as Add Employee Modal
    participant API as /api/employees
    participant Service as Employee Service
    participant Repo as Employee Repository
    participant DB as PostgreSQL
    participant Realtime as Supabase Realtime

    HRAdmin->>Table: Click "Add Employee"
    Table->>Modal: Open modal
    HRAdmin->>Modal: Fill form and submit
    Modal->>Modal: Validate form (Zod schema)

    alt Validation Success
        Modal->>API: POST /api/employees
        API->>API: Verify user is hr_admin
        API->>Service: createEmployee(formData)
        Service->>Service: Validate business rules
        Service->>Repo: create(formData)
        Repo->>DB: INSERT INTO employees
        DB-->>Repo: New employee record
        Repo-->>Service: Employee object
        Service-->>API: Employee object
        API-->>Modal: 201 Created
        Modal->>Modal: Close modal
        Modal->>Table: Trigger refresh

        Note over DB,Realtime: Database change triggers real-time event
        DB->>Realtime: New employee inserted
        Realtime->>Table: Broadcast change event
        Table->>Table: Add new row with highlight

    else Validation Failed
        Modal->>HRAdmin: Display validation errors
    end
```

## Workflow 3: External Party Edits Custom Column

```mermaid
sequenceDiagram
    actor Sodexo as Sodexo User
    participant Table as Table Component
    participant API as /api/employees/[id]/custom-data
    participant Service as Employee Service
    participant Repo as Custom Data Repository
    participant DB as sodexo_data table

    Sodexo->>Table: Click custom column cell
    Table->>Table: Enter edit mode
    Sodexo->>Table: Type new value
    Sodexo->>Table: Press Enter or blur
    Table->>Table: Optimistic update (instant feedback)

    Table->>API: PATCH /api/employees/{id}/custom-data
    API->>API: Verify user role is sodexo
    API->>Service: updateCustomData(employeeId, role, data)
    Service->>Repo: updateCustomData(employeeId, 'sodexo', {columnName: value})

    Repo->>DB: UPDATE sodexo_data SET data = jsonb_set(...)
    DB-->>Repo: Updated record
    Repo-->>Service: Success
    Service-->>API: Success
    API-->>Table: 200 OK

    alt Update Failed
        API-->>Table: 400 Bad Request
        Table->>Table: Revert optimistic update
        Table->>Sodexo: Display error toast
    end
```

## Workflow 4: Real-time Masterdata Sync

```mermaid
sequenceDiagram
    actor HRAdmin as HR Admin
    participant HRTable as HR Admin Table
    participant SodexoTable as Sodexo Table
    participant API as /api/employees/[id]
    participant DB as PostgreSQL
    participant Realtime as Supabase Realtime

    Note over HRTable,SodexoTable: Both tables subscribed to employees channel

    HRAdmin->>HRTable: Edit employee email
    HRTable->>API: PATCH /api/employees/{id}
    API->>DB: UPDATE employees SET email = '...'
    DB-->>API: Success
    API-->>HRTable: 200 OK
    HRTable->>HRTable: Update display

    Note over DB,Realtime: Change triggers real-time broadcast
    DB->>Realtime: employees:UPDATE event
    Realtime->>HRTable: Broadcast update
    Realtime->>SodexoTable: Broadcast update

    HRTable->>HRTable: Confirm update (already displayed)
    SodexoTable->>SodexoTable: Check if column visible

    alt Column visible to Sodexo
        SodexoTable->>SodexoTable: Update cell with pulse animation
    else Column not visible
        SodexoTable->>SodexoTable: Ignore update
    end

    Note over HRTable,SodexoTable: Update visible within <2 seconds
```

## Workflow 5: CSV Import with Error Handling

```mermaid
sequenceDiagram
    actor HRAdmin as HR Admin
    participant Modal as Import CSV Modal
    participant API as /api/employees/import
    participant Service as Employee Service
    participant Parser as CSV Parser
    participant Repo as Employee Repository
    participant DB as PostgreSQL

    HRAdmin->>Modal: Click "Import Employees"
    Modal->>HRAdmin: Show file upload
    HRAdmin->>Modal: Select CSV file
    Modal->>Modal: Validate file type (.csv)
    HRAdmin->>Modal: Map columns to fields
    HRAdmin->>Modal: Click "Import"

    Modal->>API: POST /api/employees/import (multipart/form-data)
    API->>Service: importFromCSV(file, columnMapping)
    Service->>Parser: Parse CSV file
    Parser-->>Service: Array of row objects

    loop For each row
        Service->>Service: Validate row data

        alt Row Valid
            Service->>Repo: create(rowData)
            Repo->>DB: INSERT INTO employees
            DB-->>Repo: Success
            Service->>Service: Increment success count
        else Row Invalid
            Service->>Service: Add to error list
            Service->>Service: Increment skip count
        end

        Service->>Modal: Update progress (via streaming or polling)
    end

    Service-->>API: {imported: 243, skipped: 4, errors: [...]}
    API-->>Modal: Import complete
    Modal->>HRAdmin: Show summary with error report
    HRAdmin->>Modal: Download error report (optional)
        Modal->>Modal: Close and refresh table
```

## Workflow 6: External Party Receives Change Notification

```mermaid
sequenceDiagram
    actor HRAdmin as HR Admin
    actor Sodexo as Sodexo User
    participant HRTable as HR Admin Table
    participant SodexoTable as Sodexo Table
    participant ViewTracker as ViewStateTracker Hook
    participant API as /api/employees/[id]
    participant DB as PostgreSQL
    participant Realtime as Supabase Realtime

    Note over Sodexo,SodexoTable: Sodexo user viewing filtered table (hire_date >= 2025-01-01)

    Sodexo->>SodexoTable: Apply filter: hire_date >= 2025-01-01
    SodexoTable->>ViewTracker: Update viewState with filter
    ViewTracker->>ViewTracker: Track visibleEmployeeIds (15 employees)

    Note over HRAdmin,HRTable: HR Admin updates employee hire date
    HRAdmin->>HRTable: Edit employee hire_date: 2024-12-15 → 2025-01-10
    HRTable->>API: PATCH /api/employees/{id}
    API->>DB: UPDATE employees SET hire_date = '2025-01-10'
    DB-->>API: Success
    API-->>HRTable: 200 OK

    Note over DB,Realtime: Database change triggers real-time event
    DB->>Realtime: employees:UPDATE event {old, new}
    Realtime->>SodexoTable: Broadcast change event

    SodexoTable->>ViewTracker: Receive real-time event
    ViewTracker->>ViewTracker: detectViewImpact(old, new, viewState)
    ViewTracker->>ViewTracker: Check: Was employee visible before?
    ViewTracker->>ViewTracker: Check: Is employee visible now?

    alt Employee enters view (wasn't visible, now is)
        ViewTracker->>SodexoTable: Return 'added'
        SodexoTable->>SodexoTable: Show toast: "1 new employee matches your filters: John Doe"
        SodexoTable->>SodexoTable: Add employee row with highlight
        SodexoTable->>ViewTracker: Update visibleEmployeeIds (add employee)

    else Employee leaves view (was visible, now isn't)
        ViewTracker->>SodexoTable: Return 'removed'
        SodexoTable->>SodexoTable: Show toast: "1 employee no longer matches your filters: Jane Smith"
        SodexoTable->>SodexoTable: Remove employee row
        SodexoTable->>ViewTracker: Update visibleEmployeeIds (remove employee)

    else Employee updated in view (was and still is visible)
        ViewTracker->>SodexoTable: Return 'updated'
        SodexoTable->>SodexoTable: Show toast: "Employee John Doe was updated (Email changed)"
        SodexoTable->>SodexoTable: Update employee row with highlight

    else Change doesn't affect view
        ViewTracker->>SodexoTable: Return null
        SodexoTable->>SodexoTable: No notification shown
    end

    Note over SodexoTable: Notification auto-dismisses after 5 seconds or user clicks X

    Sodexo->>SodexoTable: (Optional) Click notification
    SodexoTable->>SodexoTable: Scroll to and focus affected row
```

**Actor:** External Party User (Sodexo/ÖMC/Payroll/Toplux)

**Trigger:** HR Admin updates masterdata field affecting external party's filtered view

**Preconditions:**

- External party user is logged in and viewing employee table
- User has active filter or sort applied (or viewing default unfiltered view)
- Supabase real-time subscription is active

**Steps:**

1. External party user is viewing employee table with active filter (e.g., hire_date >= 2025-01-01, showing 15 employees)
2. HR Admin updates employee hire_date from 2024-12-15 to 2025-01-10 (employee now matches filter)
3. Supabase real-time broadcasts UPDATE event to all subscribed clients
4. External party's ViewStateTracker hook receives event
5. ViewStateTracker evaluates: Does employee match current filter criteria?
   - **Before change:** Employee NOT in visibleEmployeeIds set (hire_date 2024-12-15 < filter criteria)
   - **After change:** Employee DOES match filter criteria (hire_date 2025-01-10 >= 2025-01-01)
   - **Decision:** Trigger "Employee Added to View" notification
6. Toast notification appears in bottom-right: "1 new employee matches your filters: John Doe"
7. Employee row appears in table at correct sorted position (real-time sync from Story 4.5)
8. Row briefly highlights to draw attention (existing AC from Story 4.5)
9. User can:
   - Dismiss notification by clicking X
   - Wait 5 seconds for auto-dismiss
   - Optionally click notification to focus on new row (enhancement)
10. ViewStateTracker updates visibleEmployeeIds to include new employee

**Success Criteria:**

- Notification appears within 2 seconds of HR change (NFR4)
- Notification is non-intrusive and dismissible (NFR16)
- User can continue working without interruption
- Notification provides clear context about what changed

**Alternative Flows:**

**A1: Employee Removed from View**

- Step 5: Employee WAS in visibleEmployeeIds, change causes employee to NO LONGER match filter
- Step 6: Notification: "1 employee no longer matches your filters: Jane Smith"
- Step 7: Employee row disappears from table

**A2: Employee Updated in View (No Visibility Change)**

- Step 5: Employee WAS and STILL IS in visibleEmployeeIds
- Step 6: Notification: "Employee John Doe was updated (Email changed)"
- Step 7: Employee row updates in place (existing AC from Story 4.5)

**A3: Multiple Simultaneous Changes**

- HR Admin imports 10 employees via CSV (bulk operation)
- ViewStateTracker batches notifications: "10 new employees match your filters"
- Table updates with all 10 employees

**Error Handling:**

- If real-time connection drops: No notifications shown (user sees warning from Story 4.5 AC #8)
- If notification logic takes >100ms: Log performance warning (does not block table update)

---

````
```

````
