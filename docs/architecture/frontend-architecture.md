# Frontend Architecture

## Component Organization

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

## State Management Architecture

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

## Routing Architecture

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

## Frontend Services Layer

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
