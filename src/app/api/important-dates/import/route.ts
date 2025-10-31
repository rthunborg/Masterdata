import { NextRequest, NextResponse } from "next/server";
import { requireHRAdminAPI, createErrorResponse } from "@/lib/server/auth";
import { importantDateRepository } from "@/lib/server/repositories/important-date-repository";
import { validateImportantDatesCSV } from "@/lib/utils/important-dates-csv-validator";
import Papa from "papaparse";
import type { ImportantDateFormData } from "@/lib/types/important-date";

// Force Node.js runtime
export const runtime = "nodejs";

interface CSVRow {
  [key: string]: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify HR Admin role
    await requireHRAdminAPI();

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const columnMappingStr = formData.get("columnMapping") as string;

    if (!file) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "No file uploaded",
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    if (!columnMappingStr) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Column mapping is required",
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    const columnMapping = JSON.parse(columnMappingStr) as Record<
      string,
      string
    >;

    // Read file content
    const fileContent = await file.text();

    // Parse CSV
    const parseResult = await new Promise<Papa.ParseResult<CSVRow>>(
      (resolve, reject) => {
        Papa.parse<CSVRow>(fileContent, {
          header: true,
          skipEmptyLines: true,
          complete: resolve,
          error: reject,
        });
      }
    );

    if (!parseResult.data || parseResult.data.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "CSV file is empty or could not be parsed",
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Apply column mapping to transform CSV rows
    const mappedRows = parseResult.data.map((row) => {
      const mappedRow: Record<string, unknown> = {};

      Object.entries(columnMapping).forEach(([csvHeader, dbField]) => {
        if (dbField !== "ignore") {
          const value = row[csvHeader];
          // Convert empty strings to null for optional fields
          mappedRow[dbField] =
            value === undefined || value === "" ? null : value;
        }
      });

      return mappedRow;
    });

    // Validate rows
    const { valid, invalid } = validateImportantDatesCSV(mappedRows);

    let imported = 0;
    let skipped = invalid.length;
    const errors = [...invalid];

    // Check for duplicates against existing database records
    if (valid.length > 0) {
      const existingDates = await importantDateRepository.findAll();
      const existingKeys = new Set(
        existingDates.map((date) => {
          const weekNum = date.week_number === null ? "null" : String(date.week_number);
          const category = date.category.toLowerCase().trim();
          return `${weekNum}-${date.year}-${category}`;
        })
      );

      const validNonDuplicates: ImportantDateFormData[] = [];

      valid.forEach((row, index) => {
        const weekNum = row.week_number === null ? "null" : String(row.week_number);
        const category = row.category.toLowerCase().trim();
        const key = `${weekNum}-${row.year}-${category}`;

        if (existingKeys.has(key)) {
          const weekDisplay = weekNum === "null" ? "null" : weekNum;
          errors.push({
            row: index + 2,
            message: `Duplicate date entry already exists in database (Week ${weekDisplay}, Year ${row.year}, Category ${row.category})`,
          });
          skipped++;
        } else {
          validNonDuplicates.push(row);
        }
      });

      // Batch insert valid rows
      if (validNonDuplicates.length > 0) {
        try {
          const result = await importantDateRepository.createMany(
            validNonDuplicates
          );
          imported = result.imported;
          skipped += result.skipped;
          errors.push(...result.errors);
        } catch (error) {
          console.error("Error during batch insert:", error);
          return NextResponse.json(
            {
              error: {
                code: "INTERNAL_ERROR",
                message: "Failed to import dates",
                timestamp: new Date().toISOString(),
              },
            },
            { status: 500 }
          );
        }
      }
    }

    // Return result (200 even if some rows failed - partial success)
    return NextResponse.json({
      data: {
        imported,
        skipped,
        errors,
      },
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
