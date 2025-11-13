/**
 * Test Helper Functions for Room Assignment Tests
 * 
 * Provides utilities for creating test data and verifying room assignments
 * in room assignment algorithm tests.
 * 
 * Story: 11.2 - Room Assignment Algorithm Test Suite
 * Task 7: Create Test Utilities
 */

import type { Employee } from "@/lib/types/employee";
import type { ImportantDate } from "@/lib/types/important-date";

/**
 * Extended Employee type with room assignment fields
 */
export interface EmployeeWithRoom extends Employee {
  hotel_required?: boolean;
  hotel_room_number?: number | null;
}

/**
 * Options for creating employees for a date
 */
export interface CreateEmployeesOptions {
  rank?: 'SEV' | 'CHEF';
  gender?: 'Man' | 'Woman' | null;
  hotel_required?: boolean;
  hotel_room_number?: number | null;
  hire_date?: string;
  [key: string]: any; // Allow additional fields
}

/**
 * Creates multiple employees for a specific ÖMC date
 * 
 * @param dateId - UUID of the ÖMC date
 * @param dateValue - Date value string (e.g., "2025-03-08")
 * @param count - Number of employees to create
 * @param options - Default options for all employees
 * @returns Array of created employees
 */
export function createEmployeesForDate(
  dateId: string,
  dateValue: string,
  count: number,
  options: CreateEmployeesOptions = {}
): EmployeeWithRoom[] {
  const employees: EmployeeWithRoom[] = [];
  
  for (let i = 0; i < count; i++) {
    const employee: EmployeeWithRoom = {
      id: `emp-${dateId}-${i + 1}`,
      first_name: `Test${i + 1}`,
      surname: `Employee${i + 1}`,
      ssn: `1990010${i.toString().padStart(1, '0')}-123${i}`,
      email: `test${i + 1}@example.com`,
      mobile: `+4670123456${i}`,
      rank: options.rank || 'SEV',
      gender: options.gender !== undefined ? options.gender : (i % 2 === 0 ? 'Man' : 'Woman'),
      town_district: 'Stockholm',
      hire_date: options.hire_date || `2025-01-${String(i + 1).padStart(2, '0')}`,
      omc_date: dateId,
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
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      hotel_required: options.hotel_required !== undefined ? options.hotel_required : true,
      hotel_room_number: options.hotel_room_number !== undefined ? options.hotel_room_number : null,
      ...options,
    };
    
    employees.push(employee);
  }
  
  return employees;
}

/**
 * Verifies that all room assignments for a date are correct according to FR40 algorithm
 * 
 * Validates:
 * - CHEF rooms have exactly 1 occupant
 * - SEV rooms have max 2 occupants
 * - SEV rooms have same gender occupants
 * - Room numbers are sequential and valid
 * 
 * @param employees - Array of employees for the date
 * @returns Object with validation results and room occupancy map
 */
export function verifyRoomAssignments(employees: EmployeeWithRoom[]): {
  isValid: boolean;
  errors: string[];
  rooms: Map<number, EmployeeWithRoom[]>;
} {
  const errors: string[] = [];
  const rooms = new Map<number, EmployeeWithRoom[]>();
  
  // Group employees by room number
  for (const emp of employees) {
    if (emp.hotel_required && emp.hotel_room_number !== null && emp.hotel_room_number !== undefined) {
      const roomNum = emp.hotel_room_number;
      if (!rooms.has(roomNum)) {
        rooms.set(roomNum, []);
      }
      rooms.get(roomNum)!.push(emp);
    }
  }
  
  // Validate each room
  for (const [roomNum, occupants] of rooms.entries()) {
    const chefs = occupants.filter(e => e.rank === 'CHEF');
    const sevs = occupants.filter(e => e.rank === 'SEV');
    
    // CHEF rooms must have exactly 1 occupant
    if (chefs.length > 0 && occupants.length !== 1) {
      errors.push(`Room ${roomNum}: CHEF room must have exactly 1 occupant, found ${occupants.length}`);
    }
    
    // SEV rooms must have max 2 occupants
    if (sevs.length > 0 && occupants.length > 2) {
      errors.push(`Room ${roomNum}: SEV room has ${occupants.length} occupants, max is 2`);
    }
    
    // SEV rooms must have same gender
    if (sevs.length > 0) {
      const genders = new Set(sevs.map(e => e.gender).filter((g): g is 'Man' | 'Woman' => g !== null));
      if (genders.size > 1) {
        errors.push(`Room ${roomNum}: SEV room has mixed genders: ${Array.from(genders).join(', ')}`);
      }
    }
    
    // Room number must be positive
    if (roomNum <= 0) {
      errors.push(`Room ${roomNum}: Room number must be positive`);
    }
  }
  
  // Check for duplicate room assignments (shouldn't happen, but verify)
  const allRoomNumbers = employees
    .filter(e => e.hotel_required && e.hotel_room_number !== null)
    .map(e => e.hotel_room_number!);
  const uniqueRooms = new Set(allRoomNumbers);
  if (allRoomNumbers.length !== uniqueRooms.size) {
    errors.push('Duplicate room numbers found');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    rooms,
  };
}

