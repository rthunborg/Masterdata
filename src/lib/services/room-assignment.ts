/**
 * Room Assignment Service
 * 
 * Implements the ÖMC room assignment algorithm (FR40) for automatically assigning
 * hotel rooms to employees based on rank and gender.
 * 
 * Business Rules (FR40):
 * 1. First employee for a date gets room 1
 * 2. CHEF rank gets next available private room (incremented)
 * 3. SEV rank shares room with same gender (max 2 per room)
 * 4. SEV gets new room if no same-gender match or room full
 * 5. Room recalculation when dates/hotels change
 * 
 * Story: 8.20 - ÖMC Room Assignment Algorithm Implementation
 */

import { createClient as createClientClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Employee } from '@/lib/types/employee';

/**
 * Internal function to calculate room number based on existing employees list
 * 
 * @param employeeData - Employee data for room calculation
 * @param existingEmployees - List of existing employees for the same date (with room_number_shared set)
 * @returns Room number (1-N) or null if no room should be assigned
 */
function calculateRoomNumberFromList(
  employeeData: {
    rank: 'SEV' | 'CHEF';
    gender: 'Man' | 'Woman' | null;
  },
  existingEmployees: Array<{ rank: 'SEV' | 'CHEF'; gender: 'Man' | 'Woman' | null; room_number_shared: number | null }>
): number | null {
  // Filter to only employees with assigned rooms
  const employeesWithRooms = existingEmployees.filter(
    emp => emp.room_number_shared !== null && emp.room_number_shared !== undefined
  );

  // Rule 1: First employee for date gets room 1
  if (employeesWithRooms.length === 0) {
    return 1;
  }

  // Rule 2: CHEF rank gets private room (next available number)
  if (employeeData.rank === 'CHEF') {
    const maxRoom = Math.max(
      ...employeesWithRooms.map(emp => emp.room_number_shared!).filter((n): n is number => n !== null && n !== undefined),
      0
    );
    return maxRoom + 1;
  }

  // Rule 3 & 4: SEV rank shares room with same gender (max 2 per room)
  if (employeeData.rank === 'SEV') {
    // If gender is null, assign private room
    if (!employeeData.gender) {
      const maxRoom = Math.max(
        ...employeesWithRooms.map(emp => emp.room_number_shared!).filter((n): n is number => n !== null && n !== undefined),
        0
      );
      return maxRoom + 1;
    }

    // Group employees by room number to check occupancy
    const roomOccupancy = new Map<number, typeof employeesWithRooms>();
    
    for (const emp of employeesWithRooms) {
      const roomNum = emp.room_number_shared!;
      if (!roomOccupancy.has(roomNum)) {
        roomOccupancy.set(roomNum, []);
      }
      roomOccupancy.get(roomNum)!.push(emp);
    }

    // Find room with 1 SEV occupant of same gender (room not full)
    for (const [roomNum, occupants] of roomOccupancy.entries()) {
      // Check if room has exactly 1 occupant
      if (occupants.length === 1) {
        const occupant = occupants[0];
        // Check if occupant is SEV and same gender
        if (occupant.rank === 'SEV' && occupant.gender === employeeData.gender) {
          return roomNum; // Share this room
        }
      }
      // If room has 2 occupants, it's full - skip
    }

    // No matching room found - assign next available room
    const maxRoom = Math.max(
      ...employeesWithRooms.map(emp => emp.room_number_shared!).filter((n): n is number => n !== null && n !== undefined),
      0
    );
    return maxRoom + 1;
  }

  // Default: next available room (shouldn't reach here, but safety fallback)
  const maxRoom = Math.max(
    ...employeesWithRooms.map(emp => emp.room_number_shared!).filter((n): n is number => n !== null && n !== undefined),
    0
  );
  return maxRoom + 1;
}

/**
 * Calculate room number for employee based on FR40 algorithm
 * 
 * **AC6 - Concurrency Handling:** Uses RPC function with SELECT FOR UPDATE
 * to lock employees and prevent race conditions in high-concurrency scenarios.
 * 
 * @param employeeData - Employee data for room calculation
 * @param supabaseClient - Optional Supabase client (defaults to client-side for browser usage)
 * @returns Room number (1-N) or null if no room should be assigned
 */
export async function calculateRoomNumber(
  employeeData: {
    omc_date: string | null;
    rank: 'SEV' | 'CHEF';
    gender: 'Man' | 'Woman' | null;
    hotel_required: boolean;
  },
  supabaseClient?: SupabaseClient
): Promise<number | null> {
  // Return null if hotel not required or no ÖMC date
  if (!employeeData.hotel_required || !employeeData.omc_date) {
    return null;
  }

  const supabase = supabaseClient || createClientClient();

  // Use RPC function for atomic room calculation with locking (AC6)
  const { data: roomNumber, error } = await supabase.rpc('calculate_room_number', {
    p_date_id: employeeData.omc_date,
    p_rank: employeeData.rank,
    p_gender: employeeData.gender || null,
  });

  if (error) {
    console.error('Error calculating room number via RPC:', error);
    // Fallback to TypeScript implementation for backward compatibility
    // This should only happen if RPC function is not available
    const { data: existingEmployees, error: queryError } = await supabase
      .from('employees')
      .select('id, rank, gender, room_number_shared, hire_date')
      .eq('omc_date', employeeData.omc_date)
      .eq('hotel_required', true)
      .not('room_number_shared', 'is', null)
      .order('rank', { ascending: false })
      .order('hire_date', { ascending: true });

    if (queryError) {
      console.error('Error querying existing employees for room assignment:', queryError);
      return null;
    }

    const employeesForDate = existingEmployees || [];
    return calculateRoomNumberFromList(
      {
        rank: employeeData.rank,
        gender: employeeData.gender,
      },
      employeesForDate
    );
  }

  return roomNumber;
}

