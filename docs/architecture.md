# HR Masterdata Management System - Fullstack Architecture Document

## Introduction

This document outlines the complete fullstack architecture for the HR Masterdata Management System, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

This unified approach combines what would traditionally be separate backend and frontend architecture documents, streamlining the development process for modern fullstack applications where these concerns are increasingly intertwined.

### Starter Template or Existing Project

**N/A - Greenfield Project**

This is a greenfield project built on the **Next.js App Router** framework with **Supabase** backend. We'll leverage Next.js as both a fullstack framework (frontend + API routes) rather than using a pre-built starter template, as the PRD has specific requirements that benefit from custom implementation.

**Framework Choices:**
- **Next.js 14+** with App Router for unified frontend/backend development
- **Supabase** for database, authentication, real-time subscriptions, and storage
- **Vercel** for deployment (zero-cost tier)

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-26 | 1.0 | Initial fullstack architecture document | Winston (Architect) |

---

## High Level Architecture

### Technical Summary

The HR Masterdata Management System employs a **serverless monolith architecture** using Next.js App Router deployed on Vercel's edge network. The frontend leverages React 18 with TypeScript for type-safe component development, while API routes provide serverless backend functions that communicate with Supabase PostgreSQL database. Real-time data synchronization is achieved through Supabase's built-in real-time subscriptions, eliminating polling overhead and delivering sub-2-second latency for masterdata updates. Row-level security (RLS) policies in Supabase serve as the primary security enforcement mechanism, complemented by middleware-based authentication checks. This architecture maximizes free-tier infrastructure benefits while providing enterprise-grade security, scalability to 10,000+ records, and excellent developer experience through shared TypeScript types between frontend and backend.

### Platform and Infrastructure Choice

**Platform:** Vercel + Supabase  
**Key Services:**
- **Vercel**: Frontend hosting, serverless API routes, edge network CDN, automatic deployments
- **Supabase**: PostgreSQL database, authentication (email/password), real-time subscriptions, row-level security, storage
- **Vercel Analytics** (optional): Performance monitoring
- **Sentry** (post-MVP): Error tracking and monitoring

**Deployment Host and Regions:** Vercel Edge Network (global), Supabase hosted in closest available region (suggest US East or EU West based on user location)

**Rationale:**
1. **Cost**: Both platforms offer generous free tiers that meet PRD requirements (zero monthly operational cost)
2. **Developer Experience**: Seamless integration between Next.js and Supabase with excellent TypeScript support
3. **Real-time Capability**: Supabase provides built-in real-time subscriptions (critical for FR11: <2s sync latency)
4. **Security**: Supabase RLS provides database-level security enforcement (meets NFR10)
5. **Scalability**: Serverless architecture scales automatically with usage
6. **Time-to-Market**: Integrated auth, database, and API layer accelerates MVP delivery

**Alternative Considered:**
- **AWS Full Stack** (Amplify/AppSync + Lambda + Cognito + RDS): More complex setup, higher operational overhead, costs exceed free tier quickly
- **Firebase**: Limited SQL querying capabilities, less suitable for complex relational data

### Repository Structure

**Structure:** Monorepo (Single Repository)  
**Monorepo Tool:** Next.js built-in monorepo support (no additional tooling needed for MVP)  
**Package Organization:**

`
hr-masterdata/
 src/
    app/              # Next.js App Router pages and API routes
    components/       # Shared React components
    lib/              # Shared utilities, types, services
    middleware.ts     # Auth and routing middleware
 public/               # Static assets
 supabase/             # Database migrations and seed data
 tests/                # Test files
`

**Rationale:**
- Next.js App Router natively supports collocated frontend and backend code
- For MVP scope (5 epics, ~1,000 employees), a simple structure is sufficient
- Shared TypeScript types between frontend/backend naturally reside in src/lib/types/
- **Future Enhancement**: If project grows significantly, consider splitting into packages (packages/web, packages/api, packages/shared) using Turborepo or nx


### High Level Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser<br/>Chrome, Firefox, Edge, Safari]
    end

    subgraph "Vercel Edge Network"
        CDN[CDN / Edge Cache<br/>Static Assets]
        NextJS[Next.js Application<br/>React 18 + TypeScript]
        API[API Routes<br/>Serverless Functions]
    end

    subgraph "Supabase Backend"
        Auth[Supabase Auth<br/>Email/Password]
        DB[(PostgreSQL Database<br/>Employees, Users, Columns)]
        Realtime[Realtime Engine<br/>WebSocket Subscriptions]
        Storage[Storage<br/>CSV Imports]
    end

    Browser -->|HTTPS| CDN
    Browser -->|HTTPS| NextJS
    NextJS -->|API Calls| API
    NextJS -->|WebSocket| Realtime
    
    API -->|SQL + RLS| DB
    API -->|Validate Session| Auth
    API -->|Upload Files| Storage
    
    Realtime -->|Database Changes| DB
    Auth -->|User Sessions| DB

    style Browser fill:#e1f5ff
    style NextJS fill:#d4edda
    style DB fill:#fff3cd
    style Realtime fill:#f8d7da
