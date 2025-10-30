import { describe, it, expect } from "vitest";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  type CreateEmployeeInput,
} from "@/lib/validation/employee-schema";

describe("createEmployeeSchema", () => {
  const validEmployeeData: CreateEmployeeInput = {
    first_name: "John",
    surname: "Doe",
    ssn: "19850315-1234",
    email: "john.doe@example.com",
    mobile: "+46701234567",
    rank: "CHEF",
    gender: "Male",
    town_district: "Stockholm",
    hire_date: "2024-01-15",
    comments: "New hire",
    is_terminated: false,
    is_archived: false,
    termination_date: null,
    termination_reason: null,
  };

  describe("required fields validation", () => {
    it("should validate complete valid employee data", () => {
      const result = createEmployeeSchema.parse(validEmployeeData);
      expect(result.first_name).toBe("John");
      expect(result.surname).toBe("Doe");
      expect(result.ssn).toBe("19850315-1234");
      expect(result.email).toBe("john.doe@example.com");
    });

    it("should reject missing first_name", () => {
      const data = { ...validEmployeeData, first_name: "" };
      expect(() => createEmployeeSchema.parse(data)).toThrow("First name is required");
    });

    it("should reject missing surname", () => {
      const data = { ...validEmployeeData, surname: "" };
      expect(() => createEmployeeSchema.parse(data)).toThrow("Surname is required");
    });

    it("should reject missing ssn", () => {
      const data = { ...validEmployeeData, ssn: "" };
      expect(() => createEmployeeSchema.parse(data)).toThrow("SSN is required");
    });

    it("should reject missing email", () => {
      const data = { ...validEmployeeData, email: "" };
      expect(() => createEmployeeSchema.parse(data)).toThrow("Email is required");
    });

    it("should reject missing hire_date", () => {
      const data = { ...validEmployeeData, hire_date: "" };
      expect(() => createEmployeeSchema.parse(data)).toThrow("Hire date is required");
    });
  });

  describe("email format validation", () => {
    it("should accept valid email formats", () => {
      const validEmails = [
        "test@example.com",
        "user.name@company.co.uk",
        "first+last@domain.org",
      ];
      
      validEmails.forEach((email) => {
        const data = { ...validEmployeeData, email };
        const result = createEmployeeSchema.parse(data);
        expect(result.email).toBe(email);
      });
    });

    it("should reject invalid email formats", () => {
      const invalidEmails = [
        "notanemail",
        "missing@domain",
        "@nodomain.com",
        "spaces in@email.com",
      ];

      invalidEmails.forEach((email) => {
        const data = { ...validEmployeeData, email };
        expect(() => createEmployeeSchema.parse(data)).toThrow("Invalid email format");
      });
    });
  });

  describe("SSN format validation", () => {
    it("should accept valid SSN formats", () => {
      const validSSNs = [
        "19850315-1234", // Full year format
        "850315-1234",   // Short year format
        "20001225-5678", // Y2K+ format
      ];

      validSSNs.forEach((ssn) => {
        const data = { ...validEmployeeData, ssn };
        const result = createEmployeeSchema.parse(data);
        expect(result.ssn).toBe(ssn);
      });
    });

    it("should reject invalid SSN formats", () => {
      const invalidSSNs = [
        "123456-12345",    // Too many digits after dash
        "1234567-123",     // Too few digits after dash
        "12345-1234",      // Too few digits before dash
        "123456789-1234",  // Too many digits before dash
        "850315+1234",     // Wrong separator
        "123456789",       // 9 digits (invalid length)
        "12345678901",     // 11 digits (invalid length)
      ];

      invalidSSNs.forEach((ssn) => {
        const data = { ...validEmployeeData, ssn };
        expect(() => createEmployeeSchema.parse(data)).toThrow(/SSN must be in format/);
      });
    });
  });

  describe("hire_date validation", () => {
    it("should accept valid past dates", () => {
      const validDates = [
        "2024-01-15",
        "2020-12-31",
        "2000-01-01",
      ];

      validDates.forEach((hire_date) => {
        const data = { ...validEmployeeData, hire_date };
        const result = createEmployeeSchema.parse(data);
        expect(result.hire_date).toBe(hire_date);
      });
    });

    it("should accept today's date", () => {
      const today = new Date().toISOString().split("T")[0];
      const data = { ...validEmployeeData, hire_date: today };
      const result = createEmployeeSchema.parse(data);
      expect(result.hire_date).toBe(today);
    });

    it("should reject future dates", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const futureDate = tomorrow.toISOString().split("T")[0];
      
      const data = { ...validEmployeeData, hire_date: futureDate };
      expect(() => createEmployeeSchema.parse(data)).toThrow("Hire date cannot be in the future");
    });

    it("should reject invalid date formats", () => {
      const invalidDates = [
        "not-a-date",
        "32-13-2024",
        "2024/01/15",
      ];

      invalidDates.forEach((hire_date) => {
        const data = { ...validEmployeeData, hire_date };
        expect(() => createEmployeeSchema.parse(data)).toThrow("Invalid date format");
      });
    });
  });

  describe("gender validation", () => {
    it("should accept valid gender values", () => {
      const validGenders = ["Male", "Female", "Other", "Prefer not to say"];

      validGenders.forEach((gender) => {
        const data = { ...validEmployeeData, gender };
        const result = createEmployeeSchema.parse(data);
        expect(result.gender).toBe(gender);
      });
    });

    it("should accept null for optional gender", () => {
      const data = { ...validEmployeeData, gender: null };
      const result = createEmployeeSchema.parse(data);
      expect(result.gender).toBeNull();
    });

    it("should reject invalid gender values", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = { ...validEmployeeData, gender: "InvalidGender" as any };
      expect(() => createEmployeeSchema.parse(data)).toThrow();
    });
  });

  describe("optional fields validation", () => {
    it("should accept null for optional fields", () => {
      const data: CreateEmployeeInput = {
        first_name: "Jane",
        surname: "Smith",
        ssn: "19900101-5678",
        email: "jane@example.com",
        hire_date: "2024-01-01",
        mobile: null,
        rank: null,
        gender: null,
        town_district: null,
        comments: null,
        is_terminated: false,
        is_archived: false,
        termination_date: null,
        termination_reason: null,
      };

      const result = createEmployeeSchema.parse(data);
      expect(result.mobile).toBeNull();
      expect(result.rank).toBeNull();
      expect(result.gender).toBeNull();
      expect(result.town_district).toBeNull();
      expect(result.comments).toBeNull();
    });

    it("should accept valid string values for optional fields", () => {
      const result = createEmployeeSchema.parse(validEmployeeData);
      expect(result.mobile).toBe("+46701234567");
      expect(result.rank).toBe("CHEF");
      expect(result.town_district).toBe("Stockholm");
      expect(result.comments).toBe("New hire");
    });
  });

  describe("system-managed fields with defaults", () => {
    it("should apply default values for system fields", () => {
      const minimalData = {
        first_name: "Test",
        surname: "User",
        ssn: "19950101-1234",
        email: "test@example.com",
        hire_date: "2024-01-01",
      };

      const result = createEmployeeSchema.parse(minimalData);
      expect(result.is_terminated).toBe(false);
      expect(result.is_archived).toBe(false);
      expect(result.termination_date).toBeNull();
      expect(result.termination_reason).toBeNull();
    });
  });

  describe("field length validation", () => {
    it("should reject first_name longer than 100 characters", () => {
      const data = { ...validEmployeeData, first_name: "a".repeat(101) };
      expect(() => createEmployeeSchema.parse(data)).toThrow("First name must be less than 100 characters");
    });

    it("should reject surname longer than 100 characters", () => {
      const data = { ...validEmployeeData, surname: "a".repeat(101) };
      expect(() => createEmployeeSchema.parse(data)).toThrow("Surname must be less than 100 characters");
    });

    it("should accept names at maximum length", () => {
      const data = {
        ...validEmployeeData,
        first_name: "a".repeat(100),
        surname: "b".repeat(100),
      };
      const result = createEmployeeSchema.parse(data);
      expect(result.first_name.length).toBe(100);
      expect(result.surname.length).toBe(100);
    });
  });
});

