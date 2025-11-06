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
import type { ColumnConfig } from "@/lib/types/column-config";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Archive, ArchiveRestore, UserX, UserCheck, Search, X, ArrowUpDown, ArrowUp, ArrowDown, Lock, Eye, EyeOff } from "lucide-react";
import { EditableCell } from "./editable-cell";
import { getReadableTextColor } from "@/lib/utils/color-contrast";
import { EditableDateCell } from "./editable-date-cell";
import { TerminateEmployeeModal } from "./terminate-employee-modal";
import { employeeService } from "@/lib/services/employee-service";
import { customDataService } from "@/lib/services/custom-data-service";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/use-auth";
import { useColumns } from "@/lib/hooks/use-columns";
import { useImportantDates } from "@/lib/hooks/use-important-dates";
import { getEmployeeFieldValue } from "@/lib/utils/column-mapping";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/store/ui-store";
import { useTranslations } from "@/lib/i18n";

interface EmployeeTableProps {
  employees: Employee[];
  isLoading: boolean;
  onEmployeeUpdated?: () => void;
  includeArchived?: boolean;
  onIncludeArchivedChange?: (value: boolean) => void;
  includeTerminated?: boolean;
  onIncludeTerminatedChange?: (value: boolean) => void;
  updatedEmployeeId?: string | null;
  onGlobalFilterChange?: (value: string) => void;
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
  updatedEmployeeId = null,
  onGlobalFilterChange,
}: EmployeeTableProps) {
  const { user } = useAuth();
  const isHRAdmin = user?.role === "hr_admin";
  const t = useTranslations("tooltips");
  const tDashboard = useTranslations("dashboard");
  const tModals = useTranslations("modals");
  const tAdmin = useTranslations("admin");
  
  // Get preview mode state and column visibility
  const { previewRole, isPreviewMode, initColumnVisibility, columnVisibility, toggleColumnVisibility, resetColumnVisibility } = useUIStore();
  
  // Initialize column visibility preferences on mount
  React.useEffect(() => {
    if (user?.id) {
      initColumnVisibility(user.id);
    }
  }, [user?.id, initColumnVisibility]);
  
  // Determine effective role for column filtering
  const effectiveRole = previewRole || user?.role;
  
  // Fetch column configurations based on effective role (for preview mode)
  const { columns: columnConfigs, isLoading: columnsLoading, error: columnsError } = useColumns(effectiveRole);
  
  // Fetch all Important Dates for resolving date field UUIDs
  const { dates: allImportantDates } = useImportantDates();
  
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
  
  // Row refs for scrolling
  const rowRefs = React.useRef<Map<string, HTMLTableRowElement>>(new Map());

  // Notify parent of global filter changes
  React.useEffect(() => {
    onGlobalFilterChange?.(globalFilter);
  }, [globalFilter, onGlobalFilterChange]);

  // Scroll to employee function
  const scrollToEmployee = React.useCallback((employeeId: string) => {
    const rowElement = rowRefs.current.get(employeeId);
    if (rowElement) {
      rowElement.scrollIntoView({ behavior: "smooth", block: "center" });
      rowElement.classList.add("ring-2", "ring-blue-500", "ring-offset-2");
      setTimeout(() => {
        rowElement.classList.remove("ring-2", "ring-blue-500", "ring-offset-2");
      }, 3000);
    }
  }, []);

  // Listen for scroll-to-employee events from notifications
  React.useEffect(() => {
    const handleScrollToEmployee = (event: Event) => {
      const customEvent = event as CustomEvent<{ employeeId: string }>;
      scrollToEmployee(customEvent.detail.employeeId);
    };

    window.addEventListener("scrollToEmployee", handleScrollToEmployee as EventListener);
    return () => {
      window.removeEventListener("scrollToEmployee", handleScrollToEmployee as EventListener);
    };
  }, [scrollToEmployee]);

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
    // First filter by role permissions
    const roleFilteredColumns = columnConfigs;
    
    // Then apply visibility preferences (for HR Admin only)
    const visibleColumns = isHRAdmin 
      ? roleFilteredColumns.filter((config) => {
          const isVisible = columnVisibility[config.id] !== false;
          
          // Debug logging in development
          if (typeof window !== "undefined" && window.location.hostname === "localhost") {
            if (columnVisibility[config.id] === false) {
              console.log("[Column Filter] Hiding column:", config.column_name, "ID:", config.id);
            }
          }
          
          return isVisible;
        })
      : roleFilteredColumns;
    
    const dataColumns: ColumnDef<Employee>[] = visibleColumns.map((config) => {
      // Determine if user can edit this column based on role permissions
      // In preview mode, all editing is disabled
      const userRole = effectiveRole || "";
      const hasEditPermission = config.role_permissions[userRole]?.edit ?? false;
      const canEdit = hasEditPermission && !isPreviewMode; // Disable editing in preview mode
      
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
          const value = getEmployeeFieldValue(row.original, config.column_name, config.is_masterdata, allImportantDates);
          
          // Special handling for Important Date columns (Stena Date, ÖMC Date, PE3 Date)
          if (["Stena Date", "ÖMC Date", "PE3 Date"].includes(config.column_name)) {
            const dateFieldMap: Record<string, keyof Employee> = {
              "Stena Date": "stena_date",
              "ÖMC Date": "omc_date",
              "PE3 Date": "pe3_date"
            };
            
            const dateCategoryMap: Record<string, string> = {
              "Stena Date": "Stena Dates",
              "ÖMC Date": "ÖMC Dates",
              "PE3 Date": "PE3 Dates"
            };
            
            const dateField = dateFieldMap[config.column_name];
            const dateCategory = dateCategoryMap[config.column_name];
            const dateValue = row.original[dateField] as string | null;
            
            return (
              <EditableDateCell
                value={dateValue}
                displayValue={value as string}
                employeeId={row.original.id}
                field={dateField}
                dateCategory={dateCategory}
                allDates={allImportantDates}
                canEdit={canEdit}
                onSave={handleMasterdataUpdate}
                onError={(error) => toast.error(error)}
              />
            );
          }
          
          // Standard cell rendering for other columns
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
        ...(config.column_type === "date" && {
          sortingFn: (rowA, rowB) => {
            const dateA = new Date(getEmployeeFieldValue(rowA.original, config.column_name, config.is_masterdata, allImportantDates) as string).getTime();
            const dateB = new Date(getEmployeeFieldValue(rowB.original, config.column_name, config.is_masterdata, allImportantDates) as string).getTime();
            return dateA - dateB;
          },
        }),
        cell: getCellRenderer(),
      };
    });

    // Add Actions column for HR Admin
    if (isHRAdmin) {
      dataColumns.push({
        id: "actions",
        header: tAdmin("actions"),
        enableSorting: false,
        cell: ({ row }) => {
          const employee = row.original;

          return (
            <div className="flex gap-2">
              {/* Terminate/Reactivate buttons (now first) */}
              {employee.is_terminated ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReactivateClick(employee)}
                    >
                      <UserCheck className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("reactivateEmployee")}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTerminateClick(employee)}
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("terminateEmployee")}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Archive/Unarchive buttons (now second) */}
              {employee.is_archived ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnarchiveClick(employee)}
                    >
                      <ArchiveRestore className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("restoreEmployee")}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleArchiveClick(employee)}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("archiveEmployee")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        },
      });
    }

    return dataColumns;
  }, [columnConfigs, isHRAdmin, handleMasterdataUpdate, handleCustomDataUpdate, effectiveRole, isPreviewMode, t, tAdmin, columnVisibility, allImportantDates]);

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
          : tDashboard('noEmployeesMessage')}
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
                {tDashboard("showArchived")}
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
                {tDashboard("showTerminated")}
              </Label>
            </div>
          )}
        </div>
      )}

      {/* Search Input and Column Visibility */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tDashboard("searchPlaceholder")}
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
        
        {/* Column Visibility Controls for HR Admin */}
        {isHRAdmin && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <EyeOff className="h-4 w-4 mr-2" />
                {tDashboard("columnVisibility")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">{tDashboard("showHiddenColumns")}</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {tDashboard("columnVisibilityDescription")}
                  </p>
                </div>
                
                {/* List of hideable columns */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {columnConfigs.map((config) => {
                    const isVisible = columnVisibility[config.id] !== false;
                    return (
                      <div key={config.id} className="flex items-center justify-between">
                        <span className="text-sm">{config.column_name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleColumnVisibility(config.id)}
                        >
                          {isVisible ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
                
                {/* Reset button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={resetColumnVisibility}
                >
                  {tDashboard("resetColumnVisibility")}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  // Get column config for category color styling
                  const columnId = header.column.id;
                  const columnConfig = columnConfigs.find((c: ColumnConfig) => c.id === columnId);
                  const categoryColor = columnConfig?.category_color;
                  const categoryName = columnConfig?.category;
                  
                  // Calculate text color for accessibility
                  const textColor = categoryColor 
                    ? getReadableTextColor(categoryColor)
                    : undefined;
                  
                  const headerContent = header.isPlaceholder ? null : flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  );
                  
                  return (
                    <TableHead 
                      key={header.id}
                      style={{
                        backgroundColor: categoryColor || undefined,
                        color: textColor === 'white' ? '#ffffff' : textColor === 'black' ? '#000000' : undefined,
                      }}
                    >
                      {categoryColor && categoryName ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>{headerContent}</div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Kategori: {categoryName}</p>
                            <p className="text-xs font-mono">{categoryColor}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        headerContent
                      )}
                    </TableHead>
                  );
                })}
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
                    ? tDashboard("noEmployeesMatchSearch")
                    : tDashboard("noEmployeesToDisplay")}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const isUpdatedRow = updatedEmployeeId === row.original.id;
                
                return (
                  <TableRow 
                    key={row.id}
                    ref={(el) => {
                      if (el) {
                        rowRefs.current.set(row.original.id, el);
                      } else {
                        rowRefs.current.delete(row.original.id);
                      }
                    }}
                    className={cn(
                      row.original.is_archived && "bg-muted text-muted-foreground opacity-60",
                      row.original.is_terminated && !row.original.is_archived && "bg-red-50 text-red-800",
                      isUpdatedRow && "animate-pulse bg-blue-50 border-l-4 border-l-blue-400 transition-all duration-2000"
                    )}
                    data-testid={`employee-row-${row.original.id}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tModals("archive.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tModals("archive.message", { 
                name: `${selectedEmployee?.first_name} ${selectedEmployee?.surname}` 
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>{tModals("archive.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmArchive} disabled={isArchiving}>
              {isArchiving ? "Archiving..." : tModals("archive.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={unarchiveDialogOpen} onOpenChange={setUnarchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tModals("restore.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tModals("restore.message", {
                name: `${selectedEmployee?.first_name} ${selectedEmployee?.surname}`,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>{tModals("restore.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUnarchive} disabled={isArchiving}>
              {isArchiving ? tModals("restore.restoring") : tModals("restore.confirm")}
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
            <AlertDialogTitle>{tModals("reactivate.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tModals("reactivate.message", {
                name: `${selectedEmployee?.first_name} ${selectedEmployee?.surname}`,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReactivating}>{tModals("reactivate.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReactivate} disabled={isReactivating}>
              {isReactivating ? tModals("reactivate.reactivating") : tModals("reactivate.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
