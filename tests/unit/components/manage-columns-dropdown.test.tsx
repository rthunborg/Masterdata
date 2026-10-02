/**
 * Manage Columns dialog tests.
 *
 * Story 22.13 keeps external-party presentation edits but removes schema
 * lifecycle controls. Creation and deletion are HR Admin-only operations.
 */

import { fireEvent, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ManageColumnsDialog } from "@/components/dashboard/manage-columns-dropdown";
import { useColumns } from "@/lib/hooks/use-columns";
import { useUIStore } from "@/lib/store/ui-store";
import type { ColumnConfig } from "@/lib/types/column-config";
import { renderWithI18n } from "@/../tests/utils/i18n-test-wrapper";

vi.mock("@/lib/hooks/use-columns");
vi.mock("@/lib/store/ui-store");

const mockOpenEditColumnModal = vi.fn();

const mockCustomColumns: ColumnConfig[] = [
  {
    id: "col-1",
    column_name: "Recruitment Team",
    column_type: "text",
    is_masterdata: false,
    category: "Team",
    role_permissions: { sodexo: { view: true, edit: true } },
    display_order: 1,
    is_visible: true,
    db_column_name: "recruitment_team",
    category_color: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "col-2",
    column_name: "Training Status",
    column_type: "text",
    is_masterdata: false,
    category: null,
    role_permissions: { sodexo: { view: true, edit: true } },
    display_order: 2,
    is_visible: true,
    db_column_name: "training_status",
    category_color: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
];

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return renderWithI18n(
    <QueryClientProvider client={queryClient}>
      <ManageColumnsDialog />
    </QueryClientProvider>
  );
}

describe("ManageColumnsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useColumns).mockReturnValue({
      columns: mockCustomColumns,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(useUIStore).mockReturnValue({
      modals: {},
      openEditColumnModal: mockOpenEditColumnModal,
      closeModal: vi.fn(),
      openModal: vi.fn(),
      isPreviewMode: false,
      previewRole: null,
      setPreviewRole: vi.fn(),
      setIsPreviewMode: vi.fn(),
      columnVisibility: {},
      initColumnVisibility: vi.fn(),
      setColumnVisibility: vi.fn(),
      toggleColumnVisibility: vi.fn(),
      editColumnId: null,
      closeEditColumnModal: vi.fn(),
    });
  });

  it("shows the Swedish manage-columns label", () => {
    renderDialog();

    expect(
      screen.getByRole("button", { name: /Hantera kolumner/i })
    ).toBeInTheDocument();
  });

  it("shows translated presentation-editing copy and grouped columns", async () => {
    renderDialog();
    fireEvent.click(
      screen.getByRole("button", { name: /Hantera kolumner/i })
    );

    await waitFor(() => {
      expect(screen.getByText("Hantera anpassade kolumner")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Redigera dina anpassade kolumnnamn och kategorier")
    ).toBeInTheDocument();
    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("Okategoriserad")).toBeInTheDocument();
    expect(screen.getByText("Recruitment Team")).toBeInTheDocument();
    expect(screen.getByText("Training Status")).toBeInTheDocument();
  });

  it("opens the safe presentation editor for the selected custom column", async () => {
    renderDialog();
    fireEvent.click(
      screen.getByRole("button", { name: /Hantera kolumner/i })
    );

    const columnButton = await screen.findByRole("button", {
      name: /Recruitment Team/i,
    });
    fireEvent.click(columnButton);

    expect(mockOpenEditColumnModal).toHaveBeenCalledWith("col-1");
  });

  it("does not expose lifecycle deletion to external users", async () => {
    renderDialog();
    fireEvent.click(
      screen.getByRole("button", { name: /Hantera kolumner/i })
    );

    await screen.findByText("Recruitment Team");
    expect(
      screen.queryByRole("button", { name: /Ta bort \(permanent\)/i })
    ).not.toBeInTheDocument();
  });

  it("does not render when no custom columns exist", () => {
    vi.mocked(useColumns).mockReturnValue({
      columns: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = renderDialog();
    expect(container.firstChild).toBeNull();
  });
});