describe("updateEmployeeSchema", () => {
  it("should accept partial updates with single field", () => {
    const partialUpdate = {
      first_name: "UpdatedName",
    };

    const result = updateEmployeeSchema.parse(partialUpdate);
    expect(result.first_name).toBe("UpdatedName");
  });

  it("should accept partial updates with multiple fields", () => {
    const partialUpdate = {
      email: "newemail@example.com",
      mobile: "+46709876543",
    };

    const result = updateEmployeeSchema.parse(partialUpdate);
    expect(result.email).toBe("newemail@example.com");
    expect(result.mobile).toBe("+46709876543");
  });

  it("should reject empty object (no fields provided)", () => {
    expect(() => updateEmployeeSchema.parse({})).toThrow("At least one field must be provided for update");
  });

  it("should validate email format for updates", () => {
    const invalidUpdate = {
      email: "not-an-email",
    };

    expect(() => updateEmployeeSchema.parse(invalidUpdate)).toThrow("Invalid email format");
  });

  it("should validate SSN format for updates", () => {
    const invalidUpdate = {
      ssn: "invalid-ssn",
    };

    expect(() => updateEmployeeSchema.parse(invalidUpdate)).toThrow(/SSN must be in format/);
  });

  it("should validate date format for updates", () => {
    const invalidUpdate = {
      hire_date: "not-a-date",
    };

    expect(() => updateEmployeeSchema.parse(invalidUpdate)).toThrow("Invalid date format");
  });

  it("should allow nullable fields to be set to null", () => {
    const update = { 
      mobile: null,
      comments: null,
    };
    
    const result = updateEmployeeSchema.parse(update);
    expect(result.mobile).toBeNull();
    expect(result.comments).toBeNull();
  });

  it("should validate gender enum for updates", () => {
    const validUpdate = {
      gender: "Female" as const,
    };

    const result = updateEmployeeSchema.parse(validUpdate);
    expect(result.gender).toBe("Female");
  });

  it("should allow all fields to be optional", () => {
    const update = {
      email: "test@example.com",
      // All other fields omitted - should be valid
    };

    const result = updateEmployeeSchema.parse(update);
    expect(result.email).toBe("test@example.com");
    expect(result.first_name).toBeUndefined();
    expect(result.surname).toBeUndefined();
  });
});
