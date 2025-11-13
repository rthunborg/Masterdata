import { NextRequest, NextResponse } from "next/server";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import {
  requireHRAdminAPI,
  createErrorResponse,
} from "@/lib/server/auth";
import { updateEmployeeSchema } from "@/lib/validation/employee-schema";
import { normalizeSSN } from "@/lib/utils/ssn-formatter";
import { canEditTalmundo } from "@/lib/services/talmundo-validation";
import { canEditCrewingDone, getIncompleteFields } from "@/lib/services/crewing-validation";
import { assignEmployeeToDate } from "@/lib/services/date-capacity";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { Employee } from "@/lib/types/employee";

// Force Node.js runtime for cookies() support
export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify HR Admin role
    await requireHRAdminAPI();

    // Await params (Next.js 15+ requirement)
    const { id } = await params;

    // Parse and validate request body
    const body = await request.json();
    
    let validatedData;
    try {
      validatedData = updateEmployeeSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid input data",
              details: validationError.errors.reduce((acc, err) => {
                const field = err.path.join(".");
                if (!acc[field]) acc[field] = [];
                acc[field].push(err.message);
                return acc;
              }, {} as Record<string, string[]>),
              timestamp: new Date().toISOString(),
            },
          },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Normalize SSN if it's being updated
    const normalizedData = validatedData.ssn
      ? { ...validatedData, ssn: normalizeSSN(validatedData.ssn) }
      : validatedData;

    // Handle One field timestamp logic (Story 8.3)
    const updates: Partial<Employee> = { ...normalizedData };
    
    if ('one' in validatedData) {
      // Fetch current employee to check previous One field value
      const currentEmployee = await employeeRepository.findById(id);
      
      if (!currentEmployee) {
        return NextResponse.json(
          {
            error: {
              code: "NOT_FOUND",
              message: `Employee with ID ${id} not found`,
              timestamp: new Date().toISOString(),
            },
          },
          { status: 404 }
        );
      }
      
      // If One is being set to true for the first time or after being false/null
      if (validatedData.one === true && currentEmployee.one !== true) {
        updates.one_marked_at = new Date().toISOString();
      } 
      // If One is being set to false, clear the timestamp
      else if (validatedData.one === false || validatedData.one === null) {
        updates.one_marked_at = null;
      }
      // If One is already true and staying true, don't change the timestamp
    }

    // Story 8.4: Validate Talmundo field updates
    if ('talmundo' in validatedData) {
      // Fetch current employee if not already fetched
      let currentEmployee;
      if ('one' in validatedData) {
        // Already fetched above for One field logic
        currentEmployee = await employeeRepository.findById(id);
      } else {
        currentEmployee = await employeeRepository.findById(id);
      }
      
      if (!currentEmployee) {
        return NextResponse.json(
          {
            error: {
              code: "NOT_FOUND",
              message: `Employee with ID ${id} not found`,
              timestamp: new Date().toISOString(),
            },
          },
          { status: 404 }
        );
      }

      // Check if Talmundo can be edited
      if (!canEditTalmundo(currentEmployee.one, currentEmployee.one_marked_at)) {
        return NextResponse.json(
          {
            error: {
              code: "TALMUNDO_EDIT_NOT_ALLOWED",
              message: "Cannot edit Talmundo field - One field must be completed for 24 hours first",
              timestamp: new Date().toISOString(),
            },
          },
          { status: 400 }
        );
      }
    }

    // Story 8.5: Validate Crewing/Done field updates
    if ('crewing_done' in validatedData) {
      // Fetch current employee if not already fetched
      let currentEmployee;
      if ('one' in validatedData || 'talmundo' in validatedData) {
        // Already fetched above
        currentEmployee = await employeeRepository.findById(id);
      } else {
        currentEmployee = await employeeRepository.findById(id);
      }
      
      if (!currentEmployee) {
        return NextResponse.json(
          {
            error: {
              code: "NOT_FOUND",
              message: `Employee with ID ${id} not found`,
              timestamp: new Date().toISOString(),
            },
          },
          { status: 404 }
        );
      }

      // Check if Crewing/Done can be edited (all 10 prerequisites must be true)
      if (!canEditCrewingDone(currentEmployee)) {
        const incomplete = getIncompleteFields(currentEmployee);
        return NextResponse.json(
          {
            error: {
              code: "CREWING_DONE_PREREQUISITES_NOT_MET",
              message: `Cannot edit Crewing/Done - prerequisites not met: ${incomplete.join(', ')}`,
              details: { incompleteFields: incomplete },
              timestamp: new Date().toISOString(),
            },
          },
          { status: 400 }
        );
      }
    }

    // Story 8.7: Handle date assignment changes with capacity management
    // Check if any date fields are being updated
    const dateFieldUpdates: Array<{
      field: 'omc_date' | 'stena_date' | 'pe3_date';
      newValue: string | null;
      oldValue: string | null;
    }> = [];

    // Collect date field changes
    if ('omc_date' in validatedData) {
      // Fetch current employee if not already fetched
      const currentEmployee = await employeeRepository.findById(id);
      if (!currentEmployee) {
        return NextResponse.json(
          {
            error: {
              code: "NOT_FOUND",
              message: `Employee with ID ${id} not found`,
              timestamp: new Date().toISOString(),
            },
          },
          { status: 404 }
        );
      }
      
      const newValue = validatedData.omc_date || null;
      const oldValue = currentEmployee.omc_date || null;
      
      if (newValue !== oldValue) {
        dateFieldUpdates.push({ 
          field: 'omc_date', 
          newValue, 
          oldValue 
        });
      }
    }

    if ('stena_date' in validatedData) {
      // Fetch current employee if not already fetched
      const currentEmployee = await employeeRepository.findById(id);
      if (!currentEmployee) {
        return NextResponse.json(
          {
            error: {
              code: "NOT_FOUND",
              message: `Employee with ID ${id} not found`,
              timestamp: new Date().toISOString(),
            },
          },
          { status: 404 }
        );
      }
      
      const newValue = validatedData.stena_date || null;
      const oldValue = currentEmployee.stena_date || null;
      
      if (newValue !== oldValue) {
        dateFieldUpdates.push({ 
          field: 'stena_date', 
          newValue, 
          oldValue 
        });
      }
    }

    if ('pe3_date' in validatedData) {
      // Fetch current employee if not already fetched
      const currentEmployee = await employeeRepository.findById(id);
      if (!currentEmployee) {
        return NextResponse.json(
          {
            error: {
              code: "NOT_FOUND",
              message: `Employee with ID ${id} not found`,
              timestamp: new Date().toISOString(),
            },
          },
          { status: 404 }
        );
      }
      
      const newValue = validatedData.pe3_date || null;
      const oldValue = currentEmployee.pe3_date || null;
      
      if (newValue !== oldValue) {
        dateFieldUpdates.push({ 
          field: 'pe3_date', 
          newValue, 
          oldValue 
        });
      }
    }

    // Process date field updates using atomic transactions
    // Get server-side Supabase client for date assignment operations
    const supabase = createClient();
    
    for (const dateUpdate of dateFieldUpdates) {
      // Only use transaction service if assigning to a new date (not clearing)
      if (dateUpdate.newValue) {
        try {
          await assignEmployeeToDate(
            id,
            dateUpdate.newValue,
            dateUpdate.oldValue,
            dateUpdate.field,
            supabase // Pass server-side client for proper authentication
          );
        } catch (capacityError) {
          // Return capacity error to client
          return NextResponse.json(
            {
              error: {
                code: "DATE_CAPACITY_EXCEEDED",
                message: capacityError instanceof Error 
                  ? capacityError.message 
                  : `Cannot assign employee to ${dateUpdate.field} - date is fully booked`,
                timestamp: new Date().toISOString(),
              },
            },
            { status: 400 }
          );
        }
        
        // Remove the date field from updates since it was handled by the transaction
        delete updates[dateUpdate.field];
      }
    }

    // Update employee via repository (excluding date fields handled by transactions)
    const employee = await employeeRepository.update(id, updates);

    // Return successful response
    return NextResponse.json({
      data: employee,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
      },
    });
  } catch (error) {
    // Handle not found error
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 404 }
      );
    }

    // Handle duplicate SSN error
    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json(
        {
          error: {
            code: "DUPLICATE_ENTRY",
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 409 }
      );
    }

    // Handle other errors
    return createErrorResponse(error);
  }
}
