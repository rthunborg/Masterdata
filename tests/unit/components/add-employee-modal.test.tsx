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
    gender: "Female",
    town_district: "Gothenburg",
    hire_date: "2025-01-01",
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    comments: "New employee",
    created_at: "2025-10-27T12:00:00Z",
    updated_at: "2025-10-27T12:00:00Z",
  };

  it("should render modal with all form fields", () => {
    renderWithI18n(
      <AddEmployeeModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // Check for title (using the correct translation key: "Add Employee" not "Add New Employee")
    expect(screen.getByText("Add Employee")).toBeInTheDocument();

    // Check for required fields
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Surname/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/SSN/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hire Date/i)).toBeInTheDocument();

    // Check for optional fields
    expect(screen.getByLabelText(/Mobile/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Rank/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Gender/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Town District/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Comments/i)).toBeInTheDocument();

    // Check for buttons
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save/i })).toBeInTheDocument();
  });

  it("should not render modal when isOpen is false", () => {
    renderWithI18n(
      <AddEmployeeModal
        isOpen={false}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByText("Add Employee")).not.toBeInTheDocument();
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
    const submitButton = screen.getByRole("button", { name: /Save/i });
    await user.click(submitButton);

    // Wait for validation errors
    await waitFor(() => {
      expect(screen.getByText(/First name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Surname is required/i)).toBeInTheDocument();
      expect(screen.getByText(/SSN is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
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
    await user.type(screen.getByLabelText(/First Name/i), "Jane");
    await user.type(screen.getByLabelText(/Surname/i), "Smith");
    await user.type(screen.getByLabelText(/SSN/i), "19900101-1234");
    await user.type(
      screen.getByLabelText(/Email/i),
      "jane.smith@example.com"
    );
    
    // Hire date should have default value, so we can submit

    const submitButton = screen.getByRole("button", { name: /Save/i });
    await user.click(submitButton);

    // Wait for submission
    await waitFor(() => {
      expect(employeeService.create).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Employee added successfully"
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

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
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
    await user.type(screen.getByLabelText(/First Name/i), "Jane");
    await user.type(screen.getByLabelText(/Surname/i), "Smith");
    await user.type(screen.getByLabelText(/SSN/i), "19900101-1234");
    await user.type(
      screen.getByLabelText(/Email/i),
      "jane.smith@example.com"
    );

    const submitButton = screen.getByRole("button", { name: /Save/i });
    await user.click(submitButton);

    // Wait for error message
    await waitFor(() => {
      expect(
        screen.getByText(/An employee with this SSN already exists/i)
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
    await user.type(screen.getByLabelText(/First Name/i), "Jane");
    await user.type(screen.getByLabelText(/Surname/i), "Smith");
    await user.type(screen.getByLabelText(/SSN/i), "19900101-1234");
    await user.type(
      screen.getByLabelText(/Email/i),
      "jane.smith@example.com"
    );

    const submitButton = screen.getByRole("button", { name: /Save/i });
    await user.click(submitButton);

    // Wait for error toast
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to save changes", {
        description: "Unexpected server error",
      });
    });
  });
});