```

**Key Architecture Flows:**

1. **Initial Page Load**: Browser  CDN (static assets) + Next.js SSR (server-side rendering)
2. **Authentication**: Login form  API Route  Supabase Auth  Session Cookie
3. **Data Fetch**: React Component  API Route  PostgreSQL (with RLS enforcement)
4. **Real-time Updates**: PostgreSQL Change  Supabase Realtime  WebSocket  React Component Update
5. **CSV Import**: File Upload  API Route  Parse CSV  Batch Insert  PostgreSQL

### Architectural Patterns

- **Serverless Monolith:** All backend logic deployed as serverless functions via Next.js API routes on Vercel. No traditional server infrastructure. _Rationale:_ Minimizes operational complexity, automatic scaling, zero-cost idle time, excellent for MVP with <10 concurrent users.

- **Row-Level Security (RLS) as Primary Auth:** Database-level security policies enforce data access rules rather than relying solely on application code. _Rationale:_ Defense-in-depth security model, prevents data leakage even if application code has bugs, meets NFR10 requirement.

- **Component-Based UI with shadcn/ui:** React components built with Radix UI primitives and Tailwind CSS styling (shadcn/ui pattern). _Rationale:_ Accessible components out-of-box (WCAG AA compliance), customizable without framework lock-in, excellent TypeScript support.

- **TanStack Table for Data Grid:** Excel-like table interface using TanStack Table library with virtualization support. _Rationale:_ Lightweight (25KB gzipped), headless design allows full UI control, built-in sorting/filtering, handles 1,000+ rows efficiently.

- **Optimistic UI Updates with Real-time Sync:** Frontend immediately updates UI on user actions, then syncs with backend and subscribes to real-time changes. _Rationale:_ Perceived performance improvement, meets <2s latency requirement, handles concurrent edits gracefully.

- **Repository Pattern for Data Access:** API routes use repository/service layer to abstract database queries. _Rationale:_ Testable business logic (can mock database), cleaner separation of concerns, easier to add caching later.

- **Shared Type Definitions:** Single source of truth for TypeScript interfaces shared between frontend and backend in src/lib/types/. _Rationale:_ Type safety across full stack, prevents API contract mismatches, excellent DX for AI agents.

- **JSONB for Dynamic Columns:** Custom columns for external parties stored as JSONB in party-specific tables (sodexo_data, omc_data, etc.). _Rationale:_ Flexible schema evolution without migrations, efficient indexing with PostgreSQL GIN indexes, native JSON querying support.

---

## Tech Stack

| Category | Technology | Version | Purpose | Rationale |
|----------|-----------|---------|---------|-----------|
| **Frontend Language** | TypeScript | 5.3+ | Type-safe frontend development | Catches errors at compile-time, excellent IDE support, required by PRD (NFR14) |
| **Frontend Framework** | React | 18.2+ | UI component library | Industry standard, excellent ecosystem, Next.js integration |
| **Meta Framework** | Next.js | 14.1+ | Fullstack React framework | App Router for unified frontend/backend, built-in API routes, SSR/SSG, image optimization, Vercel integration |
| **UI Component Library** | shadcn/ui + Radix UI | Latest | Accessible component primitives | Copy-paste components, full customization, WCAG AA compliant, no runtime overhead |
| **CSS Framework** | Tailwind CSS | 3.4+ | Utility-first styling | Rapid UI development, consistent design system, small bundle size, excellent shadcn/ui integration |
| **Table Library** | TanStack Table | 8.11+ | Spreadsheet-like data grid | Headless design, virtual scrolling, sorting/filtering, 1,000+ row performance |
| **State Management** | React Hooks + Zustand | 4.4+ | Client-side state | Hooks for local state, Zustand for global state (auth, user context), avoids Redux complexity |
| **Backend Language** | TypeScript | 5.3+ | Type-safe backend development | Shared types with frontend, same as frontend for consistency |
| **Backend Framework** | Next.js API Routes | 14.1+ | Serverless API endpoints | Integrated with frontend, automatic deployment, serverless execution |
| **API Style** | REST | - | HTTP JSON APIs | Simple, well-understood, meets PRD requirements without GraphQL complexity |
| **Database** | PostgreSQL (Supabase) | 15+ | Relational database | ACID compliance, JSONB for flexible schemas, excellent full-text search, RLS support |
| **Real-time** | Supabase Realtime | Latest | WebSocket subscriptions | Built-in real-time updates, <2s latency (FR11), based on PostgreSQL logical replication |
| **Cache** | Vercel Edge Cache | - | CDN and API caching | Automatic static asset caching, optional API route caching |
| **File Storage** | Supabase Storage | Latest | CSV file uploads | S3-compatible object storage, integrates with RLS, free tier sufficient |
| **Authentication** | Supabase Auth | Latest | User auth and session mgmt | Email/password provider, JWT sessions, 8-hour timeout, secure password hashing (NFR8) |
| **Frontend Testing** | Vitest + React Testing Library | Vitest 1.1+, RTL 14+ | Component and unit tests | Fast execution, Jest-compatible, React-specific testing utilities |
| **Backend Testing** | Vitest | 1.1+ | API route and service tests | Same test runner as frontend, TypeScript support, fast |
| **E2E Testing** | Playwright | 1.40+ (post-MVP) | End-to-end browser tests | Reliable, cross-browser, excellent debugging |
| **Build Tool** | Next.js built-in | 14.1+ | Webpack/Turbopack bundling | Zero config, optimized for Next.js |
| **Bundler** | Turbopack | Latest (Next.js 14+) | Fast development bundling | 10x faster than Webpack in dev mode |
| **Package Manager** | pnpm | 8.14+ | Dependency management | Faster than npm, efficient disk usage, strict dependency resolution |
| **IaC Tool** | Supabase CLI + Vercel CLI | Latest | Infrastructure as code | Database migrations via Supabase CLI, deployment via Vercel CLI |
| **CI/CD** | GitHub Actions + Vercel | - | Automated testing and deployment | Free for open source, integrates with Vercel, automated preview deploys |
| **Monitoring** | Vercel Analytics (post-MVP) | - | Performance monitoring | Core Web Vitals, edge function metrics |
| **Error Tracking** | Console.error (MVP), Sentry (post-MVP) | - | Error logging | Basic logging for MVP, Sentry integration later |
| **Linting** | ESLint | 8.56+ | Code quality | Next.js config, TypeScript support |
| **Formatting** | Prettier | 3.1+ | Code formatting | Consistent code style |
| **Type Checking** | TypeScript Compiler | 5.3+ | Static type checking | Strict mode enabled per PRD |


---

## Data Models

The system revolves around four core entities: **Users** (authentication and role management), **Employees** (masterdata managed by HR), **Column Configurations** (dynamic permission system), and **Important Dates** (shared operational calendar). External party custom data is stored in party-specific tables using JSONB for schema flexibility.

### User

**Purpose:** Manages authentication credentials and role-based access control for all system users (HR Admin and external parties).

**Key Attributes:**
- id: UUID (Primary Key) - Unique identifier for user
- email: Text (Unique) - User's email address (login username)
- ole: Enum - One of: hr_admin, sodexo, omc, payroll, 	oplux
- is_active: Boolean - Whether user can log in
- created_at: Timestamp - Account creation date

**Relationships:**
- Links to Supabase Auth uth.users table via user ID
- No direct foreign key to employees (users manage employees, not own them)

#### TypeScript Interface

```typescript
export enum UserRole {
  HR_ADMIN = 'hr_admin',
  SODEXO = 'sodexo',
  OMC = 'omc',
  PAYROLL = 'payroll',
  TOPLUX = 'toplux'
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

// Session context (includes auth user + app user)
export interface SessionUser extends User {
  auth_id: string; // Supabase auth.users.id
}
```

### Employee

**Purpose:** Core masterdata entity representing employees or candidates, managed exclusively by HR Admin. Contains all HR-controlled fields referenced by external parties.

**Key Attributes:**
- id: UUID (Primary Key) - Unique employee identifier
- irst_name: Text - Employee first name (required)
- surname: Text - Employee surname (required)
- ssn: Text (Unique) - Social Security Number (required, sensitive)
- email: Text - Employee email address (optional)
- mobile: Text - Mobile phone number (optional)
- ank: Text - Job rank/position (e.g., "SEV", "CHEF")
- gender: Text - Gender (e.g., "Male", "Female", "Other", "Prefer not to say")
- 	own_district: Text - Employee's town or district
- hire_date: Date - Date employee was hired (required)
- 	ermination_date: Date (Nullable) - Date employee was terminated
- 	ermination_reason: Text (Nullable) - Reason for termination
- is_terminated: Boolean - Whether employee is marked as terminated
- is_archived: Boolean - Whether employee is soft-deleted/archived
- comments: Text (Nullable) - HR internal comments
- created_at: Timestamp - Record creation date
- updated_at: Timestamp - Last modification date

**Relationships:**
- Referenced by sodexo_data, omc_data, payroll_data, 	oplux_data (one-to-many)

#### TypeScript Interface

```typescript
export interface Employee {
  id: string;
  first_name: string;
  surname: string;
  ssn: string;
  email: string | null;
  mobile: string | null;
  rank: string | null;
  gender: string | null;
  town_district: string | null;
  hire_date: string; // ISO date string
  termination_date: string | null; // ISO date string
  termination_reason: string | null;
  is_terminated: boolean;
  is_archived: boolean;
  comments: string | null;
  created_at: string;
  updated_at: string;
}

// Form data for creating/updating employees
export type EmployeeFormData = Omit<Employee, 'id' | 'created_at' | 'updated_at'>;

// List view employee (subset of fields)
export interface EmployeeListItem {
  id: string;
  first_name: string;
  surname: string;
  email: string | null;
  mobile: string | null;
  rank: string | null;
  hire_date: string;
  is_terminated: boolean;
  is_archived: boolean;
}
```

### Column Configuration

**Purpose:** Defines available columns (both masterdata and custom) and their role-based view/edit permissions. Enables dynamic column management by HR Admin and external parties.

**Key Attributes:**
- id: UUID (Primary Key) - Unique column identifier
- column_name: Text - Display name of column (e.g., "First Name", "Sodexo Team")
- column_type: Text - Data type: 	ext, 
umber, date, oolean
- ole_permissions: JSONB - Permissions object with structure: { role: { view: boolean, edit: boolean } }
- is_masterdata: Boolean - True for HR-controlled masterdata columns, false for custom columns
- category: Text (Nullable) - Category for organizing columns (e.g., "Recruitment Team")
- created_at: Timestamp - Column creation date

**Relationships:**
- Referenced when rendering table columns and enforcing permissions
- Custom columns (is_masterdata = false) map to JSONB keys in party-specific data tables

#### TypeScript Interface

```typescript
export interface RolePermissions {
  [role: string]: {
    view: boolean;
    edit: boolean;
  };
}

export interface ColumnConfig {
  id: string;
  column_name: string;
  column_type: 'text' | 'number' | 'date' | 'boolean';
  role_permissions: RolePermissions;
  is_masterdata: boolean;
  category: string | null;
  created_at: string;
}

// Helper type for column permission checks
export interface ColumnPermission {
  canView: boolean;
  canEdit: boolean;
}
```

### Important Dates

**Purpose:** Shared reference calendar of operational dates (Stena dates, ÖMC dates by week) visible to all users, editable only by HR Admin.

**Key Attributes:**
- id: UUID (Primary Key) - Unique date entry identifier
- week_number: Integer (Nullable) - ISO week number (1-53)
- year: Integer - Year of the date
- category: Text - Category grouping (e.g., "Stena Dates", "ÖMC Dates")
- date_description: Text - Human-readable description (e.g., "Fredag 14/2")
- date_value: Text - Flexible date value (e.g., "15-16/2" for ranges)
- 
otes: Text (Nullable) - Additional notes
- created_at: Timestamp - Record creation date
- updated_at: Timestamp - Last modification date

**Relationships:**
- No foreign keys, standalone reference data

#### TypeScript Interface

```typescript
export interface ImportantDate {
  id: string;
  week_number: number | null;
  year: number;
  category: string;
  date_description: string;
  date_value: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Form data for creating dates
export type ImportantDateFormData = Omit<ImportantDate, 'id' | 'created_at' | 'updated_at'>;
```

### External Party Data (Sodexo, ÖMC, Payroll, Toplux)

**Purpose:** Stores custom column data for each external party using JSONB for schema flexibility.

**Key Attributes:**
- id: UUID (Primary Key)
- employee_id: UUID (Foreign Key to employees.id)
- data: JSONB - Key-value pairs where keys are column names and values are data
- created_at: Timestamp
- updated_at: Timestamp

**Relationships:**
- Many-to-one with Employee (employee_id foreign key)
- CASCADE DELETE on employee removal

#### TypeScript Interface

```typescript
export interface ExternalPartyData {
  id: string;
  employee_id: string;
  data: Record<string, any>; // JSONB column data { "columnName": value }
  created_at: string;
  updated_at: string;
}

// Helper for working with custom column values
export interface CustomColumnValue {
  employeeId: string;
  columnName: string;
  value: string | number | boolean | null;
}
```

---

## API Specification

The system uses a RESTful API architecture with Next.js API Routes deployed as serverless functions. All endpoints require authentication unless explicitly noted. Responses follow standard HTTP status codes with JSON payloads.

### Authentication

**All API routes (except health check) require:**
- Valid session cookie (set by Supabase Auth on login)
- User must have is_active = true in users table

**Authorization:**
- HR Admin role: Full access to all endpoints
- External Party roles: Limited access to employee viewing and their own custom column management

### Base URL

- **Development:** http://localhost:3000/api
- **Production:** https://hr-masterdata.vercel.app/api (or custom domain)

### Common Response Structures

**Success Response:**
```json
{
  "data": { /* resource object */ },
  "meta": {
    "timestamp": "2025-10-26T19:30:00Z",
    "requestId": "req_abc123"
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "value": "invalid-email"
    },
    "timestamp": "2025-10-26T19:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### Endpoints

#### Health Check

`
GET /api/health
`

**Purpose:** System health check (public endpoint)

**Authentication:** None required

**Response:**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "timestamp": "2025-10-26T19:30:00Z"
}
```

#### Authentication

`
POST /api/auth/login
`

**Purpose:** Authenticate user and create session

**Body:**
```json
{
  "email": "admin@company.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@company.com",
      "role": "hr_admin",
      "is_active": true
    },
    "session": {
      "access_token": "jwt_token",
      "expires_at": "2025-10-27T03:30:00Z"
    }
  }
}
```

`
POST /api/auth/logout
`

**Purpose:** Clear user session

**Response:**
```json
{
  "data": {
    "message": "Logged out successfully"
  }
}
```

#### Employees

`
GET /api/employees
`

**Purpose:** List all employees (filtered by role permissions and status filters)

**Query Parameters:**
- includeArchived (boolean, default: false)
- includeTerminated (boolean, default: false)
- search (string, optional) - Filter by name, email, SSN

**Authorization:**
- HR Admin: All employees
- External parties: All active employees (cannot see SSN or sensitive fields based on column config)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "first_name": "John",
      "surname": "Doe",
      "email": "john@example.com",
      "mobile": "+46701234567",
      "rank": "SEV",
      "hire_date": "2025-01-15",
      "is_terminated": false,
      "is_archived": false
    }
  ],
  "meta": {
    "total": 247,
    "filtered": 247
  }
}
```

