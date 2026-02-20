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

  type ColumnSizingState,

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


 
// Story 20.1: Select components removed (crew ready dropdown)

 
import {
  Tooltip,

  TooltipContent,

  TooltipTrigger,

} from "@/components/ui/tooltip";

 
import { Archive, ArchiveRestore, UserX, UserCheck, Search, X, ArrowUpDown, ArrowUp, ArrowDown, Lock, Clock, Minimize2, Maximize2, Eye, Edit, Save, BedDouble } from "lucide-react";


 
import { EditableCell } from "./editable-cell";


 
import { FilterButton, FilterPanel } from "./FilterPanel";
import { SaveFilterDialog } from "./FilterPanel/SaveFilterDialog";
import { useEmployeeFilters } from "@/hooks/useEmployeeFilters";
import { useSavedFilters } from "@/hooks/useSavedFilters";
import { ClearFilterButton } from "./ClearFilterButton";
import { FilteredCountDisplay } from "./FilteredCountDisplay";
import { EmptyFilterState } from "./EmptyFilterState";


 
import { getReadableTextColor } from "@/lib/utils/color-contrast";


 
import { EditableDateCell } from "./editable-date-cell";


 
import { TerminateEmployeeModal } from "./terminate-employee-modal";
import { RoomManagementModal } from "./room-management-modal";


 
import { employeeService } from "@/lib/services/employee-service";


 
import { customDataService } from "@/lib/services/custom-data-service";


 
import { canEditCrewingDone } from "@/lib/services/crewing-validation";


 
import { mutationQueueService } from "@/lib/services/mutation-queue";

 
import { toast } from "sonner";


 
import { useAuth } from "@/lib/hooks/use-auth";


 
import { useColumns } from "@/lib/hooks/use-columns";


 
import { useImportantDates } from "@/lib/hooks/use-important-dates";




 
import { loadColumnWidths, saveColumnWidths } from "@/lib/utils/column-width-storage";


 
import { ExportFieldSelectionDialog } from "./export-field-selection-dialog";
import { ExportConfirmationDialog } from "./ExportConfirmationDialog";

 
import { getEmployeeFieldValue, mapColumnToEmployeeField } from "@/lib/utils/column-mapping";

 
import { cn } from "@/lib/utils";

 
import { canEditField } from "@/lib/utils/role-utils";
import { UserRole, INTERNAL_ROLES } from "@/lib/types/user";


 
import { BulkActionsBar } from "./bulk-actions-bar";
import { EmployeeStatsBar } from "./employee-stats-bar";
import { ChecklistProgressIndicator } from "./checklist-progress-indicator";

 
import { useUIStore } from "@/lib/store/ui-store";

// Story 19.9: Sticky horizontal scrollbar - REMOVED in favor of natural document scrollbar
// import { StickyScrollbar } from "@/components/ui/sticky-scrollbar";


 
import { useTranslations } from "@/lib/i18n";
 
import { COLUMN_SELECT_OPTIONS } from "@/lib/constants/options";


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
  onOptimisticUpdate?: (id: string, updates: Partial<Employee>) => () => void;
  isColumnChanged?: (employeeId: string, columnName: string) => boolean; // Story 16.5: Change detection function
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

// Story 19.1: Constants for sticky column positioning
const CHECKBOX_COLUMN_WIDTH = 40;

