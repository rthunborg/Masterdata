import { describe, it, expect } from "vitest";
import { mapColumnToEmployeeField, getEmployeeFieldValue } from "@/lib/utils/column-mapping";
import type { Employee } from "@/lib/types/employee";

describe("column-mapping", () => {
  describe("mapColumnToEmployeeField", () => {
    it("should map 'First Name' to 'first_name'", () => {
      expect(mapColumnToEmployeeField("First Name")).toBe("first_name");
    });

    it("should map 'Surname' to 'surname'", () => {
      expect(mapColumnToEmployeeField("Surname")).toBe("surname");
    });

    it("should map 'SSN' to 'ssn'", () => {
      expect(mapColumnToEmployeeField("SSN")).toBe("ssn");
    });

    it("should map 'Email' to 'email'", () => {
      expect(mapColumnToEmployeeField("Email")).toBe("email");
    });

    it("should map 'Mobile' to 'mobile'", () => {
      expect(mapColumnToEmployeeField("Mobile")).toBe("mobile");
    });

    it("should map 'Town District' to 'town_district'", () => {
      expect(mapColumnToEmployeeField("Town District")).toBe("town_district");
    });

    it("should map 'Rank' to 'rank'", () => {
      expect(mapColumnToEmployeeField("Rank")).toBe("rank");
    });

    it("should map 'Gender' to 'gender'", () => {
      expect(mapColumnToEmployeeField("Gender")).toBe("gender");
    });

    it("should map 'Hire Date' to 'hire_date'", () => {
      expect(mapColumnToEmployeeField("Hire Date")).toBe("hire_date");
    });

    it("should map 'Termination Date' to 'termination_date'", () => {
      expect(mapColumnToEmployeeField("Termination Date")).toBe("termination_date");
    });

    it("should map 'Termination Reason' to 'termination_reason'", () => {
      expect(mapColumnToEmployeeField("Termination Reason")).toBe("termination_reason");
    });

    it("should map 'Status' to '_computed_status'", () => {
      expect(mapColumnToEmployeeField("Status")).toBe("_computed_status");
    });

    it("should map 'Comments' to 'comments'", () => {
      expect(mapColumnToEmployeeField("Comments")).toBe("comments");
    });

    it("should handle unknown column names by converting to snake_case", () => {
      expect(mapColumnToEmployeeField("Unknown Column")).toBe("unknown_column");
    });

    it("should handle single word column names", () => {
      expect(mapColumnToEmployeeField("Department")).toBe("department");
    });
  });

  describe("getEmployeeFieldValue", () => {
    const mockEmployee: Employee = {
      id: "1",
      first_name: "John",
      surname: "Doe",
      ssn: "123-45-6789",
      email: "john.doe@example.com",
      mobile: "+1234567890",
      rank: "Manager",
      gender: "Male",
      town_district: "Downtown",
      hire_date: "2020-01-15",
      termination_date: null,
      termination_reason: null,
      is_terminated: false,
      is_archived: false,
      comments: "Test comment",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };

    it("should get first name value", () => {
      expect(getEmployeeFieldValue(mockEmployee, "First Name")).toBe("John");
    });

    it("should get surname value", () => {
      expect(getEmployeeFieldValue(mockEmployee, "Surname")).toBe("Doe");
    });

    it("should get SSN value", () => {
      expect(getEmployeeFieldValue(mockEmployee, "SSN")).toBe("123-45-6789");
    });

    it("should get email value", () => {
      expect(getEmployeeFieldValue(mockEmployee, "Email")).toBe("john.doe@example.com");
    });

    it("should get mobile value", () => {
      expect(getEmployeeFieldValue(mockEmployee, "Mobile")).toBe("+1234567890");
    });

    it("should get hire date value", () => {
      expect(getEmployeeFieldValue(mockEmployee, "Hire Date")).toBe("2020-01-15");
    });

    it("should return 'Active' status for active employee", () => {
      expect(getEmployeeFieldValue(mockEmployee, "Status")).toBe("Active");
    });

    it("should return 'Terminated' status for terminated employee", () => {
      const terminatedEmployee: Employee = {
        ...mockEmployee,
        is_terminated: true,
      };
      expect(getEmployeeFieldValue(terminatedEmployee, "Status")).toBe("Terminated");
    });

    it("should return 'Archived' status for archived employee", () => {
      const archivedEmployee: Employee = {
        ...mockEmployee,
        is_archived: true,
      };
      expect(getEmployeeFieldValue(archivedEmployee, "Status")).toBe("Archived");
    });

    it("should prioritize archived over terminated", () => {
      const archivedAndTerminatedEmployee: Employee = {
        ...mockEmployee,
        is_archived: true,
        is_terminated: true,
      };
      expect(getEmployeeFieldValue(archivedAndTerminatedEmployee, "Status")).toBe("Archived");
    });

    it("should return null for null values", () => {
      const employeeWithNulls: Employee = {
        ...mockEmployee,
        email: null,
        mobile: null,
        termination_date: null,
      };
      expect(getEmployeeFieldValue(employeeWithNulls, "Email")).toBeNull();
      expect(getEmployeeFieldValue(employeeWithNulls, "Mobile")).toBeNull();
      expect(getEmployeeFieldValue(employeeWithNulls, "Termination Date")).toBeNull();
    });

    it("should handle comments", () => {
      expect(getEmployeeFieldValue(mockEmployee, "Comments")).toBe("Test comment");
    });
  });
});
