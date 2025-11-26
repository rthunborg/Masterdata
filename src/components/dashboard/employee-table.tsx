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

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue,

} from "@/components/ui/select";

import {

  Tooltip,

  TooltipContent,

  TooltipTrigger,

} from "@/components/ui/tooltip";

import { Archive, ArchiveRestore, UserX, UserCheck, Search, X, ArrowUpDown, ArrowUp, ArrowDown, Lock, Clock, Download } from "lucide-react";


import { EditableCell } from "./editable-cell";


import { getReadableTextColor } from "@/lib/utils/color-contrast";


import { EditableDateCell } from "./editable-date-cell";


import { TerminateEmployeeModal } from "./terminate-employee-modal";


import { employeeService } from "@/lib/services/employee-service";


import { customDataService } from "@/lib/services/custom-data-service";


import { canEditCrewingDone } from "@/lib/services/crewing-validation";


import { mutationQueueService } from "@/lib/services/mutation-queue";


import { useNetworkStatus } from "@/lib/hooks/use-network-status";


import { toast } from "sonner";


import { useAuth } from "@/lib/hooks/use-auth";


import { useColumns } from "@/lib/hooks/use-columns";


import { useImportantDates } from "@/lib/hooks/use-important-dates";


import {} from "@/lib/utils/column-width-storage";


