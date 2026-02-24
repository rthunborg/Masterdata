"use client";

"use no memo";

 
import * as React from "react";


 
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
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


 
import { Checkbox } from "@/components/ui/checkbox";


 
import { Label } from "@/components/ui/label";


 
import { Skeleton } from "@/components/ui/skeleton";


 
// Story 20.1: Select components removed (crew ready dropdown)

 
import {
  Tooltip,

  TooltipContent,

  TooltipTrigger,

} from "@/components/ui/tooltip";

 
import { Clock } from "lucide-react";


 
import { FilterPanel } from "./FilterPanel";
import { SaveFilterDialog } from "./FilterPanel/SaveFilterDialog";
import { useEmployeeFilters } from "@/hooks/useEmployeeFilters";
import { useSavedFilters } from "@/hooks/useSavedFilters";
import { EmptyFilterState } from "./EmptyFilterState";


 
import { getReadableTextColor } from "@/lib/utils/color-contrast";


 
import { TerminateEmployeeModal } from "./terminate-employee-modal";
import { RoomManagementModal } from "./room-management-modal";


 
import { useEmployeeTableActions } from "@/lib/hooks/use-employee-table-actions";
import { useEmployeeExport } from "@/lib/hooks/use-employee-export";
import { useEmployeeColumns } from "@/lib/hooks/use-employee-columns";
import { EmployeeTableToolbar } from "./employee-table-toolbar";


 
import { canEditCrewingDone } from "@/lib/services/crewing-validation";


 
import { mutationQueueService } from "@/lib/services/mutation-queue";

 


 
import { useAuth } from "@/lib/hooks/use-auth";


 
import { useColumns } from "@/lib/hooks/use-columns";


 
import { useImportantDates } from "@/lib/hooks/use-important-dates";




 
import { loadColumnWidths, saveColumnWidths } from "@/lib/utils/column-width-storage";


 
import { ExportFieldSelectionDialog } from "./export-field-selection-dialog";
import { ExportConfirmationDialog } from "./ExportConfirmationDialog";

 
import { cn } from "@/lib/utils";

import { UserRole, INTERNAL_ROLES } from "@/lib/types/user";


 
import { BulkActionsBar } from "./bulk-actions-bar";
import { EmployeeStatsBar } from "./employee-stats-bar";

 
import { useUIStore } from "@/lib/store/ui-store";

import { StickyScrollbar } from "@/components/ui/sticky-scrollbar";


 
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
  const tDashboard = useTranslations("dashboard");
  const tModals = useTranslations("modals");
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
  const isEffectivelyInternalUser = !!effectiveRole && INTERNAL_ROLES.includes(effectiveRole as UserRole);

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

  const [roomManagementModalOpen, setRoomManagementModalOpen] = React.useState(false);
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

  const actions = useEmployeeTableActions({
    onEmployeeUpdated,
    onOptimisticUpdate,
    bumpStats,
    filteredEmployees,
    selectedEmployeeIds,
    clearSelection: () => setSelectedEmployeeIds(new Set()),
  });

  const exportActions = useEmployeeExport({
    selectedEmployeeIds,
    isFilterActive,
  });

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

  const { handleMasterdataUpdate, handleCustomDataUpdate } = actions;

  const {
    handleArchiveClick,
    handleUnarchiveClick,
    handleTerminateClick,
    handleReactivateClick,
    handleConfirmArchive,
    handleConfirmUnarchive,
    handleConfirmReactivate,
    handleBulkAction,
    handleExportCrewReady,
    handleCellError,
    archiveDialogOpen,
    setArchiveDialogOpen,
    unarchiveDialogOpen,
    setUnarchiveDialogOpen,
    terminateModalOpen,
    setTerminateModalOpen,
    reactivateDialogOpen,
    setReactivateDialogOpen,
    selectedEmployee,
    setSelectedEmployee,
    isArchiving,
    isReactivating,
    isBulkProcessing,
  } = actions;

  // Build dynamic columns from column configs (extracted to hook)
  const columns = useEmployeeColumns({
    columnConfigs,
    isHRAdmin,
    isEffectivelyHRAdmin,
    isEffectivelyInternalUser,
    effectiveRole,
    isPreviewMode,
    density,
    columnVisibility,
    allImportantDates,
    includeTerminated,
    filteredEmployees,
    selectedEmployeeIds,
    setSelectedEmployeeIds,
    isEmployeeSelected,
    toggleEmployeeSelection,
    checkColumnChanged,
    actions: {
      handleMasterdataUpdate,
      handleCustomDataUpdate,
      handleCellError,
      handleArchiveClick,
      handleUnarchiveClick,
      handleTerminateClick,
      handleReactivateClick,
    },
  });


  // Story 13.5: Reset Crew Ready filter when Terminated filter is enabled - REMOVED in Story 20.1
  // Crew ready filter dropdown removed; clear selection when switching filter contexts
  React.useEffect(() => {
    if (includeTerminated || includeArchived || needsRepayment) {
      setSelectedEmployeeIds(new Set()); // Explicitly clear selection when switching context
    }
  }, [includeTerminated, includeArchived, needsRepayment]);

  // Story 13.5: Auto-select employees when Crew Ready filter is activated - REMOVED in Story 20.1
  // Crew ready filter and auto-selection removed; users select employees manually

  const {
    exportDialogOpen,
    setExportDialogOpen,
    exportConfirmationOpen,
    setExportConfirmationOpen,
    pendingExport,
    handleExportClick,
    handleExportConfirmed,
    handleExportWithFields,
  } = exportActions;

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

          <EmployeeTableToolbar
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            isFilterActive={isFilterActive}
            filterCount={filterCount}
            filteredCount={filteredCount}
            totalCount={totalCount}
            onOpenFilterPanel={() => setIsFilterPanelOpen(true)}
            onClearAllFilters={clearAllFilters}
            onOpenSaveFilterDialog={() => setSaveFilterDialogOpen(true)}
            density={density}
            setDensity={setDensity}
            isEffectivelyHRAdmin={isEffectivelyHRAdmin}
            selectedEmployeeIds={selectedEmployeeIds}
            employees={employees}
            onSelectEmployee={setSelectedEmployee}
            onOpenRoomManagement={() => setRoomManagementModalOpen(true)}
            handleExportClick={handleExportClick}
            handleExportCrewReady={handleExportCrewReady}
            eligibleCrewReadyCount={eligibleCrewReadyCount}
          />

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

            <StickyScrollbar containerRef={tableContainerRef} />

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


