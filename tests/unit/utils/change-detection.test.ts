/**
 * Unit tests for change detection utility
 */

import { describe, it, expect } from "vitest";
import {
  detectViewImpact,
  employeeMatchesFilters,
  getChangedField,
  formatNotification,
  formatBatchedNotification,
} from "@/lib/utils/change-detection";
import type { Employee } from "@/lib/types/employee";
import type { ViewState, NotificationMetadata } from "@/lib/types/notifications";

describe("detectViewImpact", () => {
  const createEmployee = (overrides: Partial<Employee>): Employee => ({
    id: "1",
    first_name: "John",
    surname: "Doe",
    ssn: "123456-7890",
    email: "john@example.com",
    mobile: null,
    rank: null,
    gender: null,
    town_district: null,
    hire_date: "2025-01-01",
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    comments: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  });

  it('returns "added" when employee enters view', () => {
    const oldEmployee = createEmployee({ hire_date: "2024-12-01" });
    const newEmployee = createEmployee({ hire_date: "2025-01-15" });
    const viewState: ViewState = {
      visibleEmployeeIds: new Set(), // Employee wasn't visible before
      activeFilters: {},
      activeSortColumn: null,
      activeSortDirection: null,
    };

    const result = detectViewImpact(oldEmployee, newEmployee, viewState);
    expect(result).toBe("added");
  });

  it('returns "removed" when employee leaves view', () => {
    const oldEmployee = createEmployee({ is_archived: false });
    const newEmployee = createEmployee({ is_archived: true });
    const viewState: ViewState = {
      visibleEmployeeIds: new Set(["1"]), // Employee was visible before
      activeFilters: { includeArchived: false },
      activeSortColumn: null,
      activeSortDirection: null,
    };

    const result = detectViewImpact(oldEmployee, newEmployee, viewState);
    expect(result).toBe("removed");
  });

  it('returns "updated" when employee stays in view', () => {
    const oldEmployee = createEmployee({ first_name: "John" });
    const newEmployee = createEmployee({ first_name: "Jonathan" });
    const viewState: ViewState = {
      visibleEmployeeIds: new Set(["1"]),
      activeFilters: {},
      activeSortColumn: null,
      activeSortDirection: null,
    };

    const result = detectViewImpact(oldEmployee, newEmployee, viewState);
    expect(result).toBe("updated");
  });

  it("returns null when change does not affect view", () => {
    const oldEmployee = createEmployee({ is_archived: true });
    const newEmployee = createEmployee({ is_archived: true, email: "newemail@example.com" });
    const viewState: ViewState = {
      visibleEmployeeIds: new Set(), // Employee not visible
      activeFilters: { includeArchived: false },
      activeSortColumn: null,
      activeSortDirection: null,
    };

    const result = detectViewImpact(oldEmployee, newEmployee, viewState);
    expect(result).toBeNull();
  });

  it('returns "added" for INSERT event (oldEmployee is null)', () => {
    const newEmployee = createEmployee();
    const viewState: ViewState = {
      visibleEmployeeIds: new Set(),
      activeFilters: {},
      activeSortColumn: null,
      activeSortDirection: null,
    };

    const result = detectViewImpact(null, newEmployee, viewState);
    expect(result).toBe("added");
  });
});

describe("employeeMatchesFilters", () => {
  const createEmployee = (overrides: Partial<Employee>): Employee => ({
    id: "1",
    first_name: "John",
    surname: "Doe",
    ssn: "123456-7890",
    email: "john@example.com",
    mobile: null,
    rank: null,
    gender: null,
    town_district: null,
    hire_date: "2025-01-01",
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    comments: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  });

  it("returns false when archived employee and includeArchived is false", () => {
    const employee = createEmployee({ is_archived: true });
    const filters = { includeArchived: false };

    const result = employeeMatchesFilters(employee, filters);
    expect(result).toBe(false);
  });

  it("returns true when archived employee and includeArchived is true", () => {
    const employee = createEmployee({ is_archived: true });
    const filters = { includeArchived: true };

    const result = employeeMatchesFilters(employee, filters);
    expect(result).toBe(true);
  });

  it("returns false when terminated employee and includeTerminated is false", () => {
    const employee = createEmployee({ is_terminated: true });
    const filters = { includeTerminated: false };

    const result = employeeMatchesFilters(employee, filters);
    expect(result).toBe(false);
  });

  it("returns true when employee matches global filter", () => {
    const employee = createEmployee({ first_name: "Alice" });
    const filters = { globalFilter: "alice" };

    const result = employeeMatchesFilters(employee, filters);
    expect(result).toBe(true);
  });

  it("returns false when employee does not match global filter", () => {
    const employee = createEmployee({ first_name: "Alice" });
    const filters = { globalFilter: "bob" };

    const result = employeeMatchesFilters(employee, filters);
    expect(result).toBe(false);
  });

  it("returns true when no filters are applied", () => {
    const employee = createEmployee();
    const filters = {};

    const result = employeeMatchesFilters(employee, filters);
    expect(result).toBe(true);
  });
});

