
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithI18n } from '@/../tests/utils/i18n-test-wrapper';
import { EmployeeTable } from "@/components/dashboard/employee-table";
import type { Employee } from "@/lib/types/employee";
import { UserRole } from "@/lib/types/user";
import * as useColumnsModule from "@/lib/hooks/use-columns";
import { employeeService } from "@/lib/services/employee-service";

// Mock services
vi.mock("@/lib/services/employee-service", () => ({
    employeeService: {
        update: vi.fn(() => Promise.resolve({})),
    },
}));

vi.mock("@/lib/services/custom-data-service", () => ({
    customDataService: {
        updateCustomData: vi.fn(() => Promise.resolve({})),
    },
}));

// Mock the auth hook
vi.mock("@/lib/hooks/use-auth", () => ({
    useAuth: vi.fn(() => ({
        user: {
            id: "user-1",
            role: UserRole.HR_ADMIN,
        },
        isAuthenticated: true,
        isLoading: false,
    })),
}));

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
    createClient: vi.fn(() => ({
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn(),
        })),
        removeChannel: vi.fn(),
    })),
}));

// Mock fetch
global.fetch = vi.fn();

// Mock useColumns
vi.mock("@/lib/hooks/use-columns", () => ({
    useColumns: vi.fn(() => ({
        columns: [
            {
                id: "ssn",
                column_name: "SSN",
                column_type: "text",
                is_masterdata: true,
                is_visible: true,
                role_permissions: { hr_admin: { view: true, edit: true } },
                db_column_name: 'ssn',
            },
            {
                id: "hire_date",
                column_name: "Hire Date",
                column_type: "date",
                is_masterdata: true,
                is_visible: true,
                role_permissions: { hr_admin: { view: true, edit: true } },
                db_column_name: 'hire_date',
            },
        ],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
    })),
}));

// Mock UI store
vi.mock("@/lib/store/ui-store", () => ({
    useUIStore: vi.fn(() => ({
        previewRole: null,
        isPreviewMode: false,
        columnVisibility: {},
        initColumnVisibility: vi.fn(),
        getVisibleColumns: vi.fn((cols) => cols),
    })),
}));

// Mock sonner
vi.mock("sonner", () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

describe("EmployeeTable SSN and Hiring Date Display", () => {
    const mockEmployee: Employee = {
        id: "1",
        first_name: "Test",
        surname: "User",
        ssn: "19900101-1234",
        email: "test@example.com",
        mobile: "0701234567",
        rank: "SEV",
        gender: 'Man',
        town_district: "Göteborg",
        hire_date: "2023-01-01",
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
        comments: null,
        one: false,
        one_marked_at: null,
        talmundo: false,
        isps: false,
        photo: false,
        origo: false,
        loneiva: null,
        mail_lon: false,
        bankuppgifter: false,
        li: false,
        passport: false,
        kvitto_c17_18: false,
        c17: false,
        crewing_done: false,
        hotel_required: false,
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-01T00:00:00Z",
        stena_date: null,
        omc_date: null,
        pe3_date: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should display SSN and Hire Date when present", () => {
        renderWithI18n(<EmployeeTable employees={[mockEmployee]} isLoading={false} />);

        expect(screen.getByText("19900101-1234")).toBeInTheDocument();
        // Story 19.3: Hire date displays in dd-MM format (e.g., "01-01" for January 1st)
        expect(screen.getByText("01-01")).toBeInTheDocument();
    });

    it("should display '-' when SSN is empty string", () => {
        const emptySSNEmployee = { ...mockEmployee, ssn: "" };
        renderWithI18n(<EmployeeTable employees={[emptySSNEmployee]} isLoading={false} />);

        const dashes = screen.getAllByText("—");
        expect(dashes.length).toBeGreaterThan(0);
    });

    it("should display '-' when Hire Date is empty string", () => {
        const emptyHireDateEmployee = { ...mockEmployee, hire_date: "" };
        renderWithI18n(<EmployeeTable employees={[emptyHireDateEmployee]} isLoading={false} />);

        const dashes = screen.getAllByText("—");
        expect(dashes.length).toBeGreaterThan(0);
    });

    it("should display SSN even if column name has trailing space", () => {
        // Mock useColumns to return "SSN " with trailing space
        (useColumnsModule.useColumns as Mock).mockReturnValue({
            columns: [
                {
                    id: "ssn",
                    column_name: "SSN ", // Trailing space
                    column_type: "text",
                    is_masterdata: true,
                    is_visible: true,
                    role_permissions: { hr_admin: { view: true, edit: true } },
                    db_column_name: 'ssn',
                    created_at: "2023-01-01",
                    updated_at: "2023-01-01",
                    category: null,
                    category_color: null,
                    display_order: 0,
                },
            ],
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        renderWithI18n(<EmployeeTable employees={[mockEmployee]} isLoading={false} />);

        // Should display SSN because mapping now handles trailing space
        expect(screen.getByText("19900101-1234")).toBeInTheDocument();
    });

    it("should display SSN and Hire Date when using Swedish column names (DB mismatch scenario)", () => {
        // Mock useColumns to return Swedish column names as found in DB
        (useColumnsModule.useColumns as Mock).mockReturnValue({
            columns: [
                {
                    id: "ssn",
                    column_name: "Social Security No.", // DB name
                    column_type: "text",
                    is_masterdata: true,
                    is_visible: true,
                    role_permissions: { hr_admin: { view: true, edit: true } },
                    db_column_name: 'social_security_no.', // DB name
                },
                {
                    id: "hire_date",
                    column_name: "Anställningsdatum", // DB name
                    column_type: "date",
                    is_masterdata: true,
                    is_visible: true,
                    role_permissions: { hr_admin: { view: true, edit: true } },
                    db_column_name: 'hire_date',
                },
            ],
            isLoading: false,
            error: null,
            refetch: vi.fn(),
        });

        renderWithI18n(<EmployeeTable employees={[mockEmployee]} isLoading={false} />);

        // Should display SSN and Hire Date because mapping handles Swedish names
        expect(screen.getByText("19900101-1234")).toBeInTheDocument();
        // Story 19.3: Hire date displays in dd-MM format (e.g., "01-01" for January 1st)
        expect(screen.getByText("01-01")).toBeInTheDocument();
    });

    it("should not trigger update on no-op edit", async () => {
        renderWithI18n(<EmployeeTable employees={[mockEmployee]} isLoading={false} />);

        // Click on SSN to edit
        const ssnCell = screen.getByText("19900101-1234");
        fireEvent.click(ssnCell);

        // Input should appear with current value
        const input = await screen.findByDisplayValue("19900101-1234");
        expect(input).toBeTruthy();

        // Press Enter without changing value
        fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

        // Check that update was NOT called
        expect(employeeService.update).not.toHaveBeenCalled();

        // Now try changing and changing back
        // Re-open edit mode
        const ssnCell2 = await screen.findByText("19900101-1234");
        fireEvent.click(ssnCell2);
        const input2 = await screen.findByDisplayValue("19900101-1234");

        // Change value
        fireEvent.change(input2, { target: { value: "19900101-12345" } });
        // Change back
        fireEvent.change(input2, { target: { value: "19900101-1234" } });

        // Save
        fireEvent.keyDown(input2, { key: "Enter", code: "Enter" });

        expect(employeeService.update).not.toHaveBeenCalled();
    });
});
