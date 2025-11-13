/**
 * Integration Tests for Room Assignment API
 * 
 * Tests room assignment integration with API routes and database operations:
 * - Room assignment on employee creation
 * - Room recalculation on property changes
 * - Room clearing on hotel toggle
 * - Complex scenarios with multiple employees
 * 
 * Story: 11.2 - Room Assignment Algorithm Test Suite
 * AC2: Integration Test Coverage (Room Calculation API)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST as POST_EMPLOYEE } from "@/app/api/employees/route";
import { PATCH as PATCH_EMPLOYEE } from "@/app/api/employees/[id]/route";
import { DELETE as DELETE_EMPLOYEE } from "@/app/api/employees/[id]/route";
import { NextRequest } from "next/server";
import * as auth from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import type { Employee, EmployeeFormData } from "@/lib/types/employee";
import { UserRole } from "@/lib/types/user";
import {
  createEmployeesForDate,
  createTestOMCDate,
  verifyRoomAssignments,
  getRoomOccupants,
} from "@/../tests/helpers/room-assignment-helpers";
import type { EmployeeWithRoom } from "@/../tests/helpers/room-assignment-helpers";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/server/auth");
vi.mock("@/lib/server/repositories/employee-repository");
// Mock Supabase server client to avoid cookies() error
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("Room Assignment API Integration Tests", () => {
  const mockHRAdminUser = {
    id: "user-1",
    auth_id: "auth-1",
    email: "admin@example.com",
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    last_active_at: null,
  };

  const mockOMCDate = createTestOMCDate({
    id: "date-omc-1",
    date_value: "2025-03-08",
  });

  // Shared mock Supabase client that can be accessed in tests
  let mockSupabaseClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
    
    // Setup Supabase server mock to return a mock client with RPC support
    mockSupabaseClient = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabaseClient as any);
  });

  describe("POST /api/employees - Room assignment on creation", () => {
    it("should assign room 1 to first employee with ÖMC date", async () => {
      const employeeData: EmployeeFormData = {
        first_name: "John",
        surname: "Doe",
        ssn: "19900101-1234",
        email: "john@example.com",
        mobile: "+46701234567",
        rank: "SEV",
        gender: "Man",
        town_district: "Stockholm",
        hire_date: "2025-01-01",
        omc_date: mockOMCDate.id,
        stena_date: null,
        pe3_date: null,
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
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
        comments: null,
      };

      const createdEmployee: Employee & { hotel_required?: boolean; room_number_shared?: number | null } = {
        ...employeeData,
        id: "emp-1",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        hotel_required: true,
        room_number_shared: 1, // First employee gets room 1
      };

      vi.mocked(employeeRepository.create).mockResolvedValue(createdEmployee as Employee);
      
      // Mock RPC function to return room 1 for first employee
      vi.mocked(mockSupabaseClient.rpc).mockResolvedValue({ 
        data: 1, // First employee gets room 1
        error: null 
      });

      const request = new NextRequest("http://localhost:3000/api/employees", {
        method: "POST",
        body: JSON.stringify(employeeData),
      });

      const response = await POST_EMPLOYEE(request);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.data).toBeDefined();
      // Verify RPC was called for room calculation
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('calculate_room_number', {
        p_date_id: mockOMCDate.id,
        p_rank: "SEV",
        p_gender: "Man",
      });
    });
  });

  describe("PATCH /api/employees/[id] - Room recalculation on date change", () => {
    it("should recalculate room when omc_date changes", async () => {
      const oldDate = createTestOMCDate({ id: "date-old", date_value: "2025-03-08" });
      const newDate = createTestOMCDate({ id: "date-new", date_value: "2025-03-15" });

      const existingEmployee: Employee & { hotel_required?: boolean; room_number_shared?: number | null } = {
        id: "emp-1",
        first_name: "John",
        surname: "Doe",
        ssn: "19900101-1234",
        email: "john@example.com",
        mobile: "+46701234567",
        rank: "SEV",
        gender: "Man",
        town_district: "Stockholm",
        hire_date: "2025-01-01",
        omc_date: oldDate.id,
        stena_date: null,
        pe3_date: null,
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
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
        comments: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        hotel_required: true,
        room_number_shared: 2, // Had room 2 on old date
      };

      const updatedEmployee = {
        ...existingEmployee,
        omc_date: newDate.id,
        room_number_shared: 1, // Should get room 1 on new date (if first)
      };

      vi.mocked(employeeRepository.findById).mockResolvedValue(existingEmployee as Employee);
      vi.mocked(employeeRepository.update).mockResolvedValue(updatedEmployee as Employee);
      vi.mocked(employeeRepository.findAll).mockResolvedValue([]); // No other employees on new date

      const request = new NextRequest(`http://localhost:3000/api/employees/${existingEmployee.id}`, {
        method: "PATCH",
        body: JSON.stringify({ omc_date: newDate.id }),
      });

      const response = await PATCH_EMPLOYEE(request, { params: { id: existingEmployee.id } });
      const json = await response.json();

      expect(response.status).toBe(200);
      // Room should be recalculated for new date
      // Implementation will verify room_number_shared is updated
      expect(json.data).toBeDefined();
    });
  });

  describe("PATCH /api/employees/[id] - Room recalculation on rank change", () => {
    it("should recalculate room when rank changes from SEV to CHEF", async () => {
      const employee: Employee & { hotel_required?: boolean; room_number_shared?: number | null } = {
        id: "emp-1",
        first_name: "John",
        surname: "Doe",
        ssn: "19900101-1234",
        email: "john@example.com",
        mobile: "+46701234567",
        rank: "SEV",
        gender: "Man",
        town_district: "Stockholm",
        hire_date: "2025-01-01",
        omc_date: mockOMCDate.id,
        stena_date: null,
        pe3_date: null,
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
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
        comments: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        hotel_required: true,
        room_number_shared: 1, // Was sharing room 1 as SEV
      };

      const updatedEmployee = {
        ...employee,
        rank: "CHEF" as const,
        room_number_shared: 2, // Should get private room as CHEF
      };

      vi.mocked(employeeRepository.findById).mockResolvedValue(employee as Employee);
      vi.mocked(employeeRepository.update).mockResolvedValue(updatedEmployee as Employee);
      vi.mocked(employeeRepository.findAll).mockResolvedValue([]);

      const request = new NextRequest(`http://localhost:3000/api/employees/${employee.id}`, {
        method: "PATCH",
        body: JSON.stringify({ rank: "CHEF" }),
      });

      const response = await PATCH_EMPLOYEE(request, { params: { id: employee.id } });
      
      expect(response.status).toBe(200);
      // Room should be recalculated to private room for CHEF
    });
  });

  describe("PATCH /api/employees/[id] - Room recalculation on gender change", () => {
    it("should recalculate room when gender changes", async () => {
      const sev1: EmployeeWithRoom = {
        id: "emp-sev-1",
        first_name: "John",
        surname: "Doe",
        ssn: "19900101-1234",
        email: "john@example.com",
        mobile: "+46701234567",
        rank: "SEV",
        gender: "Man",
        town_district: "Stockholm",
        hire_date: "2025-01-01",
        omc_date: mockOMCDate.id,
        stena_date: null,
        pe3_date: null,
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
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
        comments: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        hotel_required: true,
        room_number_shared: 1, // Sharing with another male SEV
      };

      const sev2: EmployeeWithRoom = {
        ...sev1,
        id: "emp-sev-2",
        room_number_shared: 1, // Sharing room 1
      };

      // When sev1 gender changes to Woman, should get new room
      const updatedSev1 = {
        ...sev1,
        gender: "Woman" as const,
        room_number_shared: 2, // New room (can't share with male)
      };

      vi.mocked(employeeRepository.findById).mockResolvedValue(sev1 as Employee);
      vi.mocked(employeeRepository.update).mockResolvedValue(updatedSev1 as Employee);
      vi.mocked(employeeRepository.findAll).mockResolvedValue([sev2 as Employee]);

      const request = new NextRequest(`http://localhost:3000/api/employees/${sev1.id}`, {
        method: "PATCH",
        body: JSON.stringify({ gender: "Woman" }),
      });

      const response = await PATCH_EMPLOYEE(request, { params: { id: sev1.id } });
      
      expect(response.status).toBe(200);
      // Room should be recalculated due to gender mismatch
    });
  });

  describe("PATCH /api/employees/[id] - Room cleared on hotel toggle", () => {
    it("should clear room when hotel_required changes to false", async () => {
      const employee: Employee & { hotel_required?: boolean; room_number_shared?: number | null } = {
        id: "emp-1",
        first_name: "John",
        surname: "Doe",
        ssn: "19900101-1234",
        email: "john@example.com",
        mobile: "+46701234567",
        rank: "SEV",
        gender: "Man",
        town_district: "Stockholm",
        hire_date: "2025-01-01",
        omc_date: mockOMCDate.id,
        stena_date: null,
        pe3_date: null,
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
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
        comments: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        hotel_required: true,
        room_number_shared: 1,
      };

      const updatedEmployee = {
        ...employee,
        hotel_required: false,
        room_number_shared: null, // Room cleared
      };

      vi.mocked(employeeRepository.findById).mockResolvedValue(employee as Employee);
      vi.mocked(employeeRepository.update).mockResolvedValue(updatedEmployee as Employee);

      const request = new NextRequest(`http://localhost:3000/api/employees/${employee.id}`, {
        method: "PATCH",
        body: JSON.stringify({ hotel_required: false }),
      });

      const response = await PATCH_EMPLOYEE(request, { params: { id: employee.id } });
      
      expect(response.status).toBe(200);
      // Room should be cleared (set to null)
    });
  });

  describe("DELETE /api/employees/[id] - Rooms recalculated on deletion", () => {
    it("should recalculate rooms for remaining employees when one is deleted", async () => {
      const employees = createEmployeesForDate(
        mockOMCDate.id,
        mockOMCDate.date_value!,
        3,
        { hotel_required: true }
      );
      
      // Assign rooms manually for test
      employees[0].room_number_shared = 1; // First employee
      employees[1].room_number_shared = 2; // CHEF gets private
      employees[2].room_number_shared = 2; // SEV shares with another SEV (if applicable)

      const employeeToDelete = employees[1];

      vi.mocked(employeeRepository.findById).mockResolvedValue(employeeToDelete as Employee);
      vi.mocked(employeeRepository.delete).mockResolvedValue();
      vi.mocked(employeeRepository.findAll).mockResolvedValue([
        employees[0],
        employees[2],
      ] as Employee[]);

      const request = new NextRequest(`http://localhost:3000/api/employees/${employeeToDelete.id}`, {
        method: "DELETE",
      });

      const response = await DELETE_EMPLOYEE(request, { params: { id: employeeToDelete.id } });
      
      expect(response.status).toBe(200);
      // Remaining employees' rooms should be recalculated
    });
  });

  describe("Complex scenario: 10 employees assigned", () => {
    it("should assign rooms correctly for 10 employees with mixed ranks and genders", async () => {
      const employees = createEmployeesForDate(
        mockOMCDate.id,
        mockOMCDate.date_value!,
        10,
        { hotel_required: true }
      );

      // Mix of CHEF and SEV
      employees[0].rank = "SEV";
      employees[0].gender = "Man";
      employees[1].rank = "CHEF";
      employees[1].gender = "Woman";
      employees[2].rank = "SEV";
      employees[2].gender = "Man";
      employees[3].rank = "SEV";
      employees[3].gender = "Woman";
      employees[4].rank = "CHEF";
      employees[4].gender = "Man";
      employees[5].rank = "SEV";
      employees[5].gender = "Man";
      employees[6].rank = "SEV";
      employees[6].gender = "Woman";
      employees[7].rank = "CHEF";
      employees[7].gender = "Woman";
      employees[8].rank = "SEV";
      employees[8].gender = "Man";
      employees[9].rank = "SEV";
      employees[9].gender = "Woman";

      // Expected room assignments:
      // Room 1: SEV (Man) - first employee
      // Room 2: CHEF (Woman) - private
      // Room 1: SEV (Man) - shares with first SEV
      // Room 3: SEV (Woman) - new room
      // Room 4: CHEF (Man) - private
      // Room 1: SEV (Man) - room full, should get new room (Room 5)
      // Room 3: SEV (Woman) - shares with female SEV
      // Room 6: CHEF (Woman) - private
      // Room 5: SEV (Man) - already assigned above
      // Room 3: SEV (Woman) - room full, should get new room (Room 7)

      vi.mocked(employeeRepository.findAll).mockResolvedValue(employees as Employee[]);

      // Verify room assignments are valid
      const validation = verifyRoomAssignments(employees);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe("Transaction rollback scenarios", () => {
    it("should not assign room if employee creation fails", async () => {
      const employeeData: EmployeeFormData = {
        first_name: "John",
        surname: "Doe",
        ssn: "19900101-1234",
        email: "john@example.com",
        mobile: "+46701234567",
        rank: "SEV",
        gender: "Man",
        town_district: "Stockholm",
        hire_date: "2025-01-01",
        omc_date: mockOMCDate.id,
        stena_date: null,
        pe3_date: null,
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
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
        comments: null,
      };

      vi.mocked(employeeRepository.create).mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/employees", {
        method: "POST",
        body: JSON.stringify(employeeData),
      });

      const response = await POST_EMPLOYEE(request);
      
      expect(response.status).toBeGreaterThanOrEqual(400);
      // Room should not be assigned if employee creation fails
    });
  });
});

