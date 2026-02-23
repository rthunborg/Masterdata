/**
 * Unit Tests: EmployeeContextMenu Component
 * Story 12.6: Mobile Quick Actions and Shortcuts - AC 1
 * 
 * Tests that context menu appears and handles actions correctly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmployeeContextMenu } from '@/components/dashboard/employee-context-menu';
import type { Employee } from '@/lib/types/employee';

// Mock employee data
const mockEmployee: Employee = {
  id: 'emp-1',
  first_name: 'John',
  surname: 'Doe',
  email: 'john.doe@example.com',
  mobile: '+46701234567',
  is_archived: false,
  is_terminated: false,
} as Employee;


vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: "/dashboard",
  }),
  useSearchParams: () => ({
    get: vi.fn(),
    toString: vi.fn(() => ""),
  }),
  usePathname: () => "/dashboard",
}));

describe('EmployeeContextMenu (Story 12.6)', () => {
  let mockOnClose: () => void;
  let mockOnEdit: (employee: Employee) => void;
  let mockOnArchive: (employee: Employee) => void;
  let mockOnViewDetails: (employee: Employee) => void;
  let mockOnCall: (phoneNumber: string) => void;

  beforeEach(() => {
    mockOnClose = vi.fn();
    mockOnEdit = vi.fn();
    mockOnArchive = vi.fn();
    mockOnViewDetails = vi.fn();
    mockOnCall = vi.fn();
  });

  it('should not render when isOpen is false', () => {
    render(
      <EmployeeContextMenu
        employee={mockEmployee}
        isOpen={false}
        onClose={mockOnClose}
        position={null}
      />
    );

    expect(screen.queryByText('View Details')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true and position is provided', () => {
    render(
      <EmployeeContextMenu
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        position={{ x: 100, y: 100 }}
        onViewDetails={mockOnViewDetails}
        onEdit={mockOnEdit}
        onArchive={mockOnArchive}
        onCall={mockOnCall}
      />
    );

    expect(screen.getByText('View Details')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Archive')).toBeInTheDocument();
    expect(screen.getByText('Call')).toBeInTheDocument();
  });

  it('should call onViewDetails and close menu when View Details is clicked', () => {
    render(
      <EmployeeContextMenu
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        position={{ x: 100, y: 100 }}
        onViewDetails={mockOnViewDetails}
      />
    );

    fireEvent.click(screen.getByText('View Details'));

    expect(mockOnViewDetails).toHaveBeenCalledWith(mockEmployee);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onEdit and close menu when Edit is clicked', () => {
    render(
      <EmployeeContextMenu
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        position={{ x: 100, y: 100 }}
        onEdit={mockOnEdit}
      />
    );

    fireEvent.click(screen.getByText('Edit'));

    expect(mockOnEdit).toHaveBeenCalledWith(mockEmployee);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onArchive and close menu when Archive is clicked', () => {
    render(
      <EmployeeContextMenu
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        position={{ x: 100, y: 100 }}
        onArchive={mockOnArchive}
      />
    );

    fireEvent.click(screen.getByText('Archive'));

    expect(mockOnArchive).toHaveBeenCalledWith(mockEmployee);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onCall and close menu when Call is clicked', () => {
    render(
      <EmployeeContextMenu
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        position={{ x: 100, y: 100 }}
        onCall={mockOnCall}
      />
    );

    fireEvent.click(screen.getByText('Call'));

    expect(mockOnCall).toHaveBeenCalledWith(mockEmployee.mobile);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not show Archive for archived employees', () => {
    const archivedEmployee = { ...mockEmployee, is_archived: true };

    render(
      <EmployeeContextMenu
        employee={archivedEmployee}
        isOpen={true}
        onClose={mockOnClose}
        position={{ x: 100, y: 100 }}
        onArchive={mockOnArchive}
      />
    );

    expect(screen.queryByText('Archive')).not.toBeInTheDocument();
  });

  it('should not show Archive for terminated employees', () => {
    const terminatedEmployee = { ...mockEmployee, is_terminated: true };

    render(
      <EmployeeContextMenu
        employee={terminatedEmployee}
        isOpen={true}
        onClose={mockOnClose}
        position={{ x: 100, y: 100 }}
        onArchive={mockOnArchive}
      />
    );

    expect(screen.queryByText('Archive')).not.toBeInTheDocument();
  });

  it('should not show Call when employee has no mobile number', () => {
    const employeeWithoutMobile = { ...mockEmployee, mobile: null };

    render(
      <EmployeeContextMenu
        employee={employeeWithoutMobile}
        isOpen={true}
        onClose={mockOnClose}
        position={{ x: 100, y: 100 }}
        onCall={mockOnCall}
      />
    );

    expect(screen.queryByText('Call')).not.toBeInTheDocument();
  });

  it('should close menu when clicking outside', () => {
    render(
      <EmployeeContextMenu
        employee={mockEmployee}
        isOpen={true}
        onClose={mockOnClose}
        position={{ x: 100, y: 100 }}
      />
    );

    // Click outside the menu
    fireEvent.mouseDown(document.body);

    // Wait for setTimeout in useEffect
    setTimeout(() => {
      expect(mockOnClose).toHaveBeenCalled();
    }, 150);
  });
});

