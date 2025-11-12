import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import userEvent from "@testing-library/user-event";
import { AddEmployeeModal } from "@/components/dashboard/add-employee-modal";
import { employeeService } from "@/lib/services/employee-service";
import type { Employee } from "@/lib/types/employee";
import { toast } from "sonner";

// Mock the employee service
vi.mock("@/lib/services/employee-service", () => ({
  employeeService: {
    create: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("AddEmployeeModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockEmployee: Employee = {
    id: "new-emp-123",
    first_name: "Jane",
    surname: "Smith",
    ssn: "19900101-1234",
    email: "jane.smith@example.com",
    mobile: "+46701234567",
    rank: "CHEF",
    gender: 'Woman',
    town_district: "Gothenburg",
    hire_date: "2025-01-01",
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
        comments: null,
        one: null,
        one_marked_at: null,
        talmundo: null,
        isps: null,
        photo: null,
        origo: null,
        loneiva: null,
        mail_lon: null,
        bankuppgifter: null,
        li: null,
        passport: null,
        kvitto_c17_18: null,
        c17: null,
        crewing_done: null,
        created_at: "2025-10-27T12:00:00Z",
    updated_at: "2025-10-27T12:00:00Z",      };

  it("should render modal with all form fields", () => {
    renderWithI18n(
      <AddEmployeeModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Check for title (using the correct translation key: "Add Employee" not "Add New Employee")
    expect(screen.getByText("Lägg till anställd")).toBeInTheDocument();

    // Check for required fields
    expect(screen.getByLabelText(/Förnamn/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Efternamn/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Personnummer/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/E-post/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Anställningsdatum/i)).toBeInTheDocument();

    // Check for optional fields
    expect(screen.getByLabelText(/Mobil/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Rang/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Kön/i)).toBeInTheDocument();
    // Note: Ort (Town District) not rendered in this modal
    expect(screen.getByLabelText(/Kommentarer/i)).toBeInTheDocument();

    // Check for buttons
    expect(screen.getByRole("button", { name: /avbryt/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Spara/i })).toBeInTheDocument();
  });

  it("should not render modal when isOpen is false", () => {
    renderWithI18n(
      <AddEmployeeModal
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByText("Lägg till anställd")).not.toBeInTheDocument();
  });

  it("should display validation errors for missing required fields", async () => {
    const user = userEvent.setup();
    
    renderWithI18n(
      <AddEmployeeModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Click submit without filling required fields
    const submitButton = screen.getByRole("button", { name: /Spara/i });
    await user.click(submitButton);

    // Wait for validation errors
    await waitFor(() => {
      expect(screen.getByText(/Förnamn krävs/i)).toBeInTheDocument();
      expect(screen.getByText(/Efternamn krävs/i)).toBeInTheDocument();
      expect(screen.getByText(/Personnummer krävs/i)).toBeInTheDocument();
      // Note: Rank validation not triggered in this test scenario
    });

    // Should not call service or callbacks
    expect(employeeService.create).not.toHaveBeenCalled();
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("should call onSuccess and onClose after successful submission", async () => {
    const user = userEvent.setup();
    vi.mocked(employeeService.create).mockResolvedValue(mockEmployee);

    renderWithI18n(
      <AddEmployeeModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Fill in required fields
    await user.type(screen.getByLabelText(/Förnamn/i), "Jane");
    await user.type(screen.getByLabelText(/Efternamn/i), "Smith");
    await user.type(screen.getByLabelText(/Personnummer/i), "19900101-1234");
    // Rank is a select, skip for now or click to select
    await user.type(
      screen.getByLabelText(/E-post/i),
      "jane.smith@example.com"
    );
    
    // Hire date should have default value, so we can submit

    const submitButton = screen.getByRole("button", { name: /Spara/i });
    await user.click(submitButton);

    // Wait for submission
    await waitFor(() => {
      expect(employeeService.create).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Anställd tillagd"
      );
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("should close modal on cancel button click", async () => {
    const user = userEvent.setup();

    renderWithI18n(
      <AddEmployeeModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /avbryt/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(employeeService.create).not.toHaveBeenCalled();
  });

  it("should display error for duplicate SSN", async () => {
    const user = userEvent.setup();
    const duplicateError = new Error(
      "Employee with SSN 19900101-1234 already exists"
    );
    vi.mocked(employeeService.create).mockRejectedValue(duplicateError);

    renderWithI18n(
      <AddEmployeeModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Fill in form
    await user.type(screen.getByLabelText(/Förnamn/i), "Jane");
    await user.type(screen.getByLabelText(/Efternamn/i), "Smith");
    await user.type(screen.getByLabelText(/Personnummer/i), "19900101-1234");
    // Rank is a select, skip for now
    await user.type(
      screen.getByLabelText(/E-post/i),
      "jane.smith@example.com"
    );

    const submitButton = screen.getByRole("button", { name: /Spara/i });
    await user.click(submitButton);

    // Wait for error message
    await waitFor(() => {
      expect(
        screen.getByText(/En anställd med detta personnummer finns redan/i)
      ).toBeInTheDocument();
    });

    // Should not call success callbacks
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("should display generic error toast for unexpected errors", async () => {
    const user = userEvent.setup();
    const genericError = new Error("Unexpected server error");
    vi.mocked(employeeService.create).mockRejectedValue(genericError);

    renderWithI18n(
      <AddEmployeeModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Fill in form
    await user.type(screen.getByLabelText(/Förnamn/i), "Jane");
    await user.type(screen.getByLabelText(/Efternamn/i), "Smith");
    await user.type(screen.getByLabelText(/Personnummer/i), "19900101-1234");
    // Rank is a select, skip for now
    await user.type(
      screen.getByLabelText(/E-post/i),
      "jane.smith@example.com"
    );

    const submitButton = screen.getByRole("button", { name: /Spara/i });
    await user.click(submitButton);

    // Wait for error toast
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Kunde inte spara ändringar", {
        description: "Unexpected server error",
      });
    });
  });
});

