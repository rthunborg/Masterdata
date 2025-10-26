# API Specification

The system uses a RESTful API architecture with Next.js API Routes deployed as serverless functions. All endpoints require authentication unless explicitly noted. Responses follow standard HTTP status codes with JSON payloads.

## Authentication

**All API routes (except health check) require:**
- Valid session cookie (set by Supabase Auth on login)
- User must have is_active = true in users table

**Authorization:**
- HR Admin role: Full access to all endpoints
- External Party roles: Limited access to employee viewing and their own custom column management

## Base URL

- **Development:** http://localhost:3000/api
- **Production:** https://hr-masterdata.vercel.app/api (or custom domain)

## Common Response Structures

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

## Endpoints

### Health Check

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

### Authentication

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

### Employees

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

### Custom Columns

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

### Custom Data

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

### Important Dates

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

### Admin - User Management

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
