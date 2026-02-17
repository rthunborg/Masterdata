import { screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EditableCell } from "@/components/dashboard/editable-cell";

describe("EditableCell - Loneiva (Salary Level)", () => {
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

    it("renders a Select component (combobox) for loneiva field", () => {
        renderWithQueryClient(
            <EditableCell
                value={null}
                employeeId="emp-1"
                field="loneiva"
                type="number"
                canEdit={true}
                onSave={mockOnSave}
            />
        );

        // Click cell to enter edit mode
        const cell = screen.getByRole("gridcell");
        fireEvent.click(cell);

        // Should render a combobox (Select trigger)
        const trigger = screen.getByRole("combobox");
        expect(trigger).toBeInTheDocument();
    });

    it("contains options 0-7 and Not Set", async () => {
        renderWithQueryClient(
            <EditableCell
                value={null}
                employeeId="emp-1"
                field="loneiva"
                type="number"
                canEdit={true}
                onSave={mockOnSave}
            />
        );

        // Click cell to enter edit mode
        const cell = screen.getByRole("gridcell");
        fireEvent.click(cell);

        const trigger = screen.getByRole("combobox");
        fireEvent.click(trigger);

        // Wait for options to appear
        await waitFor(() => {
            expect(screen.getByText("Ej angiven")).toBeInTheDocument(); // Swedish translation for "Not Set"
            expect(screen.getByText("0")).toBeInTheDocument();
            expect(screen.getByText("7")).toBeInTheDocument();
        });
    });

    it("calls onSave with selected number when an option is chosen", async () => {
        renderWithQueryClient(
            <EditableCell
                value={null}
                employeeId="emp-1"
                field="loneiva"
                type="number"
                canEdit={true}
                onSave={mockOnSave}
            />
        );

        // Click cell to enter edit mode
        const cell = screen.getByRole("gridcell");
        fireEvent.click(cell);

        const trigger = screen.getByRole("combobox");
        fireEvent.click(trigger);

        await waitFor(() => {
            screen.getByText("3").click();
        });

        // Should call onSave with 3 (number)
        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith("emp-1", "loneiva", 3);
        });
    });

    it("calls onSave with null when 'Not Set' is chosen", async () => {
        renderWithQueryClient(
            <EditableCell
                value={3}
                employeeId="emp-1"
                field="loneiva"
                type="number"
                canEdit={true}
                onSave={mockOnSave}
            />
        );

        // Click cell to enter edit mode
        const cell = screen.getByRole("gridcell");
        fireEvent.click(cell);

        const trigger = screen.getByRole("combobox");
        fireEvent.click(trigger);

        await waitFor(() => {
            screen.getByText("Ej angiven").click(); // Swedish translation for "Not Set"
        });

        // Should call onSave with null
        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith("emp-1", "loneiva", null);
        });
    });

    it("does NOT call onSave if the same value is selected (no-op)", async () => {
        renderWithQueryClient(
            <EditableCell
                value={5}
                employeeId="emp-1"
                field="loneiva"
                type="number"
                canEdit={true}
                onSave={mockOnSave}
            />
        );

        // Click cell to enter edit mode
        const cell = screen.getByRole("gridcell");
        fireEvent.click(cell);

        const trigger = screen.getByRole("combobox");
        fireEvent.click(trigger);

        await waitFor(() => {
            // Select 5 again
            const options = screen.getAllByText("5");
            // The one in the content is the second one usually, or we can just click the one that is visible
            options[options.length - 1].click();
        });

        // Should NOT call onSave
        await waitFor(() => {
            expect(mockOnSave).not.toHaveBeenCalled();
        });
    });
});
