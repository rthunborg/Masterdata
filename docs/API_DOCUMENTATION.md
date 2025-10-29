# HR Masterdata Management System - API Documentation

**Version:** 1.0  
**Last Updated:** October 29, 2025  
**Base URL (Development):** http://localhost:3000/api  
**Base URL (Production):** https://hr-masterdata.vercel.app/api

---

## Table of Contents

1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Common Response Structures](#common-response-structures)
4. [Error Codes](#error-codes)
5. [Endpoints](#endpoints)
   - [Health Check](#health-check)
   - [Authentication](#authentication-endpoints)
   - [Employees](#employees-endpoints)
   - [Columns](#columns-endpoints)
   - [Custom Data](#custom-data-endpoints)
   - [Important Dates](#important-dates-endpoints)
   - [Admin - Users](#admin-users-endpoints)
   - [Admin - Column Permissions](#admin-column-permissions-endpoints)

---

## Introduction

The HR Masterdata Management System exposes a RESTful API for managing employee data, custom columns, user accounts, and system configuration. All endpoints return JSON responses and follow consistent error handling patterns.

**Key Features:**
- **Session-Based Authentication**: Uses Supabase Auth with 8-hour session timeout
- **Role-Based Authorization**: HR Admin, Sodexo, ÖMC, Payroll, Toplux roles
- **Real-Time Sync**: Database changes trigger Supabase Realtime updates to connected clients
- **Validation**: All inputs validated server-side with Zod schemas
- **Error Handling**: Consistent error response format with descriptive messages

**API Principles:**
- **Idempotent Operations**: PUT/PATCH endpoints can be safely retried
- **Partial Updates**: PATCH endpoints accept partial objects (only send fields to update)
- **Filtering**: GET list endpoints support query parameters for filtering
- **Security-First**: All endpoints protected by authentication and RLS policies

---

## Authentication

### Authentication Methods

The API uses **session-based authentication** via Supabase Auth:

1. **Login**: POST /api/auth/login with email and password
2. **Session Cookie**: Server sets sb-access-token cookie (HttpOnly, Secure, SameSite=Lax)
3. **Authenticated Requests**: Browser automatically includes cookie in subsequent requests
4. **Session Expiry**: Sessions expire after 8 hours of inactivity
5. **Logout**: POST /api/auth/logout to clear session

### Authorization

Role-based authorization controls access to endpoints:

| Role     | Access Level                                                 |
| -------- | ------------------------------------------------------------ |
| hr_admin | Full access to all endpoints                                 |
| sodexo   | View employees, edit Sodexo custom columns                   |
| omc      | View employees, edit ÖMC custom columns                      |
| payroll  | View employees, edit Payroll custom columns                  |
| toplux   | View employees, edit Toplux custom columns                   |

**Authorization Headers:**

For browser requests, cookies are automatically included. For external API calls (e.g., curl, Postman):

\\\ash
Authorization: Bearer <jwt-token>
\\\

Or include the session cookie:

\\\ash
Cookie: sb-access-token=<jwt-token>
\\\

### Rate Limiting

**Current Implementation:** No rate limiting (MVP)

**Future Implementation (Post-MVP):**
- 100 requests per minute per user
- 1,000 requests per hour per user
- 429 Too Many Requests response when exceeded

---

## Common Response Structures

### Success Response

All successful API responses follow this structure:

\\\json
{
  \"data\": {
    // Resource object or array
  },
  \"meta\": {
    \"timestamp\": \"2025-10-29T19:30:00Z\",
    \"requestId\": \"req_abc123\",
    \"total\": 247,          // Optional: For paginated lists
    \"filtered\": 50         // Optional: Number of results after filtering
  }
}
\\\

**Single Resource Response:**
\\\json
{
  \"data\": {
    \"id\": \"uuid\",
    \"first_name\": \"John\",
    \"surname\": \"Doe\"
  }
}
\\\

**List Response:**
\\\json
{
  \"data\": [
    { \"id\": \"uuid1\", \"first_name\": \"John\" },
    { \"id\": \"uuid2\", \"first_name\": \"Jane\" }
  ],
  \"meta\": {
    \"total\": 247,
    \"filtered\": 2
  }
}
\\\

### Error Response

All error responses follow this structure:

\\\json
{
  \"error\": {
    \"code\": \"ERROR_CODE\",
    \"message\": \"Human-readable error message\",
    \"details\": {
      // Optional: Additional error context
    },
    \"timestamp\": \"2025-10-29T19:30:00Z\",
    \"requestId\": \"req_abc123\"
  }
}
\\\

**Example - Validation Error:**
\\\json
{
  \"error\": {
    \"code\": \"VALIDATION_ERROR\",
    \"message\": \"Invalid email format\",
    \"details\": {
      \"field\": \"email\",
      \"value\": \"invalid-email\",
      \"expected\": \"Valid email address\"
    },
    \"timestamp\": \"2025-10-29T19:30:00Z\"
  }
}
\\\

---

## Error Codes

| Code                    | HTTP Status | Description                                           |
| ----------------------- | ----------- | ----------------------------------------------------- |
| \UNAUTHORIZED\          | 401         | Authentication required (not logged in)               |
| \FORBIDDEN\             | 403         | Insufficient permissions (wrong role)                 |
| \NOT_FOUND\             | 404         | Resource does not exist                               |
| \VALIDATION_ERROR\      | 400         | Invalid input data (failed validation)                |
| \DUPLICATE_ERROR\       | 409         | Unique constraint violation (e.g., duplicate email)   |
| \INTERNAL_ERROR\        | 500         | Unexpected server error                               |
| \DATABASE_ERROR\        | 500         | Database operation failed                             |
| \RATE_LIMIT_EXCEEDED\   | 429         | Too many requests (post-MVP)                          |

**Common Error Scenarios:**

| Scenario                                       | Status | Code               | Message                                   |
| ---------------------------------------------- | ------ | ------------------ | ----------------------------------------- |
| User not logged in                             | 401    | UNAUTHORIZED       | \"Authentication required\"                 |
| Non-admin accessing admin endpoint             | 403    | FORBIDDEN          | \"Insufficient permissions\"                |
| Employee with ID not found                     | 404    | NOT_FOUND          | \"Employee not found\"                      |
| Creating employee with duplicate email         | 409    | DUPLICATE_ERROR    | \"Email already exists\"                    |
| Missing required field                         | 400    | VALIDATION_ERROR   | \"First name is required\"                  |
| Invalid SSN format                             | 400    | VALIDATION_ERROR   | \"SSN must be 10 digits (YYYYMMDD-XXXX)\"   |

---

## Endpoints

### Health Check

---

#### \GET /api/health\

**Description:** System health check endpoint (public, no authentication required)

**Use Case:** Monitor system availability, verify API is reachable

**Authentication:** None required

**Request:**
\\\ash
curl -X GET http://localhost:3000/api/health
\\\

**Response (200 OK):**
\\\json
{
  \"status\": \"ok\",
  \"version\": \"0.1.0\",
  \"timestamp\": \"2025-10-29T19:30:00Z\",
  \"environment\": \"production\",
  \"database\": \"connected\"
}
\\\

**Response Codes:**
- \200 OK\: System healthy
- \503 Service Unavailable\: System down or database unreachable

---

### Authentication Endpoints

---

#### \POST /api/auth/login\

**Description:** Authenticate user with email and password

**Use Case:** User login flow

**Authentication:** None required (public endpoint)

**Request Body:**
\\\json
{
  \"email\": \"admin@company.com\",
  \"password\": \"securePassword123\"
}
\\\

**Request Example:**
\\\ash
curl -X POST http://localhost:3000/api/auth/login \\
  -H \"Content-Type: application/json\" \\
  -d '{
    \"email\": \"admin@company.com\",
    \"password\": \"securePassword123\"
  }'
\\\

**Response (200 OK):**
\\\json
{
  \"data\": {
    \"user\": {
      \"id\": \"550e8400-e29b-41d4-a716-446655440000\",
      \"email\": \"admin@company.com\",
      \"role\": \"hr_admin\",
      \"is_active\": true,
      \"created_at\": \"2025-10-20T10:00:00Z\"
    },
    \"session\": {
      \"access_token\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\",
      \"token_type\": \"bearer\",
      \"expires_in\": 28800,
      \"expires_at\": \"2025-10-30T03:30:00Z\",
      \"refresh_token\": \"...\"
    }
  }
}
\\\

