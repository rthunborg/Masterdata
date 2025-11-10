"use client";

import * as React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Search } from "lucide-react";
import type { ImportantDate, AssignedEmployee } from "@/lib/types/important-date";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface AssignedEmployeesModalProps {
  date: ImportantDate | null;
  onClose: () => void;
}

/**
 * Modal displaying list of employees assigned to an important date.
 * Features: Search filtering, pagination, CSV export.
 * 
 * Story: 8.8 - Important Dates Assigned Employees List
 */
export function AssignedEmployeesModal({ 
  date, 
  onClose 
}: AssignedEmployeesModalProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [showUpdateIndicator, setShowUpdateIndicator] = React.useState(false);
  
  const ITEMS_PER_PAGE = 50;

  // Filter employees based on search query
  const filteredEmployees = React.useMemo(() => {
    if (!date?.assigned_employees) return [];
    
    const query = searchQuery.toLowerCase();
    if (!query) return date.assigned_employees;

    return date.assigned_employees.filter(emp => 
      emp.name.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query)
    );
  }, [date, searchQuery]); // Changed: Use full date object instead of date?.assigned_employees

  // Paginate filtered employees
  const paginatedEmployees = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEmployees.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredEmployees, currentPage]);

  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Reset search when modal closes
  React.useEffect(() => {
    if (!date) {
      setSearchQuery("");
      setCurrentPage(1);
    }
  }, [date]);

  // Real-time subscription for assigned_employees updates (Story 8.8 - AC 9)
  React.useEffect(() => {
    if (!date?.id) return;

    const supabase = createClient();
    
    const channel = supabase
      .channel(`assigned-employees-${date.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "important_dates",
          filter: `id=eq.${date.id}`,
        },
        (payload) => {
          // Show visual indicator that data updated
          setShowUpdateIndicator(true);
          setTimeout(() => setShowUpdateIndicator(false), 2000);
          
          // Note: The parent component should handle refetching the date
          // This just shows the indicator. The actual data update comes from
          // the parent re-rendering with fresh data from useImportantDates hook.
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date?.id]);

  /**
   * Mask SSN to show only last 4 digits
   * Format: ****-XXXX
   */
  const maskSSN = (ssn: string | null): string => {
    if (!ssn) return "—";
    
    // Assuming SSN format is YYYYMMDD-XXXX or similar
    const parts = ssn.split('-');
    if (parts.length === 2) {
      return `****-${parts[1]}`;
    }
    
    // If no dash, just show last 4 characters
    if (ssn.length >= 4) {
      return `****-${ssn.slice(-4)}`;
    }
    
    return "—";
  };

  /**
   * Generate and download CSV file for assigned employees
   */
  const handleDownloadCSV = () => {
    if (!date?.assigned_employees || date.assigned_employees.length === 0) {
      toast.error("No employees to export");
      return;
    }

    try {
      // CSV headers
      const headers = ["Name", "Email", "SSN", "Room Number"];
      
      // CSV rows - NOTE: SSN is exported unmasked for hotel bookings
      const rows = date.assigned_employees.map(emp => [
        emp.name,
        emp.email || "",
        emp.id, // TODO: Get full SSN from employees table when exporting
        emp.room_number?.toString() || "N/A"
      ]);

      // Build CSV content
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // Generate filename
      const dateDesc = date.date_description.replace(/\s+/g, "_");
      const timestamp = new Date().toISOString().split("T")[0];
      link.download = `assigned_employees_${dateDesc}_${timestamp}.csv`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("CSV downloaded successfully");
    } catch (error) {
      console.error("Error downloading CSV:", error);
      toast.error("Failed to download CSV");
    }
  };

  if (!date) return null;

  return (
    <Dialog open={!!date} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Assigned Employees</span>
            {showUpdateIndicator && (
              <span className="text-xs font-normal text-green-600 animate-pulse">
                Updated
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {date.date_description} - {date.date_value}
            <span className="ml-2 font-medium">
              ({filteredEmployees.length} {filteredEmployees.length === 1 ? 'employee' : 'employees'})
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Search and Actions */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCSV}
            disabled={date.assigned_employees.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
        </div>

        {/* Employee List Table */}
        {filteredEmployees.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? "No employees found matching your search" : "No employees assigned to this date"}
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>SSN (Last 4)</TableHead>
                    <TableHead>Room Number</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.name}
                      </TableCell>
                      <TableCell>
                        {employee.email || "—"}
                      </TableCell>
                      <TableCell>
                        {maskSSN(employee.id)} {/* TODO: Pass actual SSN field when available */}
                      </TableCell>
                      <TableCell>
                        {employee.room_number ? `Room ${employee.room_number}` : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{" "}
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredEmployees.length)} of{" "}
                  {filteredEmployees.length} employees
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-3 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
