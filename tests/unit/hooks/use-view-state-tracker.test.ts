/**
 * Unit tests for ViewStateTracker hook
 */

import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useViewStateTracker } from "@/lib/hooks/use-view-state-tracker";
import type { Employee } from "@/lib/types/employee";

describe("useViewStateTracker", () => {
  const createEmployee = (id: string, overrides: Partial<Employee> = {}): Employee => ({
    id,
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

  it("tracks visible employee IDs", () => {
    const employees = [
      createEmployee("1", { first_name: "John" }),
      createEmployee("2", { first_name: "Jane" }),
    ];

    const { result } = renderHook(() =>
      useViewStateTracker({
        employees,
        filters: {},
        sort: undefined,
      })
    );

    expect(result.current.visibleEmployeeIds.size).toBe(2);
    expect(result.current.visibleEmployeeIds.has("1")).toBe(true);
    expect(result.current.visibleEmployeeIds.has("2")).toBe(true);
  });

  it("updates visibleEmployeeIds when employees change", () => {
    const employees = [createEmployee("1")];

    const { result, rerender } = renderHook(
      ({ employees }) =>
        useViewStateTracker({
          employees,
          filters: {},
          sort: undefined,
        }),
      { initialProps: { employees } }
    );

    expect(result.current.visibleEmployeeIds.size).toBe(1);

    // Update employees (filter applied)
    const filteredEmployees: Employee[] = [];
    rerender({ employees: filteredEmployees });

    expect(result.current.visibleEmployeeIds.size).toBe(0);
  });

  it("updates activeFilters when filters prop changes", () => {
    const employees = [createEmployee("1")];
    const initialFilters = { includeArchived: false };

    const { result, rerender } = renderHook(
      ({ filters }) =>
        useViewStateTracker({
          employees,
          filters,
          sort: undefined,
        }),
      { initialProps: { filters: initialFilters } }
    );

    expect(result.current.activeFilters.includeArchived).toBe(false);

    // Update filters
    const updatedFilters = { includeArchived: true };
    rerender({ filters: updatedFilters });

    expect(result.current.activeFilters.includeArchived).toBe(true);
  });

  it("updates sort state when sort prop changes", () => {
    const employees = [createEmployee("1")];
    const initialSort = { column: "first_name", direction: "asc" as const };

    const { result, rerender } = renderHook(
      ({ sort }) =>
        useViewStateTracker({
          employees,
          filters: {},
          sort,
        }),
      { initialProps: { sort: initialSort } }
    );

    expect(result.current.activeSortColumn).toBe("first_name");
    expect(result.current.activeSortDirection).toBe("asc");

    // Update sort
    const updatedSort = { column: "surname", direction: "desc" as const };
    rerender({ sort: updatedSort });

    expect(result.current.activeSortColumn).toBe("surname");
    expect(result.current.activeSortDirection).toBe("desc");
  });

  it("handles undefined sort state", () => {
    const employees = [createEmployee("1")];

    const { result } = renderHook(() =>
      useViewStateTracker({
        employees,
        filters: {},
        sort: undefined,
      })
    );

    expect(result.current.activeSortColumn).toBeNull();
    expect(result.current.activeSortDirection).toBeNull();
  });

  it("tracks globalFilter in activeFilters", () => {
    const employees = [createEmployee("1")];
    const filters = { globalFilter: "john" };

    const { result } = renderHook(() =>
      useViewStateTracker({
        employees,
        filters,
        sort: undefined,
      })
    );

    expect(result.current.activeFilters.globalFilter).toBe("john");
  });

  it("updates all state simultaneously when all props change", () => {
    const employees1 = [createEmployee("1"), createEmployee("2")];
    const filters1 = { includeArchived: false };
    const sort1 = { column: "first_name", direction: "asc" as const };

    const { result, rerender } = renderHook(
      ({ employees, filters, sort }) =>
        useViewStateTracker({ employees, filters, sort }),
      { initialProps: { employees: employees1, filters: filters1, sort: sort1 } }
    );

    expect(result.current.visibleEmployeeIds.size).toBe(2);
    expect(result.current.activeFilters.includeArchived).toBe(false);
    expect(result.current.activeSortColumn).toBe("first_name");

    // Update all props
    const employees2 = [createEmployee("3")];
    const filters2 = { includeArchived: true };
    const sort2 = { column: "surname", direction: "desc" as const };

    rerender({ employees: employees2, filters: filters2, sort: sort2 });

    expect(result.current.visibleEmployeeIds.size).toBe(1);
    expect(result.current.visibleEmployeeIds.has("3")).toBe(true);
    expect(result.current.activeFilters.includeArchived).toBe(true);
    expect(result.current.activeSortColumn).toBe("surname");
    expect(result.current.activeSortDirection).toBe("desc");
  });
});
