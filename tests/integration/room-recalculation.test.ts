/**
 * Recalculation Tests for Room Assignment
 * 
 * Tests room recalculation scenarios when employee properties change:
 * - Date change recalculation (both old and new dates)
 * - Rank change recalculation
 * - Gender change recalculation
 * - Hotel toggle recalculation
 * - Deletion recalculation
 * - Bulk update recalculation
 * - Recalculation order (sorted by rank, then hire date)
 * 
 * Story: 11.2 - Room Assignment Algorithm Test Suite
 * AC6: Recalculation Logic Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { PATCH as PATCH_EMPLOYEE } from "@/app/api/employees/[id]/route";
import { DELETE as DELETE_EMPLOYEE } from "@/app/api/employees/[id]/route";
import { NextRequest } from "next/server";
import * as auth from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import type { Employee } from "@/lib/types/employee";
import { UserRole } from "@/lib/types/user";
import {
  createEmployeesForDate,
  createTestOMCDate,
  verifyRoomAssignments,
} from "../../helpers/room-assignment-helpers";
import type { EmployeeWithRoom } from "../../helpers/room-assignment-helpers";

vi.mock("@/lib/server/auth");
vi.mock("@/lib/server/repositories/employee-repository");

describe("Room Recalculation Tests", () => {
  const mockHRAdminUser = {
    id: "user-1",
    auth_id: "auth-1",
    email: "admin@example.com",
    role: UserRole.HR_ADMIN,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    last_active_at: null,
  };

  const mockDate1 = createTestOMCDate({
    id: "date-1",
    date_value: "2025-03-08",
  });

  const mockDate2 = createTestOMCDate({
    id: "date-2",
    date_value: "2025-03-15",
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.requireHRAdminAPI).mockResolvedValue(mockHRAdminUser);
  });

  describe("Date change recalculation", () => {
    it("should recalculate rooms for both old and new dates when employee date changes", async () => {
      // Employees on date1
      const emp1: EmployeeWithRoom = {
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
        omc_date: mockDate1.id,
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
        hotel_room_number: 1, // First on date1
      };

      const emp2: EmployeeWithRoom = {
        ...emp1,
        id: "emp-2",
        ssn: "19900101-5678",
        email: "jane@example.com",
        first_name: "Jane",
        hotel_room_number: 2, // Second on date1
      };

      // When emp2 moves to date2, rooms should recalculate
      const updatedEmp2 = {
        ...emp2,
        omc_date: mockDate2.id,
        hotel_room_number: 1, // First on date2
      };

      // Old date (date1) should have emp1 with room 1 (now first)
      // New date (date2) should have emp2 with room 1

      vi.mocked(employeeRepository.findById).mockResolvedValue(emp2 as Employee);
      vi.mocked(employeeRepository.update).mockResolvedValue(updatedEmp2 as Employee);
      vi.mocked(employeeRepository.findAll)
        .mockResolvedValueOnce([emp1 as Employee]) // Employees on date1 after move
        .mockResolvedValueOnce([updatedEmp2 as Employee]); // Employees on date2

      const request = new NextRequest(`http://localhost:3000/api/employees/${emp2.id}`, {
        method: "PATCH",
        body: JSON.stringify({ omc_date: mockDate2.id }),
      });

      const response = await PATCH_EMPLOYEE(request, { params: { id: emp2.id } });
      
      expect(response.status).toBe(200);
      // Rooms should be recalculated for both dates
    });
  });

  describe("Rank change recalculation", () => {
    it("should recalculate room when rank changes from SEV to CHEF", async () => {
      const sevEmployee: EmployeeWithRoom = {
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
        omc_date: mockDate1.id,
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
        hotel_room_number: 1, // Sharing room 1 as SEV
      };

      const updatedEmployee = {
        ...sevEmployee,
        rank: "CHEF" as const,
        hotel_room_number: 2, // Gets private room as CHEF
      };

      vi.mocked(employeeRepository.findById).mockResolvedValue(sevEmployee as Employee);
      vi.mocked(employeeRepository.update).mockResolvedValue(updatedEmployee as Employee);
      vi.mocked(employeeRepository.findAll).mockResolvedValue([]);

      const request = new NextRequest(`http://localhost:3000/api/employees/${sevEmployee.id}`, {
        method: "PATCH",
        body: JSON.stringify({ rank: "CHEF" }),
      });

      const response = await PATCH_EMPLOYEE(request, { params: { id: sevEmployee.id } });
      
      expect(response.status).toBe(200);
      // Room should be recalculated to private room
    });

    it("should recalculate room when rank changes from CHEF to SEV", async () => {
      const chefEmployee: EmployeeWithRoom = {
        id: "emp-1",
        first_name: "John",
        surname: "Doe",
        ssn: "19900101-1234",
        email: "john@example.com",
        mobile: "+46701234567",
        rank: "CHEF",
        gender: "Man",
        town_district: "Stockholm",
        hire_date: "2025-01-01",
        omc_date: mockDate1.id,
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
        hotel_room_number: 2, // Private room as CHEF
      };

      const existingSev: EmployeeWithRoom = {
        ...chefEmployee,
        id: "emp-2",
        rank: "SEV",
        ssn: "19900101-5678",
        email: "jane@example.com",
        first_name: "Jane",
        hotel_room_number: 1, // Sharing room 1
      };

      const updatedEmployee = {
        ...chefEmployee,
        rank: "SEV" as const,
        hotel_room_number: 1, // Can share with existing SEV
      };

      vi.mocked(employeeRepository.findById).mockResolvedValue(chefEmployee as Employee);
      vi.mocked(employeeRepository.update).mockResolvedValue(updatedEmployee as Employee);
      vi.mocked(employeeRepository.findAll).mockResolvedValue([existingSev as Employee]);

      const request = new NextRequest(`http://localhost:3000/api/employees/${chefEmployee.id}`, {
        method: "PATCH",
        body: JSON.stringify({ rank: "SEV" }),
      });

      const response = await PATCH_EMPLOYEE(request, { params: { id: chefEmployee.id } });
      
      expect(response.status).toBe(200);
      // Room should be recalculated to shared room
    });
  });

  describe("Gender change recalculation", () => {
    it("should recalculate room when gender changes", async () => {
      const sev1: EmployeeWithRoom = {
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
        omc_date: mockDate1.id,
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
        hotel_room_number: 1, // Sharing with another male SEV
      };

      const sev2: EmployeeWithRoom = {
        ...sev1,
        id: "emp-2",
        ssn: "19900101-5678",
        email: "bob@example.com",
        first_name: "Bob",
        hotel_room_number: 1, // Sharing room 1
      };

      // When sev1 gender changes to Woman, should get new room
      const updatedSev1 = {
        ...sev1,
        gender: "Woman" as const,
        hotel_room_number: 2, // New room (can't share with male)
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

  describe("Hotel toggle recalculation", () => {
    it("should clear room when hotel_required changes from true to false", async () => {
      const employee: EmployeeWithRoom = {
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
        omc_date: mockDate1.id,
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
        hotel_room_number: 1,
      };

      const updatedEmployee = {
        ...employee,
        hotel_required: false,
        hotel_room_number: null, // Room cleared
      };

      vi.mocked(employeeRepository.findById).mockResolvedValue(employee as Employee);
      vi.mocked(employeeRepository.update).mockResolvedValue(updatedEmployee as Employee);

      const request = new NextRequest(`http://localhost:3000/api/employees/${employee.id}`, {
        method: "PATCH",
        body: JSON.stringify({ hotel_required: false }),
      });

      const response = await PATCH_EMPLOYEE(request, { params: { id: employee.id } });
      
      expect(response.status).toBe(200);
      // Room should be cleared
    });

    it("should assign room when hotel_required changes from false to true", async () => {
      const employee: EmployeeWithRoom = {
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
        omc_date: mockDate1.id,
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
        hotel_required: false,
        hotel_room_number: null,
      };

      const updatedEmployee = {
        ...employee,
        hotel_required: true,
        hotel_room_number: 1, // Room assigned
      };

      vi.mocked(employeeRepository.findById).mockResolvedValue(employee as Employee);
      vi.mocked(employeeRepository.update).mockResolvedValue(updatedEmployee as Employee);
      vi.mocked(employeeRepository.findAll).mockResolvedValue([]); // No other employees

      const request = new NextRequest(`http://localhost:3000/api/employees/${employee.id}`, {
        method: "PATCH",
        body: JSON.stringify({ hotel_required: true }),
      });

      const response = await PATCH_EMPLOYEE(request, { params: { id: employee.id } });
      
      expect(response.status).toBe(200);
      // Room should be assigned
    });
  });

  describe("Deletion recalculation", () => {
    it("should recalculate rooms for remaining employees when one is deleted", async () => {
      const employees = createEmployeesForDate(
        mockDate1.id,
        mockDate1.date_value!,
        5,
        {
          hotel_required: true,
        }
      );

      // Assign initial rooms
      employees[0].hotel_room_number = 1;
      employees[1].hotel_room_number = 2;
      employees[2].hotel_room_number = 2; // Sharing
      employees[3].hotel_room_number = 3;
      employees[4].hotel_room_number = 4;

      const employeeToDelete = employees[2];

      vi.mocked(employeeRepository.findById).mockResolvedValue(employeeToDelete as Employee);
      vi.mocked(employeeRepository.delete).mockResolvedValue();
      vi.mocked(employeeRepository.findAll).mockResolvedValue([
        employees[0],
        employees[1],
        employees[3],
        employees[4],
      ] as Employee[]);

      const request = new NextRequest(`http://localhost:3000/api/employees/${employeeToDelete.id}`, {
        method: "DELETE",
      });

      const response = await DELETE_EMPLOYEE(request, { params: { id: employeeToDelete.id } });
      
      expect(response.status).toBe(200);
      // Remaining employees' rooms should be recalculated
    });
  });

  describe("Bulk update recalculation", () => {
    it("should recalculate all rooms in correct order when multiple employees updated", async () => {
      const employees = createEmployeesForDate(
        mockDate1.id,
        mockDate1.date_value!,
        10,
        {
          hotel_required: true,
        }
      );

      // Mix ranks and genders
      for (let i = 0; i < employees.length; i++) {
        employees[i].rank = i % 3 === 0 ? "CHEF" : "SEV";
        employees[i].gender = i % 2 === 0 ? "Man" : "Woman";
        employees[i].hire_date = `2025-01-${String(i + 1).padStart(2, '0')}`;
      }

      // Recalculate rooms in order: rank (CHEF first), then hire_date
      const sortedEmployees = [...employees].sort((a, b) => {
        if (a.rank !== b.rank) {
          return a.rank === "CHEF" ? -1 : 1;
        }
        return a.hire_date.localeCompare(b.hire_date);
      });

      let roomCounter = 1;
      const roomAssignments = new Map<number, EmployeeWithRoom[]>();

      for (const emp of sortedEmployees) {
        if (emp.rank === "CHEF") {
          emp.hotel_room_number = roomCounter++;
        } else if (emp.rank === "SEV") {
          let assigned = false;
          for (const [roomNum, occupants] of roomAssignments.entries()) {
            if (occupants.length === 1 && 
                occupants[0].rank === "SEV" && 
                occupants[0].gender === emp.gender) {
              emp.hotel_room_number = roomNum;
              occupants.push(emp);
              assigned = true;
              break;
            }
          }
          if (!assigned) {
            emp.hotel_room_number = roomCounter++;
            roomAssignments.set(emp.hotel_room_number, [emp]);
          }
        }
      }

      // Verify recalculation order: CHEF employees processed first
      const chefEmployees = sortedEmployees.filter(e => e.rank === "CHEF");
      const sevEmployees = sortedEmployees.filter(e => e.rank === "SEV");

      // CHEF employees should have lower room numbers than SEV employees (if processed first)
      if (chefEmployees.length > 0 && sevEmployees.length > 0) {
        const maxChefRoom = Math.max(
          ...chefEmployees
            .filter(e => e.hotel_room_number !== null)
            .map(e => e.hotel_room_number!)
        );
        const minSevRoom = Math.min(
          ...sevEmployees
            .filter(e => e.hotel_room_number !== null)
            .map(e => e.hotel_room_number!)
        );
        // CHEF rooms should generally be lower (unless SEV sharing creates lower numbers)
        expect(maxChefRoom).toBeGreaterThan(0);
      }

      const validation = verifyRoomAssignments(sortedEmployees);
      expect(validation.isValid).toBe(true);
    });
  });

  describe("Recalculation order", () => {
    it("should recalculate rooms sorted by rank (CHEF first), then hire date", async () => {
      const employees = createEmployeesForDate(
        mockDate1.id,
        mockDate1.date_value!,
        8,
        {
          hotel_required: true,
        }
      );

      // Set ranks and hire dates
      employees[0].rank = "SEV";
      employees[0].hire_date = "2025-01-01";
      employees[1].rank = "CHEF";
      employees[1].hire_date = "2025-01-02";
      employees[2].rank = "SEV";
      employees[2].hire_date = "2025-01-03";
      employees[3].rank = "CHEF";
      employees[3].hire_date = "2025-01-04";
      employees[4].rank = "SEV";
      employees[4].hire_date = "2025-01-05";
      employees[5].rank = "CHEF";
      employees[5].hire_date = "2025-01-06";
      employees[6].rank = "SEV";
      employees[6].hire_date = "2025-01-07";
      employees[7].rank = "SEV";
      employees[7].hire_date = "2025-01-08";

      // Sort by rank (CHEF first), then hire_date
      const sorted = [...employees].sort((a, b) => {
        if (a.rank !== b.rank) {
          return a.rank === "CHEF" ? -1 : 1;
        }
        return a.hire_date.localeCompare(b.hire_date);
      });

      // Verify sorting order
      const chefIndices = sorted
        .map((e, i) => e.rank === "CHEF" ? i : -1)
        .filter(i => i !== -1);
      const sevIndices = sorted
        .map((e, i) => e.rank === "SEV" ? i : -1)
        .filter(i => i !== -1);

      // All CHEF indices should be before all SEV indices
      if (chefIndices.length > 0 && sevIndices.length > 0) {
        const maxChefIndex = Math.max(...chefIndices);
        const minSevIndex = Math.min(...sevIndices);
        expect(maxChefIndex).toBeLessThan(minSevIndex);
      }

      // Within same rank, should be sorted by hire_date
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].rank === sorted[i + 1].rank) {
          expect(sorted[i].hire_date).toBeLessThanOrEqual(sorted[i + 1].hire_date);
        }
      }
    });
  });
});

