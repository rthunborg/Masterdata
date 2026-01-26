import { describe, it, expect } from "vitest";
import {
  normalizeColumnName,
  resolveColumnAlias,
  columnNamesMatch,
} from "@/lib/utils/column-aliases";

describe("column-aliases utility", () => {
  describe("normalizeColumnName", () => {
    it("converts to lowercase", () => {
      expect(normalizeColumnName("First_Name")).toBe("first_name");
      expect(normalizeColumnName("SSN")).toBe("ssn");
    });

    it("trims whitespace", () => {
      expect(normalizeColumnName("  first_name  ")).toBe("first_name");
      expect(normalizeColumnName(" email ")).toBe("email");
    });

    it("replaces spaces with underscores", () => {
      expect(normalizeColumnName("First Name")).toBe("first_name");
      expect(normalizeColumnName("Social Security Number")).toBe(
        "social_security_number"
      );
      expect(normalizeColumnName("Town   District")).toBe("town_district");
    });

    it("handles combined transformations", () => {
      expect(normalizeColumnName("  Social Security Number  ")).toBe(
        "social_security_number"
      );
      expect(normalizeColumnName("  FIRST NAME  ")).toBe("first_name");
    });
  });

  describe("resolveColumnAlias", () => {
    describe("SSN aliases", () => {
      it("resolves ssn variations to ssn", () => {
        expect(resolveColumnAlias("ssn")).toBe("ssn");
        expect(resolveColumnAlias("social_security_no")).toBe("ssn");
        expect(resolveColumnAlias("social_security_number")).toBe("ssn");
        expect(resolveColumnAlias("personal_number")).toBe("ssn");
        expect(resolveColumnAlias("personnummer")).toBe("ssn");
      });

      it("handles SSN with mixed case and spaces", () => {
        expect(resolveColumnAlias("Social Security Number")).toBe("ssn");
        expect(resolveColumnAlias("SOCIAL SECURITY NO")).toBe("ssn");
        expect(resolveColumnAlias("Personal Number")).toBe("ssn");
      });
    });

    describe("Name field aliases", () => {
      it("resolves first name variations", () => {
        expect(resolveColumnAlias("first_name")).toBe("first_name");
        expect(resolveColumnAlias("firstname")).toBe("first_name");
        expect(resolveColumnAlias("given_name")).toBe("first_name");
        expect(resolveColumnAlias("First Name")).toBe("first_name");
      });

      it("resolves surname variations", () => {
        expect(resolveColumnAlias("surname")).toBe("surname");
        expect(resolveColumnAlias("last_name")).toBe("surname");
        expect(resolveColumnAlias("lastname")).toBe("surname");
        expect(resolveColumnAlias("family_name")).toBe("surname");
        expect(resolveColumnAlias("Last Name")).toBe("surname");
      });
    });

    describe("Contact field aliases", () => {
      it("resolves email variations", () => {
        expect(resolveColumnAlias("email")).toBe("email");
        expect(resolveColumnAlias("e-mail")).toBe("email");
        expect(resolveColumnAlias("email_address")).toBe("email");
        expect(resolveColumnAlias("E-Mail")).toBe("email");
      });

      it("resolves mobile variations", () => {
        expect(resolveColumnAlias("mobile")).toBe("mobile");
        expect(resolveColumnAlias("phone")).toBe("mobile");
        expect(resolveColumnAlias("mobile_phone")).toBe("mobile");
        expect(resolveColumnAlias("telephone")).toBe("mobile");
      });
    });

    describe("Position field aliases", () => {
      it("resolves rank variations", () => {
        expect(resolveColumnAlias("rank")).toBe("rank");
        expect(resolveColumnAlias("position")).toBe("rank");
        expect(resolveColumnAlias("title")).toBe("rank");
      });
    });

    describe("Date field aliases", () => {
      it("resolves hire date variations", () => {
        expect(resolveColumnAlias("hire_date")).toBe("hire_date");
        expect(resolveColumnAlias("start_date")).toBe("hire_date");
        expect(resolveColumnAlias("employment_date")).toBe("hire_date");
        expect(resolveColumnAlias("joining_date")).toBe("hire_date");
      });

      it("resolves termination date variations", () => {
        expect(resolveColumnAlias("termination_date")).toBe("termination_date");
        expect(resolveColumnAlias("end_date")).toBe("termination_date");
        expect(resolveColumnAlias("leaving_date")).toBe("termination_date");
        expect(resolveColumnAlias("exit_date")).toBe("termination_date");
      });
    });

    describe("Text field aliases", () => {
      it("resolves comments variations", () => {
        expect(resolveColumnAlias("comments")).toBe("comments");
        expect(resolveColumnAlias("comment")).toBe("comments");
        expect(resolveColumnAlias("notes")).toBe("comments");
        expect(resolveColumnAlias("note")).toBe("comments");
        expect(resolveColumnAlias("remarks")).toBe("comments");
      });

      it("resolves termination reason variations", () => {
        expect(resolveColumnAlias("termination_reason")).toBe(
          "termination_reason"
        );
        expect(resolveColumnAlias("reason")).toBe("termination_reason");
        expect(resolveColumnAlias("exit_reason")).toBe("termination_reason");
      });
    });

    describe("Location field aliases", () => {
      it("resolves town district variations", () => {
        expect(resolveColumnAlias("town_district")).toBe("town_district");
        expect(resolveColumnAlias("town")).toBe("town_district");
        expect(resolveColumnAlias("district")).toBe("town_district");
        expect(resolveColumnAlias("location")).toBe("town_district");
      });
    });

    describe("Gender field aliases", () => {
      it("resolves gender variations", () => {
        expect(resolveColumnAlias("gender")).toBe("gender");
        expect(resolveColumnAlias("sex")).toBe("gender");
      });
    });

    describe("Special diet aliases", () => {
      it("resolves special diet variations", () => {
        expect(resolveColumnAlias("special_diet")).toBe("special_diet");
        expect(resolveColumnAlias("specialkost")).toBe("special_diet");
      });

      it("resolves diet details variations", () => {
        expect(resolveColumnAlias("diet")).toBe("diet_details");
        expect(resolveColumnAlias("diet_details")).toBe("diet_details");
      });
    });

    describe("Salary field aliases", () => {
      it("resolves salary level variations", () => {
        expect(resolveColumnAlias("loneiva")).toBe("loneiva");
        expect(resolveColumnAlias("salary_level")).toBe("loneiva");
        expect(resolveColumnAlias("lönenivå")).toBe("loneiva");
      });
    });

    describe("Unknown columns", () => {
      it("returns normalized name for unmapped columns", () => {
        expect(resolveColumnAlias("unknown_field")).toBe("unknown_field");
        expect(resolveColumnAlias("custom_column")).toBe("custom_column");
        expect(resolveColumnAlias("New Field")).toBe("new_field");
      });
    });
  });

  describe("columnNamesMatch", () => {
    it("matches identical column names", () => {
      expect(columnNamesMatch("ssn", "ssn")).toBe(true);
      expect(columnNamesMatch("first_name", "first_name")).toBe(true);
      expect(columnNamesMatch("email", "email")).toBe(true);
    });

    it("matches column name aliases", () => {
      expect(columnNamesMatch("ssn", "social_security_no")).toBe(true);
      expect(columnNamesMatch("ssn", "social_security_number")).toBe(true);
      expect(columnNamesMatch("ssn", "personal_number")).toBe(true);
      expect(columnNamesMatch("social_security_no", "ssn")).toBe(true);
    });

    it("matches with different casing", () => {
      expect(columnNamesMatch("SSN", "social_security_no")).toBe(true);
      expect(columnNamesMatch("First Name", "firstname")).toBe(true);
      expect(columnNamesMatch("SURNAME", "last_name")).toBe(true);
    });

    it("matches with spaces vs underscores", () => {
      expect(columnNamesMatch("first name", "first_name")).toBe(true);
      expect(columnNamesMatch("Social Security Number", "ssn")).toBe(true);
      expect(columnNamesMatch("Last Name", "surname")).toBe(true);
    });

    it("does not match different columns", () => {
      expect(columnNamesMatch("ssn", "email")).toBe(false);
      expect(columnNamesMatch("first_name", "surname")).toBe(false);
      expect(columnNamesMatch("mobile", "email")).toBe(false);
    });

    it("handles whitespace variations", () => {
      expect(columnNamesMatch("  SSN  ", "social_security_no")).toBe(true);
      expect(columnNamesMatch("first_name", "  First Name  ")).toBe(true);
    });

    it("handles complex real-world scenarios", () => {
      // CSV import header: "Social Security Number" should match db column: "ssn"
      expect(columnNamesMatch("Social Security Number", "ssn")).toBe(true);

      // column_config db_column_name: "social_security_no" should match EXPORTABLE_EMPLOYEE_FIELDS key: "ssn"
      expect(columnNamesMatch("social_security_no", "ssn")).toBe(true);

      // User-facing label: "First Name" should match db column: "first_name"
      expect(columnNamesMatch("First Name", "first_name")).toBe(true);

      // Import header: "Position" should match db column: "rank"
      expect(columnNamesMatch("Position", "rank")).toBe(true);
    });
  });
});