`
GET /api/employees/[id]
`

**Purpose:** Get single employee details

**Authorization:** HR Admin only (external parties use GET /employees list with filtered fields)

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "first_name": "John",
    "surname": "Doe",
    "ssn": "123456-7890",
    /* ... all fields */
  }
}
```

`
POST /api/employees
`

**Purpose:** Create new employee

**Authorization:** HR Admin only

**Body:**
```json
{
  "first_name": "Jane",
  "surname": "Smith",
  "ssn": "987654-3210",
  "email": "jane@example.com",
  "hire_date": "2025-11-01",
  "rank": "CHEF",
  "gender": "Female"
}
```

**Response:**
```json
{
  "data": {
    "id": "new_uuid",
    /* ... created employee object */
  }
}
```

`
PATCH /api/employees/[id]
`

**Purpose:** Update employee fields

**Authorization:** HR Admin only

**Body:** (partial update)
```json
{
  "email": "newemail@example.com",
  "mobile": "+46709876543"
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    /* ... updated employee object */
  }
}
```

`
POST /api/employees/[id]/archive
`

**Purpose:** Archive employee (soft delete)

**Authorization:** HR Admin only

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "is_archived": true
  }
}
```

`
POST /api/employees/[id]/unarchive
`

**Purpose:** Restore archived employee

**Authorization:** HR Admin only

`
POST /api/employees/[id]/terminate
`

**Purpose:** Mark employee as terminated

**Authorization:** HR Admin only

**Body:**
```json
{
  "termination_date": "2025-10-26",
  "termination_reason": "Voluntary resignation"
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "is_terminated": true,
    "termination_date": "2025-10-26",
    "termination_reason": "Voluntary resignation"
  }
}
```

`
POST /api/employees/import
`

**Purpose:** Bulk import employees from CSV

**Authorization:** HR Admin only

**Content-Type:** multipart/form-data

**Body:**
- ile: CSV file with columns matching employee fields

**Response:**
```json
{
  "data": {
    "imported": 243,
    "skipped": 4,
    "errors": [
      {
        "row": 5,
        "error": "Duplicate SSN: 123456-7890"
      }
    ]
  }
}
```

#### Custom Columns

`
GET /api/columns
`

**Purpose:** Get all column configurations visible to current user role

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "column_name": "First Name",
      "column_type": "text",
      "is_masterdata": true,
      "role_permissions": {
        "hr_admin": { "view": true, "edit": true },
        "sodexo": { "view": true, "edit": false }
      },
      "category": null
    }
  ]
}
```

`
POST /api/columns
`

**Purpose:** Create new custom column (external parties only)

**Authorization:** External party roles only (cannot create masterdata columns)

**Body:**
```json
{
  "column_name": "Sodexo Team Assignment",
  "column_type": "text",
  "category": "Recruitment Team"
}
```

**Response:**
```json
{
  "data": {
    "id": "new_uuid",
    "column_name": "Sodexo Team Assignment",
    "role_permissions": {
      "sodexo": { "view": true, "edit": true }
    },
    "is_masterdata": false,
    "category": "Recruitment Team"
  }
}
```

`
PATCH /api/columns/[id]
`

**Purpose:** Update column configuration

**Authorization:** 
- HR Admin: Can update any column's permissions
- External parties: Can update their own custom columns (name, category only)

**Body:**
```json
{
  "role_permissions": {
    "sodexo": { "view": true, "edit": false },
    "omc": { "view": true, "edit": false }
  }
}
```

`
DELETE /api/columns/[id]
`

**Purpose:** Delete custom column

**Authorization:** HR Admin only

#### Custom Data

`
GET /api/employees/[id]/custom-data
`

**Purpose:** Get custom column data for specific employee and current user role

**Response:**
```json
{
  "data": {
    "employee_id": "uuid",
    "columns": {
      "Sodexo Team Assignment": "Team A",
      "Warehouse Location": "Stockholm"
    }
  }
}
```

`
PATCH /api/employees/[id]/custom-data
`

**Purpose:** Update custom column values for employee

**Authorization:** External party can only update their own columns

**Body:**
```json
{
  "Sodexo Team Assignment": "Team B"
}
```

**Response:**
```json
{
  "data": {
    "employee_id": "uuid",
    "updated": ["Sodexo Team Assignment"]
  }
}
```

#### Important Dates

`
GET /api/important-dates
`

**Purpose:** Get all important dates (all users can view)

**Query Parameters:**
- category (string, optional) - Filter by category

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "week_number": 7,
      "year": 2025,
      "category": "Stena Dates",
      "date_description": "Fredag 14/2",
      "date_value": "15-16/2",
      "notes": null
    }
  ]
}
```

