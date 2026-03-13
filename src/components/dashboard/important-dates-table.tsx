"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  type ColumnSizingState,
  flexRender,
} from "@tanstack/react-table";
import { type ImportantDate, DATE_CATEGORIES } from "@/lib/types/important-date";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Maximize2, Minimize2 } from "lucide-react";
import { AssignedEmployeesModal } from "./assigned-employees-modal";
import { useUIStore } from "@/lib/store/ui-store";
import { useTranslations } from "@/lib/i18n";
import { useAuth } from "@/lib/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  loadColumnWidths, 
  saveColumnWidths
} from "@/lib/utils/column-width-storage";
import { StickyScrollbar } from "@/components/ui/sticky-scrollbar";
import { useImportantDatesActions } from "@/lib/hooks/use-important-dates-actions";
import { useImportantDatesColumns } from "@/lib/hooks/use-important-dates-columns";

interface ImportantDatesTableProps {
  dates: ImportantDate[];
  isLoading: boolean;
  userRole: string;
  onDateUpdated?: () => void;
  onDateDeleted?: () => void;
}

export function ImportantDatesTable({ 
  dates, 
  isLoading, 
  userRole,
  onDateUpdated,
  onDateDeleted,
}: ImportantDatesTableProps) {
  const { user } = useAuth();
  const { density, setDensity } = useUIStore();
  const isHRAdmin = userRole === "hr_admin" || userRole === "recruiter";
  const t = useTranslations("tooltips");
  const tDates = useTranslations("dates");

  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  
  const [categoryFilter, setCategoryFilter] = React.useState<string>("All");
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "week_number", desc: false },
    { id: "year", desc: false },
  ]);
  
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>(() => {
    if (user?.id) {
      return loadColumnWidths('importantDates', user.id) || {};
    }
    return {};
  });
  
  const saveDebounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const handleColumnSizingChange = React.useCallback((updater: ColumnSizingState | ((old: ColumnSizingState) => ColumnSizingState)) => {
    const newSizing = typeof updater === 'function' ? updater(columnSizing) : updater;
    setColumnSizing(newSizing);
    
    if (saveDebounceTimerRef.current) {
      clearTimeout(saveDebounceTimerRef.current);
    }
    
    saveDebounceTimerRef.current = setTimeout(() => {
      if (user?.id) {
        saveColumnWidths('importantDates', user.id, newSizing);
      }
    }, 300);
  }, [columnSizing, user?.id]);

  const {
    deleteDialogOpen,
    setDeleteDialogOpen,
    selectedDate,
    selectedDateForEmployees,
    setSelectedDateForEmployees,
    isDeleting,
    isArchiving,
    handleCellUpdate,
    handleDeleteClick,
    handleConfirmDelete,
    handleArchiveClick,
    handleRestoreClick,
    handleCellError,
  } = useImportantDatesActions({ dates, onDateUpdated, onDateDeleted });

  const columns = useImportantDatesColumns({
    isHRAdmin,
    density,
    handleCellUpdate,
    handleCellError,
    handleArchiveClick,
    handleRestoreClick,
    handleDeleteClick,
    setSelectedDateForEmployees,
    isArchiving,
  });

  const filteredDates = React.useMemo(() => {
    let filtered = dates;
    
    if (categoryFilter !== "All") {
      filtered = dates.filter(date => date.category === categoryFilter);
    }
    
    return [...filtered].sort((a, b) => {
      if (a.is_active !== b.is_active) {
        return a.is_active ? -1 : 1;
      }
      return 0;
    });
  }, [dates, categoryFilter]);

  const table = useReactTable({
    data: filteredDates,
    columns,
    state: {
      sorting,
      columnSizing,
    },
    onSortingChange: setSorting,
    onColumnSizingChange: handleColumnSizingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    defaultColumn: {
      minSize: density === 'compact' ? 40 : 80,
      size: density === 'compact' ? 100 : 150,
      maxSize: 500,
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" role="status" aria-label="Loading"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Filter & Density Toggle */}
      <div className="flex items-center gap-4 pt-4 justify-between">
        <div className="flex items-center gap-4">
        <Label htmlFor="category-filter" className="whitespace-nowrap">
          {tDates('filterByCategory')}:
        </Label>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger id="category-filter" className="w-[200px]">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">{tDates('allCategories')}</SelectItem>
            {DATE_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>

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
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden max-w-full">
        <Table containerRef={tableContainerRef} maxHeight="calc(100vh - 350px)">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isWeekNumberColumn = header.column.id === "week_number";
                  const isCategoryColumn = header.column.id === "category";
                  const isCompact = density === "compact";
                  
                  const weekNumberWidth = table.getColumn('week_number')?.getSize() ?? 80;
                  const stickyLeftOffset = isWeekNumberColumn ? 0 
                    : isCategoryColumn ? weekNumberWidth 
                    : undefined;
                  
                  return (
                  <TableHead 
                    key={header.id}
                    className={cn(
                      "relative",
                      isCompact ? "h-8 px-2 text-xs" : "h-12 px-4 text-sm",
                      isWeekNumberColumn && "sticky z-20 bg-background",
                      isCategoryColumn && "sticky z-20 bg-background",
                      isCategoryColumn && "shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",
                      isWeekNumberColumn && "text-center"
                    )}
                    style={{
                      width: header.getSize(),
                      left: stickyLeftOffset !== undefined ? `${stickyLeftOffset}px` : undefined,
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const isArchived = !row.original.is_active;
                return (
                  <TableRow 
                    key={row.id}
                    className={cn(
                      "bg-background",
                      isArchived && "bg-gray-50 opacity-60"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isWeekNumberColumn = cell.column.id === "week_number";
                      const isCategoryColumn = cell.column.id === "category";
                      const isCompact = density === "compact";
                      
                      const weekNumberWidth = table.getColumn('week_number')?.getSize() ?? 80;
                      const cellStickyLeftOffset = isWeekNumberColumn ? 0 
                        : isCategoryColumn ? weekNumberWidth 
                        : undefined;
                      
                      return (
                      <TableCell 
                        key={cell.id}
                        className={cn(
                          isArchived && "text-gray-500",
                          isCompact ? "p-2" : "p-4",
                      isWeekNumberColumn && "sticky z-10 bg-inherit",
                      isCategoryColumn && "sticky z-10 bg-inherit",
                      isCategoryColumn && "shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",
                      isCompact && "text-xs",
                      isWeekNumberColumn && "text-center"
                    )}
                    style={{
                      left: cellStickyLeftOffset !== undefined ? `${cellStickyLeftOffset}px` : undefined,
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {tDates('noImportantDates')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <StickyScrollbar containerRef={tableContainerRef} />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Important Date</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this date entry? This action cannot be undone.
            </AlertDialogDescription>
            {selectedDate && (
              <div className="mt-2 font-medium text-sm">
                {selectedDate.date_description} - {selectedDate.date_value}
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assigned Employees Modal */}
      <AssignedEmployeesModal
        date={selectedDateForEmployees}
        onClose={() => setSelectedDateForEmployees(null)}
      />
    </div>
  );
}
