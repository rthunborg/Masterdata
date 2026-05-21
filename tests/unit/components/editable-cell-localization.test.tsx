import { screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EditableCell } from "@/components/dashboard/editable-cell";

describe("EditableCell - Localization", () => {
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

    const mockOnSave = vi.fn();
    const mockOnError = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("displays localized error message for 'Invalid input data' error", async () => {
        mockOnSave.mockRejectedValue(new Error("Invalid input data"));

        renderWithQueryClient(
            <EditableCell
                value="Original Value"
                employeeId="emp-1"
                field="first_name"
                type="text"
                canEdit={true}
                onSave={mockOnSave}
                onError={mockOnError}
            />
        );

        // Enter edit mode
        const cell = screen.getByText("Original Value");
        fireEvent.click(cell);

        // Change value
        const input = screen.getByDisplayValue("Original Value");
        fireEvent.change(input, { target: { value: "New Value" } });
        fireEvent.keyDown(input, { key: "Enter" });

        // Verify localized error is propagated to the snackbar path and
        // the cell reverts to the confirmed original value.
        await waitFor(() => {
            expect(mockOnError).toHaveBeenCalledWith("Ogiltigt värde");
        });
        expect(screen.getByRole("gridcell")).toHaveTextContent("Original Value");
    });

    it("displays localized error message for 'VALIDATION_ERROR' error", async () => {
        mockOnSave.mockRejectedValue(new Error("VALIDATION_ERROR: Some detail"));

        renderWithQueryClient(
            <EditableCell
                value="Original Value"
                employeeId="emp-1"
                field="first_name"
                type="text"
                canEdit={true}
                onSave={mockOnSave}
                onError={mockOnError}
            />
        );

        // Enter edit mode
        const cell = screen.getByText("Original Value");
        fireEvent.click(cell);

        // Change value
        const input = screen.getByDisplayValue("Original Value");
        fireEvent.change(input, { target: { value: "New Value" } });
        fireEvent.keyDown(input, { key: "Enter" });

        // Verify localized error is propagated to the snackbar path and
        // the cell reverts to the confirmed original value.
        await waitFor(() => {
            expect(mockOnError).toHaveBeenCalledWith("Ogiltigt värde");
        });
        expect(screen.getByRole("gridcell")).toHaveTextContent("Original Value");
    });

    it("displays original error message for unknown errors", async () => {
        mockOnSave.mockRejectedValue(new Error("Network error"));

        renderWithQueryClient(
            <EditableCell
                value="Original Value"
                employeeId="emp-1"
                field="first_name"
                type="text"
                canEdit={true}
                onSave={mockOnSave}
                onError={mockOnError}
            />
        );

        // Enter edit mode
        const cell = screen.getByText("Original Value");
        fireEvent.click(cell);

        // Change value
        const input = screen.getByDisplayValue("Original Value");
        fireEvent.change(input, { target: { value: "New Value" } });
        fireEvent.keyDown(input, { key: "Enter" });

        // Verify original error is propagated to the snackbar path and
        // the cell reverts to the confirmed original value.
        await waitFor(() => {
            expect(mockOnError).toHaveBeenCalledWith("Network error");
        });
        expect(screen.getByRole("gridcell")).toHaveTextContent("Original Value");
    });
});
