import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useColumns } from "@/lib/hooks/use-columns";
import { columnConfigService } from "@/lib/services/column-config-service";
import { useAuth } from "@/lib/hooks/use-auth";
import { UserRole } from "@/lib/types/user";
import type { ColumnConfig } from "@/lib/types/column-config";

// Mock dependencies
vi.mock("@/lib/services/column-config-service");
vi.mock("@/lib/hooks/use-auth");

const mockColumnConfigs: ColumnConfig[] = [
  {
    id: "1",
    column_name: "First Name",
    column_type: "text",
    role_permissions: {
      hr_admin: { view: true, edit: true },
      sodexo: { view: true, edit: false },
      payroll: { view: true, edit: false },
    },
    is_masterdata: true,
    category: null,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "2",
    column_name: "SSN",
    column_type: "text",
    role_permissions: {
      hr_admin: { view: true, edit: true },
      sodexo: { view: false, edit: false },
      payroll: { view: true, edit: false },
    },
    is_masterdata: true,
    category: null,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "3",
    column_name: "Email",
    column_type: "text",
    role_permissions: {
      hr_admin: { view: true, edit: true },
      sodexo: { view: true, edit: false },
      payroll: { view: false, edit: false },
    },
    is_masterdata: true,
    category: null,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "4",
    column_name: "Mobile",
    column_type: "text",
    role_permissions: {
      hr_admin: { view: true, edit: true },
      sodexo: { view: true, edit: false },
      payroll: { view: false, edit: false },
    },
    is_masterdata: true,
    category: null,
    created_at: "2025-01-01T00:00:00Z",
  },
];

describe("useColumns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return all columns for HR Admin role", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { 
        id: "1", 
        email: "admin@test.com", 
        role: UserRole.HR_ADMIN, 
        is_active: true, 
        auth_id: "auth1",
        created_at: "2025-01-01T00:00:00Z",
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    vi.mocked(columnConfigService.getAll).mockResolvedValue(mockColumnConfigs);

    const { result } = renderHook(() => useColumns());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.columns).toHaveLength(4);
    expect(result.current.columns.map(c => c.column_name)).toEqual([
      "First Name",
      "SSN",
      "Email",
      "Mobile",
    ]);
    expect(result.current.error).toBeNull();
  });

  it("should filter columns for Sodexo role", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { 
        id: "2", 
        email: "sodexo@test.com", 
        role: UserRole.SODEXO, 
        is_active: true, 
        auth_id: "auth2",
        created_at: "2025-01-01T00:00:00Z",
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    vi.mocked(columnConfigService.getAll).mockResolvedValue(mockColumnConfigs);

    const { result } = renderHook(() => useColumns());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.columns).toHaveLength(3);
    expect(result.current.columns.map(c => c.column_name)).toEqual([
      "First Name",
      "Email",
      "Mobile",
    ]);
    expect(result.current.error).toBeNull();
  });

  it("should filter columns for Payroll role", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { 
        id: "3", 
        email: "payroll@test.com", 
        role: UserRole.PAYROLL, 
        is_active: true, 
        auth_id: "auth3",
        created_at: "2025-01-01T00:00:00Z",
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    vi.mocked(columnConfigService.getAll).mockResolvedValue(mockColumnConfigs);

    const { result } = renderHook(() => useColumns());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.columns).toHaveLength(2);
    expect(result.current.columns.map(c => c.column_name)).toEqual([
      "First Name",
      "SSN",
    ]);
    expect(result.current.error).toBeNull();
  });

  it("should return empty array when user is null", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    const { result } = renderHook(() => useColumns());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.columns).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it("should handle API errors", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { 
        id: "1", 
        email: "admin@test.com", 
        role: UserRole.HR_ADMIN, 
        is_active: true, 
        auth_id: "auth1",
        created_at: "2025-01-01T00:00:00Z",
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    const errorMessage = "Network error";
    vi.mocked(columnConfigService.getAll).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useColumns());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.columns).toHaveLength(0);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe(errorMessage);
  });

  it("should show loading state initially", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { 
        id: "1", 
        email: "admin@test.com", 
        role: UserRole.HR_ADMIN, 
        is_active: true, 
        auth_id: "auth1",
        created_at: "2025-01-01T00:00:00Z",
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    vi.mocked(columnConfigService.getAll).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockColumnConfigs), 100))
    );

    const { result } = renderHook(() => useColumns());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.columns).toHaveLength(0);
  });
});
