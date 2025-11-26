/**
 * Test Helper Functions for Field Validation Tests
 * 
 * Provides utilities for creating test data and verifying validation
 * in field validation and prerequisite tests.
 * 
 * Story: 11.4 - Field Validation & Prerequisites Tests
 * Task 7: Create Test Utilities
 */

import type { Employee } from "@/lib/types/employee";

/**
 * Create an employee with all prerequisites met for Crewing/Done editing
 * 
 * @param overrides - Optional field overrides
 * @returns Employee object with all 10 prerequisites set to true
 */
export function createEmployeeWithPrerequisites(
  overrides: Partial<Employee> = {}
): Partial<Employee> {
  return {
    isps: true,
    photo: true,
    origo: true,
    mail_lon: true,
    loneiva: 1, // Number field (any non-zero number counts as complete)
    bankuppgifter: true,
    li: true,
    passport: true,
    kvitto_c17_18: true,
    c17: true,
    ...overrides,
  };
}

/**
 * Set One field date with timer offset
 * 
 * @param hoursAgo - Number of hours ago the One field was set to true
 * @returns Object with one=true and one_marked_at timestamp
 */
export function setOneDateWithTimer(hoursAgo: number): {
  one: boolean;
  one_marked_at: string;
} {
  return {
    one: true,
    one_marked_at: new Date(
      Date.now() - hoursAgo * 60 * 60 * 1000
    ).toISOString(),
  };
}

/**
 * Create a basic test employee with minimal required fields
 * 
 * @param overrides - Optional field overrides
 * @returns Employee object with required fields
 */
export function createTestEmployee(
  overrides: Partial<Employee> = {}
): Employee {
  return {
    id: `emp-${Date.now()}`,
    first_name: "Test",
    surname: "Employee",
    ssn: "19900101-1234",
    email: "test@example.com",
    mobile: "+46701234567",
    rank: "SEV",
    gender: "Man",
    town_district: "Stockholm",
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
    comments: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

