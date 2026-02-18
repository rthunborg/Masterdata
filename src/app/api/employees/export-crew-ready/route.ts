import { NextRequest, NextResponse } from "next/server";
import { requireEmployeeManagerAPI, createErrorResponse } from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import { canEditCrewingDone } from "@/lib/services/crewing-validation";
import Papa from "papaparse";
import type { Employee } from "@/lib/types/employee";
import type { ImportantDate } from "@/lib/types/important-date";
import { createAPIClient } from "@/lib/supabase/server-api";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { resolveImportantDateId } from "@/lib/utils/important-date-resolver";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

/**
 * POST /api/employees/export-crew-ready
 * 
 * Export selected employees who have all prerequisites met for Crewing/Done
 * but currently have crewing_done = false or null.
 * After export, mark all exported employees as crewing_done = true.
 * 
 * Story 8.5: Crewing/Done Field Conditional Logic - Export Enhancement
 * Story 13.4: Export Only Selected Employees
 */
export async function POST(request: NextRequest) {
  try {
    // Verify HR Admin or Recruiter role
    await requireEmployeeManagerAPI(request);

    // Parse request body to get selected employee IDs
    const body = await request.json();
    const { selectedEmployeeIds } = body;

    // Validate: If selectedEmployeeIds is empty, return error message
    if (!selectedEmployeeIds || !Array.isArray(selectedEmployeeIds) || selectedEmployeeIds.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "NO_EMPLOYEES_SELECTED",
            message: "No employees selected. Please select employees to export.",
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Fetch selected employees (excluding archived and terminated)
    const allEmployees = await employeeRepository.findAll({
      includeArchived: false,
      includeTerminated: false,
    });

    // Filter by selected IDs first
    const selectedEmployees = allEmployees.filter((emp: Employee) =>
      selectedEmployeeIds.includes(emp.id)
    );

    // Then filter employees who:
    // 1. Have all prerequisites met (canEditCrewingDone returns true)
    // 2. Have crewing_done = false or null
    const eligibleEmployees = selectedEmployees.filter((emp: Employee) => {
      return canEditCrewingDone(emp) && emp.crewing_done !== true;
    });

    if (eligibleEmployees.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "NO_ELIGIBLE_EMPLOYEES",
            message: "No selected employees found with all prerequisites met and crewing_done not yet marked",
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    // Fetch all important dates to resolve date UUIDs
    // Use service role client to bypass RLS — important_dates is shared reference
    // data needed by all authenticated roles for resolving date UUID fields.
    const serviceClient = createServiceRoleClient();
    const { data: importantDates, error: datesError } = await serviceClient
      .from('important_dates')
      .select('*')
      .eq('is_active', true);

    if (datesError) {
      console.error("Error fetching important dates:", datesError);
    }

    const allImportantDates: ImportantDate[] = importantDates || [];

    // Prepare CSV data
    const csvData = eligibleEmployees.map((emp: Employee) => ({
      "Employee ID": emp.id,
      "First Name": emp.first_name,
      "Surname": emp.surname,
      "SSN": emp.ssn,
      "Email": emp.email || "",
      "Mobile": emp.mobile || "",
      "Rank": emp.rank,
      "Hire Date": emp.hire_date,
      "ISP": emp.isps ? "Yes" : "No",
      "Photo": emp.photo ? "Yes" : "No",
      "Origo": emp.origo ? "Yes" : "No",
      "Mail": emp.mail_lon ? "Yes" : "No",
      "Salary Level": emp.loneiva !== null && emp.loneiva !== undefined ? emp.loneiva.toString() : "Not Set",
      "Bankuppgifter": emp.bankuppgifter ? "Yes" : "No",
      "LI": emp.li ? "Yes" : "No",
      "Passport": emp.passport ? "Yes" : "No",
      "Kvitto C17/18": emp.kvitto_c17_18 ? "Yes" : "No",
      "C17": emp.c17 ? "Yes" : "No",
      "All Prerequisites Met": "Yes",
      "Ready for Crew Assignment": "Yes",
    }));

    // Generate CSV
    const csv = Papa.unparse(csvData);

    // Mark all exported employees as crewing_done = true
    const updatePromises = eligibleEmployees.map((emp: Employee) =>
      employeeRepository.update(emp.id, { crewing_done: true })
    );

    await Promise.all(updatePromises);

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="crew_ready_employees_${new Date().toISOString().split('T')[0]}.csv"`,
        "X-Employees-Exported": eligibleEmployees.length.toString(),
        "X-Timestamp": new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Export crew-ready employees error:", error);
    return createErrorResponse(error);
  }
}
