# Coding Standards

## Critical Fullstack Rules

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

## Naming Conventions

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