**Cookies Set:**
- \sb-access-token\: Session JWT (HttpOnly, Secure, SameSite=Lax, 8-hour expiry)
- \sb-refresh-token\: Refresh token (HttpOnly, Secure, SameSite=Lax, 7-day expiry)

**Error Responses:**
- \401 UNAUTHORIZED\: Invalid email or password
- \403 FORBIDDEN\: Account deactivated (is_active = false)
- \400 VALIDATION_ERROR\: Missing email or password

---

#### \POST /api/auth/logout\

**Description:** Clear user session and invalidate tokens

**Use Case:** User logout flow

**Authentication:** Required (any authenticated user)

**Request Example:**
\\\ash
curl -X POST http://localhost:3000/api/auth/logout \\
  -H \"Cookie: sb-access-token=<your-token>\"
\\\

**Response (200 OK):**
\\\json
{
  \"data\": {
    \"message\": \"Logged out successfully\"
  }
}
\\\

**Cookies Cleared:**
- \sb-access-token\: Removed
- \sb-refresh-token\: Removed

**Error Responses:**
- \401 UNAUTHORIZED\: Not authenticated

---

### Employees Endpoints

---

#### \GET /api/employees\

**Description:** List all employees visible to current user role

**Use Case:** Display employee table on dashboard

**Authentication:** Required (all roles)

**Authorization:**
- HR Admin: See all employees with all fields
- External parties: See active employees with permitted columns only (SSN hidden)

**Query Parameters:**

| Parameter           | Type    | Default | Description                           |
| ------------------- | ------- | ------- | ------------------------------------- |
| \includeArchived\   | boolean | false   | Include archived employees            |
| \includeTerminated\ | boolean | false   | Include terminated employees          |
| \search\            | string  | -       | Filter by name, email (partial match) |

