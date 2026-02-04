import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import userEvent from "@testing-library/user-event";
import { AddEmployeeModal } from "@/components/dashboard/add-employee-modal";
import { createEmployeeSchema } from "@/lib/validation/employee-schema";
import { employeeService } from "@/lib/services/employee-service";
import { useImportantDates } from "@/lib/hooks/use-important-dates";
import { useAvailablePE3Dates } from "@/lib/hooks/use-available-pe3-dates";

// Mock services and hooks
vi.mock("@/lib/services/employee-service", () => ({
  employeeService: {
    create: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/hooks/use-important-dates", () => ({
  useImportantDates: vi.fn(),
}));

vi.mock("@/lib/hooks/use-available-pe3-dates", () => ({
  useAvailablePE3Dates: vi.fn(),
}));

describe("Story 8.17: Dietary Requirements Logic", () => {
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

  describe("Validation Schema", () => {
    it("should fail validation if special_diet is true but diet_details is empty", () => {
      const invalidData = {
        first_name: "Test",
        surname: "User",
        ssn: "19900101-1234",
        rank: "SEV" as const,
        gender: "Man" as const,
        hire_date: "2025-01-01",
        // Story 8.17 fields
        special_diet: true,
        diet_details: "", // Empty - this should trigger the error
        // Required boolean fields
        one: false,
        talmundo: false,
        isps: false,
        photo: false,
        origo: false,
        mail_lon: false,
        bankuppgifter: false,
        li: false,
        passport: false,
        kvitto_c17_18: false,
        c17: false,
        crewing_done: false,
        hotel_required: false,
        // Optional fields - must be provided as null/default to satisfy base schema
        email: null,
        mobile: null,
        town_district: null,
        stena_date: null,
        omc_date: null,
        pe3_date: null,
        comments: null,
        is_terminated: false,
        is_archived: false,
        termination_date: null,
        termination_reason: null,
        loneiva: null,
        room_number_shared: null,
        one_marked_at: null,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
        omc_masterdata_reminder_sent_at: null,
      };

      const result = createEmployeeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const dietError = result.error.errors.find(e => e.path.includes("diet_details"));
        expect(dietError).toBeDefined();
        // The constant schema uses hardcoded English message
        expect(dietError?.message).toBe("Diet details are required when special diet is selected");
      }
    });

    it("should pass validation if special_diet is true and diet_details is provided", () => {
      const validData = {
        first_name: "Test",
        surname: "User",
        ssn: "19900101-1234",
        rank: "SEV" as const,
        gender: "Man" as const,
        hire_date: "2025-01-01",
        // Story 8.17 fields
        special_diet: true,
        diet_details: "Gluten free",
        // Required boolean fields
        one: false,
        talmundo: false,
        isps: false,
        photo: false,
        origo: false,
        mail_lon: false,
        bankuppgifter: false,
        li: false,
        passport: false,
        kvitto_c17_18: false,
        c17: false,
        crewing_done: false,
        hotel_required: false,
        // Optional fields
        email: null,
        mobile: null,
        town_district: null,
        stena_date: null,
        omc_date: null,
        pe3_date: null,
        comments: null,
        is_terminated: false,
        is_archived: false,
        termination_date: null,
        termination_reason: null,
        loneiva: null,
        room_number_shared: null,
        one_marked_at: null,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
        omc_masterdata_reminder_sent_at: null,
      };

      const result = createEmployeeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should pass validation if special_diet is false (diet_details optional)", () => {
      const validData = {
        first_name: "Test",
        surname: "User",
        ssn: "19900101-1234",
        rank: "SEV" as const,
        gender: "Man" as const,
        hire_date: "2025-01-01",
        // Story 8.17 fields
        special_diet: false,
        diet_details: null, // Can be null or empty
        // Required boolean fields
        one: false,
        talmundo: false,
        isps: false,
        photo: false,
        origo: false,
        mail_lon: false,
        bankuppgifter: false,
        li: false,
        passport: false,
        kvitto_c17_18: false,
        c17: false,
        crewing_done: false,
        hotel_required: false,
        // Optional fields
        email: null,
        mobile: null,
        town_district: null,
        stena_date: null,
        omc_date: null,
        pe3_date: null,
        comments: null,
        is_terminated: false,
        is_archived: false,
        termination_date: null,
        termination_reason: null,
        loneiva: null,
        room_number_shared: null,
        one_marked_at: null,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
        omc_masterdata_reminder_sent_at: null,
      };

      const result = createEmployeeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("UI Conditional Rendering (AddEmployeeModal)", () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
      
      vi.mocked(useImportantDates).mockReturnValue({ dates: [], isLoading: false });
      vi.mocked(useAvailablePE3Dates).mockReturnValue({
        availableDates: [],
        totalAvailable: 0,
        isLoading: false,
      });
    });

    it("should initially hide diet details field when special diet is unchecked", () => {
      renderWithQueryClient(
        <AddEmployeeModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Checkbox should be present and unchecked
      const specialDietCheckbox = screen.getByRole("checkbox", { name: /Specialkost/i });
      expect(specialDietCheckbox).toBeInTheDocument();
      expect(specialDietCheckbox).not.toBeChecked();

      // Diet details text area should NOT be present
      expect(screen.queryByPlaceholderText(/Beskriv kostbehoven/i)).not.toBeInTheDocument();
    });

    it("should show diet details field when special diet is checked", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <AddEmployeeModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Click special diet checkbox
      const specialDietCheckbox = screen.getByRole("checkbox", { name: /Specialkost/i });
      await user.click(specialDietCheckbox);

      // Check that Diet details field appears
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Beskriv kostbehoven/i)).toBeInTheDocument();
      });
    });

    it("should validate mandatory diet details when special diet is checked", async () => {
      const user = userEvent.setup();
      renderWithQueryClient(
        <AddEmployeeModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      // Fill in other required fields to isolate diet validation
      await user.type(screen.getByLabelText(/Förnamn/i), "Test");
      await user.type(screen.getByLabelText(/Efternamn/i), "User");
      await user.type(screen.getByLabelText(/Personnummer/i), "19900101-1234");
      
      // Select gender (required field)
      const genderSelect = screen.getByRole("combobox", { name: /Kön/i });
      await user.click(genderSelect);
      await user.click(screen.getByRole("option", { name: /Man/i }));

      // Check special diet
      const specialDietCheckbox = screen.getByRole("checkbox", { name: /Specialkost/i });
      await user.click(specialDietCheckbox);

      // Try to submit without filling diet details
      const submitButton = screen.getByRole("button", { name: /Spara/i });
      await user.click(submitButton);

      // Should see validation error with SWEDISH message
      // Use getAllByText because errors are announced to screen readers (duplicates)
      await waitFor(() => {
        expect(screen.getAllByText(/Dietdetaljer krävs när specialkost har valts/i).length).toBeGreaterThan(0);
      });
      
      // Ensure create was not called
      expect(employeeService.create).not.toHaveBeenCalled();
    }, 15000);
  });
});
