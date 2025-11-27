import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EditableCell } from "@/components/dashboard/editable-cell";

describe("EditableCell - Boolean Dropdown (Story 9.9)", () => {
    const mockOnSave = vi.fn().mockResolvedValue(undefined);
    const mockOnError = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("AC1 - Dropdown instead of checkbox in edit mode", () => {
        it("shows dropdown instead of checkbox when entering edit mode", async () => {
            renderWithI18n(
                <EditableCell
                    value={true}
                    employeeId="emp-1"
                    field="one"
                    type="boolean"
                    canEdit={true}
                    onSave={mockOnSave}
                />
            );

            const cell = screen.getByRole("gridcell");
            fireEvent.click(cell);

            // Should show dropdown (combobox role), NOT checkbox
            await waitFor(() => {
                expect(screen.getByRole("combobox")).toBeInTheDocument();
            });
            expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
        });

        it("dropdown options are 'Klart' and 'Nej'", async () => {
            renderWithI18n(
                <EditableCell
                    value={true}
                    employeeId="emp-1"
                    field="one"
                    type="boolean"
                    canEdit={true}
                    onSave={mockOnSave}
                />
            );

            const cell = screen.getByRole("gridcell");

            fireEvent.click(cell);

            await waitFor(() => {
                const dropdown = screen.getByRole("combobox");
                expect(dropdown).toHaveTextContent("Klart");
            });
        });

        it("preselects 'Nej' when value is false", async () => {
            renderWithI18n(
                <EditableCell
                    value={false}
                    employeeId="emp-1"
                    field="one"
                    type="boolean"
                    canEdit={true}
                    onSave={mockOnSave}
                />
            );

            const cell = screen.getByRole("gridcell");
            fireEvent.click(cell);

            await waitFor(() => {
                const dropdown = screen.getByRole("combobox");
                expect(dropdown).toHaveTextContent("Nej");
            });
        });
    });

    describe("AC3 - Correct persistence", () => {
        it("selecting 'Klart' saves true", async () => {
            renderWithI18n(
                <EditableCell
                    value={false}
                    employeeId="emp-1"
                    field="one"
                    type="boolean"
                    canEdit={true}
                    onSave={mockOnSave}
                />
            );

            const cell = screen.getByRole("gridcell");
            fireEvent.click(cell);

            const trigger = screen.getByRole("combobox");
            fireEvent.click(trigger);

            await waitFor(() => {
                const klartOptions = screen.getAllByText("Klart");
                klartOptions[klartOptions.length - 1].click();
            });

            await waitFor(() => {
                expect(mockOnSave).toHaveBeenCalledWith("emp-1", "one", true);
            });
        });

        it("selecting 'Nej' saves false", async () => {
            renderWithI18n(
                <EditableCell
                    value={true}
                    employeeId="emp-1"
                    field="one"
                    type="boolean"
                    canEdit={true}
                    onSave={mockOnSave}
                />
            );

            const cell = screen.getByRole("gridcell");
            fireEvent.click(cell);

            const trigger = screen.getByRole("combobox");
            fireEvent.click(trigger);

            await waitFor(() => {
                const nejOptions = screen.getAllByText("Nej");
                nejOptions[nejOptions.length - 1].click();
            });

            await waitFor(() => {
                expect(mockOnSave).toHaveBeenCalledWith("emp-1", "one", false);
            });
        });
    });

    describe("AC4 - Keyboard and accessibility", () => {
        it("dropdown can be focused", async () => {
            renderWithI18n(
                <EditableCell
                    value={true}
                    employeeId="emp-1"
                    field="one"
                    type="boolean"
                    canEdit={true}
                    onSave={mockOnSave}
                />
            );

            const cell = screen.getByRole("gridcell");
            fireEvent.click(cell);

            const dropdown = screen.getByRole("combobox");
            dropdown.focus();
            expect(dropdown).toHaveFocus();
        });

        it("has correct ARIA attributes", async () => {
            renderWithI18n(
                <EditableCell
                    value={true}
                    employeeId="emp-1"
                    field="one"
                    type="boolean"
                    canEdit={true}
                    onSave={mockOnSave}
                />
            );

            const cell = screen.getByRole("gridcell");
            fireEvent.click(cell);

            await waitFor(() => {
                const dropdown = screen.getByRole("combobox");
                expect(dropdown).toBeInTheDocument();
                expect(dropdown).toHaveAttribute("aria-expanded");
            });
        });
    });

    describe("AC5 - No-op edit does not cause updates or extra renders", () => {
        it("entering edit mode with true and selecting 'Klart' does not call onSave", async () => {
            renderWithI18n(
                <EditableCell
                    value={true}
                    employeeId="emp-1"
                    field="one"
                    type="boolean"
                    canEdit={true}
                    onSave={mockOnSave}
                />
            );

            const cell = screen.getByRole("gridcell");
            fireEvent.click(cell);

            const trigger = screen.getByRole("combobox");
            fireEvent.click(trigger);

            await waitFor(() => {
                const klartOptions = screen.getAllByText("Klart");
                klartOptions[klartOptions.length - 1].click();
            });

            await waitFor(() => {
                expect(mockOnSave).not.toHaveBeenCalled();
            });
        });

        it("entering edit mode with false and selecting 'Nej' does not call onSave", async () => {
            renderWithI18n(
                <EditableCell
                    value={false}
                    employeeId="emp-1"
                    field="one"
                    type="boolean"
                    canEdit={true}
                    onSave={mockOnSave}
                />
            );

            const cell = screen.getByRole("gridcell");
            fireEvent.click(cell);

            const trigger = screen.getByRole("combobox");
            fireEvent.click(trigger);

            await waitFor(() => {
                const nejOptions = screen.getAllByText("Nej");
                nejOptions[nejOptions.length - 1].click();
            });

            await waitFor(() => {
                expect(mockOnSave).not.toHaveBeenCalled();
            });
        });

        it("changing value from true to false DOES call onSave", async () => {
            renderWithI18n(
                <EditableCell
                    value={true}
                    employeeId="emp-1"
                    field="one"
                    type="boolean"
                    canEdit={true}
                    onSave={mockOnSave}
                />
            );

            const cell = screen.getByRole("gridcell");
            fireEvent.click(cell);

            const trigger = screen.getByRole("combobox");
            fireEvent.click(trigger);

            await waitFor(() => {
                const nejOptions = screen.getAllByText("Nej");
                nejOptions[nejOptions.length - 1].click();
            });

            await waitFor(() => {
                expect(mockOnSave).toHaveBeenCalledWith("emp-1", "one", false);
            });
        });
    });

    describe("Display Mode", () => {
        it("displays 'Klart' for true value in read mode", () => {
            renderWithI18n(
                <EditableCell
                    value={true}
                    employeeId="emp-1"
                    field="one"
                    type="boolean"
                    canEdit={true}
                    onSave={mockOnSave}
                />
            );

            expect(screen.getByText("Klart")).toBeInTheDocument();
        });

        it("displays 'Nej' for false value in read mode", () => {
            renderWithI18n(
                <EditableCell
                    value={false}
                    employeeId="emp-1"
                    field="one"
                    type="boolean"
                    canEdit={true}
                    onSave={mockOnSave}
                />
            );

            expect(screen.getByText("Nej")).toBeInTheDocument();
        });
    });

    describe("Error Handling", () => {
        it("handles save errors gracefully", async () => {
            const errorMessage = "Network error";
            mockOnSave.mockRejectedValueOnce(new Error(errorMessage));

            renderWithI18n(
                <EditableCell
                    value={true}
                    employeeId="emp-1"
                    field="one"
                    type="boolean"
                    canEdit={true}
                    onSave={mockOnSave}
                    onError={mockOnError}
                />
            );

            const cell = screen.getByRole("gridcell");
            fireEvent.click(cell);

            const trigger = screen.getByRole("combobox");
            fireEvent.click(trigger);

            await waitFor(() => {
                const nejOptions = screen.getAllByText("Nej");
                nejOptions[nejOptions.length - 1].click();
            });

            await waitFor(() => {
                expect(mockOnError).toHaveBeenCalledWith(errorMessage);
            });
        });
    });
});
