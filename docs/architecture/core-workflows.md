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

