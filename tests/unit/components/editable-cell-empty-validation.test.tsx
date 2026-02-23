import { screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EditableCell } from "@/components/dashboard/editable-cell";

describe("EditableCell - Empty Value Validation", () => {
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

    const mockOnSave = vi.fn().mockResolvedValue(undefined);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should NOT call onSave when entering and exiting edit mode on an empty field", async () => {
        renderWithQueryClient(
            <EditableCell
                value={null}
                employeeId="emp-1"
                field="test_field"
                type="text"
                canEdit={true}
                onSave={mockOnSave}
            />
        );

        const cell = screen.getByRole("gridcell");

        // Enter edit mode
        fireEvent.click(cell);

        const input = screen.getByRole("textbox");
        expect(input).toBeInTheDocument();
        expect(input).toHaveValue("");

        // Exit edit mode without changing anything (click outside)
        fireEvent.mouseDown(document.body);

        // Should not call onSave
        expect(mockOnSave).not.toHaveBeenCalled();
    });
});
