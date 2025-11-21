import { NextResponse } from "next/server";
import { requireHRAdminAPI, createErrorResponse } from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import Papa from "papaparse";
import type { Employee } from "@/lib/types/employee";
import { createClient } from "@/lib/supabase/server";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

/**
 * POST /api/employees/export
 * 
 * Export selected employees with custom field selection.
 * 
 * Story 13.6: General Export Button with Field Selection
 */
export async function POST(request: Request) {
  try {
    // Verify HR Admin role
    await requireHRAdminAPI();

    // Parse request body
    const body = await request.json();
    const { employeeIds, fields } = body;

    // Validate: If employeeIds is empty, return error message
    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
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

    // Validate: If fields is empty, return error message
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "NO_FIELDS_SELECTED",
            message: "No fields selected. Please select at least one field to export.",
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

    // Filter by selected IDs
    const selectedEmployees = allEmployees.filter((emp: Employee) =>
      employeeIds.includes(emp.id)
    );

    if (selectedEmployees.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "NO_EMPLOYEES_FOUND",
            message: "No employees found matching the selected IDs.",
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    // Get all important dates for resolving date field UUIDs
    const supabase = await createClient();
    const { data: importantDates, error: datesError } = await supabase
      .from('important_dates')
      .select('*')
      .eq('is_active', true);

    if (datesError) {
      console.error("Error fetching important dates:", datesError);
    }

    // Get custom column data for selected employees
    const { data: customDataRows, error: customDataError } = await supabase
      .from('custom_data')
      .select('*')
      .in('employee_id', employeeIds);

    if (customDataError) {
      console.error("Error fetching custom data:", customDataError);
    }

    // Create a map of employee_id -> custom data
    const customDataMap = new Map<string, Record<string, string | number | boolean | null>>();
    if (customDataRows) {
      customDataRows.forEach((row) => {
        customDataMap.set(row.employee_id, row.data || {});
      });
    }

    // Prepare CSV data with only selected fields
    const csvData = selectedEmployees.map((emp: Employee) => {
      const row: Record<string, any> = {};

      // Add custom data to employee object for field value extraction
      const employeeWithCustomData = {
        ...emp,
        customData: customDataMap.get(emp.id) || {},
      };

      fields.forEach((fieldKey) => {
        // Check if this is a masterdata field or custom column
        // Masterdata fields use field names like "first_name", "surname"
        // Custom columns use db_column_name

        // Try to get value from employee object first (masterdata)
        if (fieldKey in emp) {
          const value = (emp as any)[fieldKey];
          // Format the value appropriately
          if (value === null || value === undefined) {
            row[fieldKey] = '';
          } else if (typeof value === 'boolean') {
            row[fieldKey] = value ? 'Yes' : 'No';
          } else {
            row[fieldKey] = String(value);
          }
        } else {
          // Try custom data
          const customData = customDataMap.get(emp.id);
          if (customData && fieldKey in customData) {
            const value = customData[fieldKey];
            row[fieldKey] = value !== null && value !== undefined ? String(value) : '';
          } else {
            // Field not found, set empty
            row[fieldKey] = '';
          }
        }
      });

      return row;
    });

    // Generate CSV headers from field keys
    // Map field keys to human-readable labels
    const fieldLabels: Record<string, string> = {
      'first_name': 'First Name',
      'surname': 'Surname',
      'ssn': 'SSN',
      'email': 'Email',
      'mobile': 'Mobile',
      'rank': 'Rank',
      'gender': 'Gender',
      'town_district': 'Town District',
      'hire_date': 'Hire Date',
      'termination_date': 'Termination Date',
      'termination_reason': 'Termination Reason',
      'repayment_needed_omc': 'Repayment Needed (ÖMC)',
      'repayment_needed_pe3': 'Repayment Needed (PE3)',
      'comments': 'Comments',
      'loneiva': 'Lönenivå',
    };

    const headers = fields.map((fieldKey: string) => {
      return fieldLabels[fieldKey] || fieldKey;
    });

    // Generate CSV
    const csv = Papa.unparse({
      fields: headers,
      data: csvData.map((row) => fields.map((fieldKey: string) => row[fieldKey] || '')),
    });

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="employees_export_${new Date().toISOString().split('T')[0]}.csv"`,
        "X-Employees-Exported": selectedEmployees.length.toString(),
        "X-Timestamp": new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Export employees error:", error);
    return createErrorResponse(error);
  }
}