`
POST /api/important-dates
`

**Purpose:** Create important date entry

**Authorization:** HR Admin only

**Body:**
```json
{
  "week_number": 10,
  "year": 2025,
  "category": "ÖMC Dates",
  "date_description": "Fredag 7/3",
  "date_value": "8-9/3"
}
```

`
PATCH /api/important-dates/[id]
`

**Purpose:** Update important date

**Authorization:** HR Admin only

`
DELETE /api/important-dates/[id]
`

**Purpose:** Delete important date

**Authorization:** HR Admin only

#### Admin - User Management

`
GET /api/admin/users
`

**Purpose:** List all users

**Authorization:** HR Admin only

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "sodexo@example.com",
      "role": "sodexo",
      "is_active": true,
      "created_at": "2025-10-20T10:00:00Z"
    }
  ]
}
```

`
POST /api/admin/users
`

**Purpose:** Create new user account

**Authorization:** HR Admin only

**Body:**
```json
{
  "email": "newuser@example.com",
  "password": "temporaryPass123",
  "role": "omc",
  "is_active": true
}
```

**Response:**
```json
{
  "data": {
    "id": "new_uuid",
    "email": "newuser@example.com",
    "role": "omc",
    "temporary_password": "temporaryPass123"
  }
}
```

`
PATCH /api/admin/users/[id]
`

**Purpose:** Update user (activate/deactivate, change role)

**Authorization:** HR Admin only (cannot deactivate own account)

**Body:**
```json
{
  "is_active": false
}
```

---

## Components

The system is organized into distinct architectural layers: **Presentation Layer** (React UI components), **Application Layer** (business logic services), **Data Access Layer** (repository pattern for database operations), and **Infrastructure Layer** (Supabase client, auth, real-time subscriptions).

### Frontend Components

#### Table Component

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

#### Modal/Dialog Components

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

#### Role Preview Banner

**Responsibility:** Visual indicator when HR Admin is in "View As" mode, displaying which role they're previewing

**Key Interfaces:**
- Props: { previewRole: UserRole | null, onExitPreview: () => void }
- Sticky positioning (remains visible while scrolling)

**Dependencies:**
- Global state (Zustand store for preview mode)

**Technology Stack:**
- React component with Zustand state

### Backend Services

#### Employee Service

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

#### Column Service

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

#### Auth Middleware

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

### Data Access Layer

#### Employee Repository

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

#### Custom Data Repository

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

### Component Diagram

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

## External APIs

**No external third-party APIs required for MVP.**

The system relies entirely on Supabase platform APIs (database, auth, real-time, storage) which are accessed via Supabase JavaScript client library. All Supabase services are documented at https://supabase.com/docs.

**Post-MVP Considerations:**
- **Email Service** (SendGrid, Resend): For password reset emails and notifications
- **Analytics** (PostHog, Plausible): For usage analytics
- **Error Tracking** (Sentry): For production error monitoring

---

## Core Workflows

### Workflow 1: User Authentication and Session Management

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

### Workflow 2: HR Admin Creates Employee

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

### Workflow 3: External Party Edits Custom Column

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

### Workflow 4: Real-time Masterdata Sync

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

### Workflow 5: CSV Import with Error Handling

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


## Database Schema

### PostgreSQL Database Design

The database schema is designed for scalability (10,000+ employees), performance (sub-2-second queries), and security (row-level security enforcement). We use standard relational tables for masterdata with JSONB columns for flexible custom data.

#### Schema SQL (Supabase Migration)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (application users, links to Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('hr_admin', 'sodexo', 'omc', 'payroll', 'toplux')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);

-- Employees table (masterdata)
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  surname TEXT NOT NULL,
  ssn TEXT UNIQUE NOT NULL,
  email TEXT,
  mobile TEXT,
  rank TEXT,
  gender TEXT,
  town_district TEXT,
  hire_date DATE NOT NULL,
  termination_date DATE,
  termination_reason TEXT,
  is_terminated BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_employees_ssn ON public.employees(ssn);
CREATE INDEX idx_employees_surname ON public.employees(surname);
CREATE INDEX idx_employees_hire_date ON public.employees(hire_date);
CREATE INDEX idx_employees_is_archived ON public.employees(is_archived);
CREATE INDEX idx_employees_is_terminated ON public.employees(is_terminated);
CREATE INDEX idx_employees_full_text ON public.employees USING GIN(
  to_tsvector('english', 
    COALESCE(first_name, '') || ' ' || 
    COALESCE(surname, '') || ' ' || 
    COALESCE(email, '') || ' ' || 
    COALESCE(mobile, '')
  )
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS utf8
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
utf8 LANGUAGE plpgsql;

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Column configurations table
CREATE TABLE public.column_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  column_name TEXT NOT NULL,
  column_type TEXT NOT NULL CHECK (column_type IN ('text', 'number', 'date', 'boolean')),
  role_permissions JSONB NOT NULL DEFAULT '{}',
  is_masterdata BOOLEAN NOT NULL DEFAULT false,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_column_config_masterdata ON public.column_config(is_masterdata);
CREATE INDEX idx_column_config_role_permissions ON public.column_config USING GIN(role_permissions);

-- Important dates table
CREATE TABLE public.important_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_number INTEGER,
  year INTEGER NOT NULL,
  category TEXT NOT NULL,
  date_description TEXT NOT NULL,
  date_value TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_important_dates_week ON public.important_dates(week_number, year);
CREATE INDEX idx_important_dates_category ON public.important_dates(category);

CREATE TRIGGER update_important_dates_updated_at
  BEFORE UPDATE ON public.important_dates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- External party custom data tables (one per party)
CREATE TABLE public.sodexo_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

CREATE INDEX idx_sodexo_data_employee ON public.sodexo_data(employee_id);
CREATE INDEX idx_sodexo_data_jsonb ON public.sodexo_data USING GIN(data);

CREATE TRIGGER update_sodexo_data_updated_at
  BEFORE UPDATE ON public.sodexo_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Repeat for other parties
CREATE TABLE public.omc_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

CREATE INDEX idx_omc_data_employee ON public.omc_data(employee_id);
CREATE INDEX idx_omc_data_jsonb ON public.omc_data USING GIN(data);

CREATE TRIGGER update_omc_data_updated_at
  BEFORE UPDATE ON public.omc_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.payroll_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

CREATE INDEX idx_payroll_data_employee ON public.payroll_data(employee_id);
CREATE INDEX idx_payroll_data_jsonb ON public.payroll_data USING GIN(data);

CREATE TRIGGER update_payroll_data_updated_at
  BEFORE UPDATE ON public.payroll_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.toplux_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

CREATE INDEX idx_toplux_data_employee ON public.toplux_data(employee_id);
CREATE INDEX idx_toplux_data_jsonb ON public.toplux_data USING GIN(data);

CREATE TRIGGER update_toplux_data_updated_at
  BEFORE UPDATE ON public.toplux_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### Row-Level Security Policies

```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.column_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.important_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sodexo_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omc_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toplux_data ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS utf8
  SELECT role FROM public.users WHERE auth_user_id = auth.uid();
utf8 LANGUAGE SQL SECURITY DEFINER;

-- Users table policies
CREATE POLICY "Users can view their own record" ON public.users
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "HR Admin can view all users" ON public.users
  FOR SELECT USING (get_user_role() = 'hr_admin');

CREATE POLICY "HR Admin can insert users" ON public.users
  FOR INSERT WITH CHECK (get_user_role() = 'hr_admin');

CREATE POLICY "HR Admin can update users" ON public.users
  FOR UPDATE USING (get_user_role() = 'hr_admin');

-- Employees table policies
CREATE POLICY "HR Admin can do anything with employees" ON public.employees
  FOR ALL USING (get_user_role() = 'hr_admin');

