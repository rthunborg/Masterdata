import { NextRequest, NextResponse } from "next/server";
import { employeeRepository } from "@/lib/server/repositories/employee-repository";
import {
  requireRoleAPI,
  createErrorResponse,
} from "@/lib/server/auth";
import { calculateRoomNumber } from "@/lib/services/room-assignment";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/lib/types/user";

export const runtime = 'nodejs';

/**
 * Preview room assignment result without committing changes.
 * Used by the Rumshantering modal to show what room an employee would get.
 * 
 * GET /api/employees/[id]/room-preview?hotel_required=true
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoleAPI(["hr_admin" as UserRole]);

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hotelRequired = searchParams.get("hotel_required") === "true";

    const employee = await employeeRepository.findById(id);
    if (!employee) {
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

    const supabase = await createClient();

    let previewRoomNumber: number | null = null;
    let sharingWith: { name: string; rank: string; gender: string } | null = null;
    let dateLabel: string | null = null;
    let dateRoomSummary: Array<{
      room_number: number;
      occupants: Array<{ name: string; rank: string; gender: string }>;
    }> = [];

    if (employee.omc_date) {
      // Fetch ÖMC date description
      const { data: dateData } = await supabase
        .from("important_dates")
        .select("date_description")
        .eq("id", employee.omc_date)
        .single();
      dateLabel = dateData?.date_description ?? null;

      // Fetch all employees on the same ÖMC date with hotel rooms
      const { data: dateEmployees } = await supabase
        .from("employees")
        .select("id, first_name, surname, rank, gender, hotel_required, room_number_shared")
        .eq("omc_date", employee.omc_date)
        .eq("hotel_required", true)
        .not("room_number_shared", "is", null)
        .order("room_number_shared", { ascending: true });

      // Build current room summary (excluding the target employee)
      const otherEmployees = (dateEmployees ?? []).filter(e => e.id !== id);
      const roomMap = new Map<number, Array<{ name: string; rank: string; gender: string }>>();
      for (const emp of otherEmployees) {
        const roomNum = emp.room_number_shared!;
        if (!roomMap.has(roomNum)) roomMap.set(roomNum, []);
        roomMap.get(roomNum)!.push({
          name: `${emp.first_name} ${emp.surname}`,
          rank: emp.rank ?? "",
          gender: emp.gender ?? "",
        });
      }

      // Include the target employee's current room in summary if they have one and we're previewing removal
      if (!hotelRequired && employee.room_number_shared != null) {
        const currentRoom = employee.room_number_shared;
        if (!roomMap.has(currentRoom)) roomMap.set(currentRoom, []);
        roomMap.get(currentRoom)!.push({
          name: `${employee.first_name} ${employee.surname}`,
          rank: employee.rank ?? "",
          gender: employee.gender ?? "",
        });
      }

      dateRoomSummary = Array.from(roomMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([room_number, occupants]) => ({ room_number, occupants }));

      // Calculate preview room if toggling hotel ON
      if (hotelRequired && employee.rank) {
        try {
          previewRoomNumber = await calculateRoomNumber(
            {
              omc_date: employee.omc_date,
              rank: employee.rank,
              gender: employee.gender ?? null,
              hotel_required: true,
            },
            supabase
          );

          // Determine if room would be shared
          if (previewRoomNumber != null) {
            const roomOccupants = roomMap.get(previewRoomNumber);
            if (roomOccupants && roomOccupants.length === 1) {
              sharingWith = roomOccupants[0];
            }
          }
        } catch (error) {
          console.error("Room preview calculation failed:", error);
          return NextResponse.json(
            {
              error: {
                code: "ROOM_CALCULATION_FAILED",
                message: "Kunde inte beräkna rumstilldelning. Försök igen.",
                timestamp: new Date().toISOString(),
              },
            },
            { status: 500 }
          );
        }
      }
    }

    const missingRequirements: string[] = [];
    if (!employee.omc_date) missingRequirements.push("omc_date");
    if (!employee.rank) missingRequirements.push("rank");

    return NextResponse.json({
      data: {
        current_hotel_required: employee.hotel_required ?? false,
        current_room_number: employee.room_number_shared ?? null,
        preview_hotel_required: hotelRequired,
        preview_room_number: previewRoomNumber,
        sharing_with: sharingWith,
        date_label: dateLabel,
        date_room_summary: dateRoomSummary,
        missing_requirements: missingRequirements,
        employee_name: `${employee.first_name} ${employee.surname}`,
        employee_rank: employee.rank,
        employee_gender: employee.gender,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
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
    return createErrorResponse(error);
  }
}
