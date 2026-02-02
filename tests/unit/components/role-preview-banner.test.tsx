import { screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RolePreviewBanner } from "@/components/dashboard/role-preview-banner";
import { useUIStore } from "@/lib/store/ui-store";
import { UserRole } from "@/lib/types/user";

// Mock the UI store
vi.mock("@/lib/store/ui-store");

describe("RolePreviewBanner", () => {
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

  const mockSetPreviewRole = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with role name when in preview mode", () => {
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

    renderWithQueryClient(<RolePreviewBanner />);

    // Swedish translations
    expect(screen.getByText(/Visar som Sodexo/i)).toBeInTheDocument();
    expect(screen.getByText(/Förhandsgranskningsläge/i)).toBeInTheDocument();
    expect(screen.getByText(/Redigering är inaktiverad/i)).toBeInTheDocument();
  });

  it("calls setPreviewRole(null) when Exit Preview clicked", () => {
    vi.mocked(useUIStore).mockReturnValue({
      previewRole: UserRole.OMC,
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

    renderWithQueryClient(<RolePreviewBanner />);

    // Swedish translation
    const exitButton = screen.getByRole("button", { name: /Avsluta förhandsgranskning/i });
    fireEvent.click(exitButton);

    expect(mockSetPreviewRole).toHaveBeenCalledWith(null);
  });

  it("does not render when not in preview mode", () => {
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

    const { container } = renderWithQueryClient(<RolePreviewBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders with correct ARIA attributes", () => {
    vi.mocked(useUIStore).mockReturnValue({
      previewRole: UserRole.PAYROLL,
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

    renderWithQueryClient(<RolePreviewBanner />);

    const banner = screen.getByRole("alert");
    expect(banner).toHaveAttribute("aria-live", "polite");
    expect(banner).toHaveAttribute("aria-atomic", "true");
  });

  it("displays correct role names for all external parties", () => {
    const testCases = [
      { role: UserRole.SODEXO, displayName: "Sodexo" },
      { role: UserRole.OMC, displayName: "ÖMC" },
      { role: UserRole.PAYROLL, displayName: "Payroll" },
      { role: UserRole.TOPLUX, displayName: "Toplux" },
    ];

    testCases.forEach(({ role, displayName }) => {
      vi.mocked(useUIStore).mockReturnValue({
        previewRole: role,
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

      const { unmount } = renderWithQueryClient(<RolePreviewBanner />);
      // Swedish translation: "Visar som" instead of "Viewing as"
      expect(screen.getByText(new RegExp(`Visar som ${displayName}`, "i"))).toBeInTheDocument();
      unmount();
    });
  });
});

