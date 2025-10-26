# Components

The system is organized into distinct architectural layers: **Presentation Layer** (React UI components), **Application Layer** (business logic services), **Data Access Layer** (repository pattern for database operations), and **Infrastructure Layer** (Supabase client, auth, real-time subscriptions).

## Frontend Components

### Table Component

**Responsibility:** Display employee data in spreadsheet-like interface with role-based column visibility, inline editing, sorting, and search. Core component for all user roles.

**Key Interfaces:**
- Props: { columns: ColumnConfig[], data: Employee[], onEdit: (id, field, value) => void, onSort: (field) => void }
- Uses TanStack Table hooks for table state management
- Subscribes to Supabase real-time channel for live updates

**Dependencies:**
- TanStack Table library
- Column configuration from /api/columns
- Employee data from /api/employees
- Supabase real-time client

**Technology Stack:**
- React 18 functional component with hooks
- TypeScript strict mode
- TanStack Table v8 for table logic
- Tailwind CSS for styling
- Radix UI primitives for accessible table cells

### Modal/Dialog Components

**Responsibility:** Reusable modal dialogs for forms (Add Employee, Import CSV, Terminate Employee, Add Column, etc.)

**Key Interfaces:**
- Props: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }
- Keyboard navigation (Esc to close, Tab trap)
- Backdrop click to close (with dirty form warning)

**Dependencies:**
- Radix UI Dialog primitive
- React Hook Form for form state
- Zod for validation

**Technology Stack:**
- shadcn/ui Dialog component
- React Hook Form + Zod validation
- Tailwind CSS

### Role Preview Banner

**Responsibility:** Visual indicator when HR Admin is in "View As" mode, displaying which role they're previewing

**Key Interfaces:**
- Props: { previewRole: UserRole | null, onExitPreview: () => void }
- Sticky positioning (remains visible while scrolling)

**Dependencies:**
- Global state (Zustand store for preview mode)

**Technology Stack:**
- React component with Zustand state

## Backend Services

### Employee Service

**Responsibility:** Business logic for employee CRUD operations, validation, and CSV import processing

**Key Interfaces:**
- createEmployee(data: EmployeeFormData): Promise<Employee>
- updateEmployee(id: string, data: Partial<Employee>): Promise<Employee>
- rchiveEmployee(id: string): Promise<void>
- 	erminateEmployee(id: string, date: string, reason: string): Promise<void>
- importFromCSV(file: File): Promise<ImportResult>

**Dependencies:**
- Employee Repository
- Column Config Repository (for validation)
- CSV Parser (papaparse)

**Technology Stack:**
- TypeScript service class
- Zod for validation
- papaparse for CSV parsing

### Column Service

**Responsibility:** Manage column configurations and permissions

**Key Interfaces:**
- getVisibleColumns(role: UserRole): Promise<ColumnConfig[]>
- createCustomColumn(role: UserRole, data: ColumnFormData): Promise<ColumnConfig>
- updatePermissions(id: string, permissions: RolePermissions): Promise<void>
- deleteColumn(id: string): Promise<void>

**Dependencies:**
- Column Config Repository

**Technology Stack:**
- TypeScript service class

### Auth Middleware

**Responsibility:** Validate authentication on all protected routes, attach user context to request

**Key Interfaces:**
- uthenticateUser(req: NextRequest): Promise<SessionUser | null>
- equireRole(allowedRoles: UserRole[]): Middleware

**Dependencies:**
- Supabase Auth client
- User Repository

**Technology Stack:**
- Next.js middleware
- Supabase Auth helpers for Next.js

## Data Access Layer

### Employee Repository

**Responsibility:** Abstract database operations for employees table

**Key Interfaces:**
- indAll(filters?: EmployeeFilters): Promise<Employee[]>
- indById(id: string): Promise<Employee | null>
- create(data: EmployeeFormData): Promise<Employee>
- update(id: string, data: Partial<Employee>): Promise<Employee>
- delete(id: string): Promise<void>

**Dependencies:**
- Supabase PostgreSQL client

**Technology Stack:**
- TypeScript class
- Supabase JS client with typed queries

### Custom Data Repository

**Responsibility:** Manage JSONB custom column data in party-specific tables

**Key Interfaces:**
- getCustomData(employeeId: string, role: UserRole): Promise<Record<string, any>>
- updateCustomData(employeeId: string, role: UserRole, data: Record<string, any>): Promise<void>

**Dependencies:**
- Supabase PostgreSQL client
- Column Config Repository (for validation)

**Technology Stack:**
- TypeScript class
- PostgreSQL JSONB operations

## Component Diagram

```mermaid
graph TD
    subgraph "Frontend - React Components"
        Table[Table Component<br/>TanStack Table]
        Modal[Modal Components<br/>shadcn/ui Dialogs]
        Preview[Role Preview Banner]
        Layout[Layout Component]
    end

    subgraph "Frontend - State Management"
        Auth[Auth Context<br/>Zustand]
        RealTime[Real-time Subscription<br/>Supabase Client]
    end

    subgraph "API Routes - Next.js Serverless"
        EmployeeAPI[/api/employees]
        ColumnAPI[/api/columns]
        AdminAPI[/api/admin/*]
        AuthAPI[/api/auth/*]
    end

    subgraph "Business Logic - Services"
        EmployeeService[Employee Service]
        ColumnService[Column Service]
        AuthService[Auth Service]
    end

    subgraph "Data Access - Repositories"
        EmployeeRepo[Employee Repository]
        CustomDataRepo[Custom Data Repository]
        UserRepo[User Repository]
        ColumnRepo[Column Config Repository]
    end

    subgraph "Infrastructure - Supabase"
        DB[(PostgreSQL Database)]
        AuthProvider[Supabase Auth]
        RealtimeEngine[Realtime Engine]
    end

    Table --> EmployeeAPI
    Table --> ColumnAPI
    Table --> RealTime
    Modal --> EmployeeAPI
    Modal --> ColumnAPI
    Preview --> Auth

    EmployeeAPI --> EmployeeService
    ColumnAPI --> ColumnService
    AuthAPI --> AuthService
    AdminAPI --> AuthService

    EmployeeService --> EmployeeRepo
    EmployeeService --> CustomDataRepo
    ColumnService --> ColumnRepo
    AuthService --> UserRepo

    EmployeeRepo --> DB
    CustomDataRepo --> DB
    UserRepo --> DB
    ColumnRepo --> DB
    UserRepo --> AuthProvider

    RealTime --> RealtimeEngine
    RealtimeEngine --> DB

    style Table fill:#d4edda
    style EmployeeAPI fill:#fff3cd
    style EmployeeService fill:#cfe2ff
    style DB fill:#f8d7da
```

---
