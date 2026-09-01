/**
 * Unit Tests for Story 17.5: Search Filter Improvements for External Users
 *
 * The role-specific crew-ready dropdown contract was superseded by Story 20.1.
 * This file retains Story 17.5's current search-visibility contract; the Epic 20
 * filter-panel and export suites cover the replacement filtering workflow.
 */

import { screen, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { EmployeeTable } from "@/components/dashboard/employee-table";
import type { Employee } from "@/lib/types/employee";
import { UserRole } from "@/lib/types/user";

// Mock services
vi.mock("@/lib/services/employee-service", () => ({
  employeeService: {
    update: vi.fn(() => Promise.resolve({})),
    archive: vi.fn(() => Promise.resolve()),
    unarchive: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("@/lib/services/custom-data-service", () => ({
  customDataService: {
    updateCustomData: vi.fn(() => Promise.resolve({})),
  },
}));

// Mock mutation queue service
vi.mock('@/lib/services/mutation-queue', () => ({
  mutationQueueService: {
    getPendingMutations: vi.fn(() => Promise.resolve([])),
  },
}));

// Mock the auth hook
const mockUseAuth = vi.fn();
vi.mock("@/lib/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Supabase client for hooks
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  })),
}));

// Mock fetch for hooks
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: async () => ({ data: [] }),
    text: async () => "",
    status: 200,
    statusText: "OK",
  } as Response)
);

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: '/dashboard',
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    toString: vi.fn(() => ''),
  }),
  usePathname: () => '/dashboard',
}));


// Mock the columns hook
vi.mock("@/lib/hooks/use-columns", () => ({
  useColumns: vi.fn(() => ({
    columns: [
      { 
        id: "first_name", 
        column_name: "First Name", 
        column_type: "text", 
        is_masterdata: true, 
        category: null, 
        is_visible: true,
        role_permissions: {
          hr_admin: { view: true, edit: true },
          sodexo: { view: true, edit: false },
          omc: { view: true, edit: false },
          payroll: { view: true, edit: false },
          toplux: { view: true, edit: false },
        },
        created_at: "2025-01-01T00:00:00Z",
        db_column_name: 'first_name',
        category_color: '#FFFFFF',
        display_order: 0,
        updated_at: new Date().toISOString(),
      },
    ],
    isLoading: false,
    error: null,
  })),
}));

// Mock important dates hook
vi.mock('@/lib/hooks/use-important-dates', () => ({
  useImportantDates: vi.fn(() => ({
    dates: [],
    isLoading: false,
    error: null,
  })),
}));

// Mock UI store
vi.mock('@/lib/store/ui-store', () => ({
  useUIStore: vi.fn(() => ({
    previewRole: null,
    isPreviewMode: false,
    columnVisibility: {},
    initColumnVisibility: vi.fn(),
    toggleColumnVisibility: vi.fn(),
    resetColumnVisibility: vi.fn(),
  })),
}));

describe("Story 17.5: Filter Dropdown Conditional Rendering", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return renderWithI18n(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  const mockEmployees: Employee[] = [
    {
      id: "emp-1",
      first_name: "John",
      surname: "Doe",
      ssn: "123-45-6789",
      email: "john.doe@example.com",
      mobile: "+1234567890",
      hire_date: "2020-01-15",
      gender: 'Man',
      rank: 'SEV',
      town_district: "Trelleborg",
      stena_date: null,
      omc_date: null,
      pe3_date: null,
      is_archived: false,
      is_terminated: false,
      termination_date: null,
      termination_reason: null,
      repayment_needed_omc: null,
      repayment_needed_pe3: null,
      comments: null,
      one: null,
      one_marked_at: null,
      talmundo: null,
      isps: null,
      photo: null,
      origo: null,
      loneiva: null,
      mail_lon: null,
      bankuppgifter: null,
      li: null,
      passport: null,
      kvitto_c17_18: null,
      c17: null,
      crewing_done: null,
      created_at: "2020-01-01T00:00:00Z",
      updated_at: "2020-01-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AC2: Search Functionality Preserved", () => {
    it("should show search input for external users", async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: "user-1",
          email: "sodexo@example.com",
          role: "sodexo" as UserRole,
          is_active: true,
          created_at: "2025-01-01T00:00:00Z",
        },
        isAuthenticated: true,
        isLoading: false,
      });

      await act(async () => {
        renderWithQueryClient(
          <EmployeeTable
            employees={mockEmployees}
            isLoading={false}
          />
        );
      });

      // Search input should be visible and functional (placeholder is in Swedish: "Sök anställda...")
      const searchInput = screen.getByPlaceholderText(/Sök anställda/i);
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).not.toBeDisabled();
    });
  });

});