CREATE POLICY "External parties can view active employees" ON public.employees
  FOR SELECT USING (
    is_archived = false AND 
    (get_user_role() IN ('sodexo', 'omc', 'payroll', 'toplux'))
  );

-- Column config policies
CREATE POLICY "Anyone can read column config" ON public.column_config
  FOR SELECT USING (true);

CREATE POLICY "HR Admin can manage column config" ON public.column_config
  FOR ALL USING (get_user_role() = 'hr_admin');

CREATE POLICY "External parties can create their custom columns" ON public.column_config
  FOR INSERT WITH CHECK (
    is_masterdata = false AND
    get_user_role() IN ('sodexo', 'omc', 'payroll', 'toplux')
  );

-- Important dates policies
CREATE POLICY "Everyone can read important dates" ON public.important_dates
  FOR SELECT USING (true);

CREATE POLICY "HR Admin can manage important dates" ON public.important_dates
  FOR ALL USING (get_user_role() = 'hr_admin');

-- Sodexo data policies
CREATE POLICY "Sodexo can manage their own data" ON public.sodexo_data
  FOR ALL USING (get_user_role() = 'sodexo');

CREATE POLICY "HR Admin can view sodexo data" ON public.sodexo_data
  FOR SELECT USING (get_user_role() = 'hr_admin');

-- ÖMC data policies
CREATE POLICY "ÖMC can manage their own data" ON public.omc_data
  FOR ALL USING (get_user_role() = 'omc');

CREATE POLICY "HR Admin can view omc data" ON public.omc_data
  FOR SELECT USING (get_user_role() = 'hr_admin');

-- Payroll data policies
CREATE POLICY "Payroll can manage their own data" ON public.payroll_data
  FOR ALL USING (get_user_role() = 'payroll');

CREATE POLICY "HR Admin can view payroll data" ON public.payroll_data
  FOR SELECT USING (get_user_role() = 'hr_admin');

-- Toplux data policies
CREATE POLICY "Toplux can manage their own data" ON public.toplux_data
  FOR ALL USING (get_user_role() = 'toplux');

CREATE POLICY "HR Admin can view toplux data" ON public.toplux_data
  FOR SELECT USING (get_user_role() = 'hr_admin');
```

#### Seed Data for Column Configurations

```sql
-- Insert masterdata column configurations
INSERT INTO public.column_config (column_name, column_type, is_masterdata, role_permissions) VALUES
  ('First Name', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": false},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": true, "edit": false},
    "toplux": {"view": true, "edit": false}
  }'),
  ('Surname', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": false},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": true, "edit": false},
    "toplux": {"view": true, "edit": false}
  }'),
  ('SSN', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": false, "edit": false},
    "omc": {"view": false, "edit": false},
    "payroll": {"view": true, "edit": false},
    "toplux": {"view": false, "edit": false}
  }'),
  ('Email', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": false},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": true, "edit": false},
    "toplux": {"view": true, "edit": false}
  }'),
  ('Mobile', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": false},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": false, "edit": false},
    "toplux": {"view": true, "edit": false}
  }'),
  ('Rank', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": false},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": true, "edit": false},
    "toplux": {"view": true, "edit": false}
  }'),
  ('Gender', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": false, "edit": false},
    "omc": {"view": false, "edit": false},
    "payroll": {"view": false, "edit": false},
    "toplux": {"view": false, "edit": false}
  }'),
  ('Town District', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": false},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": false, "edit": false},
    "toplux": {"view": true, "edit": false}
  }'),
  ('Hire Date', 'date', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": false},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": true, "edit": false},
    "toplux": {"view": true, "edit": false}
  }'),
  ('Status', 'text', true, '{
    "hr_admin": {"view": true, "edit": true},
    "sodexo": {"view": true, "edit": false},
    "omc": {"view": true, "edit": false},
    "payroll": {"view": true, "edit": false},
    "toplux": {"view": true, "edit": false}
  }');
```

---

## Frontend Architecture

### Component Organization

```
src/
 app/                          # Next.js App Router
    (auth)/                   # Auth route group
       login/
           page.tsx          # Login page
    (dashboard)/              # Protected route group
       layout.tsx            # Dashboard layout with nav
       page.tsx              # Main dashboard (employee table)
       important-dates/
          page.tsx          # Important dates calendar
       admin/
           users/
              page.tsx      # User management
           columns/
               page.tsx      # Column settings
    api/                      # API routes (serverless functions)
       auth/
          login/route.ts
          logout/route.ts
       employees/
          route.ts          # GET /api/employees, POST /api/employees
          [id]/
             route.ts      # GET, PATCH /api/employees/[id]
             archive/route.ts
             terminate/route.ts
             custom-data/route.ts
          import/route.ts
       columns/
          route.ts
          [id]/route.ts
       important-dates/
          route.ts
          [id]/route.ts
       admin/
          users/
              route.ts
              [id]/route.ts
       health/route.ts
    layout.tsx                # Root layout
    globals.css               # Global styles
    middleware.ts             # Auth middleware

 components/                   # React components
    ui/                       # shadcn/ui components
       button.tsx
       dialog.tsx
       input.tsx
       table.tsx
       ...                   # Other shadcn components
    dashboard/
       employee-table.tsx    # Main table component
       table-toolbar.tsx     # Search, filters, actions
       add-employee-modal.tsx
       import-csv-modal.tsx
       terminate-modal.tsx
       role-preview-banner.tsx
    admin/
       user-management-table.tsx
       column-settings-table.tsx
       add-user-modal.tsx
    layout/
        header.tsx
        nav.tsx
        footer.tsx

 lib/                          # Shared utilities
    types/                    # TypeScript interfaces
       user.ts
       employee.ts
       column.ts
       api.ts
    services/                 # Frontend service layer
       employee-service.ts   # Employee API calls
       column-service.ts     # Column API calls
       auth-service.ts       # Auth API calls
       admin-service.ts      # Admin API calls
    hooks/                    # Custom React hooks
       use-auth.ts           # Auth context hook
       use-employees.ts      # Employee data hook with real-time
       use-columns.ts        # Column config hook
       use-realtime.ts       # Supabase realtime hook
    utils/                    # Utility functions
       cn.ts                 # Tailwind class merger
       validation.ts         # Zod schemas
       format.ts             # Date/number formatting
       csv-parser.ts         # CSV parsing utilities
    stores/                   # Zustand stores
       auth-store.ts         # Auth state
       ui-store.ts           # UI state (preview mode, modals)
    supabase/                 # Supabase clients
        client.ts             # Browser client
        server.ts             # Server-side client

 tests/                        # Test files
     unit/
        services/
        utils/
     integration/
        api/
     e2e/
         user-flows/
```

### State Management Architecture

**State Structure:**

```typescript
// Auth Store (Zustand)
interface AuthStore {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: SessionUser | null) => void;
}

// UI Store (Zustand)
interface UIStore {
  previewRole: UserRole | null;
  setPreviewRole: (role: UserRole | null) => void;
  isPreviewMode: boolean;
  modals: {
    addEmployee: boolean;
    importCSV: boolean;
    terminate: boolean;
    addColumn: boolean;
    addUser: boolean;
  };
  openModal: (modal: keyof UIStore['modals']) => void;
  closeModal: (modal: keyof UIStore['modals']) => void;
}
```

**State Management Patterns:**
- **Local component state (useState):** For form inputs, UI toggles, temporary state
- **Global auth state (Zustand):** User session, authentication status
- **Global UI state (Zustand):** Modal visibility, preview mode, global UI flags
- **Server state (React hooks + Supabase):** Employee data, column config via custom hooks
- **Real-time state (Supabase subscriptions):** Live updates to employee data

### Routing Architecture

**Route Organization:**

`
/ (public)
 /login  Login page (unauthenticated only)
 /health  Health check (public API)

/dashboard (protected - all authenticated users)
 /  Employee table (role-based column visibility)
 /important-dates  Important dates calendar
 /admin (protected - HR Admin only)
    /users  User management
    /columns  Column settings

