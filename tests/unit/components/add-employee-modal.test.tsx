import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import userEvent from "@testing-library/user-event";
import { AddEmployeeModal } from "@/components/dashboard/add-employee-modal";
import { employeeService } from "@/lib/services/employee-service";
import type { Employee } from "@/lib/types/employee";
import { toast } from "sonner";
import { useImportantDates } from "@/lib/hooks/use-important-dates";
import { useAvailablePE3Dates } from "@/lib/hooks/use-available-pe3-dates";

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

// Mock the date hooks
vi.mock("@/lib/hooks/use-important-dates", () => ({
  useImportantDates: vi.fn(),
}));

vi.mock("@/lib/hooks/use-available-pe3-dates", () => ({
  useAvailablePE3Dates: vi.fn(),
}));

describe("AddEmployeeModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default mock return values for hooks
    // useImportantDates is called twice (Stena and ÖMC), so we use mockReturnValue
    // which will return the same value for all calls
    vi.mocked(useImportantDates)
      .mockReturnValue({ dates: [], isLoading: false });
    
    vi.mocked(useAvailablePE3Dates).mockReturnValue({
      availableDates: [],
      totalAvailable: 0,
      isLoading: false,
    });
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

    // Wait for validation errors (use getAllByText since errors appear in multiple places)
    await waitFor(() => {
      expect(screen.getAllByText(/Förnamn krävs/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Efternamn krävs/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Personnummer krävs/i).length).toBeGreaterThan(0);
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

    // Wait for error message (use getAllByText since error appears in multiple places)
    await waitFor(() => {
      expect(
        screen.getAllByText(/En anställd med detta personnummer finns redan/i).length
      ).toBeGreaterThan(0);
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

  describe("Date Dropdown Remaining Spots Display", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Note: Don't set up default mocks here - each test will set up its own mocks
    });

    it("should display remaining spots in parentheses for Stena dates in dropdown", async () => {
      // Use a fixed future date to avoid being filtered out
      // The component filters with: new Date(d.date_value) >= new Date()
      // This compares midnight UTC to current time, so we need a date definitely in the future
      // Format: YYYY-MM-DD (ISO date string)
      // Use a fixed date far in the future to ensure it's always valid
      const futureDateStr = "2026-12-31"; // Far in the future
      const mockStenaDates = [
        {
          id: "stena-1",
          week_number: 10,
          year: 2026,
          category: "Stena Dates",
          date_description: "Fredag 7/3",
          date_value: futureDateStr, // Format as YYYY-MM-DD
          notes: null,
          time_value: null,
          deadline_submit: null,
          deadline_cancel: null,
          is_active: true,
          remaining_spots: 5,
          max_spots: 99,
          assigned_employees: [],
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      // Set up mocks BEFORE rendering
      // The component calls useImportantDates twice with different category parameters
      // Mock based on the category parameter
      vi.mocked(useImportantDates).mockImplementation((category: string) => {
        if (category === 'Stena Dates') {
          return { dates: mockStenaDates, isLoading: false };
        }
        return { dates: [], isLoading: false }; // ÖMC Dates or any other category
      });

      vi.mocked(useAvailablePE3Dates).mockReturnValue({
        availableDates: [],
        totalAvailable: 0,
        isLoading: false,
      });

      const user = userEvent.setup();

      renderWithI18n(
        <AddEmployeeModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Wait for the component to render and hooks to be called
      await waitFor(() => {
        expect(screen.getByLabelText(/Stena.*datum/i)).toBeInTheDocument();
      });

      // Open Stena date dropdown
      const stenaDateSelect = screen.getByLabelText(/Stena.*datum/i);
      await user.click(stenaDateSelect);

      // Wait for dropdown to open - check for SelectContent
      await waitFor(() => {
        const selectContent = document.querySelector('[role="listbox"]');
        expect(selectContent).toBeInTheDocument();
      }, { timeout: 3000 });

      // Wait for options to appear - filter out "(None)" and "No available dates" options
      // The component filters dates with: new Date(d.date_value) >= new Date()
      // So we need to ensure our date is definitely in the future
      await waitFor(() => {
        const allOptions = screen.queryAllByRole("option");
        const dateOptions = allOptions.filter(opt => {
          const text = opt.textContent || '';
          return !text.includes("(None)") && 
                 !text.includes("No available dates") &&
                 text.includes("(5)"); // Our test date has 5 remaining spots
        });
        expect(dateOptions.length).toBeGreaterThan(0);
      }, { timeout: 5000 });

      // Verify the date option contains remaining spots in parentheses
      // Note: formatImportantDateOption adds "Week X - " prefix, so we check for the formatted text
      const allOptions = screen.getAllByRole("option");
      const dateOption = allOptions.find(opt => {
        const text = opt.textContent || '';
        return (
          (text.includes("Fredag 7/3") || text.includes("Week 10")) &&
          text.includes("(5)")
        );
      });

      expect(dateOption).toBeDefined();
      expect(dateOption).toBeInTheDocument();
      expect(dateOption).toHaveTextContent("(5)");
    });

    it("should display remaining spots in parentheses for ÖMC dates in dropdown", async () => {
      // Use a future date to avoid being filtered out
      // The component filters with: new Date(d.date_value) >= new Date()
      // This compares midnight UTC to current time, so we need a date definitely in the future
      // Format: YYYY-MM-DD (ISO date string)
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 30); // 30 days in the future to be safe
      const year = futureDate.getFullYear();
      const month = String(futureDate.getMonth() + 1).padStart(2, '0');
      const day = String(futureDate.getDate()).padStart(2, '0');
      const futureDateStr = `${year}-${month}-${day}`;
      const mockOmcDates = [
        {
          id: "omc-1",
          week_number: 11,
          year: 2025,
          category: "ÖMC Dates",
          date_description: "Måndag 10/3",
          date_value: futureDateStr, // Format as YYYY-MM-DD
          notes: null,
          time_value: null,
          deadline_submit: null,
          deadline_cancel: null,
          is_active: true,
          remaining_spots: 3,
          max_spots: 20,
          assigned_employees: [],
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      // Set up mocks BEFORE rendering
      // The component calls useImportantDates twice with different category parameters
      // Mock based on the category parameter
      vi.mocked(useImportantDates).mockImplementation((category: string) => {
        if (category === 'ÖMC Dates') {
          return { dates: mockOmcDates, isLoading: false };
        }
        return { dates: [], isLoading: false }; // Stena Dates or any other category
      });

      vi.mocked(useAvailablePE3Dates).mockReturnValue({
        availableDates: [],
        totalAvailable: 0,
        isLoading: false,
      });

      const user = userEvent.setup();

      renderWithI18n(
        <AddEmployeeModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Wait for the component to render and hooks to be called
      await waitFor(() => {
        expect(screen.getByLabelText(/ÖMC.*datum/i)).toBeInTheDocument();
      });

      // Open ÖMC date dropdown
      const omcDateSelect = screen.getByLabelText(/ÖMC.*datum/i);
      await user.click(omcDateSelect);

      // Wait for dropdown to open - check for SelectContent
      await waitFor(() => {
        const selectContent = document.querySelector('[role="listbox"]');
        expect(selectContent).toBeInTheDocument();
      }, { timeout: 3000 });

      // Wait for options to appear
      await waitFor(() => {
        const options = screen.getAllByRole("option");
        expect(options.length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      // Verify the date option contains remaining spots in parentheses
      // Note: formatImportantDateOption formats ÖMC dates differently, so we check for the formatted text
      const dateOption = screen.getByText(
        (content, element) => {
          const text = element?.textContent || '';
          return (
            (text.includes("Måndag 10/3") || text.includes("Week 11") || text.includes("mars")) &&
            text.includes("(3)")
          );
        },
        { selector: "[role='option']" }
      );

      expect(dateOption).toBeInTheDocument();
      expect(dateOption).toHaveTextContent("(3)");
    });

    it("should display remaining spots in parentheses for PE3 dates in dropdown", async () => {
      // Use a future date to avoid being filtered out
      // The component filters with: new Date(d.date_value) >= new Date()
      // This compares midnight UTC to current time, so we need a date definitely in the future
      // Format: YYYY-MM-DD (ISO date string)
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 30); // 30 days in the future to be safe
      const year = futureDate.getFullYear();
      const month = String(futureDate.getMonth() + 1).padStart(2, '0');
      const day = String(futureDate.getDate()).padStart(2, '0');
      const futureDateStr = `${year}-${month}-${day}`;
      const mockPE3Dates = [
        {
          id: "pe3-1",
          week_number: 12,
          year: 2025,
          category: "PE3 Dates",
          date_description: "Torsdag 13/3",
          date_value: futureDateStr, // Format as YYYY-MM-DD
          notes: null,
          time_value: "14:30",
          deadline_submit: null,
          deadline_cancel: null,
          is_active: true,
          remaining_spots: 1,
          max_spots: 1,
          assigned_employees: [],
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      vi.mocked(useImportantDates)
        .mockReturnValueOnce({ dates: [], isLoading: false }) // Stena dates
        .mockReturnValueOnce({ dates: [], isLoading: false }); // ÖMC dates

      vi.mocked(useAvailablePE3Dates).mockReturnValue({
        availableDates: mockPE3Dates,
        totalAvailable: 1,
        isLoading: false,
      });

      const user = userEvent.setup();

      renderWithI18n(
        <AddEmployeeModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Open PE3 date dropdown
      const pe3DateSelect = screen.getByLabelText(/PE3.*datum/i);
      await user.click(pe3DateSelect);

      // Wait for dropdown options to appear
      await waitFor(() => {
        const options = screen.getAllByRole("option");
        expect(options.length).toBeGreaterThan(0);
      });

      // Verify the date option contains remaining spots in parentheses
      // Note: formatImportantDateOption formats PE3 dates as "Week X - day/month time" (e.g., "Week 12 - 15/3 14:30")
      const dateOption = screen.getByText(
        (content, element) => {
          const text = element?.textContent || '';
          // PE3 dates are formatted as "day/month time" or might include the original description
          return (
            (text.includes("Torsdag 13/3") || text.includes("Week 12") || text.includes("14:30") || text.includes("13/3")) &&
            text.includes("(1)")
          );
        },
        { selector: "[role='option']" }
      );

      expect(dateOption).toBeInTheDocument();
      expect(dateOption).toHaveTextContent("(1)");
    });
  });
});

