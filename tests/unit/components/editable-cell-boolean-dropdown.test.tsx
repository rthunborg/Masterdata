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
                expect(screen.getByRole("combobox", { hidden: true })).toBeInTheDocument();
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
                const dropdown = screen.getByRole("combobox", { hidden: true });
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
                const dropdown = screen.getByRole("combobox", { hidden: true });
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

             const trigger = screen.getByRole("combobox", { hidden: true });
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

             const trigger = screen.getByRole("combobox", { hidden: true });
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

            const dropdown = screen.getByRole("combobox", { hidden: true });
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
                const dropdown = screen.getByRole("combobox", { hidden: true });
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

             const trigger = screen.getByRole("combobox", { hidden: true });
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

             const trigger = screen.getByRole("combobox", { hidden: true });
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

             const trigger = screen.getByRole("combobox", { hidden: true });
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

             const trigger = screen.getByRole("combobox", { hidden: true });
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

describe("EditableCell - Non-Checklist Boolean Fields (isChecklistItem=false)", () => {
    const mockOnSave = vi.fn().mockResolvedValue(undefined);
    const mockOnError = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Display Mode - Shows 'Ja' instead of 'Klart' when isChecklistItem=false", () => {
        it("displays 'Ja' for true value in read mode when isChecklistItem=false", () => {
            renderWithI18n(
                <EditableCell
                    value={true}
                    employeeId="emp-1"
                    field="some_boolean"
                    type="boolean"
                    canEdit={true}
                    isChecklistItem={false}
                    onSave={mockOnSave}
                />
            );

            expect(screen.getByText("Ja")).toBeInTheDocument();
            expect(screen.queryByText("Klart")).not.toBeInTheDocument();
        });

        it("displays 'Nej' for false value in read mode when isChecklistItem=false", () => {
            renderWithI18n(
                <EditableCell
                    value={false}
                    employeeId="emp-1"
                    field="some_boolean"
                    type="boolean"
                    canEdit={true}
                    isChecklistItem={false}
                    onSave={mockOnSave}
                />
            );

            expect(screen.getByText("Nej")).toBeInTheDocument();
        });
    });

    describe("Edit Mode - Dropdown options show 'Ja/Nej' when isChecklistItem=false", () => {
        it("dropdown preselects 'Ja' when value is true and isChecklistItem=false", async () => {
            renderWithI18n(
                <EditableCell
                    value={true}
                    employeeId="emp-1"
                    field="some_boolean"
                    type="boolean"
                    canEdit={true}
                    isChecklistItem={false}
                    onSave={mockOnSave}
                />
            );

            const cell = screen.getByRole("gridcell");
            fireEvent.click(cell);

            await waitFor(() => {
                const dropdown = screen.getByRole("combobox", { hidden: true });
                expect(dropdown).toHaveTextContent("Ja");
            });
        });

        it("dropdown shows 'Ja' option instead of 'Klart' when isChecklistItem=false", async () => {
            renderWithI18n(
                <EditableCell
                    value={false}
                    employeeId="emp-1"
                    field="some_boolean"
                    type="boolean"
                    canEdit={true}
                    isChecklistItem={false}
                    onSave={mockOnSave}
                />
            );

            const cell = screen.getByRole("gridcell");
            fireEvent.click(cell);

            const trigger = screen.getByRole("combobox", { hidden: true });
            fireEvent.click(trigger);

            await waitFor(() => {
                const jaOptions = screen.getAllByText("Ja");
                expect(jaOptions.length).toBeGreaterThan(0);
            });

            // Should NOT show 'Klart' as an option
            expect(screen.queryByText("Klart")).not.toBeInTheDocument();
        });

        it("selecting 'Ja' saves true when isChecklistItem=false", async () => {
            renderWithI18n(
                <EditableCell
                    value={false}
                    employeeId="emp-1"
                    field="some_boolean"
                    type="boolean"
                    canEdit={true}
                    isChecklistItem={false}
                    onSave={mockOnSave}
                />
            );

            const cell = screen.getByRole("gridcell");
            fireEvent.click(cell);

            const trigger = screen.getByRole("combobox", { hidden: true });
            fireEvent.click(trigger);

            await waitFor(() => {
                const jaOptions = screen.getAllByText("Ja");
                jaOptions[jaOptions.length - 1].click();
            });

            await waitFor(() => {
                expect(mockOnSave).toHaveBeenCalledWith("emp-1", "some_boolean", true);
            });
        });

        it("selecting 'Nej' saves false when isChecklistItem=false", async () => {
            renderWithI18n(
                <EditableCell
                    value={true}
                    employeeId="emp-1"
                    field="some_boolean"
                    type="boolean"
                    canEdit={true}
                    isChecklistItem={false}
                    onSave={mockOnSave}
                />
            );

            const cell = screen.getByRole("gridcell");
            fireEvent.click(cell);

            const trigger = screen.getByRole("combobox", { hidden: true });
            fireEvent.click(trigger);

            await waitFor(() => {
                const nejOptions = screen.getAllByText("Nej");
                nejOptions[nejOptions.length - 1].click();
            });

            await waitFor(() => {
                expect(mockOnSave).toHaveBeenCalledWith("emp-1", "some_boolean", false);
            });
        });
    });

    describe("No-op Edit - Does not trigger save when value unchanged", () => {
        it("entering edit mode with true and selecting 'Ja' does not call onSave when isChecklistItem=false", async () => {
            renderWithI18n(
                <EditableCell
                    value={true}
                    employeeId="emp-1"
                    field="some_boolean"
                    type="boolean"
                    canEdit={true}
                    isChecklistItem={false}
                    onSave={mockOnSave}
                />
            );

            const cell = screen.getByRole("gridcell");
            fireEvent.click(cell);

            const trigger = screen.getByRole("combobox", { hidden: true });
            fireEvent.click(trigger);

            await waitFor(() => {
                const jaOptions = screen.getAllByText("Ja");
                jaOptions[jaOptions.length - 1].click();
            });

            await waitFor(() => {
                expect(mockOnSave).not.toHaveBeenCalled();
            });
        });
    });

    describe("Read-only mode - Shows 'Ja' instead of 'Klart' when isChecklistItem=false", () => {
        it("displays 'Ja' for read-only true value when isChecklistItem=false", () => {
            renderWithI18n(
                <EditableCell
                    value={true}
                    employeeId="emp-1"
                    field="some_boolean"
                    type="boolean"
                    canEdit={false}
                    isChecklistItem={false}
                    onSave={mockOnSave}
                />
            );

            expect(screen.getByText("Ja")).toBeInTheDocument();
            expect(screen.queryByText("Klart")).not.toBeInTheDocument();
        });
    });

    describe("Comparison - isChecklistItem=true shows 'Klart', isChecklistItem=false shows 'Ja'", () => {
        it("shows 'Klart' when isChecklistItem=true (default behavior)", () => {
            renderWithI18n(
                <EditableCell
                    value={true}
                    employeeId="emp-1"
                    field="checklist_field"
                    type="boolean"
                    canEdit={true}
                    isChecklistItem={true}
                    onSave={mockOnSave}
                />
            );

            expect(screen.getByText("Klart")).toBeInTheDocument();
            expect(screen.queryByText("Ja")).not.toBeInTheDocument();
        });

        it("shows 'Ja' when isChecklistItem=false", () => {
            renderWithI18n(
                <EditableCell
                    value={true}
                    employeeId="emp-1"
                    field="non_checklist_field"
                    type="boolean"
                    canEdit={true}
                    isChecklistItem={false}
                    onSave={mockOnSave}
                />
            );

            expect(screen.getByText("Ja")).toBeInTheDocument();
            expect(screen.queryByText("Klart")).not.toBeInTheDocument();
        });
    });
});