**Request Example:**
\\\ash
curl -X GET \"http://localhost:3000/api/employees?includeArchived=true&search=john\" \\
  -H \"Cookie: sb-access-token=<your-token>\"
\\\

**Response (200 OK):**
\\\json
{
  \"data\": [
    {
      \"id\": \"550e8400-e29b-41d4-a716-446655440000\",
      \"first_name\": \"John\",
      \"surname\": \"Doe\",
      \"preferred_name\": \"Johnny\",
      \"email\": \"john@example.com\",
      \"mobile\": \"+46701234567\",
      \"ssn\": \"19850315-1234\",    // Only visible to HR Admin
      \"rank\": \"SEV\",
      \"gender\": \"Male\",
      \"hire_date\": \"2025-01-15\",
      \"termination_date\": null,
      \"is_terminated\": false,
      \"is_archived\": false,
      \"created_at\": \"2025-01-10T12:00:00Z\",
      \"updated_at\": \"2025-10-29T15:30:00Z\"
    }
  ],
  \"meta\": {
    \"total\": 247,
    \"filtered\": 1
  }
}
\\\

**Error Responses:**
- \401 UNAUTHORIZED\: Not authenticated
- \400 VALIDATION_ERROR\: Invalid query parameter value

---

#### \GET /api/employees/[id]\

**Description:** Get single employee by ID with all details

**Use Case:** View employee details in modal/page

**Authentication:** Required (all roles)

**Authorization:** 
- HR Admin: See all fields
- External parties: See permitted columns only

**Request Example:**
\\\ash
curl -X GET http://localhost:3000/api/employees/550e8400-e29b-41d4-a716-446655440000 \\
  -H \"Cookie: sb-access-token=<your-token>\"
\\\

**Response (200 OK):**
\\\json
{
  \"data\": {
    \"id\": \"550e8400-e29b-41d4-a716-446655440000\",
    \"first_name\": \"John\",
    \"surname\": \"Doe\",
    \"ssn\": \"19850315-1234\",
    // ... all employee fields
  }
}
\\\

**Error Responses:**
- \401 UNAUTHORIZED\: Not authenticated
- \404 NOT_FOUND\: Employee with ID does not exist

---

#### \POST /api/employees\

**Description:** Create new employee

**Use Case:** HR Admin adds new employee via dashboard

**Authentication:** Required

**Authorization:** HR Admin only

**Request Body:**
\\\json
{
  \"first_name\": \"Jane\",
  \"surname\": \"Smith\",
  \"ssn\": \"19900520-4321\",
  \"email\": \"jane.smith@example.com\",
  \"mobile\": \"+46709876543\",
  \"hire_date\": \"2025-11-01\",
  \"rank\": \"CHEF\",
  \"gender\": \"Female\"
}
\\\

**Required Fields:**
- \irst_name\ (string, 1-100 chars)
- \surname\ (string, 1-100 chars)
- \ssn\ (string, format: YYYYMMDD-XXXX, unique)
- \email\ (string, valid email format, unique)
- \hire_date\ (string, ISO 8601 date)

**Optional Fields:**
- \preferred_name\, \mobile\, \ank\, \gender\, etc.

**Request Example:**
\\\ash
curl -X POST http://localhost:3000/api/employees \\
  -H \"Content-Type: application/json\" \\
  -H \"Cookie: sb-access-token=<your-token>\" \\
  -d '{
    \"first_name\": \"Jane\",
    \"surname\": \"Smith\",
    \"ssn\": \"19900520-4321\",
    \"email\": \"jane.smith@example.com\",
    \"hire_date\": \"2025-11-01\"
  }'
\\\

**Response (201 Created):**
\\\json
{
  \"data\": {
    \"id\": \"new-uuid\",
    \"first_name\": \"Jane\",
    \"surname\": \"Smith\",
    // ... all fields with defaults
  }
}
\\\

**Error Responses:**
- \401 UNAUTHORIZED\: Not authenticated
- \403 FORBIDDEN\: Not HR Admin
- \400 VALIDATION_ERROR\: Missing required field or invalid format
- \409 DUPLICATE_ERROR\: Email or SSN already exists

---

#### \PATCH /api/employees/[id]\

**Description:** Update employee fields (partial update)

**Use Case:** HR Admin edits employee data

**Authentication:** Required

**Authorization:** HR Admin only

**Request Body:** (Partial - only include fields to update)
\\\json
{
  \"email\": \"newemail@example.com\",
  \"mobile\": \"+46701111111\",
  \"rank\": \"KM\"
}
\\\

**Request Example:**
\\\ash
curl -X PATCH http://localhost:3000/api/employees/550e8400-e29b-41d4-a716-446655440000 \\
  -H \"Content-Type: application/json\" \\
  -H \"Cookie: sb-access-token=<your-token>\" \\
  -d '{
    \"email\": \"newemail@example.com\"
  }'
\\\

