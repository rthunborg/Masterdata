import { NextRequest, NextResponse } from "next/server";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import {
  requireEmployeeManagerAPI,
  requireAuthAPI,
  createErrorResponse,
} from "@/lib/server/auth";
import { createEmployeeSchema } from "@/lib/validation/employee-schema";
import { normalizeSSN } from "@/lib/utils/ssn-formatter";
import { canEditTalmundo } from "@/lib/services/talmundo-validation";
import { canEditCrewingDone, getIncompleteFields } from "@/lib/services/crewing-validation";
import { assignEmployeeToDate } from "@/lib/services/date-capacity";
import { calculateRoomNumber } from "@/lib/services/room-assignment";
import { createClient } from "@/lib/supabase/server";
import { columnConfigRepository } from "@/lib/server/repositories/column-config-repository";
import {
  attachVisibleCustomDataForRoleList,
  filterEmployeesForRole,
} from "@/lib/server/employee-field-access";
import { isExternalParty, UserRole } from "@/lib/types/user";
import {
  parseOrError,
  createDuplicateResponse,
  isDuplicatePE3DateError,
  createDuplicatePE3Response,
} from "@/lib/server/api-helpers";
import type { EmployeeFormData } from "@/lib/types/employee";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication (all roles can view, but permissions handled by RLS and column config)
    const user = await requireAuthAPI(request);
    
    // Log for debugging (remove in production if needed)
    console.log('[GET /api/employees] Authenticated user:', { id: user.id, role: user.role, email: user.email });

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const includeArchived = searchParams.get("includeArchived") === "true";
    const includeTerminated = searchParams.get("includeTerminated") === "true";
    const needsRepayment = searchParams.get("needsRepayment") === "true"; // Story 8.13 AC 9

    // External parties cannot view archived employees (enforced by RLS, but also restrict query param)
    // HR Admin can view archived employees
    const effectiveIncludeArchived = user.role === "hr_admin" ? includeArchived : false;

    // Fetch employees
    // RLS policies will automatically filter based on user role:
    // - HR Admin: sees all employees
    // - External parties: sees only non-archived employees
    const employees = await employeeRepository.findAll({
      includeArchived: effectiveIncludeArchived,
      includeTerminated,
      needsRepayment, // Story 8.13 AC 9
    });

    let responseData: unknown[] = employees;
    if (isExternalParty(user.role as UserRole)) {
      const allColumns = await columnConfigRepository.findAll();
      responseData = filterEmployeesForRole(employees, allColumns, user.role as UserRole);
    } else if (user.role !== "hr_admin") {
      const allColumns = await columnConfigRepository.findAll();
      responseData = attachVisibleCustomDataForRoleList(
        employees,
        allColumns,
        user.role as UserRole
      );
    }

    return NextResponse.json({
      data: responseData,
      meta: {
        total: responseData.length,
        filtered: responseData.length,
      },
    });
  } catch (error) {
    // Enhanced error logging for debugging
    console.error('[GET /api/employees] Error:', error);
    if (error instanceof Error) {
      console.error('[GET /api/employees] Error message:', error.message);
      console.error('[GET /api/employees] Error stack:', error.stack);
    }
    return createErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify HR Admin or Recruiter role
    await requireEmployeeManagerAPI(request);

    // Parse and validate request body
    const body = await request.json();
    
    const parsed = parseOrError(createEmployeeSchema, body);
    if (parsed instanceof NextResponse) return parsed;
    const validatedData = parsed;

    // Get server-side Supabase client for room assignment and date operations
    const supabase = await createClient();

    // Story 8.20: Calculate room number before employee creation
    let roomNumber: number | null = null;
    if (validatedData.omc_date && validatedData.hotel_required && validatedData.rank) {
      try {
        roomNumber = await calculateRoomNumber(
          {
            omc_date: validatedData.omc_date,
            rank: validatedData.rank,
            gender: validatedData.gender ?? null,
            hotel_required: true,
          },
          supabase
        );
      } catch (roomError) {
        // Error handling strategy: Log warning but allow employee creation
        // Room assignment is not critical for employee creation - can be assigned later via update
        console.warn(
          'Warning: Failed to calculate room number during employee creation. Employee will be created without room assignment.',
          roomError
        );
        // Continue without room assignment - employee can still be created
        // Room can be assigned later via update or manual assignment
      }
    }

    // Normalize SSN to standard format (YYMMDD-XXXX) and email (convert undefined to null)
    // Convert empty strings to null for UUID date fields (database expects null, not "")
    // Exclude system-managed fields that should not be set during creation
    // These fields are system-managed and should only be set by their respective services
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { omc_masterdata_reminder_sent_at, repayment_needed_omc, repayment_needed_pe3, ...validatedDataWithoutSystemFields } = validatedData;
    const normalizedData = {
      ...validatedDataWithoutSystemFields,
      ssn: normalizeSSN(validatedData.ssn),
      email: validatedData.email ?? null,
      gender: validatedData.gender ?? null,
      // Convert empty strings to null for date UUID fields
      stena_date: validatedData.stena_date === "" || !validatedData.stena_date ? null : validatedData.stena_date,
      omc_date: validatedData.omc_date === "" || !validatedData.omc_date ? null : validatedData.omc_date,
      pe3_date: validatedData.pe3_date === "" || !validatedData.pe3_date ? null : validatedData.pe3_date,
      // Story 8.20: Include room number in employee data
      room_number_shared: roomNumber,
      // Handle One field timestamp logic (Story 8.3)
      // If One field is set to true during creation, record the timestamp
      one_marked_at: validatedData.one === true ? new Date().toISOString() : null,
    } as EmployeeFormData;

    // Story 8.4: Validate Talmundo on creation
    if (validatedData.talmundo === true) {
      const canEdit = canEditTalmundo(
        validatedData.one ?? false,
        validatedData.one_marked_at ?? null
      );

      if (!canEdit) {
        return NextResponse.json(
          {
            error: {
              code: "TALMUNDO_EDIT_NOT_ALLOWED",
              message: "Cannot set Talmundo to true - One field must be completed until the following day",
              timestamp: new Date().toISOString(),
            },
          },
          { status: 400 }
        );
      }
    }

    // Story 8.5: Validate Crewing/Done on creation
    if (validatedData.crewing_done === true) {
      // Check if all prerequisites are met
      if (!canEditCrewingDone(validatedData)) {
        const incomplete = getIncompleteFields(validatedData);
        return NextResponse.json(
          {
            error: {
              code: "CREWING_DONE_PREREQUISITES_NOT_MET",
              message: `Cannot set Crewing/Done to true - prerequisites not met: ${incomplete.join(', ')}`,
              details: { incompleteFields: incomplete },
              timestamp: new Date().toISOString(),
            },
          },
          { status: 400 }
        );
      }
    }

    // Create employee via repository
    const employee = await employeeRepository.create(normalizedData);

    // Story 8.7: Handle date assignments with capacity management
    // Process date field assignments using atomic transactions
    const dateAssignments: Array<{
      field: 'omc_date' | 'stena_date' | 'pe3_date';
      dateId: string;
    }> = [];

    if (validatedData.omc_date) {
      dateAssignments.push({ field: 'omc_date', dateId: validatedData.omc_date });
    }
    if (validatedData.stena_date) {
      dateAssignments.push({ field: 'stena_date', dateId: validatedData.stena_date });
    }
    if (validatedData.pe3_date) {
      dateAssignments.push({ field: 'pe3_date', dateId: validatedData.pe3_date });
    }

    // Assign employee to dates with capacity tracking
    // NOTE: Current implementation creates employee before checking date capacity.
    // If capacity assignment fails, employee record remains orphaned without dates.
    // FUTURE ENHANCEMENT: Wrap employee creation and date assignments in database
    // transaction to ensure atomic operation and enable rollback on capacity failure.
    // See QA Review 8.7 - RELIABILITY-001 for details.
    
    for (const assignment of dateAssignments) {
      try {
        await assignEmployeeToDate(
          employee.id,
          assignment.dateId,
          null, // No old date for new employee
          assignment.field,
          supabase // Pass server-side client for proper authentication
        );
      } catch (capacityError) {
        if (isDuplicatePE3DateError(capacityError)) {
          return createDuplicatePE3Response(capacityError as Error);
        }
        
        // Capacity assignment failed - employee was created but date not assigned
        // Manual cleanup may be required if this occurs frequently in production
        console.error('Date capacity assignment failed after employee creation:', {
          employeeId: employee.id,
          dateField: assignment.field,
          dateId: assignment.dateId,
          error: capacityError instanceof Error ? capacityError.message : 'Unknown error'
        });
        
        return NextResponse.json(
          {
            error: {
              code: "DATE_CAPACITY_EXCEEDED",
              message: capacityError instanceof Error 
                ? capacityError.message 
                : `Cannot assign employee to ${assignment.field} - date is fully booked`,
              details: {
                employeeCreated: true,
                employeeId: employee.id,
                note: 'Employee record was created but date assignment failed due to capacity constraint'
              },
              timestamp: new Date().toISOString(),
            },
          },
          { status: 400 }
        );
      }
    }

    // Return successful response
    return NextResponse.json(
      {
        data: employee,
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle duplicate SSN error
    if (error instanceof Error && error.message.includes("already exists")) {
      return createDuplicateResponse(error.message);
    }

    // Handle duplicate PE3 date error (database unique constraint)
    if (isDuplicatePE3DateError(error)) {
      return createDuplicatePE3Response(error as Error);
    }

    // Handle other errors
    return createErrorResponse(error);
  }
}
