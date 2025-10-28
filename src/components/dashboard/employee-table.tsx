"use client";
"use no memo";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  type Row,
  flexRender,
} from "@tanstack/react-table";
import type { Employee } from "@/lib/types/employee";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Archive, ArchiveRestore, UserX, UserCheck, Search, X, ArrowUpDown, ArrowUp, ArrowDown, Lock } from "lucide-react";
import { EditableCell } from "./editable-cell";
import { TerminateEmployeeModal } from "./terminate-employee-modal";
import { employeeService } from "@/lib/services/employee-service";
import { customDataService } from "@/lib/services/custom-data-service";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/use-auth";
import { useColumns } from "@/lib/hooks/use-columns";
import { getEmployeeFieldValue } from "@/lib/utils/column-mapping";
import { cn } from "@/lib/utils";

interface EmployeeTableProps {
  employees: Employee[];
  isLoading: boolean;
  onEmployeeUpdated?: () => void;
  includeArchived?: boolean;
  onIncludeArchivedChange?: (value: boolean) => void;
  includeTerminated?: boolean;
  onIncludeTerminatedChange?: (value: boolean) => void;
}

// Custom global filter function for multi-column search
const globalFilterFn = (row: Row<Employee>, columnId: string, filterValue: string) => {
  const searchableFields = [
    row.original.first_name,
    row.original.surname,
    row.original.ssn,
    row.original.email,
    row.original.mobile,
    row.original.rank,
    row.original.gender,
    row.original.town_district,
  ];

  const searchLower = filterValue.toLowerCase();
  return searchableFields.some((field) =>
    field?.toString().toLowerCase().includes(searchLower)
  );
};