**Response (200 OK):**
\\\json
{
  \"data\": {
    \"id\": \"550e8400-e29b-41d4-a716-446655440000\",
    \"email\": \"newemail@example.com\",
    // ... full updated employee object
  }
}
\\\

**Error Responses:**
- \401 UNAUTHORIZED\: Not authenticated
- \403 FORBIDDEN\: Not HR Admin
- \404 NOT_FOUND\: Employee not found
- \400 VALIDATION_ERROR\: Invalid field value
- \409 DUPLICATE_ERROR\: Email or SSN conflict

---

#### \POST /api/employees/[id]/archive\

**Description:** Archive employee (soft delete)

**Use Case:** HR Admin removes employee from active list

**Authentication:** Required

**Authorization:** HR Admin only

**Request Example:**
\\\ash
curl -X POST http://localhost:3000/api/employees/550e8400-e29b-41d4-a716-446655440000/archive \\
  -H \"Cookie: sb-access-token=<your-token>\"
\\\

**Response (200 OK):**
\\\json
{
  \"data\": {
    \"id\": \"550e8400-e29b-41d4-a716-446655440000\",
    \"is_archived\": true,
    \"archived_at\": \"2025-10-29T19:45:00Z\"
  }
}
\\\

**Error Responses:**
- \401 UNAUTHORIZED\: Not authenticated
- \403 FORBIDDEN\: Not HR Admin
- \404 NOT_FOUND\: Employee not found

---

#### \POST /api/employees/[id]/unarchive\

**Description:** Restore archived employee

**Use Case:** HR Admin restores accidentally archived employee

**Authentication:** Required

**Authorization:** HR Admin only

**Request Example:**
\\\ash
curl -X POST http://localhost:3000/api/employees/550e8400-e29b-41d4-a716-446655440000/unarchive \\
  -H \"Cookie: sb-access-token=<your-token>\"
\\\

**Response (200 OK):**
\\\json
{
  \"data\": {
    \"id\": \"550e8400-e29b-41d4-a716-446655440000\",
    \"is_archived\": false
  }
}
\\\

---

#### \POST /api/employees/[id]/terminate\

**Description:** Mark employee as terminated

**Use Case:** HR Admin records employee departure

**Authentication:** Required

**Authorization:** HR Admin only

**Request Body:**
\\\json
{
  \"termination_date\": \"2025-10-31\",
  \"termination_reason\": \"Voluntary resignation\"
}
\\\

**Request Example:**
\\\ash
curl -X POST http://localhost:3000/api/employees/550e8400-e29b-41d4-a716-446655440000/terminate \\
  -H \"Content-Type: application/json\" \\
  -H \"Cookie: sb-access-token=<your-token>\" \\
  -d '{
    \"termination_date\": \"2025-10-31\",
    \"termination_reason\": \"Voluntary resignation\"
  }'
\\\

**Response (200 OK):**
\\\json
{
  \"data\": {
    \"id\": \"550e8400-e29b-41d4-a716-446655440000\",
    \"is_terminated\": true,
    \"termination_date\": \"2025-10-31\",
    \"termination_reason\": \"Voluntary resignation\"
  }
}
\\\

---

#### \POST /api/employees/import\

**Description:** Bulk import employees from CSV file

**Use Case:** HR Admin imports existing employee data from Excel

**Authentication:** Required

**Authorization:** HR Admin only

**Content-Type:** \multipart/form-data\

**Request Body:**
- \ile\: CSV file with columns matching employee schema

**CSV Format:**
\\\csv
first_name,surname,ssn,email,hire_date,rank,gender
John,Doe,19850315-1234,john@example.com,2025-01-15,SEV,Male
Jane,Smith,19900520-4321,jane@example.com,2025-02-01,CHEF,Female
\\\

**Request Example:**
\\\ash
curl -X POST http://localhost:3000/api/employees/import \\
  -H \"Cookie: sb-access-token=<your-token>\" \\
  -F \"file=@employees.csv\"
\\\

**Response (200 OK):**
\\\json
{
  \"data\": {
    \"imported\": 243,
    \"skipped\": 4,
    \"errors\": [
      {
        \"row\": 5,
        \"field\": \"email\",
        \"error\": \"Duplicate email: john@example.com\"
      },
      {
        \"row\": 12,
        \"field\": \"ssn\",
        \"error\": \"Invalid SSN format\"
      }
    ]
  }
}
\\\

**Error Responses:**
- \401 UNAUTHORIZED\: Not authenticated
- \403 FORBIDDEN\: Not HR Admin
- \400 VALIDATION_ERROR\: Invalid CSV format or encoding

---

### Columns Endpoints

---

#### \GET /api/columns\

**Description:** Get all column configurations visible to current user role

**Use Case:** Render table columns and permission matrix

**Authentication:** Required (all roles)

**Authorization:**
- HR Admin: See all columns
- External parties: See only permitted columns

**Request Example:**
\\\ash
curl -X GET http://localhost:3000/api/columns \\
  -H \"Cookie: sb-access-token=<your-token>\"
\\\

