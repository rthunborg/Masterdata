import { NextRequest, NextResponse } from "next/server";
import { requireHRAdminAPI, createErrorResponse } from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import { csvImportEmployeeSchema } from "@/lib/validation/employee-schema";
import Papa from "papaparse";
import type { EmployeeFormData } from "@/lib/types/employee";
import { z } from "zod";

interface CSVRow {
  [key: string]: string;
}

interface ImportError {
  row: number;
  error: string;
  data: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    // Require HR Admin authentication
    await requireHRAdminAPI();

    // Parse multipart/form-data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "No file provided",
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith(".csv")) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "File must be a CSV file",
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.text();

    // Parse CSV using papaparse
    const parseResult = await new Promise<Papa.ParseResult<CSVRow>>((resolve, reject) => {
      Papa.parse<CSVRow>(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => {
          // Normalize headers to match database field names
          const normalized = header.toLowerCase().trim().replace(/\s+/g, "_");
          
          // Map common variations
          const mappings: Record<string, string> = {
            "first_name": "first_name",
            "firstname": "first_name",
            "given_name": "first_name",
            "surname": "surname",
            "last_name": "surname",
            "lastname": "surname",
            "family_name": "surname",
            "ssn": "ssn",
            "social_security_no": "ssn",
            "social_security_number": "ssn",
            "personal_number": "ssn",
            "email": "email",
            "mobile": "mobile",
            "phone": "mobile",
            "mobile_phone": "mobile",
            "rank": "rank",
            "position": "rank",
            "title": "rank",
            "gender": "gender",
            "sex": "gender",
            "town_district": "town_district",
            "town": "town_district",
            "district": "town_district",
            "location": "town_district",
            "hire_date": "hire_date",
            "start_date": "hire_date",
            "employment_date": "hire_date",
            "comments": "comments",
            "notes": "comments",
            "remarks": "comments",
          };

          return mappings[normalized] || normalized;
        },
        complete: resolve,
        error: reject,
      });
    });

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: `CSV parsing error: ${parseResult.errors[0].message}`,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    const csvData = parseResult.data;

    if (csvData.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "CSV file is empty",
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Validate and transform CSV rows to EmployeeFormData
    const validEmployees: EmployeeFormData[] = [];
    const validationErrors: ImportError[] = [];

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2; // +2 because row 1 is header, array is 0-indexed

      try {
        // Transform empty strings to null for optional fields
        const transformedRow = {
          first_name: row.first_name || "",
          surname: row.surname || "",
          ssn: row.ssn || "",
          email: row.email || null,
          mobile: row.mobile || null,
          rank: row.rank || null,
          gender: row.gender || null,
          town_district: row.town_district || null,
          hire_date: row.hire_date || "",
          comments: row.comments || null,
          is_terminated: false,
          is_archived: false,
          termination_date: null,
          termination_reason: null,
        };

        // Validate using Zod schema
        const validated = csvImportEmployeeSchema.parse(transformedRow);

        // Convert empty email to null
        const employeeData: EmployeeFormData = {
          first_name: validated.first_name,
          surname: validated.surname,
          ssn: validated.ssn,
          email: validated.email === "" || !validated.email ? null : validated.email,
          mobile: validated.mobile === "" || !validated.mobile ? null : validated.mobile,
          rank: validated.rank === "" || !validated.rank ? null : validated.rank,
          gender: validated.gender === "" || !validated.gender ? null : validated.gender,
          town_district: validated.town_district === "" || !validated.town_district ? null : validated.town_district,
          hire_date: validated.hire_date,
          comments: validated.comments === "" || !validated.comments ? null : validated.comments,
          is_terminated: false,
          is_archived: false,
          termination_date: null,
          termination_reason: null,
        };

        validEmployees.push(employeeData);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessages = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
          validationErrors.push({
            row: rowNumber,
            error: errorMessages,
            data: row,
          });
        } else if (error instanceof Error) {
          validationErrors.push({
            row: rowNumber,
            error: error.message,
            data: row,
          });
        } else {
          validationErrors.push({
            row: rowNumber,
            error: "Unknown validation error",
            data: row,
          });
        }
      }
    }

    // If no valid employees, return validation errors
    if (validEmployees.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "No valid employees found in CSV",
            details: validationErrors,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Batch insert valid employees
    const { inserted, errors: insertErrors } = await employeeRepository.createMany(validEmployees);

    // Combine validation and insert errors
    const allErrors = [...validationErrors, ...insertErrors];

    // Return success response with summary
    return NextResponse.json(
      {
        data: {
          imported: inserted.length,
          skipped: allErrors.length,
          errors: allErrors,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: `import_${Date.now()}`,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error importing employees:", error);
    return createErrorResponse(error);
  }
}