import { ExportFieldSelectionDialog } from "./export-field-selection-dialog";

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

  needsRepayment?: boolean; // Story 8.13 AC 9

  onNeedsRepaymentChange?: (value: boolean) => void; // Story 8.13 AC 9

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

  needsRepayment = false, // Story 8.13 AC 9

  onNeedsRepaymentChange, // Story 8.13 AC 9

  updatedEmployeeId = null,

  onGlobalFilterChange,

}: EmployeeTableProps) {

  const { user } = useAuth();


  const isHRAdmin = user?.role === "hr_admin";


  const t = useTranslations("tooltips");


  const tDashboard = useTranslations("dashboard");


  const tModals = useTranslations("modals");


  const tAdmin = useTranslations("admin");


  const tToasts = useTranslations("toasts");


  // Get preview mode state and column visibility


  const { previewRole, isPreviewMode, initColumnVisibility, columnVisibility } = useUIStore();


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


  // Story 8.5: Crew-ready filter state


  const [crewReadyFilter, setCrewReadyFilter] = React.useState<'all' | 'ready' | 'not-ready'>('all');


  // Story 13.2: Employee selection state


  const [selectedEmployeeIds, setSelectedEmployeeIds] = React.useState<Set<string>>(new Set());

  const [globalFilter, setGlobalFilter] = React.useState("");

  const [sorting, setSorting] = React.useState<SortingState>([]);

  // Story 13.2: Toggle employee selection


  const toggleEmployeeSelection = React.useCallback((id: string) => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Story 13.2: Check if employee is selected


  const isEmployeeSelected = React.useCallback((id: string) => {

    return selectedEmployeeIds.has(id);

  }, [selectedEmployeeIds]);

  // Story 13.3: Row click handler with event delegation
  const handleRowClick = React.useCallback((event: React.MouseEvent<HTMLTableRowElement>, employeeId: string) => {
    // Check if click is on an interactive element or editable cell
    const target = event.target as HTMLElement;
    if (target.closest('button, input, a, [role="button"], [role="menuitem"], [role="menu"], [role="gridcell"]')) {
      return; // Don't change selection
    }

    // Toggle selection
    toggleEmployeeSelection(employeeId);
  }, [toggleEmployeeSelection]);

  // Story 8.5: Calculate count of eligible employees for crew-ready exportReadyFilter, setCrewReadyFilter] = React.useState<'all' | 'ready' | 'not-ready'>('all');


  // Story 8.5: Calculate count of eligible employees for crew-ready export


  const eligibleCrewReadyCount = React.useMemo(() => {

    return employees.filter((emp) => {

      return canEditCrewingDone(emp) && emp.crewing_done !== true;

    }).length;

  }, [employees]);

  // Poll every 60 seconds to update One field badge statuses (Story 8.3)


  // The One field status is calculated based on one_marked_at timestamp vs current time


  // We need periodic re-renders to update the badge status as time passes


  const [, setRefreshTrigger] = React.useState(0);

  React.useEffect(() => {

    const interval = setInterval(() => {


      // Force table re-render to recalculate One field status badges


      // The state update triggers a re-render even though we don't read the value

      setRefreshTrigger((prev) => prev + 1);

    }, 60000); // 60 seconds

    return () => clearInterval(interval);

  }, []);


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

  // Network status for offline support (Story 12.3)


  const { isOnline } = useNetworkStatus();


  // Track pending mutations for visual indicators


  const [pendingMutations, setPendingMutations] = React.useState<Set<string>>(new Set());


  // Load pending mutations on mount and when employees change

  React.useEffect(() => {

    const loadPendingMutations = async () => {


      const mutations = await mutationQueueService.getPendingMutations();


      const employeeIds = new Set(

        mutations

          .filter((m) => m.employeeId)

          .map((m) => m.employeeId!)

      );

      setPendingMutations(employeeIds);

    };

    loadPendingMutations();

    // Refresh every 5 seconds to catch new mutations


    const interval = setInterval(loadPendingMutations, 5000);

    return () => clearInterval(interval);

  }, [employees]);

  // Handler for masterdata column updates (Story 12.3: offline support)


  const handleMasterdataUpdate = React.useCallback(async (

    id: string, 

    field: string, 

    value: string | number | boolean | null

  ) => {

    try {

      if (!isOnline) {

        // Offline: queue mutation

        await mutationQueueService.queueMutation("update", { [field]: value }, id);

        toast.info(tToasts("employees.changeSavedLocally"));

        // Update pending mutations set

        setPendingMutations((prev) => new Set(prev).add(id));

      } else {

        // Online: update immediately

        await employeeService.update(id, { [field]: value });

        toast.success(tToasts("employees.updatedSuccessfully"));

      }

      onEmployeeUpdated?.();

    } catch (error: unknown) {

      console.error("[EmployeeTable] Update failed:", error);

      const message = error instanceof Error ? error.message : tToasts("employees.updateFailed");

      throw new Error(message);

    }

  }, [onEmployeeUpdated, isOnline]);

  // Handler for custom column updates


  const handleCustomDataUpdate = React.useCallback(async (

    id: string, 

    columnName: string, 

    value: string | number | boolean | null

  ) => {

    try {

      await customDataService.updateCustomData(id, { [columnName]: value });

      toast.success(tToasts("employees.customDataUpdated"));

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

        tToasts("employees.archived", { name: `${selectedEmployee.first_name} ${selectedEmployee.surname}` })

      );

      setArchiveDialogOpen(false);

      onEmployeeUpdated?.();

    } catch (error: unknown) {

      const message = error instanceof Error ? error.message : tToasts("employees.archiveFailed");

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

        tToasts("employees.restored", { name: `${selectedEmployee.first_name} ${selectedEmployee.surname}` })

      );

      setUnarchiveDialogOpen(false);

      onEmployeeUpdated?.();

    } catch (error: unknown) {

      const message = error instanceof Error ? error.message : tToasts("employees.unarchiveFailed");

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

      // Story 8.13 AC 7: Handle warnings from reactivation


      const { warnings } = await employeeService.reactivate(selectedEmployee.id);


      // Display success message

      toast.success(

        tToasts("employees.reactivated", { name: `${selectedEmployee.first_name} ${selectedEmployee.surname}` })

      );

      // Display warnings if any dates couldn't be restored

      if (warnings && warnings.length > 0) {

        warnings.forEach((warning) => {

          toast.warning(warning, { duration: 8000 });

        });

      }

      setReactivateDialogOpen(false);

      onEmployeeUpdated?.();

    } catch (error: unknown) {

      const message = error instanceof Error ? error.message : tToasts("employees.reactivateFailed");

      toast.error(message);

    } finally {

      setIsReactivating(false);

    }

  };

  // Story 8.5: Export crew-ready employees (with all prerequisites met but not yet marked)


  const handleExportCrewReady = async () => {

    try {

      const response = await fetch('/api/employees/export-crew-ready', {

        method: 'POST',

        credentials: 'include',

      });

      if (!response.ok) {

        const errorData = await response.json();

        if (response.status === 404) {

          toast.info(tToasts('employees.noCrewReadyFound'));

          return;

        }

        throw new Error(errorData.error?.message || 'Failed to export crew-ready employees');

      }


      // Get the count from headers


      const countHeader = response.headers.get('X-Employees-Exported');
      const count = countHeader ? parseInt(countHeader, 10) : 0;


      // Download the CSV file


      const blob = await response.blob();


      const url = window.URL.createObjectURL(blob);


      const a = document.createElement('a');

      a.href = url;

      a.download = `crew_ready_employees_${new Date().toISOString().split('T')[0]}.csv`;

      document.body.appendChild(a);

      a.click();

      document.body.removeChild(a);

      window.URL.revokeObjectURL(url);

      toast.success(tToasts("employees.exportedCrewReady", { count }));

      // Refresh the table to show updated crewing_done values

      onEmployeeUpdated?.();

    } catch (error: unknown) {

      const message = error instanceof Error ? error.message : tToasts('employees.exportCrewReadyFailed');

      toast.error(message);

    }

  };

  // Build dynamic columns from column configs


  const columns: ColumnDef<Employee>[] = React.useMemo(() => {


    // Story 13.2: Selection checkbox column (first column)


    const selectionColumn: ColumnDef<Employee> = {

      id: "select",

      header: () => null,

      enableSorting: false,

      size: 40,

      cell: ({ row }) => (

        <div onClick={(e) => e.stopPropagation()}>

          <Checkbox

            checked={isEmployeeSelected(row.original.id)}

            onCheckedChange={() => toggleEmployeeSelection(row.original.id)}

            aria-label={`Select ${row.original.first_name} ${row.original.surname}`}

            className="w-4 h-4"

            data-testid={`employee-select-checkbox-${row.original.id}`}

          />

        </div>

      ),

    };

    // First filter by role permissions


    const roleFilteredColumns = columnConfigs;


    // Story 8.13 AC 3 & Story 13.9: Filter repayment columns - only show when viewing terminated employees
    // Repayment columns are included in column definitions when includeTerminated is true,
    // but will be conditionally rendered per-row based on employee.is_terminated status


    const repaymentColumns = ['Återbetalningsskyldig ÖMC', 'Återbetalningsskyldig PE3'];


    const terminatedFilteredColumns = includeTerminated 

      ? roleFilteredColumns 

      : roleFilteredColumns.filter((config) => !repaymentColumns.includes(config.column_name));

    // Then apply visibility preferences (for HR Admin only)


    const visibleColumns = isHRAdmin 

      ? terminatedFilteredColumns.filter((config) => {

          const isVisible = columnVisibility[config.id] !== false;

          return isVisible;

        })

      : terminatedFilteredColumns;

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


        const fieldKey = config.db_column_name.toLowerCase().replace(/ /g, "_");


        const DataCell = ({ row }: { row: Row<Employee> }) => {


          // Story 13.9: Hide repayment columns for non-terminated employees
          const isRepaymentColumn = repaymentColumns.includes(config.column_name);
          if (isRepaymentColumn && !row.original.is_terminated) {
            return <div className="text-muted-foreground">—</div>;
          }


          // For masterdata columns, use column_name (display name like "ÖMC Date")


          // For custom columns, use db_column_name (the actual database column name)


          const columnIdentifier = config.is_masterdata ? config.column_name : config.db_column_name;


          const value = getEmployeeFieldValue(row.original, columnIdentifier, config.is_masterdata, allImportantDates, tDashboard("dateDeleted"));


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

            options = ["Man", "Woman"];

          } else if (config.column_name === "Rank") {

            cellType = "select";

            options = ["SEV", "CHEF"];

          }


          // Choose the appropriate save handler based on column type


          const handleSave = config.is_masterdata 

            ? handleMasterdataUpdate 

            : handleCustomDataUpdate;

          // Pass oneMarkedAt prop for One field (Story 8.3)


          const oneMarkedAtProp = (config.column_name === "One" || fieldKey === "one") 

            ? { oneMarkedAt: row.original.one_marked_at }

            : {};

          // Story 8.4: Pass oneValue and oneMarkedAt for Talmundo field conditional editability


          const talmundoConditionalProps = (config.column_name === "Talmundo" || fieldKey === "talmundo")

            ? { 

                oneValue: row.original.one,

                oneMarkedAt: row.original.one_marked_at 

              }

            : {};

          // Story 8.5: Pass full employee data for Crewing/Done field conditional editability


          const crewingDoneConditionalProps = (config.column_name === "Crewing/Done" || fieldKey === "crewing_done")

            ? { employeeData: row.original }

            : {};

          return (

            <EditableCell

              value={value}

              employeeId={row.original.id}

              field={config.is_masterdata ? fieldKey : config.db_column_name}

              type={cellType}

              options={options}

              canEdit={canEdit} // Pass permission flag

              {...oneMarkedAtProp} // Conditionally pass oneMarkedAt for One field

              {...talmundoConditionalProps} // Conditionally pass One field data for Talmundo

              {...crewingDoneConditionalProps} // Conditionally pass employee data for Crewing/Done

              onSave={handleSave}

              onError={(error) => toast.error(error)}

            />

          );

        };

        DataCell.displayName = `${config.db_column_name}Cell`;

        return DataCell;

      };

      return {

        accessorKey: config.db_column_name.toLowerCase().replace(/ /g, "_"),

        header: ({ column }) => {

          // Use column_name for header display (this is now the display name)


          const displayName = config.column_name;


          // Add lock icon for read-only columns

          return (

            <div

              className={cn(

                column.getCanSort()

                  ? "flex items-center gap-2 cursor-pointer select-none hover:text-foreground"

                  : "flex items-center gap-2",

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

                  ? `Sort by ${displayName}${

                      column.getIsSorted() === "asc"

                        ? ", currently sorted ascending"

                        : column.getIsSorted() === "desc"

                        ? ", currently sorted descending"

                        : ""

                    }${!canEdit ? " (read-only)" : ""}`

                  : !canEdit ? `${displayName} (read-only)` : displayName

              }

            >

              <span>{displayName}</span>

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

          );

        },

        id: config.id,

        enableSorting: true,

        ...(config.column_type === "date" && {

          sortingFn: (rowA, rowB) => {

            const dateA = new Date(getEmployeeFieldValue(rowA.original, config.db_column_name, config.is_masterdata, allImportantDates, tDashboard("dateDeleted")) as string).getTime();


            const dateB = new Date(getEmployeeFieldValue(rowB.original, config.db_column_name, config.is_masterdata, allImportantDates, tDashboard("dateDeleted")) as string).getTime();

            return dateA - dateB;

          },

        }),

        ...((config.db_column_name.toLowerCase() === 'loneiva' || config.db_column_name.toLowerCase() === 'lönenivå') && {

          sortingFn: (rowA, rowB) => {

            // Story 8.6: Numeric sorting with NULL values at end


            const a = getEmployeeFieldValue(rowA.original, config.db_column_name, config.is_masterdata, allImportantDates, tDashboard("dateDeleted")) as number | null;


            const b = getEmployeeFieldValue(rowB.original, config.db_column_name, config.is_masterdata, allImportantDates, tDashboard("dateDeleted")) as number | null;


            // NULL values always sort to the end

            if (a === null && b === null) return 0;

            if (a === null) return 1; // a after b

            if (b === null) return -1; // b after a

            // Normal numeric comparison

            return a - b;

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


    // Story 13.2: Return selection column first, then data columns

    return [selectionColumn, ...dataColumns];

  }, [columnConfigs, isHRAdmin, handleMasterdataUpdate, handleCustomDataUpdate, effectiveRole, isPreviewMode, t, tAdmin, tDashboard, columnVisibility, allImportantDates, includeTerminated, isEmployeeSelected, toggleEmployeeSelection]);

  // Story 8.5: Apply crew-ready filter to employees


  const filteredEmployees = React.useMemo(() => {

    if (crewReadyFilter === 'ready') {

      return employees.filter(emp => emp.crewing_done === true);

    } else if (crewReadyFilter === 'not-ready') {

      return employees.filter(emp => emp.crewing_done !== true);

    }

    return employees; // 'all'

  }, [employees, crewReadyFilter]);

  // Story 13.5: Reset Crew Ready filter when Terminated filter is enabled
  React.useEffect(() => {
    if (includeTerminated || includeArchived || needsRepayment) {
      setCrewReadyFilter('all');
    }
  }, [includeTerminated, includeArchived, needsRepayment]);

  // Story 13.5: Auto-select employees when Crew Ready filter is activated
  React.useEffect(() => {
    if (crewReadyFilter === 'ready') {
      const readyEmployeeIds = employees
        .filter(emp => emp.crewing_done === true)
        .map(emp => emp.id);
      setSelectedEmployeeIds(new Set(readyEmployeeIds));
    } else {
      setSelectedEmployeeIds(new Set());
    }
  }, [crewReadyFilter, employees]);

  // Story 13.6: General export with field selection

  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);


  const handleExportClick = () => {

    const selectedIds = Array.from(selectedEmployeeIds);

    if (selectedIds.length === 0) {

      toast.error(tDashboard("noEmployeesSelected") || tToasts("employees.noEmployeesSelected"));

      return;

    }

    setExportDialogOpen(true);

  };

  const handleExportWithFields = async (selectedFields: string[]) => {

    try {

      const selectedIds = Array.from(selectedEmployeeIds);

      if (selectedIds.length === 0) {

        toast.error(tDashboard("noEmployeesSelected") || tToasts("employees.noEmployeesSelected"));

        return;

      }

      if (selectedFields.length === 0) {

        toast.error(tDashboard("noFieldsSelected") || tToasts("employees.noFieldsSelected"));

        return;

      }


      const response = await fetch('/api/employees/export', {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

        },

        credentials: 'include',

        body: JSON.stringify({

          employeeIds: selectedIds,

          fields: selectedFields,

        }),

      });

      if (!response.ok) {

        const errorData = await response.json();

        throw new Error(errorData.error?.message || 'Failed to export employees');

      }


      // Download the CSV file

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');

      a.href = url;

      const dateStr = new Date().toISOString().split('T')[0];

      a.download = `employees_export_${dateStr}.csv`;

      document.body.appendChild(a);

      a.click();

      document.body.removeChild(a);

      window.URL.revokeObjectURL(url);

      toast.success(tDashboard("exportSuccess", { count: selectedIds.length }) || tToasts("employees.exportSuccess", { count: selectedIds.length }));

    } catch (error: unknown) {

      const message = error instanceof Error ? error.message : tToasts('employees.exportFailed');

      toast.error(message);

    }

  };

  // Get visible column IDs for the export dialog (Story 13.6)
  const visibleColumnIds = React.useMemo(() => {
    const visible = new Set<string>();
    columnConfigs.forEach((config) => {
      if (isHRAdmin) {
        const isVisible = columnVisibility[config.id] !== false;
        if (isVisible) {
          visible.add(config.id);
        }
      } else {
        // For non-HR Admin, check role permissions
        const rolePerms = config.role_permissions[effectiveRole || ''];
        if (rolePerms?.view) {
          visible.add(config.id);
        }
      }
    });
    return visible;
  }, [columnConfigs, columnVisibility, isHRAdmin, effectiveRole]);

  const table = useReactTable({
    data: filteredEmployees,
    columns,
    getRowId: (row) => row.id,
    state: {
      globalFilter,
      sorting,
      rowSelection: React.useMemo(() => {
        const selection: Record<string, boolean> = {};
        selectedEmployeeIds.forEach((id) => {
          selection[id] = true;
        });
        return selection;
      }, [selectedEmployeeIds]),
    },

    onGlobalFilterChange: setGlobalFilter,

    onSortingChange: setSorting,

    globalFilterFn: globalFilterFn,

    getCoreRowModel: getCoreRowModel(),

    getFilteredRowModel: getFilteredRowModel(),

    getSortedRowModel: getSortedRowModel(),

    enableRowSelection: true,

    // Column resizing configuration (Story 9.4)

    enableColumnResizing: true,

    columnResizeMode: 'onChange',

    defaultColumn: {

      minSize: 80,

      maxSize: 500,

    },

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


  const filteredRowCount = employees.length > 0 ? table.getFilteredRowModel().rows.length : 0;

  return (

    <>

      {/* Filter checkboxes - always show for HR Admin */}

      {isHRAdmin && (onIncludeArchivedChange || onIncludeTerminatedChange || onNeedsRepaymentChange) && (

        <div className="flex items-center space-x-4 mb-4 pt-4">

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

          {/* Story 8.13 AC 9: Needs Repayment filter */}

          {onNeedsRepaymentChange && (

            <div className="flex items-center space-x-2">

              <Checkbox

                id="needs-repayment"

                checked={needsRepayment}

                onCheckedChange={onNeedsRepaymentChange}

              />

              <Label htmlFor="needs-repayment" className="cursor-pointer">

                {tDashboard("needsRepayment")}

              </Label>

            </div>

          )}

        </div>

      )}

      {/* Empty state */}

      {employees.length === 0 ? (

        <div className="text-center p-8 text-muted-foreground">

          {includeArchived 

            ? "No arkiverade anställda hittades." 

            : tDashboard('noEmployeesMessage')}

        </div>

      ) : (

        <>

          {/* Search Input and Column Visibility */}

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">

        <div className="relative flex-1 max-w-sm w-full">

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

        {/* Story 8.5: Crew-Ready Filter */}

        <Select 

          value={crewReadyFilter} 

          onValueChange={(value) => setCrewReadyFilter(value as 'all' | 'ready' | 'not-ready')}

        >

          <SelectTrigger className="w-[180px]" aria-label="Crew Status" data-testid="crew-status-filter">

            <SelectValue placeholder="Crew Status" />

          </SelectTrigger>

          <SelectContent>

            <SelectItem value="all">Alla anställda</SelectItem>

            <SelectItem value="ready">Crew Ready</SelectItem>

            <SelectItem value="not-ready">Inte Crew Ready</SelectItem>

          </SelectContent>

        </Select>

        {/* Story 13.6: General Export Button with Field Selection (HR Admin only) */}
        {isHRAdmin && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportClick}
                disabled={selectedEmployeeIds.size === 0}
                className="whitespace-nowrap"
              >
                {tDashboard("exportSelected") || "Exporta markerade anställda"}
                {selectedEmployeeIds.size > 0 && ` (${selectedEmployeeIds.size})`}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {selectedEmployeeIds.size === 0
                  ? tDashboard("noEmployeesSelected") || "No employees selected. Please select employees to export."
                  : tDashboard("exportSelectedEmployees") || `Export ${selectedEmployeeIds.size} selected employee${selectedEmployeeIds.size === 1 ? '' : 's'}`}
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Story 8.5: Export Crew-Ready Employees (HR Admin only) */}

        {isHRAdmin && (

          <Tooltip>

            <TooltipTrigger asChild>

              <Button

                variant="outline"

                size="sm"

                onClick={handleExportCrewReady}

                disabled={eligibleCrewReadyCount === 0}

                className="whitespace-nowrap"

              >

                {tDashboard("exportCrewReady")}

                {eligibleCrewReadyCount > 0 && ` (${eligibleCrewReadyCount})`}

              </Button>

            </TooltipTrigger>

            <TooltipContent>

              <p>

                {eligibleCrewReadyCount === 0 

                  ? tDashboard("exportCrewReadyTooltipDisabled")

                  : tDashboard(

                      eligibleCrewReadyCount === 1 

                        ? "exportCrewReadyTooltip" 

                        : "exportCrewReadyTooltipPlural",

                      { count: eligibleCrewReadyCount }

                    )

                }

              </p>

            </TooltipContent>

          </Tooltip>

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

                      className="relative"

                      style={{

                        width: header.getSize(),

                        backgroundColor: categoryColor || undefined,

                        color: textColor === 'white' ? '#ffffff' : textColor === 'black' ? '#000000' : undefined,

                      }}

                    >

                      {/* Header content with category label */}

                      <div className="flex flex-col items-center justify-center leading-none pb-4">

                        {/* Primary header text */}

                        <div className="text-sm font-semibold leading-none">

                          {headerContent}

                        </div>

                        {/* Category name as subtitle */}

                        {categoryName && (

                          <div className="text-xs text-gray-600 font-normal leading-none">

                            {categoryName}

                          </div>

                        )}

                      </div>

                      {/* Resize handle (Story 9.4 - AC 3) */}

                      {header.column.getCanResize() && (

                        <div

                          onMouseDown={header.getResizeHandler()}

                          onTouchStart={header.getResizeHandler()}

                          className={cn(

                            "absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none",

                            "hover:bg-blue-500 bg-gray-300 opacity-0 hover:opacity-100 transition-opacity",

                            header.column.getIsResizing() && "bg-blue-500 opacity-100"

                          )}

                        />

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


                // Story 8.5: Visual indicator for crew-ready status


                const isCrewReady = row.original.crewing_done === true;


                // Story 12.3: Check if employee has pending sync mutations


                const hasPendingSync = pendingMutations.has(row.original.id);

                return (

                  <TableRow 
                    key={row.id}
                    data-state={isEmployeeSelected(row.original.id) ? "selected" : undefined}
                    onClick={(e) => handleRowClick(e, row.original.id)}
                    ref={(el) => {

                      if (el) {

                        rowRefs.current.set(row.original.id, el);

                      } else {

                        rowRefs.current.delete(row.original.id);

                      }

                    }}

                    className={cn(

                      row.original.is_archived && "bg-muted text-muted-foreground opacity-60",

                      // Story 13.11: Status tints (priority: terminated > crew ready)
                      // Override TableRow's default data-[state=selected]:bg-muted to allow status tints to show
                      row.original.is_terminated && !row.original.is_archived && "bg-red-50 dark:bg-red-950/20 data-[state=selected]:!bg-red-50",

                      isCrewReady && !row.original.is_archived && !row.original.is_terminated && "bg-green-50/50 dark:bg-green-950/20 data-[state=selected]:!bg-green-50/50",

                      isUpdatedRow && "animate-pulse bg-blue-50 border-l-4 border-l-blue-400 transition-all duration-2000",

                      // Story 12.3: Visual indicator for pending sync

                      hasPendingSync && !row.original.is_archived && "border-l-2 border-l-yellow-400 bg-yellow-50/30",

                      // Story 13.2 & 13.3: Row selection styling (combines with status tints using opacity)
                      isEmployeeSelected(row.original.id) && "bg-gray-100/50 dark:bg-gray-800/50",

                      // Story 13.3: Cursor pointer for clickable rows
                      "cursor-pointer"

                    )}

                    data-testid={`employee-row-${row.original.id}`}

                  >

                    {row.getVisibleCells().map((cell, cellIndex) => (

                      <TableCell key={cell.id}>

                        <div className="flex items-center gap-2">

                          {flexRender(cell.column.columnDef.cell, cell.getContext())}

                          {/* Story 12.3: Pending sync indicator in first cell */}

                          {cellIndex === 0 && hasPendingSync && (

                            <Tooltip>

                              <TooltipTrigger asChild>

                                <Clock className="h-3 w-3 text-yellow-600 animate-pulse" />

                              </TooltipTrigger>

                              <TooltipContent>

                                <p>Pending sync - changes will sync when online</p>

                              </TooltipContent>

                            </Tooltip>

                          )}

                        </div>

                      </TableCell>

                    ))}

                  </TableRow>

                );

              })

            )}

          </TableBody>

        </Table>

      </div>

        </>

      )}

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

      {/* Story 13.6: Export Field Selection Dialog */}
      <ExportFieldSelectionDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExportWithFields}
        columnConfigs={columnConfigs}
        visibleColumnIds={visibleColumnIds}
      />

    </>

  );

}