**Response (200 OK):**
\\\json
{
  \"data\": [
    {
      \"id\": \"uuid\",
      \"column_name\": \"First Name\",
      \"column_type\": \"text\",
      \"is_masterdata\": true,
      \"category\": null,
      \"role_permissions\": {
        \"hr_admin\": { \"view\": true, \"edit\": true },
        \"sodexo\": { \"view\": true, \"edit\": false },
        \"omc\": { \"view\": true, \"edit\": false },
        \"payroll\": { \"view\": true, \"edit\": false },
        \"toplux\": { \"view\": true, \"edit\": false }
      }
    },
    {
      \"id\": \"uuid2\",
      \"column_name\": \"Sodexo Team Assignment\",
      \"column_type\": \"text\",
      \"is_masterdata\": false,
      \"category\": \"Recruitment Team\",
      \"role_permissions\": {
        \"hr_admin\": { \"view\": true, \"edit\": false },
        \"sodexo\": { \"view\": true, \"edit\": true },
        \"omc\": { \"view\": false, \"edit\": false },
        \"payroll\": { \"view\": false, \"edit\": false },
        \"toplux\": { \"view\": false, \"edit\": false }
      }
    }
  ]
}
\\\

---

#### \POST /api/columns\

**Description:** Create new custom column

**Use Case:** External party creates column for their data tracking

**Authentication:** Required

**Authorization:** External party roles only (Sodexo, ÖMC, Payroll, Toplux)

**Request Body:**
\\\json
{
  \"column_name\": \"Sodexo Warehouse Location\",
  \"column_type\": \"text\",
  \"category\": \"Logistics\"
}
\\\

**Supported Column Types:**
- \	ext\ - Free-form text
- \
umber\ - Numeric values
- \date\ - ISO 8601 dates
- \oolean\ - True/false
- \select\ - Dropdown (single selection)

**Request Example:**
\\\ash
curl -X POST http://localhost:3000/api/columns \\
  -H \"Content-Type: application/json\" \\
  -H \"Cookie: sb-access-token=<your-token>\" \\
  -d '{
    \"column_name\": \"Sodexo Warehouse Location\",
    \"column_type\": \"text\",
    \"category\": \"Logistics\"
  }'
\\\

**Response (201 Created):**
\\\json
{
  \"data\": {
    \"id\": \"new-uuid\",
    \"column_name\": \"Sodexo Warehouse Location\",
    \"column_type\": \"text\",
    \"is_masterdata\": false,
    \"category\": \"Logistics\",
    \"role_permissions\": {
      \"sodexo\": { \"view\": true, \"edit\": true }
    }
  }
}
\\\

**Error Responses:**
- \401 UNAUTHORIZED\: Not authenticated
- \403 FORBIDDEN\: HR Admin cannot create columns (use admin panel instead)
- \400 VALIDATION_ERROR\: Invalid column type or missing required field
- \409 DUPLICATE_ERROR\: Column name already exists

---

#### \PATCH /api/columns/[id]\

**Description:** Update column configuration

**Use Case:** 
- HR Admin: Update column permissions
- External party: Update column name/category (own columns only)

**Authentication:** Required

**Authorization:**
- HR Admin: Can update any column
- External parties: Can update own custom columns only

**Request Body (HR Admin - Update Permissions):**
\\\json
{
  \"role_permissions\": {
    \"sodexo\": { \"view\": true, \"edit\": false },
    \"omc\": { \"view\": true, \"edit\": false }
  }
}
\\\

**Request Body (External Party - Update Name/Category):**
\\\json
{
  \"column_name\": \"Updated Column Name\",
  \"category\": \"New Category\"
}
\\\

**Request Example:**
\\\ash
curl -X PATCH http://localhost:3000/api/columns/uuid \\
  -H \"Content-Type: application/json\" \\
  -H \"Cookie: sb-access-token=<your-token>\" \\
  -d '{
    \"role_permissions\": {
      \"sodexo\": { \"view\": true, \"edit\": false }
    }
  }'
\\\

**Response (200 OK):**
\\\json
{
  \"data\": {
    \"id\": \"uuid\",
    \"column_name\": \"Sodexo Warehouse Location\",
    \"role_permissions\": {
      \"sodexo\": { \"view\": true, \"edit\": false }
    }
  }
}
\\\

**Error Responses:**
- \401 UNAUTHORIZED\: Not authenticated
- \403 FORBIDDEN\: Insufficient permissions
- \404 NOT_FOUND\: Column not found
- \400 VALIDATION_ERROR\: Invalid permissions structure

---

#### \DELETE /api/columns/[id]\

**Description:** Delete custom column permanently

**Use Case:** HR Admin removes obsolete custom column

**Authentication:** Required

**Authorization:** HR Admin only

**Request Example:**
\\\ash
curl -X DELETE http://localhost:3000/api/columns/uuid \\
  -H \"Cookie: sb-access-token=<your-token>\"
\\\

**Response (200 OK):**
\\\json
{
  \"data\": {
    \"id\": \"uuid\",
    \"column_name\": \"Sodexo Warehouse Location\",
    \"deleted\": true,
    \"affected_employees\": 247
  }
}
\\\

