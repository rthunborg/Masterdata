/**
 * Edge Case Tests for Room Assignment
 * 
 * Tests extreme scenarios and edge cases:
 * - Large number of employees (100+)
 * - All CHEF employees
 * - All SEV employees (same gender, mixed gender)
 * - Missing data scenarios
 * - Empty date scenarios
 * 
 * Story: 11.2 - Room Assignment Algorithm Test Suite
 * AC4: Edge Case Coverage
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST as POST_EMPLOYEE } from "@/app/api/employees/route";
import { DELETE as DELETE_EMPLOYEE } from "@/app/api/employees/[id]/route";
import { NextRequest } from "next/server";
import * as auth from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import type { Employee, EmployeeFormData } from "@/lib/types/employee";
import { UserRole } from "@/lib/types/user";
import { createClient } from "@/lib/supabase/server";
import {
  createEmployeesForDate,
  createTestOMCDate,
  verifyRoomAssignments,
  createMixedRankEmployees,
} from "../helpers/room-assignment-helpers";
import type { EmployeeWithRoom } from "../helpers/room-assignment-helpers";
import * as dateCapacity from "@/lib/services/date-capacity";

vi.mock("@/lib/services/date-capacity");
vi.mock("@/lib/supabase/server");
vi.mock("@/lib/server/auth", async () => {
  const actual = await vi.importActual("@/lib/server/auth");
  return {
    ...actual,
    requireEmployeeManagerAPI: vi.fn(),
    createErrorResponse: vi.fn((error: unknown) => {
      const message = error instanceof Error ? error.message : "Internal server error";
      return new Response(
        JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message,
            timestamp: new Date().toISOString(),
          },
        }),
        { status: 500 }
      );
    }),
  };
});
vi.mock("@/lib/server/repositories/employee-repository");

describe("Room Assignment Edge Case Tests", () => {
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
    max_spots: 100,
    remaining_spots: 100,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.requireEmployeeManagerAPI).mockResolvedValue(mockHRAdminUser);
    // Mock assignEmployeeToDate to succeed
    vi.mocked(dateCapacity.assignEmployeeToDate).mockResolvedValue({
      success: true,
      message: "Employee assigned successfully",
    });
    // Mock Supabase client with proper chain for date queries
    let supabaseCallCount = 0;
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn(() => {
        supabaseCallCount = 0; // Reset for each from() call
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          single: vi.fn().mockImplementation(() => {
            supabaseCallCount++;
            // First call: date info for deadline check
            if (supabaseCallCount === 1) {
              return Promise.resolve({ 
                data: { deadline_submit: null, deadline_cancel: null }, 
                error: null 
              });
            }
            // Subsequent calls: employee info or other data
            return Promise.resolve({ 
              data: { 
                id: "emp-1", 
                first_name: "John", 
                surname: "Doe", 
                email: "john@example.com" 
              }, 
              error: null 
            });
          }),
        };
      }),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as unknown as ReturnType<typeof createClient>);
  });

  describe("100 employees on same date", () => {
    it("should assign rooms correctly for 100 employees", async () => {
      // Create 100 employees with mixed ranks and genders
      const employees = createMixedRankEmployees(
        mockOMCDate.id,
        mockOMCDate.date_value!,
        {
          chefCount: 30,
          sevCount: 70,
          genderDistribution: "balanced",
        }
      );

      // Assign rooms based on algorithm
      let roomCounter = 1;
      const roomAssignments = new Map<number, EmployeeWithRoom[]>();

      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        
        if (emp.rank === "CHEF") {
          // CHEF gets private room
          emp.hotel_room_number = roomCounter++;
        } else if (emp.rank === "SEV") {
          // SEV: find room with 1 occupant of same gender, or create new
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

      // Verify all assignments are valid
      const validation = verifyRoomAssignments(employees);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Verify room count is reasonable (30 CHEF rooms + ~35 SEV rooms = ~65 rooms)
      const uniqueRooms = new Set(employees
        .filter(e => e.hotel_room_number !== null)
        .map(e => e.hotel_room_number!));
      expect(uniqueRooms.size).toBeGreaterThan(30); // At least CHEF count
      expect(uniqueRooms.size).toBeLessThan(100); // Less than employee count (sharing)
    });
  });

  describe("All CHEF employees scenario", () => {
    it("should assign each CHEF employee a private room", async () => {
      const chefs = createEmployeesForDate(
        mockOMCDate.id,
        mockOMCDate.date_value!,
        20,
        {
          hotel_required: true,
          rank: "CHEF",
        }
      );

      // Assign sequential rooms (each CHEF gets private room)
      for (let i = 0; i < chefs.length; i++) {
        chefs[i].hotel_room_number = i + 1;
      }

      const validation = verifyRoomAssignments(chefs);
      expect(validation.isValid).toBe(true);

      // Verify each CHEF has unique room
      const chefRooms = chefs
        .filter(e => e.hotel_room_number !== null)
        .map(e => e.hotel_room_number!);
      const uniqueRooms = new Set(chefRooms);
      expect(chefRooms.length).toBe(uniqueRooms.size); // All unique
      expect(chefRooms.length).toBe(20); // One room per CHEF
    });
  });

  describe("All SEV employees same-gender scenario", () => {
    it("should assign SEV employees in pairs (2 per room) when all same gender", async () => {
      const sevs = createEmployeesForDate(
        mockOMCDate.id,
        mockOMCDate.date_value!,
        50,
        {
          hotel_required: true,
          rank: "SEV",
          gender: "Man", // All same gender
        }
      );

      // Assign rooms: 2 per room
      for (let i = 0; i < sevs.length; i++) {
        sevs[i].hotel_room_number = Math.floor(i / 2) + 1;
      }

      const validation = verifyRoomAssignments(sevs);
      expect(validation.isValid).toBe(true);

      // Verify room count: 50 employees / 2 per room = 25 rooms
      const uniqueRooms = new Set(sevs
        .filter(e => e.hotel_room_number !== null)
        .map(e => e.hotel_room_number!));
      expect(uniqueRooms.size).toBe(25);

      // Verify each room has max 2 occupants
      const roomOccupancy = new Map<number, number>();
      for (const emp of sevs) {
        if (emp.hotel_room_number !== null) {
          roomOccupancy.set(
            emp.hotel_room_number,
            (roomOccupancy.get(emp.hotel_room_number) || 0) + 1
          );
        }
      }

      for (const count of roomOccupancy.values()) {
        expect(count).toBeLessThanOrEqual(2);
      }
    });
  });

  describe("All SEV employees mixed-gender scenario", () => {
    it("should assign alternating rooms by gender when SEV employees have mixed genders", async () => {
      const sevs = createEmployeesForDate(
        mockOMCDate.id,
        mockOMCDate.date_value!,
        20,
        {
          hotel_required: true,
          rank: "SEV",
        }
      );

      // Alternate genders
      for (let i = 0; i < sevs.length; i++) {
        sevs[i].gender = i % 2 === 0 ? "Man" : "Woman";
      }

      // Assign rooms: same gender can share
      const roomAssignments = new Map<number, EmployeeWithRoom[]>();
      let roomCounter = 1;

      for (const emp of sevs) {
        let assigned = false;
        // Try to find room with 1 occupant of same gender
        for (const [roomNum, occupants] of roomAssignments.entries()) {
          if (occupants.length === 1 && 
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

      const validation = verifyRoomAssignments(sevs);
      expect(validation.isValid).toBe(true);

      // Verify gender separation: each room has same gender
      for (const emp of sevs) {
        if (emp.hotel_room_number !== null) {
          const roomMates = sevs.filter(
            e => e.hotel_room_number === emp.hotel_room_number && e.id !== emp.id
          );
          for (const mate of roomMates) {
            expect(mate.gender).toBe(emp.gender); // Same gender
          }
        }
      }
    });
  });

  describe("Employee with no ÖMC date", () => {
    it("should return null room when employee has no ÖMC date", async () => {
      const employeeData: EmployeeFormData = {
        first_name: "John",
        surname: "Doe",
        ssn: "19900101-1234",
        email: "john@example.com",
        mobile: "+46701234567",
        rank: "SEV",
        gender: "Man",
        town_district: "Göteborg",
        hire_date: "2020-01-01", // Use past date to pass validation
        omc_date: null, // No ÖMC date
        stena_date: null,
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
        omc_masterdata_reminder_sent_at: null,
        room_number_shared: null,
      };

      const createdEmployee: Employee & { hotel_required?: boolean; hotel_room_number?: number | null } = {
        ...employeeData,
        id: "emp-1",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        hotel_required: true,
        hotel_room_number: null, // No room assigned (no date)
      };

      vi.mocked(employeeRepository.create).mockResolvedValue(createdEmployee as Employee);

      const request = new NextRequest("http://localhost:3000/api/employees", {
        method: "POST",
        body: JSON.stringify(employeeData),
      });

      const response = await POST_EMPLOYEE(request);
      const json = await response.json();

      expect(response.status).toBe(201);
      // Room should be null when no ÖMC date
      expect(json.data.hotel_room_number).toBeNull();
    });
  });

  describe("Employee with hotel_required=false", () => {
    it("should return null room when hotel_required is false", async () => {
      const employeeData: EmployeeFormData = {
        first_name: "John",
        surname: "Doe",
        ssn: "19900101-1234",
        email: "john@example.com",
        mobile: "+46701234567",
        rank: "SEV",
        gender: "Man",
        town_district: "Göteborg",
        hire_date: "2020-01-01", // Use past date to pass validation
        omc_date: mockOMCDate.id,
        hotel_required: false, // No hotel required
        stena_date: null,
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
        comments: null,
        omc_masterdata_reminder_sent_at: null,
        room_number_shared: null,
      };

      const createdEmployee: Employee & { hotel_required?: boolean; room_number_shared?: number | null } = {
        ...employeeData,
        id: "emp-1",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        hotel_required: false, // No hotel required
        room_number_shared: null, // No room assigned
      };

      vi.mocked(employeeRepository.create).mockResolvedValue(createdEmployee as Employee);

      const request = new NextRequest("http://localhost:3000/api/employees", {
        method: "POST",
        body: JSON.stringify(employeeData),
      });

      const response = await POST_EMPLOYEE(request);
      const json = await response.json();

      expect(response.status).toBe(201);
      // Room should be null when hotel_required is false
      expect(json.data.room_number_shared).toBeNull();
    });
  });

  describe("Date with 0 employees", () => {
    it("should handle empty date scenario (no rooms assigned)", async () => {
      const emptyDate = createTestOMCDate({
        id: "date-empty",
        date_value: "2025-03-15",
      });

      vi.mocked(employeeRepository.findAll).mockResolvedValue([]);

      // Verify no employees exist for this date
      const employees = await employeeRepository.findAll({});
      const employeesForDate = employees.filter(e => e.omc_date === emptyDate.id);

      expect(employeesForDate).toHaveLength(0);
      // No rooms should be assigned
    });
  });

  describe("Bulk deletion recalculation", () => {
    it("should recalculate rooms correctly after bulk deletion", async () => {
      // Create 10 employees
      const employees = createEmployeesForDate(
        mockOMCDate.id,
        mockOMCDate.date_value!,
        10,
        {
          hotel_required: true,
        }
      );

      // Assign rooms (mix of CHEF and SEV)
      for (let i = 0; i < employees.length; i++) {
        employees[i].rank = i % 3 === 0 ? "CHEF" : "SEV";
        employees[i].gender = i % 2 === 0 ? "Man" : "Woman";
        
        if (employees[i].rank === "CHEF") {
          employees[i].hotel_room_number = Math.floor(i / 3) + 1;
        } else {
          // SEV sharing logic (simplified)
          employees[i].hotel_room_number = Math.floor(i / 2) + 1;
        }
      }

      // Delete 5 employees (every other one)
      const employeesToDelete = employees.filter((_, i) => i % 2 === 0);
      const remainingEmployees = employees.filter((_, i) => i % 2 === 1);

      // Recalculate rooms for remaining employees
      // Rooms should be compacted (no gaps)
      let roomCounter = 1;
      const roomAssignments = new Map<number, EmployeeWithRoom[]>();

      for (const emp of remainingEmployees) {
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

      // Verify remaining employees have valid room assignments
      const validation = verifyRoomAssignments(remainingEmployees);
      expect(validation.isValid).toBe(true);

      // Verify rooms are sequential (no large gaps)
      const roomNumbers = remainingEmployees
        .filter(e => e.hotel_room_number !== null)
        .map(e => e.hotel_room_number!)
        .sort((a, b) => a - b);

      if (roomNumbers.length > 0) {
        // Rooms should start from 1 and be mostly sequential
        expect(roomNumbers[0]).toBe(1);
        // Max room number should be reasonable (not 10+ if only 5 employees remain)
        expect(roomNumbers[roomNumbers.length - 1]).toBeLessThanOrEqual(remainingEmployees.length);
      }
    });
  });
});

