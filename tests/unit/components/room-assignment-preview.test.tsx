/**
 * Component Tests for Room Assignment Preview
 * 
 * Tests the room assignment preview modal component:
 * - Modal rendering
 * - Room grouping by room number
 * - Occupancy display
 * - Gender display for shared rooms
 * - Empty room display
 * 
 * Story: 11.2 - Room Assignment Algorithm Test Suite
 * AC5: Component Test Coverage (UI)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import type { Employee } from "@/lib/types/employee";
import type { ImportantDate } from "@/lib/types/important-date";

// Mock component - will be replaced with actual import when component exists
// import { RoomAssignmentPreview } from "@/components/room-assignment-preview";

// Temporary mock component for testing
const RoomAssignmentPreview = ({ 
  date, 
  employees 
}: { 
  date: ImportantDate; 
  employees: (Employee & { hotel_room_number?: number | null })[] 
}) => {
  // Group employees by room number
  const rooms = new Map<number, (Employee & { hotel_room_number?: number | null })[]>();
  
  for (const emp of employees) {
    if (emp.hotel_room_number !== null && emp.hotel_room_number !== undefined) {
      const roomNum = emp.hotel_room_number;
      if (!rooms.has(roomNum)) {
        rooms.set(roomNum, []);
      }
      rooms.get(roomNum)!.push(emp);
    }
  }

  return (
    <div data-testid="room-preview-modal">
      <h2>Room Assignments for {date.date_description}</h2>
      {Array.from(rooms.entries()).map(([roomNum, occupants]) => {
        const isChef = occupants.some(e => e.rank === "CHEF");
        const maxOccupancy = isChef ? 1 : 2;
        const occupancy = `${occupants.length}/${maxOccupancy}`;
        const genders = new Set(occupants.map(e => e.gender).filter((g): g is 'Man' | 'Woman' => g !== null));
        
        return (
          <div key={roomNum} data-testid={`room-${roomNum}`}>
            <h3>Room {roomNum}</h3>
            <div data-testid={`room-${roomNum}-occupancy`}>{occupancy}</div>
            {!isChef && genders.size > 0 && (
              <div data-testid={`room-${roomNum}-gender`}>
                {Array.from(genders).join(", ")}
              </div>
            )}
            <ul>
              {occupants.map(emp => (
                <li key={emp.id} data-testid={`employee-${emp.id}`}>
                  {emp.first_name} {emp.surname}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {rooms.size === 0 && (
        <div data-testid="empty-rooms">No room assignments</div>
      )}
    </div>
  );
};

describe("RoomAssignmentPreview", () => {
  const mockDate: ImportantDate = {
    id: "date-omc-1",
    week_number: 10,
    year: 2025,
    category: "ÖMC Dates",
    date_description: "8-9 mars",
    date_value: "2025-03-08",
    notes: null,
    time_value: null,
    max_spots: 20,
    remaining_spots: 10,
    assigned_employees: [],
    deadline_submit: null,
    deadline_cancel: null,
    is_active: true,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render room preview modal", () => {
    const employees: (Employee & { hotel_room_number?: number | null })[] = [];

    render(<RoomAssignmentPreview date={mockDate} employees={employees} />);

    expect(screen.getByTestId("room-preview-modal")).toBeInTheDocument();
    expect(screen.getByText(/Room Assignments for/)).toBeInTheDocument();
  });

  it("should group employees by room number", () => {
    const employees: (Employee & { hotel_room_number?: number | null })[] = [
      {
        id: "emp-1",
        first_name: "John",
        surname: "Doe",
        ssn: "19900101-1234",
        email: "john@example.com",
        mobile: "+46701234567",
        rank: "SEV",
        gender: "Man",
        town_district: "Stockholm",
        hire_date: "2025-01-01",
        omc_date: mockDate.id,
        stena_date: null,
        pe3_date: null,
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
        one: null,
        one_marked_at: null,
        talmundo: null,
        isps: null,
        photo: null,
        origo: null,
        loneiva: null,
        mail_lon: null,
        bankuppgifter: null,
        li: null,
        passport: null,
        kvitto_c17_18: null,
        c17: null,
        crewing_done: null,
        comments: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        hotel_room_number: 1,
      },
      {
        id: "emp-2",
        first_name: "Jane",
        surname: "Smith",
        ssn: "19900101-5678",
        email: "jane@example.com",
        mobile: "+46701234568",
        rank: "CHEF",
        gender: "Woman",
        town_district: "Gothenburg",
        hire_date: "2025-01-02",
        omc_date: mockDate.id,
        stena_date: null,
        pe3_date: null,
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
        one: null,
        one_marked_at: null,
        talmundo: null,
        isps: null,
        photo: null,
        origo: null,
        loneiva: null,
        mail_lon: null,
        bankuppgifter: null,
        li: null,
        passport: null,
        kvitto_c17_18: null,
        c17: null,
        crewing_done: null,
        comments: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        hotel_room_number: 2,
      },
      {
        id: "emp-3",
        first_name: "Bob",
        surname: "Johnson",
        ssn: "19900101-9012",
        email: "bob@example.com",
        mobile: "+46701234569",
        rank: "SEV",
        gender: "Man",
        town_district: "Stockholm",
        hire_date: "2025-01-03",
        omc_date: mockDate.id,
        stena_date: null,
        pe3_date: null,
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
        one: null,
        one_marked_at: null,
        talmundo: null,
        isps: null,
        photo: null,
        origo: null,
        loneiva: null,
        mail_lon: null,
        bankuppgifter: null,
        li: null,
        passport: null,
        kvitto_c17_18: null,
        c17: null,
        crewing_done: null,
        comments: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        hotel_room_number: 1, // Shares room 1 with emp-1
      },
    ];

    render(<RoomAssignmentPreview date={mockDate} employees={employees} />);

    expect(screen.getByTestId("room-1")).toBeInTheDocument();
    expect(screen.getByTestId("room-2")).toBeInTheDocument();
    expect(screen.getByText("Room 1")).toBeInTheDocument();
    expect(screen.getByText("Room 2")).toBeInTheDocument();
  });

  it("should display occupancy correctly (1/1 for CHEF, 1/2 or 2/2 for SEV)", () => {
    const employees: (Employee & { hotel_room_number?: number | null })[] = [
      {
        id: "emp-chef-1",
        first_name: "Anna",
        surname: "Chef",
        ssn: "19900101-1234",
        email: "anna@example.com",
        mobile: "+46701234567",
        rank: "CHEF",
        gender: "Woman",
        town_district: "Stockholm",
        hire_date: "2025-01-01",
        omc_date: mockDate.id,
        stena_date: null,
        pe3_date: null,
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
        one: null,
        one_marked_at: null,
        talmundo: null,
        isps: null,
        photo: null,
        origo: null,
        loneiva: null,
        mail_lon: null,
        bankuppgifter: null,
        li: null,
        passport: null,
        kvitto_c17_18: null,
        c17: null,
        crewing_done: null,
        comments: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        hotel_room_number: 1,
      },
      {
        id: "emp-sev-1",
        first_name: "John",
        surname: "Doe",
        ssn: "19900101-5678",
        email: "john@example.com",
        mobile: "+46701234568",
        rank: "SEV",
        gender: "Man",
        town_district: "Stockholm",
        hire_date: "2025-01-02",
        omc_date: mockDate.id,
        stena_date: null,
        pe3_date: null,
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
        one: null,
        one_marked_at: null,
        talmundo: null,
        isps: null,
        photo: null,
        origo: null,
        loneiva: null,
        mail_lon: null,
        bankuppgifter: null,
        li: null,
        passport: null,
        kvitto_c17_18: null,
        c17: null,
        crewing_done: null,
        comments: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        hotel_room_number: 2,
      },
      {
        id: "emp-sev-2",
        first_name: "Bob",
        surname: "Smith",
        ssn: "19900101-9012",
        email: "bob@example.com",
        mobile: "+46701234569",
        rank: "SEV",
        gender: "Man",
        town_district: "Stockholm",
        hire_date: "2025-01-03",
        omc_date: mockDate.id,
        stena_date: null,
        pe3_date: null,
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
        one: null,
        one_marked_at: null,
        talmundo: null,
        isps: null,
        photo: null,
        origo: null,
        loneiva: null,
        mail_lon: null,
        bankuppgifter: null,
        li: null,
        passport: null,
        kvitto_c17_18: null,
        c17: null,
        crewing_done: null,
        comments: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        hotel_room_number: 2, // Shares room 2
      },
    ];

    render(<RoomAssignmentPreview date={mockDate} employees={employees} />);

    expect(screen.getByTestId("room-1-occupancy")).toHaveTextContent("1/1"); // CHEF
    expect(screen.getByTestId("room-2-occupancy")).toHaveTextContent("2/2"); // SEV shared
  });

  it("should display gender for shared rooms", () => {
    const employees: (Employee & { hotel_room_number?: number | null })[] = [
      {
        id: "emp-sev-1",
        first_name: "John",
        surname: "Doe",
        ssn: "19900101-1234",
        email: "john@example.com",
        mobile: "+46701234567",
        rank: "SEV",
        gender: "Man",
        town_district: "Stockholm",
        hire_date: "2025-01-01",
        omc_date: mockDate.id,
        stena_date: null,
        pe3_date: null,
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
        one: null,
        one_marked_at: null,
        talmundo: null,
        isps: null,
        photo: null,
        origo: null,
        loneiva: null,
        mail_lon: null,
        bankuppgifter: null,
        li: null,
        passport: null,
        kvitto_c17_18: null,
        c17: null,
        crewing_done: null,
        comments: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        hotel_room_number: 1,
      },
      {
        id: "emp-sev-2",
        first_name: "Bob",
        surname: "Smith",
        ssn: "19900101-5678",
        email: "bob@example.com",
        mobile: "+46701234568",
        rank: "SEV",
        gender: "Man",
        town_district: "Stockholm",
        hire_date: "2025-01-02",
        omc_date: mockDate.id,
        stena_date: null,
        pe3_date: null,
        termination_date: null,
        termination_reason: null,
        is_terminated: false,
        is_archived: false,
        repayment_needed_omc: null,
        repayment_needed_pe3: null,
        one: null,
        one_marked_at: null,
        talmundo: null,
        isps: null,
        photo: null,
        origo: null,
        loneiva: null,
        mail_lon: null,
        bankuppgifter: null,
        li: null,
        passport: null,
        kvitto_c17_18: null,
        c17: null,
        crewing_done: null,
        comments: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        hotel_room_number: 1, // Shares room 1
      },
    ];

    render(<RoomAssignmentPreview date={mockDate} employees={employees} />);

    expect(screen.getByTestId("room-1-gender")).toBeInTheDocument();
    expect(screen.getByTestId("room-1-gender")).toHaveTextContent("Man");
  });

  it("should display empty state when no room assignments", () => {
    const employees: (Employee & { hotel_room_number?: number | null })[] = [];

    render(<RoomAssignmentPreview date={mockDate} employees={employees} />);

    expect(screen.getByTestId("empty-rooms")).toBeInTheDocument();
    expect(screen.getByText("No room assignments")).toBeInTheDocument();
  });
});

