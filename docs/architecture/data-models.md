# Data Models

The system revolves around four core entities: **Users** (authentication and role management), **Employees** (masterdata managed by HR), **Column Configurations** (dynamic permission system), and **Important Dates** (shared operational calendar). External party custom data is stored in party-specific tables using JSONB for schema flexibility.

## User

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

### TypeScript Interface

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

## Employee

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

### TypeScript Interface

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

## Column Configuration

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

### TypeScript Interface

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

## Important Dates

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

### TypeScript Interface

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

## External Party Data (Sodexo, ÖMC, Payroll, Toplux)

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

### TypeScript Interface

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
