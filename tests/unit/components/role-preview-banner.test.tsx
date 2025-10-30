import { screen, fireEvent } from "@testing-library/react";
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RolePreviewBanner } from "@/components/dashboard/role-preview-banner";
import { useUIStore } from "@/lib/store/ui-store";
import { UserRole } from "@/lib/types/user";

// Mock the UI store
vi.mock("@/lib/store/ui-store");

describe("RolePreviewBanner", () => {
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

    renderWithI18n(<RolePreviewBanner />);

    expect(screen.getByText(/Viewing as Sodexo/i)).toBeInTheDocument();
    expect(screen.getByText(/Preview Mode/i)).toBeInTheDocument();
    expect(screen.getByText(/Editing is disabled/i)).toBeInTheDocument();
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

    renderWithI18n(<RolePreviewBanner />);

    const exitButton = screen.getByRole("button", { name: /Exit Preview/i });
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

    const { container } = renderWithI18n(<RolePreviewBanner />);
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

    renderWithI18n(<RolePreviewBanner />);

    const banner = screen.getByRole("alert");
    expect(banner).toHaveAttribute("aria-live", "polite");
    expect(banner).toHaveAttribute("aria-atomic", "true");
  });

  it("displays correct role names for all external parties", () => {
    const testCases = [
      { role: UserRole.SODEXO, displayName: "Sodexo" },
      { role: UserRole.OMC, displayName: "OMC" },
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

      const { unmount } = renderWithI18n(<RolePreviewBanner />);
      expect(screen.getByText(new RegExp(`Viewing as ${displayName}`, "i"))).toBeInTheDocument();
      unmount();
    });
  });
});

