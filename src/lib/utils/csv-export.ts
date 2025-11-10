/**
 * CSV Export Utilities
 * Story: 8.8 - Important Dates Assigned Employees List
 * 
 * Provides utilities for generating and downloading CSV files.
 */

/**
 * Generate CSV content from headers and rows
 */
export function generateCSV(headers: string[], rows: (string | number | null)[][]): string {
  const escapeCsvValue = (value: string | number | null): string => {
    if (value === null || value === undefined) return '""';
    const strValue = String(value);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
      return `"${strValue.replace(/"/g, '""')}"`;
    }
    return `"${strValue}"`;
  };

  const csvRows = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map(row => row.map(escapeCsvValue).join(','))
  ];

  return csvRows.join('\n');
}

/**
 * Download CSV content as a file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format a date value for CSV export (YYYY-MM-DD)
 */
export function formatDateForCSV(date: string | null): string {
  if (!date) return '';
  try {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  } catch {
    return date;
  }
}

/**
 * Format assigned employees array for readable display in CSV
 * AC 7: If >10 employees, truncate and add count
 */
export function formatAssignedEmployeesForCSV(employees: { name: string }[]): string {
  if (employees.length === 0) return 'None';
  
  if (employees.length <= 10) {
    return employees.map(e => e.name).join(', ');
  }
  
  const first10 = employees.slice(0, 10).map(e => e.name).join(', ');
  return `${first10}... (${employees.length} total)`;
}
