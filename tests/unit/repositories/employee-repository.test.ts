import { describe, it, expect, beforeEach, vi } from "vitest";
import { EmployeeRepository } from "@/lib/server/repositories/employee-repository";
import type { Employee, EmployeeFormData } from "@/lib/types/employee";
import * as supabaseServer from "@/lib/supabase/server";

// Mock the Supabase client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock termination workflow helpers (Story 8.13/8.14)
vi.mock("@/lib/services/termination-workflow", () => ({
  captureRepaymentDates: vi.fn().mockResolvedValue({ omc: null, pe3: null }),
  applyRepaymentCapture: vi.fn().mockResolvedValue(undefined),
  clearEmployeeDatesAndReleaseSpots: vi.fn().mockResolvedValue({ clearedDates: [], releasedSpots: 0 }),
  restoreRepaymentDates: vi.fn().mockResolvedValue({ restored: { omc: false, pe3: false }, warnings: [] }),
}));

describe("EmployeeRepository", () => {
  let repository: EmployeeRepository;

  beforeEach(() => {
    repository = new EmployeeRepository();
    vi.clearAllMocks();
  });

  const createMockSupabaseClient = (resolvedData: { data: Employee[] | null; error: unknown | null }) => {
    // Create a chainable mock that always returns itself except for the final await
    const chainMock = {
      from: vi.fn(),
      select: vi.fn(),
      eq: vi.fn(),
      or: vi.fn(),
      order: vi.fn(),
      single: vi.fn(),
      then: vi.fn(),  // Make it thenable for await
      catch: vi.fn(),
    };

    // All methods return the mock itself for chaining
    chainMock.from.mockReturnValue(chainMock);
    chainMock.select.mockReturnValue(chainMock);
    chainMock.eq.mockReturnValue(chainMock);
    chainMock.or.mockReturnValue(chainMock);
    chainMock.order.mockReturnValue(chainMock);

    // When awaited, return the resolved data
    chainMock.then.mockImplementation((onFulfilled) => {
      return Promise.resolve(resolvedData).then(onFulfilled);
    });

    // The supabase client itself needs to be a separate object that returns the chain
    const mockSupabaseClient = {
      from: vi.fn().mockReturnValue(chainMock),
    };

    vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabaseClient as never);

    return { mockSupabaseClient, chainMock };
  };

  describe("findAll", () => {
    it("should return all active employees by default", async () => {
      const mockEmployees: Employee[] = [
        {
          id: "1",
          first_name: "John",
          surname: "Doe",
          ssn: "123456-7890",
          email: "john@example.com",
          mobile: "+46701234567",
          rank: "SEV",
          gender: 'Man',
          town_district: "Göteborg",
          hire_date: "2025-01-15",
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
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      ];

      createMockSupabaseClient({ data: mockEmployees, error: null });

      const result = await repository.findAll();

      expect(result).toEqual(mockEmployees);
      expect(result.length).toBe(1);
      expect(result[0].first_name).toBe("John");
    });

    it("should return empty array when no employees exist", async () => {
      createMockSupabaseClient({ data: [], error: null });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it("should return empty array on database error", async () => {
      createMockSupabaseClient({ data: null, error: { message: "Database error" } });

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it("should filter to show only archived employees when includeArchived is true", async () => {
      const mockArchivedEmployees: Employee[] = [
        {
          id: "1",
          first_name: "Archived",
          surname: "Employee",
          ssn: "123456-7890",
          email: "archived@example.com",
          mobile: "+46701234567",
          rank: "SEV",
          gender: 'Man',
          town_district: "Göteborg",
          hire_date: "2025-01-15",
          stena_date: null,
          omc_date: null,
          pe3_date: null,
          termination_date: null,
          termination_reason: null,
          is_terminated: false,
          is_archived: true,
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
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { chainMock } = createMockSupabaseClient({ data: mockArchivedEmployees, error: null });

      const result = await repository.findAll({ includeArchived: true });

      expect(result).toEqual(mockArchivedEmployees);
      expect(result.length).toBe(1);
      expect(result[0].is_archived).toBe(true);
      expect(chainMock.eq).toHaveBeenCalledWith("is_archived", true);
    });

    it("should filter to show only non-archived employees when includeArchived is false", async () => {
      const mockActiveEmployees: Employee[] = [
        {
          id: "1",
          first_name: "Active",
          surname: "Employee",
          ssn: "123456-7890",
          email: "active@example.com",
          mobile: "+46701234567",
          rank: "SEV",
          gender: 'Man',
          town_district: "Göteborg",
          hire_date: "2025-01-15",
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
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { chainMock } = createMockSupabaseClient({ data: mockActiveEmployees, error: null });

      const result = await repository.findAll({ includeArchived: false });

      expect(result).toEqual(mockActiveEmployees);
      expect(result.length).toBe(1);
      expect(result[0].is_archived).toBe(false);
      expect(chainMock.eq).toHaveBeenCalledWith("is_archived", false);
    });

    it("should filter to show only terminated employees when includeTerminated is true", async () => {
      const mockTerminatedEmployees: Employee[] = [
        {
          id: "1",
          first_name: "Terminated",
          surname: "Employee",
          ssn: "123456-7890",
          email: "terminated@example.com",
          mobile: "+46701234567",
          rank: "SEV",
          gender: 'Man',
          town_district: "Göteborg",
          hire_date: "2025-01-15",
          stena_date: null,
          omc_date: null,
          pe3_date: null,
          termination_date: "2025-10-26",
          termination_reason: "Resigned",
          is_terminated: true,
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
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { chainMock } = createMockSupabaseClient({ data: mockTerminatedEmployees, error: null });

      const result = await repository.findAll({ includeTerminated: true });

      expect(result).toEqual(mockTerminatedEmployees);
      expect(result.length).toBe(1);
      expect(result[0].is_terminated).toBe(true);
      expect(chainMock.eq).toHaveBeenCalledWith("is_terminated", true);
    });

    it("should filter to show only non-terminated employees when includeTerminated is false", async () => {
      const mockActiveEmployees: Employee[] = [
        {
          id: "1",
          first_name: "Active",
          surname: "Employee",
          ssn: "123456-7890",
          email: "active@example.com",
          mobile: "+46701234567",
          rank: "SEV",
          gender: 'Man',
          town_district: "Göteborg",
          hire_date: "2025-01-15",
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
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { chainMock } = createMockSupabaseClient({ data: mockActiveEmployees, error: null });

      const result = await repository.findAll({ includeTerminated: false });

      expect(result).toEqual(mockActiveEmployees);
      expect(result.length).toBe(1);
      expect(result[0].is_terminated).toBe(false);
      expect(chainMock.eq).toHaveBeenCalledWith("is_terminated", false);
    });

    it("should filter to show only employees needing repayment when needsRepayment is true", async () => {
      const mockRepaymentEmployees: Employee[] = [
        {
          id: "1",
          first_name: "Repayment",
          surname: "Employee",
          ssn: "123456-7890",
          email: "repayment@example.com",
          mobile: "+46701234567",
          rank: "SEV",
          gender: 'Man',
          town_district: "Göteborg",
          hire_date: "2025-01-15",
          stena_date: null,
          omc_date: null,
          pe3_date: null,
          termination_date: "2025-10-26",
          termination_reason: "Resigned",
          is_terminated: true,
          is_archived: false,
          repayment_needed_omc: true,
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
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { chainMock } = createMockSupabaseClient({ data: mockRepaymentEmployees, error: null });

      const result = await repository.findAll({ needsRepayment: true });

      expect(result).toEqual(mockRepaymentEmployees);
      expect(result.length).toBe(1);
      expect(result[0].repayment_needed_omc).toBe(true);
      expect(chainMock.or).toHaveBeenCalledWith("repayment_needed_omc.eq.true,repayment_needed_pe3.eq.true");
    });

    it("should apply multiple filters correctly", async () => {
      const mockFilteredEmployees: Employee[] = [
        {
          id: "1",
          first_name: "Filtered",
          surname: "Employee",
          ssn: "123456-7890",
          email: "filtered@example.com",
          mobile: "+46701234567",
          rank: "SEV",
          gender: 'Man',
          town_district: "Göteborg",
          hire_date: "2025-01-15",
          stena_date: null,
          omc_date: null,
          pe3_date: null,
          termination_date: "2025-10-26",
          termination_reason: "Resigned",
          is_terminated: true,
          is_archived: false,
          repayment_needed_omc: true,
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
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      const { chainMock } = createMockSupabaseClient({ data: mockFilteredEmployees, error: null });

      const result = await repository.findAll({ 
        includeTerminated: true,
        needsRepayment: true 
      });

      expect(result).toEqual(mockFilteredEmployees);
      expect(chainMock.eq).toHaveBeenCalledWith("is_terminated", true);
      expect(chainMock.or).toHaveBeenCalledWith("repayment_needed_omc.eq.true,repayment_needed_pe3.eq.true");
    });
  });

  describe("findById", () => {
    it("should return employee by id", async () => {
      const mockEmployee: Employee = {
        id: "1",
        first_name: "John",
        surname: "Doe",
        ssn: "123456-7890",
        email: "john@example.com",
        mobile: null,
        rank: 'SEV',
        gender: null,
        town_district: null,
        hire_date: "2025-01-15",
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
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",      };

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockEmployee, error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.findById("1");

      expect(result).toEqual(mockEmployee);
      expect(mockClient.from).toHaveBeenCalledWith("employees");
      expect(mockClient.eq).toHaveBeenCalledWith("id", "1");
    });

    it("should return null when employee not found", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.findById("999");

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    const mockEmployeeFormData: EmployeeFormData = {
      first_name: "Jane",
      surname: "Smith",
      ssn: "19900101-1234",
      email: "jane.smith@example.com",
      mobile: "+46701234567",
      rank: "CHEF",
      gender: 'Woman',
      town_district: "Göteborg",
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
      comments: "New employee",
    };

    const mockCreatedEmployee: Employee = {
      id: "new-uuid-123",
      ...mockEmployeeFormData,
      created_at: "2025-10-27T12:00:00Z",
      updated_at: "2025-10-27T12:00:00Z",      };

    it("should successfully create an employee", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockCreatedEmployee, error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.create(mockEmployeeFormData);

      expect(result).toEqual(mockCreatedEmployee);
      expect(mockClient.from).toHaveBeenCalledWith("employees");
      expect(mockClient.insert).toHaveBeenCalledWith([mockEmployeeFormData]);
      expect(mockClient.select).toHaveBeenCalled();
      expect(mockClient.single).toHaveBeenCalled();
    });

    it("should throw error for duplicate SSN", async () => {
      const duplicateError = {
        code: "23505",
        message: "duplicate key value violates unique constraint employees_ssn_key",
      };

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: duplicateError }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(repository.create(mockEmployeeFormData)).rejects.toThrow(
        `Employee with SSN ${mockEmployeeFormData.ssn} already exists`
      );
    });

    it("should throw generic error for other database errors", async () => {
      const genericError = {
        code: "50000",
        message: "Unknown database error",
      };

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: genericError }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(repository.create(mockEmployeeFormData)).rejects.toThrow(
        "Failed to create employee"
      );
    });

    it("should throw error when no data is returned", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(repository.create(mockEmployeeFormData)).rejects.toThrow(
        "Failed to create employee: No data returned"
      );
    });
  });

  describe("update", () => {
    const mockEmployee: Employee = {
      id: "employee-123",
      first_name: "John",
      surname: "Doe",
      ssn: "19850315-1234",
      email: "john.doe@example.com",
      mobile: "+46701234567",
      rank: "CHEF",
      gender: 'Man',
      town_district: "Göteborg",
      hire_date: "2025-01-15",
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
        created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",      };

    const mockUpdatedEmployee: Employee = {
      ...mockEmployee,
      email: "updated@example.com",
      updated_at: "2025-10-27T15:30:00Z",      };

    it("should successfully update an employee", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUpdatedEmployee, error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.update("employee-123", { email: "updated@example.com" });

      expect(result).toEqual(mockUpdatedEmployee);
      expect(mockClient.from).toHaveBeenCalledWith("employees");
      expect(mockClient.update).toHaveBeenCalledWith({ email: "updated@example.com" });
      expect(mockClient.eq).toHaveBeenCalledWith("id", "employee-123");
      expect(mockClient.select).toHaveBeenCalled();
      expect(mockClient.single).toHaveBeenCalled();
    });

    it("should throw error when no fields provided", async () => {
      await expect(repository.update("employee-123", {})).rejects.toThrow(
        "At least one field must be provided for update"
      );
    });

    it("should throw error when employee not found", async () => {
      const notFoundError = {
        code: "PGRST116",
        message: "No rows found",
      };

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: notFoundError }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(repository.update("nonexistent-id", { email: "test@example.com" })).rejects.toThrow(
        "Employee with ID nonexistent-id not found"
      );
    });

    it("should throw error for duplicate SSN", async () => {
      const duplicateError = {
        code: "23505",
        message: 'duplicate key value violates unique constraint "employees_ssn_key"',
      };

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: duplicateError }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(repository.update("employee-123", { ssn: "19900101-1234" })).rejects.toThrow(
        "Employee with SSN 19900101-1234 already exists"
      );
    });

    it("should throw generic error for other database errors", async () => {
      const genericError = {
        code: "50000",
        message: "Unknown database error",
      };

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: genericError }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(repository.update("employee-123", { email: "test@example.com" })).rejects.toThrow(
        "Failed to update employee"
      );
    });

    it("should throw error when no data is returned without error", async () => {
      const mockClient = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(repository.update("employee-123", { email: "test@example.com" })).rejects.toThrow(
        "Employee with ID employee-123 not found"
      );
    });

    it("should update multiple fields simultaneously", async () => {
      const updateData = {
        email: "new@example.com",
        mobile: "+46709876543",
        rank: "SEV" as const,
      };

      const mockUpdated = {
        ...mockEmployee,
        ...updateData,
        updated_at: "2025-10-27T15:30:00Z",      };

      const mockClient = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUpdated, error: null }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.update("employee-123", updateData);

      expect(result.email).toBe("new@example.com");
      expect(result.mobile).toBe("+46709876543");
      expect(result.rank).toBe("SEV");
    });
  });

  describe("archive", () => {
    it("should archive employee successfully", async () => {
      const mockEmployee: Employee = {
        id: "employee-123",
        first_name: "John",
        surname: "Doe",
        ssn: "123456-7890",
        email: "john@example.com",
        mobile: "+46701234567",
        rank: "SEV",
        gender: 'Man',
        town_district: "Göteborg",
        hire_date: "2025-01-15",
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: true,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
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
        comments: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-27T00:00:00Z",      };

      const mockClient = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockEmployee, error: null }),
              }),
            }),
          }),
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.archive("employee-123");

      expect(result.is_archived).toBe(true);
      expect(result.id).toBe("employee-123");
    });

    it("should throw error when employee not found", async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: "PGRST116", message: "No rows found" },
                }),
              }),
            }),
          }),
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(repository.archive("nonexistent-id")).rejects.toThrow("not found");
    });

    it("should throw error on database error", async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: "XX000", message: "Database error" },
                }),
              }),
            }),
          }),
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(repository.archive("employee-123")).rejects.toThrow("Failed to archive employee");
    });
  });

  describe("unarchive", () => {
    it("should unarchive employee successfully", async () => {
      const mockEmployee: Employee = {
        id: "employee-123",
        first_name: "John",
        surname: "Doe",
        ssn: "123456-7890",
        email: "john@example.com",
        mobile: "+46701234567",
        rank: "SEV",
        gender: 'Man',
        town_district: "Göteborg",
        hire_date: "2025-01-15",
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
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-27T00:00:00Z",      };

      const mockClient = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockEmployee, error: null }),
              }),
            }),
          }),
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.unarchive("employee-123");

      expect(result.is_archived).toBe(false);
      expect(result.id).toBe("employee-123");
    });

    it("should throw error when employee not found", async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: "PGRST116", message: "No rows found" },
                }),
              }),
            }),
          }),
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(repository.unarchive("nonexistent-id")).rejects.toThrow("not found");
    });

    it("should throw error on database error", async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: "XX000", message: "Database error" },
                }),
              }),
            }),
          }),
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(repository.unarchive("employee-123")).rejects.toThrow("Failed to unarchive employee");
    });
  });

  describe("terminate", () => {
    it("should terminate employee successfully", async () => {
      const mockEmployee: Employee = {
        id: "employee-123",
        first_name: "John",
        surname: "Doe",
        ssn: "123456-7890",
        email: "john@example.com",
        mobile: "+46701234567",
        rank: "SEV",
        gender: 'Man',
        town_district: "Göteborg",
        hire_date: "2025-01-15",
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    termination_date: "2025-10-26",
        termination_reason: "Voluntary resignation",
        is_terminated: true,
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
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-10-27T00:00:00Z",      };

      const mockClient = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockEmployee, error: null }),
              }),
            }),
          }),
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.terminate("employee-123", "2025-10-26", "Voluntary resignation");

      expect(result.employee.is_terminated).toBe(true);
      expect(result.employee.termination_date).toBe("2025-10-26");
      expect(result.employee.termination_reason).toBe("Voluntary resignation");
      expect(result.employee.id).toBe("employee-123");
    });

    it("should throw error when employee not found", async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: "PGRST116", message: "No rows found" },
                }),
              }),
            }),
          }),
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(
        repository.terminate("nonexistent-id", "2025-10-26", "Test reason")
      ).rejects.toThrow("not found");
    });

    it("should throw error on database error", async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: "XX000", message: "Database error" },
                }),
              }),
            }),
          }),
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(
        repository.terminate("employee-123", "2025-10-26", "Test reason")
      ).rejects.toThrow("Failed to terminate employee");
    });

    it("should throw error when no data is returned without error", async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(
        repository.terminate("employee-123", "2025-10-26", "Test reason")
      ).rejects.toThrow("Employee with ID employee-123 not found");
    });
  });

  describe("reactivate", () => {
    it("should reactivate employee successfully", async () => {
      const mockEmployee: Employee = {
        id: "employee-123",
        first_name: "John",
        surname: "Doe",
        ssn: "123456-7890",
        email: "john@example.com",
        mobile: "+46701234567",
        rank: "SEV",
        gender: 'Man',
        town_district: "Göteborg",
        hire_date: "2025-01-15",
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
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-10-27T00:00:00Z",      };

      const mockClient = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockEmployee, error: null }),
              }),
            }),
          }),
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.reactivate("employee-123");

      expect(result.employee.is_terminated).toBe(false);
      expect(result.employee.termination_date).toBeNull();
      expect(result.employee.termination_reason).toBeNull();
      expect(result.employee.id).toBe("employee-123");
    });

    it("should throw error when employee not found", async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: "PGRST116", message: "No rows found" },
                }),
              }),
            }),
          }),
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(repository.reactivate("nonexistent-id")).rejects.toThrow("not found");
    });

    it("should throw error on database error", async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: "XX000", message: "Database error" },
                }),
              }),
            }),
          }),
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(repository.reactivate("employee-123")).rejects.toThrow("Failed to reactivate employee");
    });

    it("should throw error when no data is returned without error", async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      await expect(repository.reactivate("employee-123")).rejects.toThrow(
        "Employee with ID employee-123 not found"
      );
    });
  });

  describe("createMany", () => {
    it("should insert all valid employees", async () => {
      const employees: EmployeeFormData[] = [
        {
          first_name: "John",
          surname: "Doe",
          ssn: "19850315-1234",
          email: "john@example.com",
          mobile: null,
          rank: 'SEV',
          gender: null,
          town_district: null,
          hire_date: "2025-01-15",
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    termination_date: null,
          termination_reason: null,
          is_terminated: false,
          is_archived: false,
          repayment_needed_omc: null,
          repayment_needed_pe3: null,
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
          comments: null,
        },
        {
          first_name: "Jane",
          surname: "Smith",
          ssn: "19900520-5678",
          email: "jane@example.com",
          mobile: null,
          rank: 'SEV',
          gender: null,
          town_district: null,
          hire_date: "2025-02-01",
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    termination_date: null,
          termination_reason: null,
          is_terminated: false,
          is_archived: false,
          repayment_needed_omc: null,
          repayment_needed_pe3: null,
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
          comments: null,
        },
      ];

      const mockInsertedEmployees: Employee[] = [
        {
          id: "emp-1",
          ...employees[0],
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",      },
        {
          id: "emp-2",
          ...employees[1],
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",      },
      ];

      const mockClient = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn()
                .mockResolvedValueOnce({ data: mockInsertedEmployees[0], error: null })
                .mockResolvedValueOnce({ data: mockInsertedEmployees[1], error: null }),
            }),
          }),
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.createMany(employees);

      expect(result.inserted.length).toBe(2);
      expect(result.errors.length).toBe(0);
      expect(result.inserted[0].first_name).toBe("John");
      expect(result.inserted[1].first_name).toBe("Jane");
    });

    it("should handle duplicate SSN errors", async () => {
      const employees: EmployeeFormData[] = [
        {
          first_name: "John",
          surname: "Doe",
          ssn: "19850315-1234",
          email: "john@example.com",
          mobile: null,
          rank: 'SEV',
          gender: null,
          town_district: null,
          hire_date: "2025-01-15",
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    termination_date: null,
          termination_reason: null,
          is_terminated: false,
          is_archived: false,
          repayment_needed_omc: null,
          repayment_needed_pe3: null,
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
          comments: null,
        },
        {
          first_name: "Jane",
          surname: "Smith",
          ssn: "19850315-1234", // Duplicate SSN
          email: "jane@example.com",
          mobile: null,
          rank: 'SEV',
          gender: null,
          town_district: null,
          hire_date: "2025-02-01",
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    termination_date: null,
          termination_reason: null,
          is_terminated: false,
          is_archived: false,
          repayment_needed_omc: null,
          repayment_needed_pe3: null,
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
          comments: null,
        },
      ];

      const mockInsertedEmployee: Employee = {
        id: "emp-1",
        ...employees[0],
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",      };

      const mockClient = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn()
                .mockResolvedValueOnce({ data: mockInsertedEmployee, error: null })
                .mockResolvedValueOnce({
                  data: null,
                  error: {
                    code: "23505",
                    message: "duplicate key value violates unique constraint on ssn",
                  },
                }),
            }),
          }),
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.createMany(employees);

      expect(result.inserted.length).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].row).toBe(3); // Row 3 (header is row 1, first data row is 2)
      expect(result.errors[0].error).toContain("Duplicate SSN: 19850315-1234");
    });

    it("should handle partial success", async () => {
      const employees: EmployeeFormData[] = [
        {
          first_name: "John",
          surname: "Doe",
          ssn: "19850315-1234",
          email: "john@example.com",
          mobile: null,
          rank: 'SEV',
          gender: null,
          town_district: null,
          hire_date: "2025-01-15",
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    termination_date: null,
          termination_reason: null,
          is_terminated: false,
          is_archived: false,
          repayment_needed_omc: null,
          repayment_needed_pe3: null,
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
          comments: null,
        },
        {
          first_name: "Jane",
          surname: "Smith",
          ssn: "19900520-5678",
          email: "jane@example.com",
          mobile: null,
          rank: 'SEV',
          gender: null,
          town_district: null,
          hire_date: "2025-02-01",
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    termination_date: null,
          termination_reason: null,
          is_terminated: false,
          is_archived: false,
          repayment_needed_omc: null,
          repayment_needed_pe3: null,
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
          comments: null,
        },
        {
          first_name: "Bob",
          surname: "Johnson",
          ssn: "19950101-9999",
          email: "bob@example.com",
          mobile: null,
          rank: 'SEV',
          gender: null,
          town_district: null,
          hire_date: "2025-03-01",
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    termination_date: null,
          termination_reason: null,
          is_terminated: false,
          is_archived: false,
          repayment_needed_omc: null,
          repayment_needed_pe3: null,
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
          comments: null,
        },
      ];

      const mockInsertedEmployees: Employee[] = [
        {
          id: "emp-1",
          ...employees[0],
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",      },
        {
          id: "emp-3",
          ...employees[2],
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",      },
      ];

      const mockClient = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn()
                .mockResolvedValueOnce({ data: mockInsertedEmployees[0], error: null })
                .mockResolvedValueOnce({
                  data: null,
                  error: { code: "23505", message: "duplicate ssn" },
                })
                .mockResolvedValueOnce({ data: mockInsertedEmployees[1], error: null }),
            }),
          }),
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.createMany(employees);

      expect(result.inserted.length).toBe(2);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].row).toBe(3);
    });

    it("should handle general database errors", async () => {
      const employees: EmployeeFormData[] = [
        {
          first_name: "John",
          surname: "Doe",
          ssn: "19850315-1234",
          email: "john@example.com",
          mobile: null,
          rank: 'SEV',
          gender: null,
          town_district: null,
          hire_date: "2025-01-15",
    stena_date: null,
    omc_date: null,
    pe3_date: null,
    termination_date: null,
          termination_reason: null,
          is_terminated: false,
          is_archived: false,
          repayment_needed_omc: null,
          repayment_needed_pe3: null,
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
          comments: null,
        },
      ];

      const mockClient = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValueOnce({
                data: null,
                error: { message: "Database connection failed" },
              }),
            }),
          }),
        }),
      };

      vi.mocked(supabaseServer.createClient).mockResolvedValue(mockClient as never);

      const result = await repository.createMany(employees);

      expect(result.inserted.length).toBe(0);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].error).toBe("Database connection failed");
    });
  });
});
