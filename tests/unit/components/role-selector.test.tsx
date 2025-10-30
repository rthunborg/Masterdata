import { screen } from "@testing-library/react";
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RoleSelector } from "@/components/dashboard/role-selector";
import { useUIStore } from "@/lib/store/ui-store";
import { useAuth } from "@/lib/hooks/use-auth";
import { UserRole } from "@/lib/types/user";

// Mock the stores and hooks
vi.mock("@/lib/store/ui-store");
vi.mock("@/lib/hooks/use-auth");

describe("RoleSelector", () => {
  const mockSetPreviewRole = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders for HR Admin user", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "1",
        email: "admin@test.com",
        role: UserRole.HR_ADMIN,
        is_active: true,
        created_at: "2025-01-01",
        auth_id: "auth-1",
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    vi.mocked(useUIStore).mockReturnValue({
      previewRole: null,
      isPreviewMode: false,
      setPreviewRole: mockSetPreviewRole,
      modals: {
        addEmployee: false,
        importCSV: false,
        terminate: false,
        addColumn: false,
        addUser: false,
        editColumn: false,
      },
      editColumnId: null,
      openModal: vi.fn(),
      closeModal: vi.fn(),
      openEditColumnModal: vi.fn(),
      closeEditColumnModal: vi.fn(),
    });

    renderWithI18n(<RoleSelector />);

    expect(screen.getByLabelText(/View As:/i)).toBeInTheDocument();
  });

  it("does not render for non-HR Admin users", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "2",
        email: "sodexo@test.com",
        role: UserRole.SODEXO,
        is_active: true,
        created_at: "2025-01-01",
        auth_id: "auth-2",
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    vi.mocked(useUIStore).mockReturnValue({
      previewRole: null,
      isPreviewMode: false,
      setPreviewRole: mockSetPreviewRole,
      modals: {
        addEmployee: false,
        importCSV: false,
        terminate: false,
        addColumn: false,
        addUser: false,
        editColumn: false,
      },
      editColumnId: null,
      openModal: vi.fn(),
      closeModal: vi.fn(),
      openEditColumnModal: vi.fn(),
      closeEditColumnModal: vi.fn(),
    });

    const { container } = renderWithI18n(<RoleSelector />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows preview mode indicator when active", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "1",
        email: "admin@test.com",
        role: UserRole.HR_ADMIN,
        is_active: true,
        created_at: "2025-01-01",
        auth_id: "auth-1",
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    vi.mocked(useUIStore).mockReturnValue({
      previewRole: UserRole.SODEXO,
      isPreviewMode: true,
      setPreviewRole: mockSetPreviewRole,
      modals: {
        addEmployee: false,
        importCSV: false,
        terminate: false,
        addColumn: false,
        addUser: false,
        editColumn: false,
      },
      editColumnId: null,
      openModal: vi.fn(),
      closeModal: vi.fn(),
      openEditColumnModal: vi.fn(),
      closeEditColumnModal: vi.fn(),
    });

    renderWithI18n(<RoleSelector />);

    expect(screen.getByText(/Preview Mode Active/i)).toBeInTheDocument();
  });

  it("does not show preview mode indicator when not active", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "1",
        email: "admin@test.com",
        role: UserRole.HR_ADMIN,
        is_active: true,
        created_at: "2025-01-01",
        auth_id: "auth-1",
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      checkAuth: vi.fn(),
      setLoading: vi.fn(),
    });

    vi.mocked(useUIStore).mockReturnValue({
      previewRole: null,
      isPreviewMode: false,
      setPreviewRole: mockSetPreviewRole,
      modals: {
        addEmployee: false,
        importCSV: false,
        terminate: false,
        addColumn: false,
        addUser: false,
        editColumn: false,
      },
      editColumnId: null,
      openModal: vi.fn(),
      closeModal: vi.fn(),
      openEditColumnModal: vi.fn(),
      closeEditColumnModal: vi.fn(),
    });

    renderWithI18n(<RoleSelector />);

    expect(screen.queryByText(/Preview Mode Active/i)).not.toBeInTheDocument();
  });
});