**Important:** This permanently deletes the column and all data in it across all employees.

**Error Responses:**
- \401 UNAUTHORIZED\: Not authenticated
- \403 FORBIDDEN\: Not HR Admin or attempting to delete masterdata column
- \404 NOT_FOUND\: Column not found

---

### Custom Data Endpoints

---

#### \GET /api/employees/[id]/custom-data\

**Description:** Get custom column data for specific employee

**Use Case:** View employee custom data in table row

**Authentication:** Required (all roles)

**Authorization:**
- HR Admin: See all custom data
- External parties: See only their permitted custom columns

**Request Example:**
\\\ash
curl -X GET http://localhost:3000/api/employees/550e8400-e29b-41d4-a716-446655440000/custom-data \\
  -H \"Cookie: sb-access-token=<your-token>\"
\\\

**Response (200 OK):**
\\\json
{
  \"data\": {
    \"employee_id\": \"550e8400-e29b-41d4-a716-446655440000\",
    \"columns\": {
      \"Sodexo Team Assignment\": \"Team A\",
      \"Sodexo Warehouse Location\": \"Stockholm\",
      \"ÖMC Cost Center\": \"CC-12345\"
    }
  }
}
\\\

**Error Responses:**
- \401 UNAUTHORIZED\: Not authenticated
- \404 NOT_FOUND\: Employee not found

---

#### \PATCH /api/employees/[id]/custom-data\

**Description:** Update custom column values for employee

**Use Case:** External party edits their custom columns in table

**Authentication:** Required

**Authorization:** External parties can only update their own columns

**Request Body:**
\\\json
{
  \"Sodexo Team Assignment\": \"Team B\",
  \"Sodexo Warehouse Location\": \"Gothenburg\"
}
\\\

**Request Example:**
\\\ash
curl -X PATCH http://localhost:3000/api/employees/550e8400-e29b-41d4-a716-446655440000/custom-data \\
  -H \"Content-Type: application/json\" \\
  -H \"Cookie: sb-access-token=<your-token>\" \\
  -d '{
    \"Sodexo Team Assignment\": \"Team B\"
  }'
\\\

**Response (200 OK):**
\\\json
{
  \"data\": {
    \"employee_id\": \"550e8400-e29b-41d4-a716-446655440000\",
    \"updated\": [\"Sodexo Team Assignment\"],
    \"columns\": {
      \"Sodexo Team Assignment\": \"Team B\",
      \"Sodexo Warehouse Location\": \"Stockholm\"
    }
  }
}
\\\

**Error Responses:**
- \401 UNAUTHORIZED\: Not authenticated
- \403 FORBIDDEN\: Attempting to edit column not owned by user's role
- \404 NOT_FOUND\: Employee not found
- \400 VALIDATION_ERROR\: Invalid data type for column

---

### Important Dates Endpoints

---

#### \GET /api/important-dates\

**Description:** Get all important dates

**Use Case:** Display important dates calendar

**Authentication:** Required (all roles)

**Authorization:** All users can view important dates

**Query Parameters:**

| Parameter  | Type   | Default | Description                |
| ---------- | ------ | ------- | -------------------------- |
| \category\ | string | -       | Filter by category         |
| \year\     | number | -       | Filter by year             |

**Request Example:**
\\\ash
curl -X GET \"http://localhost:3000/api/important-dates?category=Stena%20Dates&year=2025\" \\
  -H \"Cookie: sb-access-token=<your-token>\"
\\\

**Response (200 OK):**
\\\json
{
  \"data\": [
    {
      \"id\": \"uuid\",
      \"week_number\": 7,
      \"year\": 2025,
      \"category\": \"Stena Dates\",
      \"date_description\": \"Fredag 14/2\",
      \"date_value\": \"15-16/2\",
      \"notes\": null,
      \"created_at\": \"2025-01-10T12:00:00Z\"
    }
  ]
}
\\\

---

#### \POST /api/important-dates\

**Description:** Create important date entry

**Use Case:** HR Admin adds important date

**Authentication:** Required

**Authorization:** HR Admin only

**Request Body:**
\\\json
{
  \"week_number\": 10,
  \"year\": 2025,
  \"category\": \"ÖMC Dates\",
  \"date_description\": \"Fredag 7/3\",
  \"date_value\": \"8-9/3\",
  \"notes\": \"Optional notes\"
}
\\\

**Request Example:**
\\\ash
curl -X POST http://localhost:3000/api/important-dates \\
  -H \"Content-Type: application/json\" \\
  -H \"Cookie: sb-access-token=<your-token>\" \\
  -d '{
    \"week_number\": 10,
    \"year\": 2025,
    \"category\": \"ÖMC Dates\",
    \"date_description\": \"Fredag 7/3\",
    \"date_value\": \"8-9/3\"
  }'
\\\

**Response (201 Created):**
\\\json
{
  \"data\": {
    \"id\": \"new-uuid\",
    \"week_number\": 10,
    \"year\": 2025,
    \"category\": \"ÖMC Dates\",
    \"date_description\": \"Fredag 7/3\",
    \"date_value\": \"8-9/3\"
  }
}
\\\