export function EmployeeTable({ 
  employees, 
  isLoading, 
  onEmployeeUpdated,
  includeArchived = false,
  onIncludeArchivedChange,
  includeTerminated = false,
  onIncludeTerminatedChange,
}: EmployeeTableProps) {
  const { user } = useAuth();
  const isHRAdmin = user?.role === "hr_admin";
  
  // Fetch column configurations based on user role
  const { columns: columnConfigs, isLoading: columnsLoading, error: columnsError } = useColumns();
  
  const [archiveDialogOpen, setArchiveDialogOpen] = React.useState(false);
  const [unarchiveDialogOpen, setUnarchiveDialogOpen] = React.useState(false);
  const [terminateModalOpen, setTerminateModalOpen] = React.useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const [isArchiving, setIsArchiving] = React.useState(false);
  const [isReactivating, setIsReactivating] = React.useState(false);
  
  // Search and sort state
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([]);

  // Handler for masterdata column updates
  const handleMasterdataUpdate = React.useCallback(async (
    id: string, 
    field: string, 
    value: string | number | boolean | null
  ) => {
    try {
      await employeeService.update(id, { [field]: value });
      toast.success("Employee updated successfully");
      onEmployeeUpdated?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update employee";
      throw new Error(message);
    }
  }, [onEmployeeUpdated]);

  // Handler for custom column updates
  const handleCustomDataUpdate = React.useCallback(async (
    id: string, 
    columnName: string, 
    value: string | number | boolean | null
  ) => {
    try {
      await customDataService.updateCustomData(id, { [columnName]: value });
      toast.success("Custom data updated successfully");
      onEmployeeUpdated?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update custom data";
      throw new Error(message);
    }
  }, [onEmployeeUpdated]);

  const handleArchiveClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setArchiveDialogOpen(true);
  };

  const handleUnarchiveClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setUnarchiveDialogOpen(true);
  };

  const handleConfirmArchive = async () => {
    if (!selectedEmployee) return;

    try {
      setIsArchiving(true);
      await employeeService.archive(selectedEmployee.id);
      toast.success(
        `${selectedEmployee.first_name} ${selectedEmployee.surname} has been archived.`
      );
      setArchiveDialogOpen(false);
      onEmployeeUpdated?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to archive employee";
      toast.error(message);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleConfirmUnarchive = async () => {
    if (!selectedEmployee) return;

    try {
      setIsArchiving(true);
      await employeeService.unarchive(selectedEmployee.id);
      toast.success(
        `${selectedEmployee.first_name} ${selectedEmployee.surname} has been restored.`
      );
      setUnarchiveDialogOpen(false);
      onEmployeeUpdated?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to unarchive employee";
      toast.error(message);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleTerminateClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setTerminateModalOpen(true);
  };

  const handleReactivateClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setReactivateDialogOpen(true);
  };

  const handleConfirmReactivate = async () => {
    if (!selectedEmployee) return;

    try {
      setIsReactivating(true);
      await employeeService.reactivate(selectedEmployee.id);
      toast.success(
        `${selectedEmployee.first_name} ${selectedEmployee.surname} has been reactivated.`
      );
      setReactivateDialogOpen(false);
      onEmployeeUpdated?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to reactivate employee";
      toast.error(message);
    } finally {
      setIsReactivating(false);
    }
  };

  // Build dynamic columns from column configs
  const columns: ColumnDef<Employee>[] = React.useMemo(() => {
    const dataColumns: ColumnDef<Employee>[] = columnConfigs.map((config) => {
      // Determine if user can edit this column based on role permissions
      // For now: only HR Admin can edit masterdata columns (Epic 3)
      // Future: Epic 4 will allow external parties to edit their custom columns
      const userRole = user?.role || "";
      const hasEditPermission = config.role_permissions[userRole]?.edit ?? false;
      const canEdit = hasEditPermission;
      
      // Determine cell renderer based on column type and permissions
      const getCellRenderer = (): ColumnDef<Employee>['cell'] => {
        
        // Special handling for Status column (computed field)
        if (config.column_name === "Status") {
          const StatusCell = ({ row }: { row: Row<Employee> }) => {
            if (row.original.is_archived) return <span className="text-muted-foreground">Archived</span>;
            if (row.original.is_terminated) return <span className="text-red-600">Terminated</span>;
            return <span className="text-green-600">Active</span>;
          };
          StatusCell.displayName = "StatusCell";
          return StatusCell;
        }

        // Get the field key for the employee object
        const fieldKey = config.column_name.toLowerCase().replace(/ /g, "_");

        const DataCell = ({ row }: { row: Row<Employee> }) => {
          const value = getEmployeeFieldValue(row.original, config.column_name, config.is_masterdata);
          
          // Determine EditableCell type based on column_type
          let cellType: "text" | "date" | "select" | "number" | "boolean" = "text";
          let options: string[] | undefined;

          if (config.column_type === "date") {
            cellType = "date";
          } else if (config.column_type === "number") {
            cellType = "number";
          } else if (config.column_type === "boolean") {
            cellType = "boolean";
          } else if (config.column_name === "Gender") {
            cellType = "select";
            options = ["Male", "Female", "Other", "Prefer not to say"];
          }

          // Choose the appropriate save handler based on column type
          const handleSave = config.is_masterdata 
            ? handleMasterdataUpdate 
            : handleCustomDataUpdate;

          return (
            <EditableCell
              value={value}
              employeeId={row.original.id}
              field={config.is_masterdata ? fieldKey : config.column_name}
              type={cellType}
              options={options}
              canEdit={canEdit} // Pass permission flag
              onSave={handleSave}
              onError={(error) => toast.error(error)}
            />
          );
        };
        DataCell.displayName = `${config.column_name}Cell`;
        return DataCell;
      };

      return {
        accessorKey: config.column_name.toLowerCase().replace(/ /g, "_"),
        header: ({ column }) => {
          // Determine category for visual grouping
          const category = config.is_masterdata 
            ? "Employee Information" 
            : (config.category || "Uncategorized");
          
          // Add lock icon for read-only columns
          return (
            <div
              className={cn(
                column.getCanSort()
                  ? "flex flex-col items-start gap-1 cursor-pointer select-none hover:text-foreground"
                  : "flex flex-col items-start gap-1",
                column.getIsSorted() && "font-semibold"
              )}
              onClick={column.getCanSort() ? column.getToggleSortingHandler() : undefined}
              role={column.getCanSort() ? "button" : undefined}
              tabIndex={column.getCanSort() ? 0 : undefined}
              onKeyDown={(e) => {
                if (column.getCanSort() && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  column.getToggleSortingHandler()?.(e);
                }
              }}
              aria-label={
                column.getCanSort()
                  ? `Sort by ${config.column_name}${
                      column.getIsSorted() === "asc"
                        ? ", currently sorted ascending"
                        : column.getIsSorted() === "desc"
                        ? ", currently sorted descending"
                        : ""
                    }${!canEdit ? " (read-only)" : ""}`
                  : !canEdit ? `${config.column_name} (read-only)` : config.column_name
              }
            >
              {/* Category label (only show for custom columns) */}
              {!config.is_masterdata && (
                <span className="text-xs text-muted-foreground font-normal">
                  {category}
                </span>
              )}
              
              <div className="flex items-center gap-2">
                <span>{config.column_name}</span>
                {!canEdit && (
                  <Lock className="h-4 w-4 text-gray-400" aria-hidden="true" />
                )}
                {column.getCanSort() && (
                  <span className="ml-auto" aria-hidden="true">
                    {column.getIsSorted() === "asc" ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : column.getIsSorted() === "desc" ? (
                      <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4 opacity-50" />
                    )}
                  </span>
                )}
              </div>
            </div>
          );
        },
        id: config.id,
        enableSorting: true,
        sortingFn: config.column_type === "date" ? (rowA, rowB) => {
          const dateA = new Date(getEmployeeFieldValue(rowA.original, config.column_name) as string).getTime();
          const dateB = new Date(getEmployeeFieldValue(rowB.original, config.column_name) as string).getTime();
          return dateA - dateB;
        } : undefined,
        cell: getCellRenderer(),
      };
    });

    // Add Actions column for HR Admin
    if (isHRAdmin) {
      dataColumns.push({
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => {
          const employee = row.original;

          return (
            <div className="flex gap-2">
              {/* Archive/Unarchive buttons */}
              {employee.is_archived ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnarchiveClick(employee)}
                  title="Restore employee"
                >
                  <ArchiveRestore className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleArchiveClick(employee)}
                  title="Archive employee"
                >
                  <Archive className="h-4 w-4" />
                </Button>
              )}

              {/* Terminate/Reactivate buttons */}
              {employee.is_terminated ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReactivateClick(employee)}
                  title="Reactivate employee"
                >
                  <UserCheck className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTerminateClick(employee)}
                  title="Mark as terminated"
                >
                  <UserX className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        },
      });
    }

    return dataColumns;
  }, [columnConfigs, isHRAdmin, user, handleMasterdataUpdate, handleCustomDataUpdate]);

  const table = useReactTable({
    data: employees,
    columns,
    state: {
      globalFilter,
      sorting,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    globalFilterFn: globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Loading state for columns
  if (columnsLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Error state for columns
  if (columnsError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load column configuration. Please refresh the page.
        </AlertDescription>
      </Alert>
    );
  }

  // Zero columns edge case
  if (columnConfigs.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No columns configured for your role. Please contact HR.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center p-8"
        role="status"
        aria-label="Loading"
      >
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        {includeArchived 
          ? "No archived employees found." 
          : "No employees found. Click 'Add Employee' to create your first record."}
      </div>
    );
  }

  const filteredRowCount = table.getFilteredRowModel().rows.length;

  return (
    <>
      {isHRAdmin && (onIncludeArchivedChange || onIncludeTerminatedChange) && (
        <div className="flex items-center space-x-4 mb-4">
          {onIncludeArchivedChange && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-archived"
                checked={includeArchived}
                onCheckedChange={onIncludeArchivedChange}
              />
              <Label htmlFor="show-archived" className="cursor-pointer">
                Show Archived
              </Label>
            </div>
          )}

          {onIncludeTerminatedChange && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-terminated"
                checked={includeTerminated}
                onCheckedChange={onIncludeTerminatedChange}
              />
              <Label htmlFor="show-terminated" className="cursor-pointer">
                Show Terminated
              </Label>
            </div>
          )}
        </div>
      )}

      {/* Search Input */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 pr-9"
          />
          {globalFilter && (
            <button
              onClick={() => setGlobalFilter("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {filteredRowCount === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {globalFilter
                    ? "No employees match your search. Try adjusting your search terms."
                    : "No employees to display."}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow 
                  key={row.id}
                  className={cn(
                    row.original.is_archived && "bg-muted text-muted-foreground opacity-60",
                    row.original.is_terminated && !row.original.is_archived && "bg-red-50 text-red-800"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive {selectedEmployee?.first_name}{" "}
              {selectedEmployee?.surname}? They will be hidden from the main view but
              can be recovered later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmArchive} disabled={isArchiving}>
              {isArchiving ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={unarchiveDialogOpen} onOpenChange={setUnarchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore {selectedEmployee?.first_name}{" "}
              {selectedEmployee?.surname}? They will be returned to the main view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUnarchive} disabled={isArchiving}>
              {isArchiving ? "Restoring..." : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TerminateEmployeeModal
        employee={selectedEmployee}
        open={terminateModalOpen}
        onOpenChange={setTerminateModalOpen}
        onSuccess={() => {
          setTerminateModalOpen(false);
          onEmployeeUpdated?.();
        }}
      />

      <AlertDialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reactivate {selectedEmployee?.first_name}{" "}
              {selectedEmployee?.surname}? This will clear their termination date and reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReactivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReactivate} disabled={isReactivating}>
              {isReactivating ? "Reactivating..." : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