// Story 19.1: Helper function to calculate sticky left offset for columns
// This centralizes the offset logic to avoid duplication between headers and cells
function calculateStickyLeftOffset(
  columnType: 'checkbox' | 'first_name' | 'surname' | 'other',
  firstNameColumnWidth: number | undefined,
  defaultColumnWidth: number
): number | undefined {
  switch (columnType) {
    case 'checkbox':
      return 0;
    case 'first_name':
      return CHECKBOX_COLUMN_WIDTH;
    case 'surname':
      return CHECKBOX_COLUMN_WIDTH + (firstNameColumnWidth ?? defaultColumnWidth);
    default:
      return undefined;
  }
}

 
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
  onOptimisticUpdate,
  isColumnChanged, // Story 16.5: Change detection function
}: EmployeeTableProps) {
  const { user } = useAuth();
  // isHRAdmin: The actual logged-in user's role (used for personal preferences & real permissions)
  const isHRAdmin = user?.role === "hr_admin";
  const t = useTranslations("tooltips");
  const tDashboard = useTranslations("dashboard");
  const tFilter = useTranslations("filter");
  const tModals = useTranslations("modals");
  const tAdmin = useTranslations("admin");
  const tToasts = useTranslations("toasts");

  // Get preview mode state and column visibility
  const { previewRole, isPreviewMode, initColumnVisibility, columnVisibility, density, setDensity } = useUIStore();

  // Initialize column visibility preferences on mount
  React.useEffect(() => {
    if (user?.id) {
      initColumnVisibility(user.id);
    }
  }, [user?.id, initColumnVisibility]);

  // Determine effective role for column filtering and UI simulation
  const effectiveRole = previewRole || user?.role;
  
  // isEffectivelyHRAdmin: For UI simulation in preview mode
  // When previewing as Sodexo, this will be false (simulating what Sodexo sees)
  const isEffectivelyHRAdmin = effectiveRole === "hr_admin";
  
  // isEffectivelyInternalUser: For features only visible to internal users (HR Admin, Recruiter, Admin Limited)
  const isEffectivelyInternalUser = effectiveRole && INTERNAL_ROLES.includes(effectiveRole as UserRole);

  // Fetch column configurations based on effective role (for preview mode)
  const { columns: columnConfigs, isLoading: columnsLoading, error: columnsError } = useColumns(effectiveRole);

  // When impersonating, fetch ALL columns (unfiltered) for the export dialog
  // This ensures the export dialog can see all columns in the system, then filter by impersonated role's permissions
  const [allColumnConfigs, setAllColumnConfigs] = React.useState<ColumnConfig[]>([]);
  
  React.useEffect(() => {
    if (previewRole) {
      // Fetch all columns without role filtering for export dialog
      import("@/lib/services/column-service").then(({ columnService }) => {
        columnService.getAllColumns().then(setAllColumnConfigs);
      });
    }
  }, [previewRole]);
  
  // Use all columns for export dialog when impersonating, otherwise use filtered columns
  const exportDialogColumns = previewRole ? allColumnConfigs : columnConfigs;

  // Fetch all Important Dates for resolving date field UUIDs
  const { dates: allImportantDates } = useImportantDates();

  // Story 16.5: Use isColumnChanged from props (passed from dashboard page to avoid duplicate API calls)
  // Default to no-op function if not provided for backward compatibility
  const checkColumnChanged = isColumnChanged || (() => false);

  const [archiveDialogOpen, setArchiveDialogOpen] = React.useState(false);
  const [unarchiveDialogOpen, setUnarchiveDialogOpen] = React.useState(false);
  const [terminateModalOpen, setTerminateModalOpen] = React.useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = React.useState(false);
  const [roomManagementModalOpen, setRoomManagementModalOpen] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<Employee | null>(null);
  const [isArchiving, setIsArchiving] = React.useState(false);
  const [isReactivating, setIsReactivating] = React.useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = React.useState(false);
  const [statsRefreshToken, setStatsRefreshToken] = React.useState(0);

  const bumpStats = React.useCallback(() => {
    setStatsRefreshToken((v) => v + 1);
  }, []);

  // Story 8.5: Crew-ready filter state - REMOVED in Story 20.1

  // Story 20.2: Filter panel state
  const [isFilterPanelOpen, setIsFilterPanelOpen] = React.useState(false);
  const [saveFilterDialogOpen, setSaveFilterDialogOpen] = React.useState(false);

  // Story 20.6: Saved filters (used by SaveFilterDialog in toolbar)
  const { saveFilter } = useSavedFilters();

  // Story 20.4: Advanced filtering with filter engine
  const {
    activeFilters,
    filteredEmployees: filterEngineEmployees,
    clearAllFilters,
    setFilters: setActiveFilters,
    filterCount,
    isFilterActive,
    filteredCount,
    totalCount,
    isFiltering, // Story 20.5: Loading state for slow filters
  } = useEmployeeFilters({
    employees,
    columnConfigs: columnConfigs, // Use columnConfigs from useColumns, not allColumnConfigs (which is only for preview mode)
    enableUrlSync: true,
  });

  // Story 13.2: Employee selection state
  const [selectedEmployeeIds, setSelectedEmployeeIds] = React.useState<Set<string>>(new Set());
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  // Default sort: internal users (see progress column) → checklist progress asc; others → hire_date desc (most recent first)
  const hasChecklistItemsForSort = columnConfigs.some(
    (col) => col.column_type === "boolean" && col.is_checklist_item
  );
  const showProgressColumnForSort = hasChecklistItemsForSort && isEffectivelyInternalUser;
  const hireDateColumnId = columnConfigs.find(
    (c) => c.db_column_name?.toLowerCase() === "hire_date"
  )?.id;
  const hasSetDefaultSortRef = React.useRef(false);
  React.useLayoutEffect(() => {
    if (hasSetDefaultSortRef.current || sorting.length !== 0) return;
    if (showProgressColumnForSort) {
      hasSetDefaultSortRef.current = true;
      setSorting([{ id: "checklist_progress", desc: false }]);
    } else if (hireDateColumnId) {
      hasSetDefaultSortRef.current = true;
      setSorting([{ id: hireDateColumnId, desc: true }]);
    }
  }, [showProgressColumnForSort, hireDateColumnId, sorting.length]);

  // Story 19.11: Column width persistence
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>(() => {
    if (user?.id) {
      return loadColumnWidths('dashboard', user.id) || {};
    }
    return {};
  });

  // Story 19.11: Debounced save for column widths
  const saveDebounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const handleColumnSizingChange = React.useCallback((
    updater: ColumnSizingState | ((old: ColumnSizingState) => ColumnSizingState)
  ) => {
    const newSizing = typeof updater === 'function' ? updater(columnSizing) : updater;
    setColumnSizing(newSizing);

    // Debounce save to localStorage (300ms delay)
    if (saveDebounceTimerRef.current) {
      clearTimeout(saveDebounceTimerRef.current);
    }

    saveDebounceTimerRef.current = setTimeout(() => {
      if (user?.id) {
        saveColumnWidths('dashboard', user.id, newSizing);
      }
    }, 300);
  }, [columnSizing, user?.id]);

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

  // Story 9.11: Row click selection removed - selection only via checkbox
  // Row clicks do not trigger selection, allowing normal row interactions (inline editing, buttons)

  // Story 8.5: Apply crew-ready filter to employees - REMOVED in Story 20.1
  // Story 20.4: Now using advanced filter engine
  const filteredEmployees = React.useMemo(() => {
    return filterEngineEmployees;
  }, [filterEngineEmployees]);

  // Story 8.5: Calculate count of eligible employees for crew-ready export
  // Story 20.7: Count only from filtered employees (respects active filters)
  const eligibleCrewReadyCount = React.useMemo(() => {
    return filteredEmployees.filter((emp) => {
      return canEditCrewingDone(emp) && emp.crewing_done !== true;
    }).length;
  }, [filteredEmployees]);

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

  // Story 19.9: Ref for sticky scrollbar
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

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

  // Handler for masterdata column updates
  const handleMasterdataUpdate = React.useCallback(async (
    id: string,
    field: string,
    value: string | number | boolean | null
  ) => {
    let rollback: (() => void) | undefined;

    try {
      if (onOptimisticUpdate) {
        rollback = onOptimisticUpdate(id, { [field]: value });
      } else {
      }

      await employeeService.update(id, { [field]: value });
      toast.success(tToasts("employees.updatedSuccessfully"));

      // Don't call onEmployeeUpdated immediately after optimistic update
      // Real-time sync will handle the update, preventing race conditions
      // where refetch overwrites the optimistic update before server processes it
      // Only call onEmployeeUpdated if no optimistic update was performed
      if (!onOptimisticUpdate) {
        onEmployeeUpdated?.();
      }

      // Stats are DB-sourced and need explicit refresh
      bumpStats();
    } catch (error: unknown) {
      // Rollback optimistic update
      if (rollback) {
        rollback();
      }

      const message = error instanceof Error ? error.message : tToasts("employees.updateFailed");
      throw new Error(message);
    }
  }, [bumpStats, onEmployeeUpdated, onOptimisticUpdate, tToasts]);

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
      bumpStats();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update custom data";
      throw new Error(message);
    }
  }, [bumpStats, onEmployeeUpdated]);

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
      bumpStats();

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
      bumpStats();

    } catch (error: unknown) {

      const message = error instanceof Error ? error.message : tToasts("employees.unarchiveFailed");

      toast.error(message);

    } finally {

      setIsArchiving(false);

    }

  };

  const handleBulkAction = async (action: 'archive' | 'restore') => {
    const selectedIds = Array.from(selectedEmployeeIds);
    if (selectedIds.length === 0) return;

    try {
      setIsBulkProcessing(true);

      const response = await fetch('/api/employees/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeIds: selectedIds,
          action: action === 'restore' ? 'restore' : 'archive'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to perform bulk action');
      }

      toast.success(
        action === 'archive'
          ? `Archived ${selectedIds.length} employees`
          : `Restored ${selectedIds.length} employees`
      );

      setSelectedEmployeeIds(new Set());
      onEmployeeUpdated?.();
      bumpStats();
    } catch (error) {
      toast.error('Failed to update employees');
      console.error(error);
    } finally {
      setIsBulkProcessing(false);
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
      bumpStats();

    } catch (error: unknown) {

      const message = error instanceof Error ? error.message : tToasts("employees.reactivateFailed");

      toast.error(message);

    } finally {

      setIsReactivating(false);

    }

  };

  // Story 8.5: Export crew-ready employees (with all prerequisites met but not yet marked)
  // Story 20.7: Crew-ready export respects filtered state


  const handleExportCrewReady = async () => {

    try {

      // Story 20.7: Pass filtered employee IDs to respect active filters
      const filteredEmployeeIds = filteredEmployees.map(e => e.id);

      const response = await fetch('/api/employees/export-crew-ready', {

        method: 'POST',

        credentials: 'include',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          selectedEmployeeIds: filteredEmployeeIds,
        }),

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
      bumpStats();

    } catch (error: unknown) {

      const message = error instanceof Error ? error.message : tToasts('employees.exportCrewReadyFailed');

      toast.error(message);

    }

  };

  // Build dynamic columns from column configs


  const columns: ColumnDef<Employee>[] = React.useMemo(() => {

    // Define styles based on density
    const isCompact = density === 'compact';
    const cellPaddingClass = isCompact ? 'px-2 py-1' : 'px-3 py-2';
    const cellHeightClass = isCompact ? 'min-h-8' : 'min-h-10';
    const fontSizeClass = isCompact ? 'text-xs' : 'text-sm';
    const iconSizeClass = isCompact ? 'h-3 w-3' : 'h-4 w-4';


    // Story 13.2: Selection checkbox column (first column)


    const selectionColumn: ColumnDef<Employee> = {

      id: "select",

      header: () => {
        const allVisibleIds = filteredEmployees.map(e => e.id);
        const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedEmployeeIds.has(id));
        const someSelected = allVisibleIds.some(id => selectedEmployeeIds.has(id));

        return (
          <div className="flex items-center justify-center w-full h-full gap-2">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={(value) => {
                setSelectedEmployeeIds((prev) => {
                  const next = new Set(prev);
                  if (value === true) {
                    allVisibleIds.forEach((id) => next.add(id));
                  } else {
                    allVisibleIds.forEach((id) => next.delete(id));
                  }
                  return next;
                });
              }}
              aria-label="Select all"
              className="w-4 h-4 cursor-pointer"
            />
          </div>
        );
      },

      enableSorting: false,

      enableResizing: false, // Story 16.6: Disable resize for checkbox column to prevent alignment issues

      size: 40, // Story 16.6: Match checkbox cell width (40px for checkbox + minimal padding)

      cell: ({ row }) => (

        <div>

          <Checkbox

            checked={isEmployeeSelected(row.original.id)}

            onCheckedChange={(checked) => {
              // Only toggle if this is a direct checkbox interaction
              toggleEmployeeSelection(row.original.id);
            }}
            onClick={(e) => {
              // Explicitly stop propagation for checkbox click to be safe
              e.stopPropagation();
            }}

            aria-label={`Select ${row.original.first_name} ${row.original.surname}`}

            className="w-4 h-4 cursor-pointer"

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


      // Use canEditField helper which handles Administrator's special edit restrictions
      // (can only edit checklist items + loneniva)
      const hasEditPermission = canEditField(userRole as UserRole, config);


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
        // Use mapColumnToEmployeeField for masterdata to ensure correct DB field name (e.g. "Lönenivå" -> "loneiva")
        // For custom columns, use db_column_name directly as fallback, but prefer consistent mapping
        const fieldKey = config.is_masterdata
          ? mapColumnToEmployeeField(config.column_name)
          : config.db_column_name.toLowerCase().replace(/ /g, "_");

        const DataCell = ({ row }: { row: Row<Employee> }) => {
          // Story 16.5: Re-compute isChanged on every render to ensure it's reactive
          // This ensures the cell updates when checkColumnChanged function changes
          const columnNameForChangeCheck = config.db_column_name?.toLowerCase().trim() || '';
          const isChanged = React.useMemo(
            () => checkColumnChanged(row.original.id, columnNameForChangeCheck),
            [checkColumnChanged, row.original.id, columnNameForChangeCheck]
          );

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

            // Story 16.5: Check if this date column has changed for highlighting
            // Map column_name to db_column_name for change detection
            const dateColumnDbName = config.db_column_name;
            const isDateChanged = checkColumnChanged(row.original.id, dateColumnDbName);

            return (

              <EditableDateCell

                value={dateValue}

                displayValue={value as string}

                employeeId={row.original.id}

                field={dateField}

                dateCategory={dateCategory}

                allDates={allImportantDates}

                canEdit={canEdit}

                isChanged={isDateChanged} // Story 16.5: Pass highlight flag

                className={cn(cellPaddingClass, cellHeightClass, fontSizeClass)}

                isCompact={isCompact}

                onSave={handleMasterdataUpdate}

                onError={(error) => toast.error(error)}

              />

            );

          }

          // Repayment columns: boolean checkboxes (null/false = unchecked, true = checked)
          if (["repayment_needed_omc", "repayment_needed_pe3"].includes(config.db_column_name)) {
            const repaymentField = config.db_column_name as "repayment_needed_omc" | "repayment_needed_pe3";
            const repaymentValue = row.original[repaymentField] as boolean | null;
            const isRepaymentChanged = checkColumnChanged(row.original.id, config.db_column_name);
            return (
              <EditableCell
                value={repaymentValue === true}
                employeeId={row.original.id}
                field={repaymentField}
                type="boolean"
                canEdit={canEdit}
                isChanged={isRepaymentChanged}
                isChecklistItem={false}
                booleanDisplay="checkbox"
                className={cn(cellPaddingClass, cellHeightClass, fontSizeClass)}
                isCompact={isCompact}
                onSave={handleMasterdataUpdate}
                onError={(error) => toast.error(error)}
              />
            );
          }

          // Standard cell rendering for other columns
          // Determine EditableCell type based on column_type


          let cellType: "text" | "date" | "select" | "number" | "boolean" = "text";

          let options: string[] | undefined;

          // Note: repayment_needed_omc and repayment_needed_pe3 are handled above with EditableDateCell
          if (config.column_type === "date") {

            cellType = "date";

          } else if (config.column_type === "number") {

            cellType = "number";

          } else if (config.column_type === "boolean") {

            cellType = "boolean";

          } else if (COLUMN_SELECT_OPTIONS[config.db_column_name]) {

            cellType = "select";

            options = COLUMN_SELECT_OPTIONS[config.db_column_name];

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

          // Story 16.5: isChanged is now computed above using useMemo for reactivity

          return (

            <EditableCell

              value={value}

              employeeId={row.original.id}

              field={config.is_masterdata ? fieldKey : config.db_column_name}

              type={cellType}

              options={options}

              canEdit={canEdit} // Pass permission flag

              isChanged={isChanged} // Story 16.5: Pass highlight flag

              isChecklistItem={config.is_checklist_item} // Story 19.x: Boolean fields show "Ja/Nej" or "Klart/Nej" based on this flag

              {...oneMarkedAtProp} // Conditionally pass oneMarkedAt for One field

              {...talmundoConditionalProps} // Conditionally pass One field data for Talmundo

              {...crewingDoneConditionalProps} // Conditionally pass employee data for Crewing/Done

              className={cn(cellPaddingClass, cellHeightClass, fontSizeClass)}

              isCompact={isCompact}

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


          // Determine permission indicator for preview mode
          // Show eye icon for view-only, edit icon for editable columns
          const showPermissionIndicator = isPreviewMode && hasEditPermission;
          const isViewOnly = isPreviewMode && !hasEditPermission;


          return (

            <Tooltip>
              <TooltipTrigger asChild>
                <div

                  className={cn(

                    "w-full min-w-0",

                    column.getCanSort()

                      ? "flex items-center gap-1.5 cursor-pointer select-none hover:text-foreground"

                      : "flex items-center gap-1.5",

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

                      ? `Sort by ${displayName}${column.getIsSorted() === "asc"

                        ? ", currently sorted ascending"

                        : column.getIsSorted() === "desc"

                          ? ", currently sorted descending"

                          : ""

                      }${!canEdit ? " (read-only)" : ""}`

                      : !canEdit ? `${displayName} (read-only)` : displayName

                  }

                >

                  {/* Header text with truncation - min-w-0 lets it shrink with column width so header aligns with values */}
                  <span className="truncate min-w-0" title={displayName}>
                    {displayName}
                  </span>

                  {/* Permission indicator for preview mode */}
                  {showPermissionIndicator && (
                    <Edit className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" aria-hidden="true" />
                  )}
                  {isViewOnly && (
                    <Eye className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" aria-hidden="true" />
                  )}

                  {/* Legacy lock icon (kept for non-preview mode) */}
                  {!canEdit && !isPreviewMode && (

                    <Lock className={cn(iconSizeClass, "text-gray-400 flex-shrink-0")} aria-hidden="true" />

                  )}

                  {column.getCanSort() && (

                    <span className="ml-auto flex-shrink-0" aria-hidden="true">

                      {column.getIsSorted() === "asc" ? (

                        <ArrowUp className={iconSizeClass} />

                      ) : column.getIsSorted() === "desc" ? (

                        <ArrowDown className={iconSizeClass} />

                      ) : (

                        <ArrowUpDown className={cn(iconSizeClass, "opacity-50")} />

                      )}

                    </span>

                  )}

                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-medium">{displayName}</p>
                  {isPreviewMode && (
                    <p className="text-xs text-muted-foreground">
                      {canEdit ? "Editable" : "View only"}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>

          );

        },

        id: config.id,

        enableSorting: true,

        ...(config.column_type === "date" && {

          sortingFn: (rowA, rowB) => {
            // For Important Date fields (stena_date, omc_date, pe3_date), we need to look up
            // the actual date_value from the ImportantDate object, not use the formatted display string
            const importantDateFields = ["stena_date", "omc_date", "pe3_date"];
            const dbField = config.db_column_name.toLowerCase();
            
            let dateAStr: string | null = null;
            let dateBStr: string | null = null;
            
            if (importantDateFields.includes(dbField)) {
              // Get the UUID from the employee and look up the actual date_value
              const dateIdA = rowA.original[dbField as keyof Employee] as string | null;
              const dateIdB = rowB.original[dbField as keyof Employee] as string | null;
              
              const dateObjA = dateIdA ? allImportantDates.find(d => d.id === dateIdA) : null;
              const dateObjB = dateIdB ? allImportantDates.find(d => d.id === dateIdB) : null;
              
              dateAStr = dateObjA?.date_value || null;
              dateBStr = dateObjB?.date_value || null;
            } else {
              // For regular date columns, use the value directly
              dateAStr = getEmployeeFieldValue(rowA.original, config.db_column_name, config.is_masterdata, allImportantDates, tDashboard("dateDeleted")) as string | null;
              dateBStr = getEmployeeFieldValue(rowB.original, config.db_column_name, config.is_masterdata, allImportantDates, tDashboard("dateDeleted")) as string | null;
            }
            
            // Handle null values - sort them to the end
            if (!dateAStr && !dateBStr) return 0;
            if (!dateAStr) return 1;
            if (!dateBStr) return -1;

            const dateA = new Date(dateAStr).getTime();
            const dateB = new Date(dateBStr).getTime();
            
            // Handle invalid dates
            if (isNaN(dateA) && isNaN(dateB)) return 0;
            if (isNaN(dateA)) return 1;
            if (isNaN(dateB)) return -1;

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

    // Add Actions column for HR Admin (simulated in preview mode)

    if (isEffectivelyHRAdmin) {

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

                      className={isCompact ? "h-6 w-6 p-0" : ""}

                    >

                      <ArchiveRestore className={iconSizeClass} />

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

                      className={isCompact ? "h-6 w-6 p-0" : ""}

                    >

                      <Archive className={iconSizeClass} />

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


    // Story 19.5: Checklist Progress column (only show if there are checklist items)
    // Only visible to internal users (hr_admin, recruiter, admin_limited)
    const hasChecklistItems = columnConfigs.some(
      (col) => col.column_type === 'boolean' && col.is_checklist_item
    );
    // Use isEffectivelyInternalUser for preview mode simulation
    const showProgressColumn = hasChecklistItems && isEffectivelyInternalUser;

    const progressColumn: ColumnDef<Employee> | null = showProgressColumn ? {
      id: "checklist_progress",
      header: ({ column }) => (
        <div
          className={cn(
            "flex items-center gap-1 font-medium cursor-pointer select-none",
            fontSizeClass
          )}
          onClick={column.getToggleSortingHandler()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              column.getToggleSortingHandler()?.(e);
            }
          }}
          tabIndex={0}
          role="button"
          aria-label={`Sort by Framsteg${column.getIsSorted() === "asc" ? ", currently sorted ascending" : column.getIsSorted() === "desc" ? ", currently sorted descending" : ""}`}
        >
          <span>Framsteg</span>
          <span className="ml-auto" aria-hidden="true">
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className={iconSizeClass} />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className={iconSizeClass} />
            ) : (
              <ArrowUpDown className={cn(iconSizeClass, "opacity-50")} />
            )}
          </span>
        </div>
      ),
      enableSorting: true,
      enableResizing: true,
      size: 120,
      accessorFn: (row) => {
        // Calculate progress for sorting - returns percentage as number
        const checklistColumns = columnConfigs.filter(
          (col) => col.column_type === 'boolean' && col.is_checklist_item
        );
        if (checklistColumns.length === 0) return 0;
        const completed = checklistColumns.filter((col) => {
          const value = getEmployeeFieldValue(row, col.db_column_name);
          return value === true;
        }).length;
        return (completed / checklistColumns.length) * 100;
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.getValue("checklist_progress") as number;
        const b = rowB.getValue("checklist_progress") as number;
        if (a !== b) return a - b;
        const createdA = rowA.original.created_at ?? "";
        const createdB = rowB.original.created_at ?? "";
        return createdA < createdB ? -1 : createdA > createdB ? 1 : 0;
      },
      cell: ({ row }) => (
        <div className={cn(cellPaddingClass, cellHeightClass, "flex items-center")}>
          <ChecklistProgressIndicator
            employee={row.original}
            columns={columnConfigs}
          />
        </div>
      ),
    } : null;

    // Story 13.2: Return selection column first, then progress column (if any), then data columns
    const allColumns = progressColumn
      ? [selectionColumn, progressColumn, ...dataColumns]
      : [selectionColumn, ...dataColumns];

    return allColumns;

  }, [
    columnConfigs,
    isHRAdmin,
    isEffectivelyHRAdmin,
    isEffectivelyInternalUser,
    handleMasterdataUpdate,
    handleCustomDataUpdate,
    effectiveRole,
    isPreviewMode,
    t,
    tAdmin,
    tDashboard,
    columnVisibility,
    allImportantDates,
    includeTerminated,
    isEmployeeSelected,
    toggleEmployeeSelection,
    checkColumnChanged,
    density,
    // Keep select-all checkbox reactive (avoid stale closures)
    filteredEmployees,
    selectedEmployeeIds,
  ]); // Story 16.5: Include checkColumnChanged so columns re-render when highlighting state changes

  // Story 13.5: Reset Crew Ready filter when Terminated filter is enabled - REMOVED in Story 20.1
  // Crew ready filter dropdown removed; clear selection when switching filter contexts
  React.useEffect(() => {
    if (includeTerminated || includeArchived || needsRepayment) {
      setSelectedEmployeeIds(new Set()); // Explicitly clear selection when switching context
    }
  }, [includeTerminated, includeArchived, needsRepayment]);

  // Story 13.5: Auto-select employees when Crew Ready filter is activated - REMOVED in Story 20.1
  // Crew ready filter and auto-selection removed; users select employees manually

  // Story 13.6: General export with field selection
  // Story 20.7: Export respects filtered state

  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [exportConfirmationOpen, setExportConfirmationOpen] = React.useState(false);
  const [pendingExport, setPendingExport] = React.useState<{
    selectedIds: string[];
    isFiltered: boolean;
  } | null>(null);


  const handleExportClick = () => {

    const selectedIds = Array.from(selectedEmployeeIds);

    if (selectedIds.length === 0) {

      toast.error(tDashboard("noEmployeesSelected") || tToasts("employees.noEmployeesSelected"));

      return;

    }

    // Story 20.7: Show confirmation if filters are active and user hasn't dismissed it
    const dismissedConfirmation = typeof window !== 'undefined' 
      ? localStorage.getItem("export-confirmation-dismissed") === "true"
      : false;

    if (isFilterActive && !dismissedConfirmation) {
      setPendingExport({ selectedIds, isFiltered: true });
      setExportConfirmationOpen(true);
    } else {
      setExportDialogOpen(true);
    }

  };

  const handleExportConfirmed = () => {
    setExportConfirmationOpen(false);
    setExportDialogOpen(true);
  };

  const handleExportWithFields = async (selectedFields: string[], impersonatedRole?: string) => {

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

          impersonatedRole: impersonatedRole,

          format: 'xlsx', // Always export as Excel

        }),

      });

      if (!response.ok) {

        const errorData = await response.json();

        // Story 17.4: Translate error codes to Swedish for external users
        const errorCode = errorData.error?.code;
        let errorMessage = errorData.error?.message || 'Failed to export employees';

        if (errorCode) {
          switch (errorCode) {
            case 'NO_EMPLOYEES_SELECTED':
              errorMessage = tDashboard("noEmployeesSelected") || errorMessage;
              break;
            case 'NO_FIELDS_SELECTED':
              errorMessage = tDashboard("noFieldsSelected") || errorMessage;
              break;
            case 'PERMISSION_DENIED':
              // Extract field names from details or message
              const deniedFields = errorData.error?.details?.deniedFields?.join(", ") ||
                errorData.error?.message?.match(/following fields: (.+)/)?.[1] || '';
              errorMessage = tDashboard("exportPermissionDenied", { fields: deniedFields }) || errorMessage;
              break;
            case 'NO_PERMITTED_FIELDS':
              errorMessage = tDashboard("exportNoPermittedFields") || errorMessage;
              break;
            case 'NO_EMPLOYEES_FOUND':
              errorMessage = tDashboard("exportNoEmployeesFound") || errorMessage;
              break;
            case 'IMPERSONATION_FORBIDDEN':
              errorMessage = "Only HR Admins can export with impersonated role context.";
              break;
            case 'INVALID_FORMAT':
              errorMessage = "Invalid export format specified.";
              break;
            default:
              // Use original message or fallback
              errorMessage = errorMessage;
          }
        }

        throw new Error(errorMessage);

      }


      // Download the file (Excel or CSV based on format)

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');

      a.href = url;

      const dateStr = new Date().toISOString().split('T')[0];

      // Determine file extension from Content-Type header
      const contentType = response.headers.get('Content-Type') || '';
      const isExcel = contentType.includes('spreadsheetml') || contentType.includes('excel');
      const extension = isExcel ? 'xlsx' : 'csv';

      a.download = `employees_export_${dateStr}.${extension}`;

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
      columnSizing,
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

    onColumnSizingChange: handleColumnSizingChange,

    globalFilterFn: globalFilterFn,

    getCoreRowModel: getCoreRowModel(),

    getFilteredRowModel: getFilteredRowModel(),

    getSortedRowModel: getSortedRowModel(),

    enableRowSelection: false, // Disabled - selection only via checkbox (Story 9.10)

    // Column resizing configuration (Story 9.4)

    enableColumnResizing: true,

    columnResizeMode: 'onChange',

    defaultColumn: {

      minSize: density === 'compact' ? 40 : 80,

      size: density === 'compact' ? 100 : 150,

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

      {/* Filters + tallies row */}
      {((isEffectivelyHRAdmin && (onIncludeArchivedChange || onIncludeTerminatedChange || onNeedsRepaymentChange)) || employees.length > 0) && (
        <div className="flex flex-wrap items-center gap-4 mb-4 pt-4 w-full max-w-full">
          {/* Filter checkboxes - always show for HR Admin (simulated in preview mode) */}
          {isEffectivelyHRAdmin && (onIncludeArchivedChange || onIncludeTerminatedChange || onNeedsRepaymentChange) && (
            <div className="flex flex-wrap items-center gap-4">
              {onIncludeArchivedChange && (
                <div className="flex items-center gap-2">
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
                <div className="flex items-center gap-2">
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
                <div className="flex items-center gap-2">
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

          {/* Employee tallies (only when table has data) */}
          {employees.length > 0 && (
            <EmployeeStatsBar
              refreshToken={statsRefreshToken}
              className="ml-auto"
            />
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

          <div className={cn(
            "flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4",
            // Prevent controls from exceeding viewport width
            "w-full max-w-full"
          )}>

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

            {/* Story 8.5: Crew-Ready Filter - REMOVED in Story 20.1 */}
            {/* Dropdown filter removed to consolidate filtering in new advanced filter panel (Epic 20) */}

            {/* Story 20.2: Filter Button */}
            <FilterButton
              onClick={() => setIsFilterPanelOpen(true)}
              isActive={isFilterActive}
              filterCount={filterCount}
            />

            {/* Story 20.5: Clear Filter Button */}
            <ClearFilterButton
              onClick={clearAllFilters}
              show={isFilterActive}
            />

            {/* Story 20.6: Save Filter Button (next to Rensa filter, outside panel) */}
            {isFilterActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSaveFilterDialogOpen(true)}
                aria-label={tFilter("saveCurrentFilters")}
                data-testid="save-filter-button"
              >
                <Save className="h-4 w-4 mr-2" />
                {tFilter("saveFilter")}
              </Button>
            )}

            {/* Density Toggle - Visible to everyone */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setDensity(density === 'compact' ? 'default' : 'compact')}
                  aria-label={density === 'compact' ? t("switchToComfortable") : t("switchToCompact")}
                >
                  {density === 'compact' ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{density === 'compact' ? t("switchToComfortable") : t("switchToCompact")}</p>
              </TooltipContent>
            </Tooltip>

            {/* Room Management Button (HR Admin only, single selection) */}
            {isEffectivelyHRAdmin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedEmployeeIds.size === 1) {
                        const selectedId = Array.from(selectedEmployeeIds)[0];
                        const emp = employees.find((e) => e.id === selectedId);
                        if (emp) {
                          setSelectedEmployee(emp);
                          setRoomManagementModalOpen(true);
                        }
                      }
                    }}
                    disabled={selectedEmployeeIds.size !== 1}
                    className="whitespace-nowrap"
                  >
                    <BedDouble className="h-4 w-4 mr-1" />
                    {tDashboard("roomManagement")}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {selectedEmployeeIds.size === 1
                      ? tDashboard("roomManagementTooltip")
                      : tDashboard("roomManagementTooltipDisabled")}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Story 13.6: General Export Button with Field Selection */}
            {/* Story 17.4: Export Button for External Users - visible to all users */}
            {/* Story 20.7: Export button label reflects filter/selection state */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportClick}
                  disabled={selectedEmployeeIds.size === 0}
                  className="whitespace-nowrap"
                >
                  {selectedEmployeeIds.size > 0
                    ? `Export Selected (${selectedEmployeeIds.size})`
                    : isFilterActive
                      ? `Export Filtered (${filteredCount})`
                      : tDashboard("exportSelected") || "Export All Employees"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {selectedEmployeeIds.size === 0
                    ? isFilterActive
                      ? `Export ${filteredCount} filtered employees`
                      : tDashboard("noEmployeesSelected") || "Inga anställda valda"
                    : `Export ${selectedEmployeeIds.size} selected employees`}
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Story 8.5: Export Crew-Ready Employees (HR Admin only, simulated in preview mode) */}

            {isEffectivelyHRAdmin && (

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

          {/* Story 20.5: Filtered Count Display */}
          <FilteredCountDisplay
            filteredCount={filteredCount}
            totalCount={totalCount}
            show={isFilterActive}
            className="mb-2"
          />

          {/* Story 20.5: ARIA live region for screen reader announcements */}
          <div 
            role="status" 
            aria-live="polite" 
            aria-atomic="true"
            className="sr-only"
          >
            {isFilterActive && `${filterCount} filters active. Showing ${filteredCount} of ${totalCount} employees.`}
          </div>

          <div 
            className="rounded-md border relative"
          >
            {/* Story 20.5: Loading overlay for slow filter operations (>50ms) */}
            {isFiltering && (
              <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-50 rounded-md">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
                  <span className="text-sm text-muted-foreground">Filtering...</span>
                </div>
              </div>
            )}

            {/* Story 19.9: Pass container ref for sticky scrollbar */}
            {/* Story 19.13: maxHeight enables vertical scrolling within the table container, 
                which is required for sticky headers to work. The height accounts for:
                - Header (~64px) + Nav (~56px) + Page padding (~48px) + Card header (~80px) 
                - Filters/controls (~60px) + some margin (~42px) ≈ 350px total */}
            <Table className="table-fixed" containerRef={tableContainerRef} maxHeight="calc(100vh - 350px)">

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

                      // Check if this is the checkbox column (empty header)
                      const isCheckboxColumn = header.column.id === "select";
                      const isActionColumn = header.column.id === "actions";
                      // Story 19.1: Check if this is a Name column (First Name or Surname) for sticky positioning
                      const isFirstNameColumn = columnConfig?.db_column_name === "first_name";
                      const isSurnameColumn = columnConfig?.db_column_name === "surname";
                      const isStickyNameColumn = isFirstNameColumn || isSurnameColumn;
                      const isCompact = density === "compact";

                      // Story 19.1: Calculate left offset for sticky columns using helper
                      const columnType = isCheckboxColumn ? 'checkbox'
                        : isFirstNameColumn ? 'first_name'
                          : isSurnameColumn ? 'surname'
                            : 'other';
                      const firstNameHeader = headerGroup.headers.find(
                        h => columnConfigs.find((c: ColumnConfig) => c.id === h.column.id)?.db_column_name === "first_name"
                      );
                      const defaultColumnWidth = isCompact ? 100 : 150;
                      const stickyLeftOffset = calculateStickyLeftOffset(
                        columnType,
                        firstNameHeader?.getSize(),
                        defaultColumnWidth
                      );

                      return (

                        <TableHead

                          key={header.id}

                          className={cn(
                            "relative",
                            // Story 16.6: For checkbox column, remove all padding to match cell structure
                            isCheckboxColumn && "p-0!",
                            // Compact mode adjustments
                            isCompact ? "h-8 px-2" : "h-12 px-4",
                            // Story 19.1: Sticky checkbox column (leftmost)
                            isCheckboxColumn && "sticky z-20 bg-background",
                            // Story 19.1: Sticky name columns (First Name and Surname)
                            isStickyNameColumn && "sticky z-20 bg-background",
                            // Story 19.1: Shadow only on the last sticky name column (Surname)
                            isSurnameColumn && "shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                          )}

                          style={{

                            width: header.getSize(),

                            minWidth: header.getSize(), // Story 16.6: Ensure consistent width

                            maxWidth: header.getSize(), // Story 16.6: Prevent width expansion

                            backgroundColor: categoryColor || undefined,

                            color: textColor === 'white' ? '#ffffff' : textColor === 'black' ? '#000000' : undefined,

                            // Story 19.1: Dynamic left offset for sticky columns
                            left: stickyLeftOffset !== undefined ? `${stickyLeftOffset}px` : undefined,

                          }}

                        >

                          {/* Header content with category label */}
                          {/* Story 19.x: For checkbox column, render the select-all checkbox from headerContent */}
                          {isCheckboxColumn ? (
                            headerContent
                          ) : (
                            <div className="flex flex-col items-start justify-center w-full leading-none gap-0.5 text-left">

                              {/* Primary header text - left-aligned to match cell values for consistent column alignment */}

                              <div className={cn(
                                "font-semibold leading-none w-full min-w-0",
                                // Compact mode text size
                                isCompact ? "text-xs" : "text-sm"
                              )}>

                                {headerContent}

                              </div>

                              {/* Category name as subtitle */}

                              {categoryName && (

                                <div className="text-xs text-gray-600 font-normal leading-none">

                                  {categoryName}

                                </div>

                              )}

                            </div>
                          )}

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

                  <TableRow className="min-h-[calc(100vh-350px)] [&>td]:h-full [&>td]:align-top">

                    <TableCell

                      colSpan={columns.length}

                      className="p-0 h-full"

                    >

                      <div className="sticky left-0 min-h-[calc(100vh-350px)] w-[calc(100vw-4rem)] max-w-full flex flex-col items-center justify-center text-center py-12">

                        {isFilterActive ? (
                          <EmptyFilterState
                            activeFilters={activeFilters}
                            columnConfigs={columnConfigs}
                            onClearFilters={clearAllFilters}
                            importantDates={allImportantDates}
                          />
                        ) : (
                          <div className="text-muted-foreground">
                            {globalFilter
                              ? tDashboard("noEmployeesMatchSearch")
                              : tDashboard("noEmployeesToDisplay")}
                          </div>
                        )}

                      </div>

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
                        ref={(el) => {

                          if (el) {

                            rowRefs.current.set(row.original.id, el);

                          } else {

                            rowRefs.current.delete(row.original.id);

                          }

                        }}

                        // Story 9.11: Explicitly prevent row clicks from triggering selection
                        // TanStack Table may still process clicks when rowSelection state exists,
                        // so we add an explicit handler that prevents any selection behavior
                        // UPDATE: Removed onClickCapture and onClick as we want standard event propagation
                        // and have disabled row selection logic. Checkbox interactions are handled directly.

                        className={cn(
                          // Base background to ensure sticky columns are opaque
                          "bg-background",

                          row.original.is_archived && "bg-muted text-muted-foreground opacity-60",

                          // Story 13.11: Status tints (priority: terminated > crew ready)
                          // Override TableRow's default data-[state=selected]:bg-muted to allow status tints to show
                          row.original.is_terminated && !row.original.is_archived && "bg-red-50 dark:bg-red-950/20 data-[state=selected]:bg-red-50!",

                          isCrewReady && !row.original.is_archived && !row.original.is_terminated && "bg-green-50/50 dark:bg-green-950/20 data-[state=selected]:bg-green-50/50!",

                          isUpdatedRow && "animate-pulse bg-blue-50 border-l-4 border-l-blue-400 transition-all duration-2000",

                          // Story 12.3: Visual indicator for pending sync

                          hasPendingSync && !row.original.is_archived && "border-l-2 border-l-yellow-400 bg-yellow-50/30",

                          // Story 13.2 & 13.3: Row selection styling (combines with status tints using opacity)
                          isEmployeeSelected(row.original.id) && "bg-gray-100/50 dark:bg-gray-800/50",

                          // Removed cursor-pointer - rows are no longer clickable for selection (Story 9.11)

                        )}

                        data-testid={`employee-row-${row.original.id}`}

                      >

                        {row.getVisibleCells().map((cell, cellIndex) => {
                          // Story 16.6: Check if this is the checkbox column to match header padding
                          const isCheckboxCell = cell.column.id === "select";
                          const isActionColumn = cell.column.id === "actions";
                          // Story 19.1: Check if this is a Name column for sticky positioning
                          const cellColumnConfig = columnConfigs.find((c: ColumnConfig) => c.id === cell.column.id);
                          const isFirstNameCell = cellColumnConfig?.db_column_name === "first_name";
                          const isSurnameCell = cellColumnConfig?.db_column_name === "surname";
                          const isStickyNameCell = isFirstNameCell || isSurnameCell;
                          const isCompact = density === "compact";

                          // Story 19.1: Calculate left offset for sticky cells using helper
                          const cellColumnType = isCheckboxCell ? 'checkbox'
                            : isFirstNameCell ? 'first_name'
                              : isSurnameCell ? 'surname'
                                : 'other';
                          const firstNameCell = row.getVisibleCells().find(
                            c => columnConfigs.find((cfg: ColumnConfig) => cfg.id === c.column.id)?.db_column_name === "first_name"
                          );
                          const defaultCellWidth = isCompact ? 100 : 150;
                          const cellStickyLeftOffset = calculateStickyLeftOffset(
                            cellColumnType,
                            firstNameCell?.column.getSize(),
                            defaultCellWidth
                          );

                          return (
                            <TableCell
                              key={cell.id}
                              style={{
                                width: cell.column.getSize(),
                                minWidth: cell.column.getSize(),
                                maxWidth: cell.column.getSize(),
                                // Story 19.1: Dynamic left offset for sticky cells
                                left: cellStickyLeftOffset !== undefined ? `${cellStickyLeftOffset}px` : undefined,
                              }}
                              className={cn(
                                "overflow-hidden",
                                // Story 16.6: Remove all padding for checkbox column to match header alignment
                                isCheckboxCell && "p-0!",
                                // Compact mode padding
                                !isCheckboxCell && (isCompact ? "p-2" : "p-4"),
                                // Story 19.1: Sticky checkbox column (leftmost)
                                isCheckboxCell && "sticky z-10 bg-inherit",
                                // Story 19.1: Sticky name columns (First Name and Surname)
                                isStickyNameCell && "sticky z-10 bg-inherit",
                                // Story 19.1: Shadow only on the last sticky name column (Surname)
                                isSurnameCell && "shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                              )}
                            >

                              <div className={cn(
                                "flex items-center gap-2 w-full",
                                // Story 16.6: Center checkbox/action columns, left-align text content
                                // Left alignment ensures column values align with header regardless of column name length
                                (isCheckboxCell || isActionColumn) ? "justify-center" : "justify-start text-left"
                              )}>

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
                          );
                        })}

                      </TableRow>

                    );

                  })

                )}

              </TableBody>

            </Table>

            {/* Story 19.9: Sticky horizontal scrollbar - REMOVED in favor of natural document scrollbar */}

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

      <RoomManagementModal
        employee={selectedEmployee}
        open={roomManagementModalOpen}
        onOpenChange={setRoomManagementModalOpen}
        onSuccess={() => {
          setRoomManagementModalOpen(false);
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
        columnConfigs={exportDialogColumns}
        visibleColumnIds={visibleColumnIds}
      />

      {/* Story 20.7: Export Confirmation Dialog */}
      <ExportConfirmationDialog
        open={exportConfirmationOpen}
        onOpenChange={setExportConfirmationOpen}
        filteredCount={filteredCount}
        totalCount={totalCount}
        onConfirm={handleExportConfirmed}
      />

      <BulkActionsBar
        selectedCount={selectedEmployeeIds.size}
        onArchive={() => handleBulkAction('archive')}
        onRestore={() => handleBulkAction('restore')}
        onClear={() => setSelectedEmployeeIds(new Set())}
        isArchivedView={includeArchived}
        isProcessing={isBulkProcessing}
        isHRAdmin={isEffectivelyHRAdmin}
      />

      {/* Story 20.2: Filter Panel - use columnConfigs (role-based) so filterable columns are available when not impersonating */}
      <FilterPanel
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        columnConfigs={columnConfigs}
        activeFilters={activeFilters}
        onFiltersChange={setActiveFilters}
        importantDates={allImportantDates}
      />

      {/* Story 20.6: Save Filter Dialog - rendered here so it opens when toolbar "Spara filter" is clicked even when panel is closed */}
      <SaveFilterDialog
        open={saveFilterDialogOpen}
        onOpenChange={setSaveFilterDialogOpen}
        activeFilters={activeFilters}
        columnConfigs={columnConfigs}
        onSave={async (name) => {
          await saveFilter({ name, filters: activeFilters });
          setSaveFilterDialogOpen(false);
        }}
      />

    </>

  );

}