/**
 * Gets all occupants of a specific room for a date
 * 
 * @param employees - Array of employees for the date
 * @param roomNumber - Room number to query
 * @returns Array of employees in that room
 */
export function getRoomOccupants(
  employees: EmployeeWithRoom[],
  roomNumber: number
): EmployeeWithRoom[] {
  return employees.filter(
    emp => emp.hotel_required && 
    emp.hotel_room_number === roomNumber
  );
}

/**
 * Creates a realistic mix of employees with different ranks and genders
 * 
 * @param dateId - UUID of the ÖMC date
 * @param dateValue - Date value string
 * @param options - Configuration for the mix
 * @returns Array of employees with varied ranks and genders
 */
export function createMixedRankEmployees(
  dateId: string,
  dateValue: string,
  options: {
    chefCount?: number;
    sevCount?: number;
    genderDistribution?: 'balanced' | 'all-male' | 'all-female' | 'mixed';
  } = {}
): EmployeeWithRoom[] {
  const {
    chefCount = 3,
    sevCount = 7,
    genderDistribution = 'balanced',
  } = options;
  
  const employees: EmployeeWithRoom[] = [];
  
  // Create CHEF employees
  for (let i = 0; i < chefCount; i++) {
    const gender = genderDistribution === 'all-male' ? 'Man' :
                   genderDistribution === 'all-female' ? 'Woman' :
                   i % 2 === 0 ? 'Man' : 'Woman';
    
    employees.push(...createEmployeesForDate(dateId, dateValue, 1, {
      rank: 'CHEF',
      gender,
      hotel_required: true,
    }));
  }
  
  // Create SEV employees
  for (let i = 0; i < sevCount; i++) {
    const gender = genderDistribution === 'all-male' ? 'Man' :
                   genderDistribution === 'all-female' ? 'Woman' :
                   i % 2 === 0 ? 'Man' : 'Woman';
    
    employees.push(...createEmployeesForDate(dateId, dateValue, 1, {
      rank: 'SEV',
      gender,
      hotel_required: true,
    }));
  }
  
  return employees;
}

/**
 * Creates a test ÖMC date
 * 
 * @param overrides - Optional overrides for date properties
 * @returns Mock ImportantDate object
 */
export function createTestOMCDate(overrides: Partial<ImportantDate> = {}): ImportantDate {
  return {
    id: `date-omc-${Math.random().toString(36).substr(2, 9)}`,
    week_number: 10,
    year: 2025,
    category: 'ÖMC Dates',
    date_description: '8-9 mars',
    date_value: '2025-03-08',
    notes: null,
    time_value: null,
    max_spots: 20,
    remaining_spots: 20,
    assigned_employees: [],
    deadline_submit: null,
    deadline_cancel: null,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Gets room occupancy summary for a date
 * 
 * @param employees - Array of employees for the date
 * @returns Map of room number to occupancy details
 */
export function getRoomOccupancySummary(employees: EmployeeWithRoom[]): Map<number, {
  occupants: EmployeeWithRoom[];
  rank: 'CHEF' | 'SEV' | 'MIXED';
  gender: 'Man' | 'Woman' | 'MIXED' | null;
  occupancy: string; // e.g., "1/1", "2/2", "1/2"
}> {
  const summary = new Map<number, {
    occupants: EmployeeWithRoom[];
    rank: 'CHEF' | 'SEV' | 'MIXED';
    gender: 'Man' | 'Woman' | 'MIXED' | null;
    occupancy: string;
  }>();
  
  const rooms = new Map<number, EmployeeWithRoom[]>();
  
  for (const emp of employees) {
    if (emp.hotel_required && emp.hotel_room_number !== null) {
      const roomNum = emp.hotel_room_number;
      if (!rooms.has(roomNum)) {
        rooms.set(roomNum, []);
      }
      rooms.get(roomNum)!.push(emp);
    }
  }
  
  for (const [roomNum, occupants] of rooms.entries()) {
    const ranks = new Set(occupants.map(e => e.rank));
    const genders = new Set(occupants.map(e => e.gender).filter((g): g is 'Man' | 'Woman' => g !== null));
    
    const rank: 'CHEF' | 'SEV' | 'MIXED' = ranks.size > 1 ? 'MIXED' :
                                             occupants[0]?.rank === 'CHEF' ? 'CHEF' : 'SEV';
    
    const gender: 'Man' | 'Woman' | 'MIXED' | null = genders.size > 1 ? 'MIXED' :
                                                      genders.size === 1 ? Array.from(genders)[0] : null;
    
    const maxOccupancy = rank === 'CHEF' ? 1 : 2;
    const occupancy = `${occupants.length}/${maxOccupancy}`;
    
    summary.set(roomNum, {
      occupants,
      rank,
      gender,
      occupancy,
    });
  }
  
  return summary;
}