describe("getChangedField", () => {
  const createEmployee = (overrides: Partial<Employee>): Employee => ({
    id: "1",
    first_name: "John",
    surname: "Doe",
    ssn: "123456-7890",
    email: "john@example.com",
    mobile: null,
    rank: null,
    gender: null,
    town_district: null,
    hire_date: "2025-01-01",
    termination_date: null,
    termination_reason: null,
    is_terminated: false,
    is_archived: false,
    comments: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  });

  it("detects first name change", () => {
    const oldEmployee = createEmployee({ first_name: "John" });
    const newEmployee = createEmployee({ first_name: "Jonathan" });

    const result = getChangedField(oldEmployee, newEmployee);
    expect(result).toBe("First Name");
  });

  it("detects email change", () => {
    const oldEmployee = createEmployee({ email: "old@example.com" });
    const newEmployee = createEmployee({ email: "new@example.com" });

    const result = getChangedField(oldEmployee, newEmployee);
    expect(result).toBe("Email");
  });

  it("detects archive status change", () => {
    const oldEmployee = createEmployee({ is_archived: false });
    const newEmployee = createEmployee({ is_archived: true });

    const result = getChangedField(oldEmployee, newEmployee);
    expect(result).toBe("Archive Status");
  });

  it("returns undefined when no tracked field changed", () => {
    const oldEmployee = createEmployee();
    const newEmployee = createEmployee({ updated_at: "2025-01-02T00:00:00Z" });

    const result = getChangedField(oldEmployee, newEmployee);
    expect(result).toBeUndefined();
  });
});

describe("formatNotification", () => {
  it('formats "added" notification', () => {
    const notification: NotificationMetadata = {
      type: "added",
      employeeId: "1",
      employeeName: "John Doe",
      timestamp: new Date(),
    };

    const result = formatNotification(notification);
    expect(result).toBe("1 new employee matches your filters: John Doe");
  });

  it('formats "removed" notification', () => {
    const notification: NotificationMetadata = {
      type: "removed",
      employeeId: "1",
      employeeName: "John Doe",
      timestamp: new Date(),
    };

    const result = formatNotification(notification);
    expect(result).toBe("1 employee no longer matches your filters: John Doe");
  });

  it('formats "updated" notification with changed field', () => {
    const notification: NotificationMetadata = {
      type: "updated",
      employeeId: "1",
      employeeName: "John Doe",
      changedField: "Email",
      timestamp: new Date(),
    };

    const result = formatNotification(notification);
    expect(result).toBe("Employee John Doe was updated (Email changed)");
  });

  it('formats "updated" notification without changed field', () => {
    const notification: NotificationMetadata = {
      type: "updated",
      employeeId: "1",
      employeeName: "John Doe",
      timestamp: new Date(),
    };

    const result = formatNotification(notification);
    expect(result).toBe("Employee John Doe was updated");
  });
});

describe("formatBatchedNotification", () => {
  it("formats single notification", () => {
    const notifications: NotificationMetadata[] = [
      {
        type: "added",
        employeeId: "1",
        employeeName: "John Doe",
        timestamp: new Date(),
      },
    ];

    const result = formatBatchedNotification(notifications);
    expect(result).toBe("1 new employee matches your filters: John Doe");
  });

  it("formats multiple added notifications", () => {
    const notifications: NotificationMetadata[] = [
      {
        type: "added",
        employeeId: "1",
        employeeName: "Alice",
        timestamp: new Date(),
      },
      {
        type: "added",
        employeeId: "2",
        employeeName: "Bob",
        timestamp: new Date(),
      },
      {
        type: "added",
        employeeId: "3",
        employeeName: "Charlie",
        timestamp: new Date(),
      },
    ];

    const result = formatBatchedNotification(notifications);
    expect(result).toBe("3 new employees match your filters");
  });

  it("formats multiple removed notifications", () => {
    const notifications: NotificationMetadata[] = [
      {
        type: "removed",
        employeeId: "1",
        employeeName: "Alice",
        timestamp: new Date(),
      },
      {
        type: "removed",
        employeeId: "2",
        employeeName: "Bob",
        timestamp: new Date(),
      },
    ];

    const result = formatBatchedNotification(notifications);
    expect(result).toBe("2 employees no longer match your filters");
  });

  it("returns empty string for empty array", () => {
    const notifications: NotificationMetadata[] = [];

    const result = formatBatchedNotification(notifications);
    expect(result).toBe("");
  });
});

describe("Performance", () => {
  it("notification logic executes in <100ms", () => {
    const employees = Array.from({ length: 1000 }, (_, i) => ({
      id: `${i}`,
      first_name: `Employee${i}`,
      surname: "Test",
      ssn: "123456-7890",
      email: `employee${i}@example.com`,
      mobile: null,
      rank: null,
      gender: null,
      town_district: null,
      hire_date: "2025-01-01",
      termination_date: null,
      termination_reason: null,
      is_terminated: false,
      is_archived: false,
      comments: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    }));

    const oldEmployee = employees[500];
    const newEmployee = { ...employees[500], email: "newemail@example.com" };
    const viewState: ViewState = {
      visibleEmployeeIds: new Set(employees.map((e) => e.id)),
      activeFilters: {},
      activeSortColumn: null,
      activeSortDirection: null,
    };

    const startTime = performance.now();
    const notificationType = detectViewImpact(oldEmployee, newEmployee, viewState);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(100);
    expect(notificationType).toBe("updated");
  });
});
