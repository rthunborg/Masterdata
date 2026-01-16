/**
 * Story 19.5: Checklist Progress Indicator Tests
 * 
 * Tests for the calculateChecklistProgress function and ChecklistProgressIndicator component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { 
  calculateChecklistProgress, 
  ChecklistProgressIndicator 
} from '@/components/dashboard/checklist-progress-indicator';
import type { Employee } from '@/lib/types/employee';
import type { ColumnConfig } from '@/lib/types/column-config';

// Mock the getEmployeeFieldValue function
vi.mock('@/lib/utils/column-mapping', () => ({
  getEmployeeFieldValue: (employee: Employee, dbColumnName: string) => {
    // Return the value from the employee object using the db_column_name
    return (employee as Record<string, unknown>)[dbColumnName];
  },
}));

// Mock TooltipProvider
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => 
    asChild ? <>{children}</> : <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
}));

describe('calculateChecklistProgress', () => {
  const createEmployee = (overrides: Partial<Employee> = {}): Employee => ({
    id: 'test-id',
    first_name: 'Test',
    surname: 'Employee',
    ssn: '123456789',
    email: 'test@example.com',
    mobile: '1234567890',
    rank: 'SEV',
    gender: 'Man',
    town_district: 'Test Town',
    hire_date: '2024-01-01',
    termination_date: null,
    termination_reason: null,
    comments: null,
    is_terminated: false,
    is_archived: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    crewing_done: false,
    ...overrides,
  } as Employee);

  const createColumnConfig = (
    dbColumnName: string,
    isChecklistItem: boolean,
    columnType: 'boolean' | 'text' = 'boolean'
  ): ColumnConfig => ({
    id: `col-${dbColumnName}`,
    column_name: dbColumnName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    db_column_name: dbColumnName,
    column_type: columnType,
    role_permissions: { hr_admin: { view: true, edit: true } },
    is_masterdata: true,
    category: null,
    category_color: null,
    display_order: 0,
    is_visible: true,
    is_checklist_item: isChecklistItem,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  });

  it('should return 0/0 when no checklist items are configured', () => {
    const employee = createEmployee();
    const columns: ColumnConfig[] = [
      createColumnConfig('name', false, 'text'),
      createColumnConfig('some_boolean', false),
    ];

    const result = calculateChecklistProgress(employee, columns);

    expect(result.completed).toBe(0);
    expect(result.total).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it('should correctly count completed checklist items', () => {
    const employee = createEmployee({
      one: true,
      talmundo: true,
      crewing_done: false,
    } as Partial<Employee>);

    const columns: ColumnConfig[] = [
      createColumnConfig('one', true),
      createColumnConfig('talmundo', true),
      createColumnConfig('crewing_done', true),
    ];

    const result = calculateChecklistProgress(employee, columns);

    expect(result.completed).toBe(2);
    expect(result.total).toBe(3);
    expect(result.percentage).toBe(67); // Rounded from 66.67
  });

  it('should return 100% when all checklist items are completed', () => {
    const employee = createEmployee({
      one: true,
      talmundo: true,
      crewing_done: true,
    } as Partial<Employee>);

    const columns: ColumnConfig[] = [
      createColumnConfig('one', true),
      createColumnConfig('talmundo', true),
      createColumnConfig('crewing_done', true),
    ];

    const result = calculateChecklistProgress(employee, columns);

    expect(result.completed).toBe(3);
    expect(result.total).toBe(3);
    expect(result.percentage).toBe(100);
  });

  it('should return 0% when no checklist items are completed', () => {
    const employee = createEmployee({
      one: false,
      talmundo: false,
      crewing_done: false,
    } as Partial<Employee>);

    const columns: ColumnConfig[] = [
      createColumnConfig('one', true),
      createColumnConfig('talmundo', true),
      createColumnConfig('crewing_done', true),
    ];

    const result = calculateChecklistProgress(employee, columns);

    expect(result.completed).toBe(0);
    expect(result.total).toBe(3);
    expect(result.percentage).toBe(0);
  });

  it('should exclude non-checklist boolean columns', () => {
    const employee = createEmployee({
      one: true,
      hotel_required: true, // This is an attribute, not a checklist item
      talmundo: false,
    } as Partial<Employee>);

    const columns: ColumnConfig[] = [
      createColumnConfig('one', true),
      createColumnConfig('hotel_required', false), // Not a checklist item
      createColumnConfig('talmundo', true),
    ];

    const result = calculateChecklistProgress(employee, columns);

    expect(result.completed).toBe(1);
    expect(result.total).toBe(2);
    expect(result.percentage).toBe(50);
  });

  it('should exclude non-boolean columns even if marked as checklist item', () => {
    const employee = createEmployee({
      one: true,
      talmundo: true,
    } as Partial<Employee>);

    const columns: ColumnConfig[] = [
      createColumnConfig('one', true),
      createColumnConfig('talmundo', true),
      createColumnConfig('name', true, 'text'), // Text column shouldn't be included
    ];

    const result = calculateChecklistProgress(employee, columns);

    expect(result.completed).toBe(2);
    expect(result.total).toBe(2);
    expect(result.percentage).toBe(100);
  });

  it('should return items array with correct completion status', () => {
    const employee = createEmployee({
      one: true,
      talmundo: false,
    } as Partial<Employee>);

    const columns: ColumnConfig[] = [
      createColumnConfig('one', true),
      createColumnConfig('talmundo', true),
    ];

    const result = calculateChecklistProgress(employee, columns);

    expect(result.items).toHaveLength(2);
    
    const oneItem = result.items.find(i => i.dbColumnName === 'one');
    const talmundoItem = result.items.find(i => i.dbColumnName === 'talmundo');
    
    expect(oneItem?.isCompleted).toBe(true);
    expect(talmundoItem?.isCompleted).toBe(false);
  });

  it('should handle null/undefined values as incomplete', () => {
    const employee = createEmployee({
      one: null,
      talmundo: undefined,
    } as Partial<Employee>);

    const columns: ColumnConfig[] = [
      createColumnConfig('one', true),
      createColumnConfig('talmundo', true),
    ];

    const result = calculateChecklistProgress(employee, columns);

    expect(result.completed).toBe(0);
    expect(result.total).toBe(2);
    expect(result.percentage).toBe(0);
  });
});

describe('ChecklistProgressIndicator', () => {
  const createEmployee = (overrides: Partial<Employee> = {}): Employee => ({
    id: 'test-id',
    first_name: 'Test',
    surname: 'Employee',
    ssn: '123456789',
    email: 'test@example.com',
    mobile: '1234567890',
    rank: 'SEV',
    gender: 'Man',
    town_district: 'Test Town',
    hire_date: '2024-01-01',
    termination_date: null,
    termination_reason: null,
    comments: null,
    is_terminated: false,
    is_archived: false,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    crewing_done: false,
    ...overrides,
  } as Employee);

  const createColumnConfig = (
    dbColumnName: string,
    isChecklistItem: boolean
  ): ColumnConfig => ({
    id: `col-${dbColumnName}`,
    column_name: dbColumnName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    db_column_name: dbColumnName,
    column_type: 'boolean',
    role_permissions: { hr_admin: { view: true, edit: true } },
    is_masterdata: true,
    category: null,
    category_color: null,
    display_order: 0,
    is_visible: true,
    is_checklist_item: isChecklistItem,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  });

  it('should render dash when no checklist items exist', () => {
    const employee = createEmployee();
    const columns: ColumnConfig[] = [];

    render(
      <ChecklistProgressIndicator employee={employee} columns={columns} />
    );

    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('should render fraction badge with progress', () => {
    const employee = createEmployee({
      one: true,
      talmundo: false,
      crewing_done: false,
    } as Partial<Employee>);

    const columns: ColumnConfig[] = [
      createColumnConfig('one', true),
      createColumnConfig('talmundo', true),
      createColumnConfig('crewing_done', true),
    ];

    render(
      <ChecklistProgressIndicator employee={employee} columns={columns} />
    );

    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('should show complete state when all items done', () => {
    const employee = createEmployee({
      one: true,
      talmundo: true,
    } as Partial<Employee>);

    const columns: ColumnConfig[] = [
      createColumnConfig('one', true),
      createColumnConfig('talmundo', true),
    ];

    render(
      <ChecklistProgressIndicator employee={employee} columns={columns} />
    );

    expect(screen.getByText('2/2')).toBeInTheDocument();
  });

  it('should render compact view when compact prop is true', () => {
    const employee = createEmployee({
      one: true,
      talmundo: false,
    } as Partial<Employee>);

    const columns: ColumnConfig[] = [
      createColumnConfig('one', true),
      createColumnConfig('talmundo', true),
    ];

    render(
      <ChecklistProgressIndicator employee={employee} columns={columns} compact={true} />
    );

    // Compact view should still show the fraction
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });
});
