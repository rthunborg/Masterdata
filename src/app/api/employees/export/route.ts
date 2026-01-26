import { NextResponse } from "next/server";
import { requireAuthAPI, createErrorResponse, createUnauthorizedResponse } from "@/lib/server/auth";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import { columnConfigRepository } from "@/lib/server/repositories/column-config-repository";
import Papa from "papaparse";
import * as ExcelJS from "exceljs";
import type { Employee } from "@/lib/types/employee";
import { createClient } from "@/lib/supabase/server";
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
 * Enhancement: HR Admin Impersonation Export - export with impersonated role's view and Excel format
 */
export async function POST(request: Request) {
  try {
    // Verify authentication (all authenticated users can export)
    const user = await requireAuthAPI();

    // Parse request body
    const body = await request.json();
    const { employeeIds, fields, impersonatedRole, format = 'csv' } = body;

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

    // Security: Validate impersonation permission (only HR Admins can impersonate)
    if (impersonatedRole && user.role !== 'hr_admin') {
      return NextResponse.json(
        {
          error: {
            code: "IMPERSONATION_FORBIDDEN",
            message: "Only HR Admins can export with impersonated role context.",
            timestamp: new Date().toISOString(),
          },
        },
        { status: 403 }
      );
    }

    // Validate export format
    if (format !== 'csv' && format !== 'xlsx') {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_FORMAT",
            message: "Export format must be either 'csv' or 'xlsx'.",
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Story 17.4: Verify user has view permission for all selected fields
    // If impersonating, use impersonated role for permission checks
    const userRole = (impersonatedRole || user.role) as UserRole;
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

    // Get column labels from column configs for accurate header names
    const fieldLabels: Record<string, string> = {};
    
    // Build field labels map from column configs (preserves user-visible names)
    allColumns.forEach((col) => {
      if (col.is_masterdata) {
        const fieldKey = col.db_column_name.toLowerCase().replace(/ /g, "_");
        fieldLabels[fieldKey] = col.column_name;
      } else {
        fieldLabels[col.db_column_name] = col.column_name;
      }
    });

    // Fallback labels for fields not in column config
    const defaultFieldLabels: Record<string, string> = {
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
      return fieldLabels[fieldKey] || defaultFieldLabels[fieldKey] || fieldKey;
    });

    // Generate export based on format
    if (format === 'xlsx') {
      // Generate Excel file
      const buffer = await generateExcelExport(
        csvData,
        fieldsToExport,
        headers
      );

      // Convert Buffer to Uint8Array for NextResponse compatibility
      const uint8Array = new Uint8Array(buffer);

      return new NextResponse(uint8Array, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="employees_export_${new Date().toISOString().split('T')[0]}.xlsx"`,
          "X-Employees-Exported": selectedEmployees.length.toString(),
          "X-Timestamp": new Date().toISOString(),
          "X-Impersonated-Role": impersonatedRole || '',
        },
      });
    } else {
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
          "X-Impersonated-Role": impersonatedRole || '',
        },
      });
    }
  } catch (error) {
    console.error("Export employees error:", error);
    // Handle authentication errors specifically
    if (error instanceof Error && error.message === "Authentication required") {
      return createUnauthorizedResponse(error.message);
    }
    return createErrorResponse(error);
  }
}

/**
 * Generate Excel file with proper formatting
 * Creates a properly formatted Excel table with frozen headers and auto-filter
 */
async function generateExcelExport(
  data: Array<Record<string, string>>,
  fieldKeys: string[],
  headers: string[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Employees', {
    views: [{ state: 'frozen', ySplit: 1 }] // Freeze header row
  });

  // Add header row
  worksheet.addRow(headers);

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F4788' } // Dark blue background
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
  headerRow.height = 20;

  // Add data rows
  data.forEach((row) => {
    const rowData = fieldKeys.map((fieldKey) => row[fieldKey] || '');
    worksheet.addRow(rowData);
  });

  // Auto-fit columns based on content
  worksheet.columns.forEach((column, index) => {
    let maxLength = headers[index]?.length || 10;
    
    // Check data rows for max length
    data.forEach((row) => {
      const fieldKey = fieldKeys[index];
      if (fieldKey && row[fieldKey]) {
        const cellLength = String(row[fieldKey]).length;
        if (cellLength > maxLength) {
          maxLength = cellLength;
        }
      }
    });

    // Set column width (with reasonable min/max)
    column.width = Math.min(Math.max(maxLength + 2, 12), 50);
  });

  // Add table formatting (Excel table with filters)
  if (data.length > 0) {
    const lastColumn = String.fromCharCode(65 + fieldKeys.length - 1); // A, B, C, etc.
    const tableRef = `A1:${lastColumn}${data.length + 1}`;
    
    worksheet.addTable({
      name: 'EmployeeTable',
      ref: tableRef,
      headerRow: true,
      totalsRow: false,
      style: {
        theme: 'TableStyleMedium2',
        showRowStripes: true,
      },
      columns: headers.map((header) => ({ name: header, filterButton: true })),
      rows: data.map((row) => fieldKeys.map((fieldKey) => row[fieldKey] || ''))
    });
  } else {
    // If no data, just enable auto-filter on headers
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: fieldKeys.length }
    };
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