/**
 * Recalculate all room assignments for a specific ÖMC date
 * 
 * **AC6 - Concurrency Handling:** Uses RPC function with SELECT FOR UPDATE
 * to lock employees and recalculate all rooms atomically, preventing race conditions.
 * 
 * This function recalculates room assignments for all employees on a date,
 * ensuring room numbers are compacted and follow FR40 algorithm rules.
 * 
 * @param dateId - UUID of the ÖMC date
 * @param supabaseClient - Optional Supabase client (pass server-side client when calling from API routes)
 * @returns Promise that resolves when recalculation is complete
 */
export async function recalculateRoomsForDate(
  dateId: string,
  supabaseClient?: SupabaseClient | Promise<SupabaseClient>
): Promise<void> {
  // Resolve the supabase client if it's a promise (server-side) or use directly (client-side)
  const supabase = supabaseClient 
    ? (supabaseClient instanceof Promise ? await supabaseClient : supabaseClient)
    : createClientClient();

  // Use RPC function for atomic recalculation with locking (AC6)
  const { error } = await supabase.rpc('recalculate_rooms_for_date', {
    p_date_id: dateId,
  });

  if (error) {
    console.error('Error recalculating rooms via RPC:', error);
    // Fallback to TypeScript implementation for backward compatibility
    // This should only happen if RPC function is not available
    const { data: employees, error: fetchError } = await supabase
      .from('employees')
      .select('id, rank, gender, hotel_required, room_number_shared, hire_date')
      .eq('omc_date', dateId)
      .eq('hotel_required', true)
      .order('rank', { ascending: false })
      .order('hire_date', { ascending: true });

    if (fetchError) {
      console.error('Error fetching employees for room recalculation:', fetchError);
      throw new Error(`Failed to fetch employees for date: ${fetchError.message}`);
    }

    if (!employees || employees.length === 0) {
      return;
    }

    const updates: Array<{ id: string; room_number_shared: number | null }> = [];
    const assignedRooms: Array<{ rank: 'SEV' | 'CHEF'; gender: 'Man' | 'Woman' | null; room_number_shared: number | null }> = [];

    for (const employee of employees) {
      const roomNumber = calculateRoomNumberFromList(
        {
          rank: employee.rank,
          gender: employee.gender,
        },
        assignedRooms
      );

      if (employee.room_number_shared !== roomNumber) {
        updates.push({
          id: employee.id,
          room_number_shared: roomNumber,
        });
      }

      assignedRooms.push({
        rank: employee.rank,
        gender: employee.gender,
        room_number_shared: roomNumber,
      });
    }

    if (updates.length > 0) {
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('employees')
          .update({ room_number_shared: update.room_number_shared })
          .eq('id', update.id);

        if (updateError) {
          console.error(`Error updating room for employee ${update.id}:`, updateError);
        }
      }
    }
  }
}

/**
 * Recalculate rooms when an employee's date changes
 * 
 * Recalculates rooms for both the old date (if exists) and new date (if exists)
 * to ensure room assignments remain correct after date changes.
 * 
 * @param employeeId - UUID of the employee whose date changed
 * @param oldDateId - Previous ÖMC date ID (null if employee had no date)
 * @param newDateId - New ÖMC date ID (null if date is being cleared)
 * @param supabaseClient - Optional Supabase client (pass server-side client when calling from API routes)
 * @returns Promise that resolves when recalculation is complete
 */
export async function recalculateRoomsForEmployee(
  employeeId: string,
  oldDateId: string | null,
  newDateId: string | null,
  supabaseClient?: SupabaseClient | Promise<SupabaseClient>
): Promise<void> {
  // Resolve the supabase client if it's a promise (server-side) or use directly (client-side)
  const supabase = supabaseClient 
    ? (supabaseClient instanceof Promise ? await supabaseClient : supabaseClient)
    : createClientClient();

  // Recalculate rooms for old date if it exists
  if (oldDateId) {
    await recalculateRoomsForDate(oldDateId, supabase);
  }

  // Recalculate rooms for new date if it exists
  if (newDateId) {
    await recalculateRoomsForDate(newDateId, supabase);
  }

  // If employee moved to new date, also update their room number
  if (newDateId) {
    // Get employee data
    const { data: employee, error } = await supabase
      .from('employees')
      .select('rank, gender, hotel_required')
      .eq('id', employeeId)
      .single();

    if (error) {
      console.error('Error fetching employee for room recalculation:', error);
      return;
    }

    if (employee && employee.hotel_required) {
      const roomNumber = await calculateRoomNumber(
        {
          omc_date: newDateId,
          rank: employee.rank,
          gender: employee.gender,
          hotel_required: true,
        },
        supabase
      );

      // Update employee's room number
      await supabase
        .from('employees')
        .update({ room_number_shared: roomNumber })
        .eq('id', employeeId);
    }
  }
}