**Error Responses:**
- \401 UNAUTHORIZED\: Not authenticated
- \403 FORBIDDEN\: Not HR Admin
- \400 VALIDATION_ERROR\: Invalid week number or year

---

#### \PATCH /api/important-dates/[id]\

**Description:** Update important date

**Use Case:** HR Admin corrects important date entry

**Authentication:** Required

**Authorization:** HR Admin only

**Request Body:**
\\\json
{
  \"date_description\": \"Updated description\",
  \"notes\": \"Corrected date\"
}
\\\

**Request Example:**
\\\ash
curl -X PATCH http://localhost:3000/api/important-dates/uuid \\
  -H \"Content-Type: application/json\" \\
  -H \"Cookie: sb-access-token=<your-token>\" \\
  -d '{
    \"date_description\": \"Updated description\"
  }'
\\\

**Response (200 OK):**
\\\json
{
  \"data\": {
    \"id\": \"uuid\",
    \"date_description\": \"Updated description\",
    // ... full updated object
  }
}
\\\

---

#### \DELETE /api/important-dates/[id]\

**Description:** Delete important date

**Use Case:** HR Admin removes obsolete important date

**Authentication:** Required

**Authorization:** HR Admin only

**Request Example:**
\\\ash
curl -X DELETE http://localhost:3000/api/important-dates/uuid \\
  -H \"Cookie: sb-access-token=<your-token>\"
\\\

**Response (200 OK):**
\\\json
{
  \"data\": {
    \"id\": \"uuid\",
    \"deleted\": true
  }
}
\\\

---

### Admin Users Endpoints

---

#### \GET /api/admin/users\

**Description:** List all users in the system

**Use Case:** HR Admin views user management table

**Authentication:** Required

**Authorization:** HR Admin only

**Request Example:**
\\\ash
curl -X GET http://localhost:3000/api/admin/users \\
  -H \"Cookie: sb-access-token=<your-token>\"
\\\

**Response (200 OK):**
\\\json
{
  \"data\": [
    {
      \"id\": \"uuid\",
      \"email\": \"admin@company.com\",
      \"role\": \"hr_admin\",
      \"is_active\": true,
      \"created_at\": \"2025-10-20T10:00:00Z\",
      \"last_login\": \"2025-10-29T08:00:00Z\"
    },
    {
      \"id\": \"uuid2\",
      \"email\": \"sodexo@company.com\",
      \"role\": \"sodexo\",
      \"is_active\": true,
      \"created_at\": \"2025-10-21T12:00:00Z\",
      \"last_login\": \"2025-10-28T15:30:00Z\"
    }
  ],
  \"meta\": {
    \"total\": 10
  }
}
\\\

**Error Responses:**
- \401 UNAUTHORIZED\: Not authenticated
- \403 FORBIDDEN\: Not HR Admin

---

#### \POST /api/admin/users\

**Description:** Create new user account

**Use Case:** HR Admin creates account for external party

**Authentication:** Required

**Authorization:** HR Admin only

**Request Body:**
\\\json
{
  \"email\": \"newuser@company.com\",
  \"password\": \"temporaryPass123!\",
  \"role\": \"omc\",
  \"is_active\": true
}
\\\

**Supported Roles:**
- \hr_admin\
- \sodexo\
- \omc\
- \payroll\
- \	oplux\

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Request Example:**
\\\ash
curl -X POST http://localhost:3000/api/admin/users \\
  -H \"Content-Type: application/json\" \\
  -H \"Cookie: sb-access-token=<your-token>\" \\
  -d '{
    \"email\": \"newuser@company.com\",
    \"password\": \"temporaryPass123!\",
    \"role\": \"omc\"
  }'
\\\

**Response (201 Created):**
\\\json
{
  \"data\": {
    \"id\": \"new-uuid\",
    \"email\": \"newuser@company.com\",
    \"role\": \"omc\",
    \"is_active\": true,
    \"temporary_password\": \"temporaryPass123!\",
    \"created_at\": \"2025-10-29T19:50:00Z\"
  }
}
\\\

**Error Responses:**
- \401 UNAUTHORIZED\: Not authenticated
- \403 FORBIDDEN\: Not HR Admin
- \400 VALIDATION_ERROR\: Invalid email, weak password, or missing required field
- \409 DUPLICATE_ERROR\: Email already exists

---

#### \PATCH /api/admin/users/[id]\

**Description:** Update user account (activate/deactivate, change role)

**Use Case:** HR Admin deactivates user who left company

**Authentication:** Required

**Authorization:** HR Admin only (cannot deactivate own account)

**Request Body:**
\\\json
{
  \"is_active\": false
}
\\\

**Request Example (Deactivate User):**
\\\ash
curl -X PATCH http://localhost:3000/api/admin/users/uuid \\
  -H \"Content-Type: application/json\" \\
  -H \"Cookie: sb-access-token=<your-token>\" \\
  -d '{
    \"is_active\": false
  }'
\\\

