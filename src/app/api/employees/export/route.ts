import { NextRequest, NextResponse } from "next/server";
import { requireAuthAPI, createErrorResponse, createUnauthorizedResponse } from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import { columnConfigRepository } from "@/lib/server/repositories/column-config-repository";
import Papa from "papaparse";
import type { Employee } from "@/lib/types/employee";
import { createAPIClient } from "@/lib/supabase/server-api";
import type { UserRole } from "@/lib/types/user";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

/**
 * POST /api/employees/export
 * 
 * Export selected employees with custom field selection.
 * 
 * Story 13.6: General Export Button with Field Selection
 * Story 17.4: Export Functionality for External Users - permission-based field filtering
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication (all authenticated users can export)
    const user = await requireAuthAPI(request);

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

    // Story 17.4: Verify user has view permission for all selected fields
    const userRole = user.role as UserRole;
    const allColumns = await columnConfigRepository.findAll();
    
    // Filter fields based on permissions
    const permittedFields: string[] = [];
    const deniedFields: string[] = [];

    for (const fieldKey of fields) {
      // Check if this is a masterdata field or custom column
      // Find matching column config
      const matchingColumn = allColumns.find((col) => {
        if (col.is_masterdata) {
          // For masterdata, match db_column_name (snake_case) with fieldKey
          return col.db_column_name.toLowerCase().replace(/ /g, "_") === fieldKey.toLowerCase();
        } else {
          // For custom columns, match db_column_name exactly
          return col.db_column_name === fieldKey;
        }
      });

      if (!matchingColumn) {
        // Field not found in column config - deny access (security: fail closed)
        deniedFields.push(fieldKey);
        continue;
      }

      // Check view permission for user's role
      const rolePerms = matchingColumn.role_permissions[userRole];
      if (rolePerms && rolePerms.view === true) {
        permittedFields.push(fieldKey);
      } else {
        deniedFields.push(fieldKey);
      }
    }

    // If any fields were denied, return error
    if (deniedFields.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: "PERMISSION_DENIED",
            message: `You do not have permission to export the following fields: ${deniedFields.join(", ")}`,
            details: {
              deniedFields: deniedFields,
            },
            timestamp: new Date().toISOString(),
          },
        },
        { status: 403 }
      );
    }

    // If no permitted fields after filtering, return error
    if (permittedFields.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "NO_PERMITTED_FIELDS",
            message: "No fields selected that you have permission to export.",
            timestamp: new Date().toISOString(),
          },
        },
        { status: 403 }
      );
    }

    // Use only permitted fields for export
    const fieldsToExport = permittedFields;

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

    // Get custom column data for selected employees
    const supabase = await createClient();
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

    // Prepare CSV data with only permitted fields
    const csvData = selectedEmployees.map((emp: Employee) => {
      const row: Record<string, string> = {};

      fieldsToExport.forEach((fieldKey) => {
        // Check if this is a masterdata field or custom column
        // Masterdata fields use field names like "first_name", "surname"
        // Custom columns use db_column_name

        // Try to get value from employee object first (masterdata)
        if (fieldKey in emp) {
          const value = emp[fieldKey as keyof Employee];
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

    const headers = fieldsToExport.map((fieldKey: string) => {
      return fieldLabels[fieldKey] || fieldKey;
    });

    // Generate CSV
    const csv = Papa.unparse({
      fields: headers,
      data: csvData.map((row) => fieldsToExport.map((fieldKey: string) => row[fieldKey] || '')),
    });

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="employees_export_${new Date().toISOString().split('T')[0]}.csv"`,
        "X-Employees-Exported": selectedEmployees.length.toString(),
        "X-Timestamp": new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Export employees error:", error);
    // Handle authentication errors specifically
    if (error instanceof Error && error.message === "Authentication required") {
      return createUnauthorizedResponse(error.message);
    }
    return createErrorResponse(error);
  }
}
