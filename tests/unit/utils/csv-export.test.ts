/**
 * Unit Tests for CSV Export Utilities
 * 
 * Tests for formatAssignedEmployeesForCSV and other CSV utility functions
 */

import { describe, it, expect } from 'vitest';
import { formatAssignedEmployeesForCSV } from '@/lib/utils/csv-export';
import type { AssignedEmployee } from '@/lib/types/important-date';

describe('formatAssignedEmployeesForCSV', () => {
  it('should return "None" for empty array', () => {
    const result = formatAssignedEmployeesForCSV([]);
    expect(result).toBe('None');
  });

  it('should return employee names for single employee', () => {
    const employees: AssignedEmployee[] = [
      { id: 'emp-1', name: 'John Doe', email: 'john@example.com', ssn: '1234', room_number: null },
    ];
    const result = formatAssignedEmployeesForCSV(employees);
    expect(result).toBe('John Doe');
  });

  it('should return comma-separated names for multiple employees (<=10)', () => {
    const employees: AssignedEmployee[] = [
      { id: 'emp-1', name: 'John Doe', email: 'john@example.com', ssn: '1234', room_number: null },
      { id: 'emp-2', name: 'Jane Smith', email: 'jane@example.com', ssn: '5678', room_number: null },
      { id: 'emp-3', name: 'Bob Johnson', email: 'bob@example.com', ssn: '9012', room_number: null },
    ];
    const result = formatAssignedEmployeesForCSV(employees);
    expect(result).toBe('John Doe, Jane Smith, Bob Johnson');
  });

  it('should truncate and add count for more than 10 employees', () => {
    const employees: AssignedEmployee[] = Array.from({ length: 15 }, (_, i) => ({
      id: `emp-${i + 1}`,
      name: `Employee ${i + 1}`,
      email: `emp${i + 1}@example.com`,
      ssn: `${i + 1}`,
      room_number: null,
    }));
    
    const result = formatAssignedEmployeesForCSV(employees);
    expect(result).toContain('Employee 1');
    expect(result).toContain('Employee 10');
    expect(result).toContain('... (15 total)');
    expect(result).not.toContain('Employee 11'); // Should be truncated
  });

  it('should handle exactly 10 employees without truncation', () => {
    const employees: AssignedEmployee[] = Array.from({ length: 10 }, (_, i) => ({
      id: `emp-${i + 1}`,
      name: `Employee ${i + 1}`,
      email: `emp${i + 1}@example.com`,
      ssn: `${i + 1}`,
      room_number: null,
    }));
    
    const result = formatAssignedEmployeesForCSV(employees);
    expect(result).toContain('Employee 1');
    expect(result).toContain('Employee 10');
    expect(result).not.toContain('...'); // Should not truncate at exactly 10
  });

  it('should handle dates with no employees assigned (empty array)', () => {
    // This test ensures dates without employees are properly handled
    const result = formatAssignedEmployeesForCSV([]);
    expect(result).toBe('None');
  });
});