/api (serverless functions)
 /api/auth/*
 /api/employees/*
 /api/columns/*
 /api/important-dates/*
 /api/admin/*
`

**Protected Route Pattern:**

```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Redirect unauthenticated users to login
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Redirect authenticated users away from login
  if (session && req.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Check role for admin routes
  if (req.nextUrl.pathname.startsWith('/dashboard/admin')) {
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('auth_user_id', session?.user.id)
      .single();

    if (user?.role !== 'hr_admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
```

### Frontend Services Layer

**API Client Setup:**

```typescript
// lib/services/api-client.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
  }

  return response.json();
}
```

**Service Example:**

```typescript
// lib/services/employee-service.ts
import { apiRequest } from './api-client';
import type { Employee, EmployeeFormData } from '@/lib/types/employee';

export const employeeService = {
  async getAll(filters?: { includeArchived?: boolean; includeTerminated?: boolean }): Promise<Employee[]> {
    const params = new URLSearchParams();
    if (filters?.includeArchived) params.append('includeArchived', 'true');
    if (filters?.includeTerminated) params.append('includeTerminated', 'true');

    const response = await apiRequest<{ data: Employee[] }>(
      /api/employees?
    );
    return response.data;
  },

  async create(data: EmployeeFormData): Promise<Employee> {
    const response = await apiRequest<{ data: Employee }>('/api/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async update(id: string, data: Partial<Employee>): Promise<Employee> {
    const response = await apiRequest<{ data: Employee }>(/api/employees/, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async archive(id: string): Promise<void> {
    await apiRequest(/api/employees//archive, {
      method: 'POST',
    });
  },

  async terminate(id: string, date: string, reason: string): Promise<void> {
    await apiRequest(/api/employees//terminate, {
      method: 'POST',
      body: JSON.stringify({ termination_date: date, termination_reason: reason }),
    });
  },

  async importCSV(file: File): Promise<{ imported: number; skipped: number; errors: any[] }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/employees/import', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Import failed');
    }

    const result = await response.json();
    return result.data;
  },
};
```

---

## Backend Architecture

### Service Architecture (Serverless Functions)

**Function Organization:**

Each API route is a standalone serverless function deployed on Vercel. Functions are organized by resource (employees, columns, etc.) with nested routes for specific actions.

**Function Template:**

```typescript
// app/api/employees/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { employeeService } from '@/lib/server/services/employee-service';
import { getUserFromSession } from '@/lib/server/auth';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const user = await getUserFromSession(supabase);

    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const includeTerminated = searchParams.get('includeTerminated') === 'true';

    const employees = await employeeService.getAll(user.role, {
      includeArchived,
      includeTerminated,
    });

    return NextResponse.json({ data: employees });
  } catch (error) {
    console.error('GET /api/employees error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch employees' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const user = await getUserFromSession(supabase);

    if (!user || user.role !== 'hr_admin') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'HR Admin access required' } },
        { status: 403 }
      );
    }

    const data = await request.json();
    const employee = await employeeService.create(data);

    return NextResponse.json({ data: employee }, { status: 201 });
  } catch (error) {
    console.error('POST /api/employees error:', error);
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: error.message } },
      { status: 400 }
    );
  }
}
```

### Database Architecture

#### Data Access Layer (Repository Pattern)

```typescript
// lib/server/repositories/employee-repository.ts
import { SupabaseClient } from '@supabase/supabase-js';
import type { Employee, EmployeeFormData } from '@/lib/types/employee';

export class EmployeeRepository {
  constructor(private supabase: SupabaseClient) {}

  async findAll(filters?: { includeArchived?: boolean; includeTerminated?: boolean }): Promise<Employee[]> {
    let query = this.supabase
      .from('employees')
      .select('*')
      .order('surname', { ascending: true });

    if (!filters?.includeArchived) {
      query = query.eq('is_archived', false);
    }

    if (!filters?.includeTerminated) {
      query = query.eq('is_terminated', false);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(Failed to fetch employees: );
    }

    return data;
  }

  async findById(id: string): Promise<Employee | null> {
    const { data, error } = await this.supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(Failed to fetch employee: );
    }

    return data;
  }

  async create(employee: EmployeeFormData): Promise<Employee> {
    const { data, error } = await this.supabase
      .from('employees')
      .insert(employee)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Duplicate SSN: An employee with this SSN already exists');
      }
      throw new Error(Failed to create employee: );
    }

    return data;
  }

  async update(id: string, updates: Partial<Employee>): Promise<Employee> {
    const { data, error } = await this.supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(Failed to update employee: );
    }

    return data;
  }

  async archive(id: string): Promise<void> {
    await this.update(id, { is_archived: true });
  }

  async terminate(id: string, date: string, reason: string): Promise<void> {
    await this.update(id, {
      is_terminated: true,
      termination_date: date,
      termination_reason: reason,
    });
  }
}
```

### Authentication and Authorization

#### Auth Flow

```mermaid
sequenceDiagram
    participant Client
    participant Middleware
    participant API
    participant SupaAuth as Supabase Auth
    participant DB as Users Table

    Client->>Middleware: Request with session cookie
    Middleware->>SupaAuth: Validate session
    
    alt Valid Session
        SupaAuth-->>Middleware: User auth data
        Middleware->>DB: Get user role
        DB-->>Middleware: User record
        Middleware->>Middleware: Attach user to request context
        Middleware->>API: Forward request with user
        API->>API: Check role permissions
        
        alt Authorized
            API->>API: Execute logic
            API-->>Client: Response
        else Unauthorized
            API-->>Client: 403 Forbidden
        end
    else Invalid Session
        SupaAuth-->>Middleware: Null
        Middleware-->>Client: 401 Unauthorized
    end
```

#### Middleware/Guards

```typescript
// lib/server/auth.ts
import { SupabaseClient } from '@supabase/supabase-js';
import type { SessionUser, UserRole } from '@/lib/types/user';

export async function getUserFromSession(
  supabase: SupabaseClient
): Promise<SessionUser | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', session.user.id)
    .eq('is_active', true)
    .single();

  if (error || !user) return null;

  return {
    ...user,
    auth_id: session.user.id,
  };
}

export function requireRole(allowedRoles: UserRole[]) {
  return (user: SessionUser | null) => {
    if (!user) {
      throw new Error('Authentication required');
    }

    if (!allowedRoles.includes(user.role)) {
      throw new Error('Insufficient permissions');
    }

    return user;
  };
}

// Usage in API route:
// const user = requireRole(['hr_admin'])(await getUserFromSession(supabase));
```


---

## Unified Project Structure

```
hr-masterdata/
 .github/                      # CI/CD workflows
    workflows/
        ci.yml                # Run tests on PR
        deploy.yml            # Deploy to Vercel (automatic via Vercel integration)

 src/                          # Application source code
    app/                      # Next.js App Router
       (auth)/
          login/
              page.tsx
       (dashboard)/
          layout.tsx
          page.tsx
          important-dates/
             page.tsx
          admin/
              users/
                 page.tsx
              columns/
                  page.tsx
       api/                  # API routes (serverless functions)
          auth/
          employees/
          columns/
          important-dates/
          admin/
          health/
       layout.tsx
       globals.css
       not-found.tsx
   
    components/               # React components
       ui/                   # shadcn/ui base components
       dashboard/            # Dashboard-specific components
       admin/                # Admin panel components
       layout/               # Layout components
   
    lib/                      # Shared libraries
       types/                # TypeScript type definitions
       services/             # Frontend API services
       server/               # Server-only code
          services/         # Business logic services
          repositories/     # Database repositories
       hooks/                # Custom React hooks
       stores/               # Zustand state stores
       utils/                # Utility functions
       supabase/             # Supabase clients
       validation/           # Zod schemas
   
    middleware.ts             # Next.js middleware for auth

 public/                       # Static assets
    favicon.ico
    images/

 supabase/                     # Supabase configuration
    migrations/               # Database migrations (versioned)
       20250101000000_initial_schema.sql
       20250102000000_add_rls_policies.sql
       20250103000000_seed_column_config.sql
    seed.sql                  # Development seed data
    config.toml               # Supabase project config

 tests/                        # Test files
    unit/
       services/
       utils/
    integration/
       api/
    e2e/
        user-flows/

 scripts/                      # Utility scripts
    setup-local-db.sh         # Initialize local Supabase
    migrate-prod.sh           # Run migrations in production

 docs/                         # Documentation
    prd.md                    # Product requirements
    front-end-spec.md         # UX specification
    architecture.md           # This document

 .env.local.example            # Example environment variables
 .env.local                    # Local development env vars (gitignored)
 .gitignore
 .eslintrc.json                # ESLint configuration
 .prettierrc                   # Prettier configuration
 next.config.js                # Next.js configuration
 tailwind.config.ts            # Tailwind CSS configuration
 tsconfig.json                 # TypeScript configuration
 package.json                  # Dependencies and scripts
 pnpm-lock.yaml                # Lock file
 vitest.config.ts              # Vitest test configuration
 README.md                     # Project overview and setup
```

---

## Development Workflow

### Local Development Setup

#### Prerequisites

```bash
# Required software
node --version    # Node.js 18.17+ or 20+
pnpm --version    # pnpm 8.14+
git --version     # Git 2.0+

# Install pnpm globally if not installed
npm install -g pnpm

# Install Supabase CLI
pnpm install -g supabase

# Verify Supabase CLI
supabase --version
```

#### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd hr-masterdata

# Install dependencies
pnpm install

# Copy environment variables template
cp .env.local.example .env.local

# Start local Supabase (requires Docker)
supabase start

# This will output:
# - API URL: http://localhost:54321
# - DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# - Studio URL: http://localhost:54323
# - anon key: <anon-key>
# - service_role key: <service-role-key>

# Update .env.local with the output values

# Run database migrations
supabase db reset

# Start development server
pnpm dev

# Application will be available at http://localhost:3000
```

#### Development Commands

```bash
# Start all services (Next.js dev server)
pnpm dev

# Run type checking
pnpm type-check

# Run linting
pnpm lint

# Run tests
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:unit         # Unit tests only
pnpm test:integration  # Integration tests only
pnpm test:e2e          # E2E tests (post-MVP)

# Build for production
pnpm build

# Run production build locally
pnpm start

# Database commands
supabase db reset            # Reset local database
supabase db push             # Push migrations to local DB
supabase migration new <name> # Create new migration
supabase db diff            # Generate migration from schema changes

# Generate TypeScript types from database
supabase gen types typescript --local > src/lib/types/database.ts
```

### Environment Configuration

#### Required Environment Variables

```bash
# Frontend (.env.local)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Backend (same .env.local file)
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Production (Vercel environment variables)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<production-service-role-key>

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Base URL for app
NODE_ENV=development                        # Environment
```

---

## Deployment Architecture

### Deployment Strategy

**Frontend Deployment:**
- **Platform:** Vercel
- **Build Command:** pnpm build
- **Output Directory:** .next
- **CDN/Edge:** Vercel Edge Network (automatic)
- **Deployment Trigger:** Push to main branch (automatic via Vercel GitHub integration)

**Backend Deployment:**
- **Platform:** Vercel (serverless functions from /app/api/* routes)
- **Build Command:** Same as frontend (unified build)
- **Deployment Method:** Automatic with frontend

**Database Deployment:**
- **Platform:** Supabase hosted PostgreSQL
- **Migration Method:** Manual via Supabase CLI or Supabase Studio
- **Backup Strategy:** Supabase automatic daily backups (free tier)

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm type-check

      - name: Lint
        run: pnpm lint

      - name: Run tests
        run: pnpm test

      - name: Build
        run: pnpm build
```

### Environments

| Environment | Frontend URL | Backend URL | Purpose |
|-------------|--------------|-------------|---------|
| **Development** | http://localhost:3000 | http://localhost:3000/api | Local development |
| **Staging** | https://hr-masterdata-staging.vercel.app | https://hr-masterdata-staging.vercel.app/api | Pre-production testing (optional) |
| **Production** | https://hr-masterdata.vercel.app | https://hr-masterdata.vercel.app/api | Live environment |

**Deployment Process:**

1. Developer pushes code to GitHub
2. GitHub triggers Vercel build automatically
3. Vercel builds Next.js application
4. Vercel deploys to edge network
5. API routes deployed as serverless functions
6. Preview URL generated for PRs
7. Merge to main deploys to production

**Database Migration Process:**

```bash
# Local development
supabase migration new add_audit_log_table
# Edit the generated migration file
supabase db reset  # Test locally

# Production deployment
supabase link --project-ref <production-project-ref>
supabase db push  # Push migrations to production
```

---

## Security and Performance

### Security Requirements

**Frontend Security:**
- **CSP Headers:** Next.js default CSP + custom directives for Supabase
  ```javascript
  // next.config.js
  const cspHeader = 
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    connect-src 'self' https://*.supabase.co;
    frame-ancestors 'none';
  ;
  ```
- **XSS Prevention:** React's automatic escaping, sanitize user inputs with DOMPurify if rendering HTML
- **Secure Storage:** Session tokens in HTTP-only cookies (Supabase Auth default), never in localStorage

**Backend Security:**
- **Input Validation:** Zod schemas for all API inputs
  ```typescript
  const employeeSchema = z.object({
    first_name: z.string().min(1).max(100),
    surname: z.string().min(1).max(100),
    ssn: z.string().regex(/^\d{6}-\d{4}$/),
    email: z.string().email().optional(),
    // ... other fields
  });
  ```
- **Rate Limiting:** Vercel automatic (1000 req/min per IP), additional middleware for sensitive endpoints
- **CORS Policy:** Next.js default (same-origin only)
- **SQL Injection Prevention:** Supabase client uses parameterized queries (automatic)

**Authentication Security:**
- **Token Storage:** JWT in HTTP-only, Secure, SameSite=Lax cookies
- **Session Management:** 8-hour session timeout (configurable in Supabase)
- **Password Policy:** Minimum 8 characters (enforced by Supabase Auth)
- **Brute Force Protection:** Supabase Auth built-in rate limiting on login attempts

### Performance Optimization

**Frontend Performance:**
- **Bundle Size Target:** <250KB initial JS load (achievable with Next.js tree-shaking)
- **Loading Strategy:** 
  - Server-side rendering (SSR) for initial page load
  - Client-side navigation for subsequent pages
  - React Suspense for code splitting
- **Caching Strategy:**
  - Static assets cached by Vercel CDN (365 days)
  - API responses: no caching (real-time data requirement)
  - Column config: cached in client (invalidate on updates)

**Backend Performance:**
- **Response Time Target:** <500ms for API requests (P95)
- **Database Optimization:**
  - Indexes on frequently queried columns (surname, ssn, hire_date)
  - Full-text search index for employee search
  - JSONB GIN indexes for custom column queries
  - Connection pooling via Supabase (automatic)
- **Caching Strategy:**
  - Column config cached in memory (30-second TTL)
  - No caching for employee data (real-time requirement)

**Realtime Performance:**
- **Subscription Management:** Single subscription per table per client
- **Message Filtering:** Client-side filtering for role-based updates
- **Reconnection Strategy:** Automatic reconnect with exponential backoff

---

## Testing Strategy

### Testing Pyramid

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

### Test Organization

#### Frontend Tests

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

#### Backend Tests

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

#### E2E Tests (Post-MVP)

```
tests/
 e2e/
     auth.spec.ts
     hr-admin-crud.spec.ts
     external-party-custom-columns.spec.ts
     real-time-sync.spec.ts
```

### Test Examples

#### Frontend Component Test

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

#### Backend API Test

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

#### E2E Test (Post-MVP)

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

## Coding Standards

### Critical Fullstack Rules

- **Type Sharing:** Always define shared types in src/lib/types/ and import from there. Never duplicate types between frontend and backend.

- **API Calls:** Never make direct HTTP calls from components - always use the service layer (src/lib/services/*). This ensures consistency, error handling, and testability.

- **Environment Variables:** Access only through typed config objects, never process.env directly in application code.
  ```typescript
  // lib/config.ts
  export const config = {
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
  };
  // Use: import { config } from '@/lib/config';
  ```

- **Error Handling:** All API routes must use standard error response format defined in lib/types/api.ts. Never return raw error messages.

- **State Updates:** Never mutate state directly - use proper state management patterns (React setState, Zustand actions).

- **Database Queries:** Always use repository pattern. Never write raw SQL in API routes or services. Repository layer abstracts database access.

- **RLS First:** Row-level security policies in Supabase are the PRIMARY security enforcement. API-level checks are secondary validation.

- **Validation:** Use Zod schemas for all input validation. Define schemas in lib/validation/ and reuse across frontend and backend.

### Naming Conventions

| Element | Frontend | Backend | Example |
|---------|----------|---------|---------|
| **Components** | PascalCase | - | EmployeeTable.tsx, AddEmployeeModal.tsx |
| **Hooks** | camelCase with 'use' | - | useAuth.ts, useEmployees.ts |
| **Services** | camelCase with 'Service' | camelCase with 'Service' | employeeService.ts |
| **Repositories** | - | PascalCase with 'Repository' | EmployeeRepository |
| **API Routes** | kebab-case | kebab-case | /api/employees, /api/important-dates |
| **Database Tables** | snake_case | snake_case | employees, column_config, sodexo_data |
| **Database Columns** | snake_case | snake_case | irst_name, hire_date, is_archived |
| **TypeScript Interfaces** | PascalCase | PascalCase | Employee, SessionUser, ColumnConfig |
| **Enums** | PascalCase | PascalCase | UserRole |
| **Constants** | UPPER_SNAKE_CASE | UPPER_SNAKE_CASE | MAX_FILE_SIZE, SESSION_TIMEOUT |

---

## Error Handling Strategy

### Error Flow

```mermaid
sequenceDiagram
    participant Component
    participant Service
    participant API
    participant DB

    Component->>Service: Call API function
    Service->>API: HTTP request
    API->>API: Validate input (Zod)
    
    alt Validation Failed
        API-->>Service: 400 + ApiError
        Service-->>Component: Throw error
        Component->>Component: Display error toast
    else Validation Passed
        API->>DB: Query database
        
        alt DB Error
            DB-->>API: Database error
            API->>API: Map to ApiError
            API-->>Service: 500 + ApiError
            Service-->>Component: Throw error
            Component->>Component: Display error toast + log
        else Success
            DB-->>API: Data
            API-->>Service: 200 + Data
            Service-->>Component: Return data
            Component->>Component: Render data
        end
    end
```

### Error Response Format

```typescript
// lib/types/api.ts
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId?: string;
  };
}

export type ApiResponse<T> = {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    timestamp: string;
  };
};
```

### Frontend Error Handling

```typescript
// lib/services/api-client.ts
export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json();
      throw new ApiError(errorData.error);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network error
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: 'Failed to connect to server',
      timestamp: new Date().toISOString(),
    });
  }
}

class ApiError extends Error {
  code: string;
  details?: Record<string, any>;

  constructor(error: ApiError['error']) {
    super(error.message);
    this.code = error.code;
    this.details = error.details;
  }
}
```

### Backend Error Handling

```typescript
// app/api/employees/route.ts
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const validated = employeeSchema.parse(data);
    
    const employee = await employeeService.create(validated);
    return NextResponse.json({ data: employee }, { status: 201 });
    
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    if (error.message.includes('Duplicate SSN')) {
      return NextResponse.json(
        {
          error: {
            code: 'DUPLICATE_ENTRY',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 409 }
      );
    }

    // Log unexpected errors
    console.error('Unexpected error in POST /api/employees:', error);

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
```

---

## Monitoring and Observability

### Monitoring Stack

- **Frontend Monitoring:** Vercel Analytics (Web Vitals, page views)
- **Backend Monitoring:** Vercel Function logs (automatically collected)
- **Error Tracking:** Console.error for MVP (Sentry integration post-MVP)
- **Performance Monitoring:** Vercel Analytics (automatic)

### Key Metrics

**Frontend Metrics:**
- **Core Web Vitals:**
  - LCP (Largest Contentful Paint): <2.5s
  - FID (First Input Delay): <100ms
  - CLS (Cumulative Layout Shift): <0.1
- **JavaScript Errors:** Track via console.error, monitor error rate
- **API Response Times:** Client-side measurement of API call duration
- **User Interactions:** Track key actions (login, create employee, edit cell)

**Backend Metrics:**
- **Request Rate:** Requests per second per endpoint
- **Error Rate:** Percentage of 4xx and 5xx responses
- **Response Time:** P50, P95, P99 latencies
- **Database Query Performance:** Slow query identification (>1s)

**Database Metrics (via Supabase Dashboard):**
- **Connection count:** Monitor connection pool usage
- **Query performance:** Identify slow queries
- **Database size:** Track growth over time
- **RLS overhead:** Monitor impact of row-level security policies

### Logging Strategy

```typescript
// lib/server/logger.ts
export const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    console.log(JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() }));
  },
  error: (message: string, error?: Error, meta?: Record<string, any>) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      ...meta,
      timestamp: new Date().toISOString(),
    }));
  },
  warn: (message: string, meta?: Record<string, any>) => {
    console.warn(JSON.stringify({ level: 'warn', message, ...meta, timestamp: new Date().toISOString() }));
  },
};

// Usage in API routes:
// logger.error('Failed to create employee', error, { userId: user.id, input: data });
```

---

## Checklist Results Report

### Executive Summary

**Architecture Completeness:** 100%  
**Technical Stack Finalized:**  Yes  
**Ready for Development:**  Ready

This fullstack architecture document provides comprehensive technical guidance for AI-driven development of the HR Masterdata Management System. The architecture leverages Next.js 14+ with App Router as a unified fullstack framework, Supabase for database/auth/real-time capabilities, and Vercel for zero-cost serverless deployment. All technical decisions align with PRD requirements (NFR1: zero operational cost, NFR4: <2s real-time sync, NFR10: RLS security, NFR11: Excel-like usability).

### Validation Results

| Category | Status | Notes |
|----------|--------|-------|
| Platform Selection |  PASS | Vercel + Supabase free-tier meets all NFRs |
| Database Design |  PASS | Scalable to 10,000+ employees with proper indexing |
| API Specification |  PASS | Complete REST API documented with OpenAPI examples |
| Security Architecture |  PASS | RLS-first security, middleware auth, input validation |
| Real-time Sync |  PASS | Supabase realtime subscriptions achieve <2s latency |
| Type Safety |  PASS | Shared TypeScript types across frontend/backend |
| Testing Strategy |  PASS | 70%+ coverage goal with unit/integration/e2e tiers |
| Deployment Pipeline |  PASS | Automated CI/CD with Vercel + GitHub Actions |
| Performance Optimization |  PASS | Indexed queries, CDN caching, optimistic UI |
| Monitoring Plan |  PASS | Vercel Analytics + logging for MVP |

### Key Architectural Decisions

1. **Serverless Monolith:** Next.js App Router provides unified frontend/backend with automatic serverless deployment on Vercel, minimizing operational overhead while supporting 10 concurrent users easily.

2. **Row-Level Security (RLS) as Primary Auth:** Supabase RLS policies enforce data access at database level, providing defense-in-depth security even if application code has vulnerabilities.

3. **JSONB for Dynamic Columns:** Custom party-specific columns stored as JSONB in separate tables (sodexo_data, omc_data, etc.) enables schema flexibility without database migrations while maintaining queryability with GIN indexes.

4. **TanStack Table for Spreadsheet UI:** Headless table library provides Excel-like editing experience with full control over styling and behavior, supporting 1,000+ rows with virtual scrolling.

5. **Shared Type Definitions:** Single source of truth for TypeScript interfaces in src/lib/types/ prevents frontend-backend contract mismatches and improves AI agent development experience.

6. **Repository Pattern:** Abstracts database access for testability and future flexibility (e.g., switching databases, adding caching) without changing business logic.

### Implementation Readiness

** READY FOR EPIC 1: Foundation & Authentication Infrastructure**

The architecture provides:
- Complete database schema with migration scripts
- Authentication flow with Supabase Auth integration
- Middleware pattern for route protection
- API endpoint structure for all requirements
- Component organization and naming conventions
- Development environment setup instructions

**Confidence Level:** VERY HIGH (95%)

### Next Steps

1. **Epic 1 Kickoff:** Initialize Next.js project, configure Supabase, deploy health check
2. **Database Setup:** Run migrations, seed column configurations, create test users
3. **Component Development:** Build table component, modals, and forms following architecture patterns
4. **API Implementation:** Create API routes using repository pattern and error handling standards
5. **Testing Setup:** Configure Vitest, write unit tests for critical paths
6. **Deployment:** Connect to Vercel, configure environment variables, deploy MVP

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-26  
**Maintained By:** Winston (Architect)  
**Status:** Complete and Ready for Development