**Request Example (Change Role):**
\\\ash
curl -X PATCH http://localhost:3000/api/admin/users/uuid \\
  -H \"Content-Type: application/json\" \\
  -H \"Cookie: sb-access-token=<your-token>\" \\
  -d '{
    \"role\": \"payroll\"
  }'
\\\

**Response (200 OK):**
\\\json
{
  \"data\": {
    \"id\": \"uuid\",
    \"email\": \"sodexo@company.com\",
    \"role\": \"sodexo\",
    \"is_active\": false
  }
}
\\\

**Error Responses:**
- \401 UNAUTHORIZED\: Not authenticated
- \403 FORBIDDEN\: Not HR Admin or attempting to deactivate own account
- \404 NOT_FOUND\: User not found
- \400 VALIDATION_ERROR\: Invalid role

---

### Admin Column Permissions Endpoints

---

#### \PATCH /api/admin/columns/[id]\

**Description:** Update column permissions (admin version with full control)

**Use Case:** HR Admin configures which roles can see/edit a column

**Authentication:** Required

**Authorization:** HR Admin only

**Request Body:**
\\\json
{
  \"role_permissions\": {
    \"sodexo\": { \"view\": true, \"edit\": false },
    \"omc\": { \"view\": true, \"edit\": false },
    \"payroll\": { \"view\": false, \"edit\": false },
    \"toplux\": { \"view\": false, \"edit\": false }
  }
}
\\\

**Request Example:**
\\\ash
curl -X PATCH http://localhost:3000/api/admin/columns/uuid \\
  -H \"Content-Type: application/json\" \\
  -H \"Cookie: sb-access-token=<your-token>\" \\
  -d '{
    \"role_permissions\": {
      \"sodexo\": { \"view\": true, \"edit\": false }
    }
  }'
\\\

**Response (200 OK):**
\\\json
{
  \"data\": {
    \"id\": \"uuid\",
    \"column_name\": \"Sodexo Warehouse Location\",
    \"role_permissions\": {
      \"sodexo\": { \"view\": true, \"edit\": false },
      \"omc\": { \"view\": true, \"edit\": false }
    }
  }
}
\\\

**Error Responses:**
- \401 UNAUTHORIZED\: Not authenticated
- \403 FORBIDDEN\: Not HR Admin
- \404 NOT_FOUND\: Column not found
- \400 VALIDATION_ERROR\: Invalid permissions structure

---

#### \DELETE /api/admin/columns/[id]\

**Description:** Delete custom column (admin version, identical to \DELETE /api/columns/[id]\)

**Use Case:** HR Admin removes custom column via admin panel

**Authentication:** Required

**Authorization:** HR Admin only

**Request Example:**
\\\ash
curl -X DELETE http://localhost:3000/api/admin/columns/uuid \\
  -H \"Cookie: sb-access-token=<your-token>\"
\\\

**Response (200 OK):**
\\\json
{
  \"data\": {
    \"id\": \"uuid\",
    \"column_name\": \"Sodexo Warehouse Location\",
    \"deleted\": true,
    \"affected_employees\": 247,
    \"data_table\": \"sodexo_data\"
  }
}
\\\

---

## Appendix

### Date Formats

All date and datetime values use ISO 8601 format:

- **Date**: \YYYY-MM-DD\ (e.g., \2025-10-29\)
- **DateTime**: \YYYY-MM-DDTHH:MM:SSZ\ (e.g., \2025-10-29T19:30:00Z\)
- **Timezone**: All datetimes in UTC (Z suffix)

### SSN Format

Swedish Social Security Number (Personnummer) format:

- **Format**: \YYYYMMDD-XXXX\ (10 digits with hyphen)
- **Example**: \19850315-1234\
- **Validation**: Must be unique, exactly 10 digits

### Email Format

Email addresses must:

- Be valid per RFC 5322 specification
- Contain @ symbol with domain
- Be unique across all users and employees
- Example: \john.doe@company.com\

### Phone Format

Phone numbers recommended format:

- **International**: \+46701234567\ (E.164 format)
- **Local**: \ 70-123 45 67\ (Swedish format)
- **Validation**: Minimum 7 digits, accepts various formats

### Testing API Endpoints

**Using curl:**
\\\ash
# Login
curl -X POST http://localhost:3000/api/auth/login \\
  -H \"Content-Type: application/json\" \\
  -d '{\"email\":\"admin@company.com\",\"password\":\"password\"}' \\
  -c cookies.txt

# Use session cookie for subsequent requests
curl -X GET http://localhost:3000/api/employees \\
  -b cookies.txt
\\\

**Using Postman:**
1. Import endpoints from this documentation
2. Set \Cookie\ header with \sb-access-token\ after login
3. Use environment variables for base URL

**Using JavaScript fetch:**
\\\javascript
// Login
const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@company.com', password: 'password' }),
  credentials: 'include' // Include cookies
});

// Subsequent requests
const employeesResponse = await fetch('http://localhost:3000/api/employees', {
  credentials: 'include' // Cookies included automatically
});
\\\

---

**Document Version:** 1.0  
**Last Updated:** October 29, 2025  
**Next Review:** January 2026  
**Maintained By:** Development Team
