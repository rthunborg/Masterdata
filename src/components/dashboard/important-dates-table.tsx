"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  type ColumnSizingState,
  flexRender,
} from "@tanstack/react-table";
import type { ImportantDate } from "@/lib/types/important-date";
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
import { Trash2, Archive, ArchiveRestore } from "lucide-react";
import { EditableCell } from "./editable-cell";
import { CapacityBadge } from "./capacity-badge";
import { AssignedEmployeesBadge } from "./assigned-employees-badge";
import { AssignedEmployeesModal } from "./assigned-employees-modal";
import { importantDateService } from "@/lib/services/important-date-service";
import { toast } from "sonner";
import { useTranslations } from "@/lib/i18n";
import { useAuth } from "@/lib/hooks/use-auth";
import { cn } from "@/lib/utils";
import { formatOMCDate, isOMCDate } from "@/lib/utils/omc-date-formatter";
import { formatTimeDisplay } from "@/lib/utils/time-formatter";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { 
  loadColumnWidths, 
  saveColumnWidths, 
  clearColumnWidths 
} from "@/lib/utils/column-width-storage";
import { getDeadlineStatus } from "@/lib/utils/deadline-validator";
import { Badge } from "@/components/ui/badge";

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
  const isHRAdmin = userRole === "hr_admin";
  const t = useTranslations("tooltips");
  const tDates = useTranslations("dates");
  const tToasts = useTranslations("toasts");
  const tDashboard = useTranslations("dashboard");
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<ImportantDate | null>(null);
  const [selectedDateForEmployees, setSelectedDateForEmployees] = React.useState<ImportantDate | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isArchiving, setIsArchiving] = React.useState(false);
  
  // Category filter and sort state
  const [categoryFilter, setCategoryFilter] = React.useState<string>("All");
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "week_number", desc: false },
    { id: "year", desc: false },
  ]);
  
  // Column resizing state (Story 9.4b)
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>(() => {
    // Load saved widths from localStorage on mount
    if (user?.id) {
      return loadColumnWidths('importantDates', user.id) || {};
    }
    return {};
  });
  
  // Debounced save for column widths (Story 9.4b)
  const saveDebounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const handleColumnSizingChange = React.useCallback((updater: ColumnSizingState | ((old: ColumnSizingState) => ColumnSizingState)) => {
    const newSizing = typeof updater === 'function' ? updater(columnSizing) : updater;
    setColumnSizing(newSizing);
    
    // Debounce save to localStorage (300ms delay)
    if (saveDebounceTimerRef.current) {
      clearTimeout(saveDebounceTimerRef.current);
    }
    
    saveDebounceTimerRef.current = setTimeout(() => {
      if (user?.id) {
        saveColumnWidths('importantDates', user.id, newSizing);
      }
    }, 300);
  }, [columnSizing, user?.id]);

  const handleCellUpdate = React.useCallback(async (
    id: string, 
    field: string, 
    value: string | number | boolean | null
  ) => {
    try {
      // Convert week_number string to number if needed
      let updateValue: string | number | null = value as string | number | null;
      if (field === "week_number" && value !== null && typeof value === "string") {
        updateValue = parseInt(value, 10);
        if (isNaN(updateValue)) {
          throw new Error("Week number must be a valid number");
        }
      }
      
      // Convert max_spots to number and adjust remaining_spots accordingly
      if (field === "max_spots") {
        const numValue = typeof value === "number" ? value : (value !== null ? parseInt(String(value), 10) : null);
        if (numValue === null || isNaN(numValue) || numValue < 0) {
          throw new Error("Max capacity must be a valid non-negative number");
        }
        
        // Find current date to get current capacity values
        const currentDate = dates.find(d => d.id === id);
        if (currentDate) {
          const currentMaxSpots = currentDate.max_spots ?? 99;
          const currentRemainingSpots = currentDate.remaining_spots ?? 99;
          
          // Calculate number of assigned employees
          const assignedCount = currentMaxSpots - currentRemainingSpots;
          
          // Calculate new remaining spots: new max - assigned count
          // Ensure it doesn't go below 0
          const newRemainingSpots = Math.max(0, numValue - assignedCount);
          
          // Update both max_spots and remaining_spots
          await importantDateService.update(id, { 
            max_spots: numValue,
            remaining_spots: newRemainingSpots
          });
        } else {
          // Fallback: just update max_spots if date not found
          await importantDateService.update(id, { max_spots: numValue });
        }
      } else {
        await importantDateService.update(id, { [field]: updateValue });
      }
      
      toast.success(tDates('dateUpdated'));
      onDateUpdated?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update important date";
      throw new Error(message);
    }
  }, [onDateUpdated, dates, tDates]);

  const handleDeleteClick = (date: ImportantDate) => {
    setSelectedDate(date);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDate) return;

    try {
      setIsDeleting(true);
      await importantDateService.delete(selectedDate.id);
      toast.success(tToasts('dates.dateDeleted'));
      setDeleteDialogOpen(false);
      onDateDeleted?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tToasts('dates.deleteFailed');
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchiveClick = React.useCallback(async (date: ImportantDate) => {
    try {
      setIsArchiving(true);
      await importantDateService.archive(date.id);
      toast.success(tToasts('dates.dateArchived'));
      onDateUpdated?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tToasts('dates.archiveFailed');
      toast.error(message);
    } finally {
      setIsArchiving(false);
    }
  }, [onDateUpdated, tToasts]);

  const handleRestoreClick = React.useCallback(async (date: ImportantDate) => {
    try {
      setIsArchiving(true);
      await importantDateService.restore(date.id);
      toast.success(tToasts('dates.dateRestored'));
      onDateUpdated?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tToasts('dates.restoreFailed');
      toast.error(message);
    } finally {
      setIsArchiving(false);
    }
  }, [onDateUpdated, tToasts]);

  const columns: ColumnDef<ImportantDate>[] = React.useMemo(() => {
    const cols: ColumnDef<ImportantDate>[] = [
      {
        accessorKey: "week_number",
        header: tDates("weekNumber"),
        enableSorting: true,
        cell: ({ row }) => {
          const isArchived = !row.original.is_active;
          return isHRAdmin && !isArchived ? (
            <EditableCell
              value={row.original.week_number?.toString() || null}
              employeeId={row.original.id}
              field="week_number"
              type="text"
              onSave={handleCellUpdate}
              onError={(error) => toast.error(error)}
            />
          ) : (
            row.original.week_number ?? "—"
          );
        },
      },
      {
        accessorKey: "year",
        header: tDates("year"),
        enableSorting: true,
        cell: ({ row }) => row.original.year,
      },
      {
        accessorKey: "category",
        header: tDates("category"),
        enableSorting: true,
        cell: ({ row }) => {
          const isArchived = !row.original.is_active;
          return isHRAdmin && !isArchived ? (
            <EditableCell
              value={row.original.category}
              employeeId={row.original.id}
              field="category"
              type="select"
              options={["Stena Dates", "ÖMC Dates", "PE3 Dates", "Other"]}
              onSave={handleCellUpdate}
              onError={(error) => toast.error(error)}
            />
          ) : (
            row.original.category
          );
        },
      },
      {
        accessorKey: "date_description",
        header: tDates("dateDescription"),
        enableSorting: true,
        cell: ({ row }) => {
          const isArchived = !row.original.is_active;
          return isHRAdmin && !isArchived ? (
            <EditableCell
              value={row.original.date_description}
              employeeId={row.original.id}
              field="date_description"
              type="text"
              onSave={handleCellUpdate}
              onError={(error) => toast.error(error)}
            />
          ) : (
            row.original.date_description
          );
        },
      },
      {
        accessorKey: "date_value",
        header: tDates("dateValue"),
        enableSorting: true,
        cell: ({ row }) => {
          const isArchived = !row.original.is_active;
          const isOmc = isOMCDate(row.original.category);
          const isPE3 = row.original.category === 'PE3 Dates';
          
          let displayValue = row.original.date_value;
          
          // Format ÖMC dates as two-day ranges
          if (isOmc) {
            displayValue = formatOMCDate(row.original.date_value, 'sv-SE');
          }
          // Format PE3 dates with time if available
          else if (isPE3 && row.original.time_value) {
            try {
              const date = new Date(row.original.date_value + 'T00:00:00');
              const formattedDate = format(date, 'd MMMM yyyy', { locale: sv });
              const formattedTime = formatTimeDisplay(row.original.time_value);
              displayValue = `${formattedDate} ${formattedTime}`;
            } catch {
              // Fall back to date only if parsing fails
              displayValue = row.original.date_value;
            }
          }
          
          return isHRAdmin && !isArchived ? (
            <EditableCell
              value={row.original.date_value}
              employeeId={row.original.id}
              field="date_value"
              type="text"
              category={row.original.category}
              onSave={handleCellUpdate}
              onError={(error) => toast.error(error)}
            />
          ) : (
            displayValue
          );
        },
      },
      // Story 8.11: Deadline columns
      {
        accessorKey: "deadline_submit",
        header: "Inlämningsdeadline",
        enableSorting: true,
        cell: ({ row }) => {
          const deadlineSubmit = row.original.deadline_submit;
          if (!deadlineSubmit) return "—";
          
          try {
            const date = new Date(deadlineSubmit + 'T00:00:00');
            const formattedDate = format(date, 'd MMM yyyy', { locale: sv });
            
            // Check deadline status
            const status = getDeadlineStatus(deadlineSubmit, row.original.deadline_cancel);
            
            return (
              <div className="flex items-center gap-2">
                <span>{formattedDate}</span>
                {status === 'submit_closed' && (
                  <Badge variant="destructive" className="text-xs">
                    Stängd
                  </Badge>
                )}
              </div>
            );
          } catch {
            return deadlineSubmit;
          }
        },
      },
      {
        accessorKey: "deadline_cancel",
        header: "Avbokningsdeadline",
        enableSorting: true,
        cell: ({ row }) => {
          const deadlineCancel = row.original.deadline_cancel;
          if (!deadlineCancel) return "—";
          
          try {
            const date = new Date(deadlineCancel + 'T00:00:00');
            const formattedDate = format(date, 'd MMM yyyy', { locale: sv });
            
            // Check deadline status
            const status = getDeadlineStatus(row.original.deadline_submit, deadlineCancel);
            
            return (
              <div className="flex items-center gap-2">
                <span>{formattedDate}</span>
                {status === 'cancel_closed' && (
                  <Badge variant="destructive" className="text-xs">
                    Stängd
                  </Badge>
                )}
              </div>
            );
          } catch {
            return deadlineCancel;
          }
        },
      },
      {
        accessorKey: "notes",
        header: tDates("notes"),
        enableSorting: true,
        cell: ({ row }) => {
          const isArchived = !row.original.is_active;
          return isHRAdmin && !isArchived ? (
            <EditableCell
              value={row.original.notes}
              employeeId={row.original.id}
              field="notes"
              type="text"
              onSave={handleCellUpdate}
              onError={(error) => toast.error(error)}
            />
          ) : (
            row.original.notes || "—"
          );
        },
      },
      // Story 8.7: Capacity management columns
      {
        accessorKey: "max_spots",
        header: "Max Capacity",
        enableSorting: true,
        cell: ({ row }) => {
          const isArchived = !row.original.is_active;
          return isHRAdmin && !isArchived ? (
            <EditableCell
              value={row.original.max_spots ?? 99}
              employeeId={row.original.id}
              field="max_spots"
              type="number"
              onSave={handleCellUpdate}
              onError={(error) => toast.error(error)}
            />
          ) : (
            row.original.max_spots || "—"
          );
        },
      },
      {
        accessorKey: "remaining_spots",
        header: "Available Spots",
        enableSorting: true,
        cell: ({ row }) => {
          const remainingSpots = row.original.remaining_spots ?? 0;
          const maxSpots = row.original.max_spots ?? 99;
          
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {remainingSpots} / {maxSpots}
              </span>
              <CapacityBadge
                remainingSpots={remainingSpots}
                maxSpots={maxSpots}
              />
            </div>
          );
        },
      },
      // Story 8.8: Assigned Employees column
      {
        accessorKey: "assigned_employees",
        header: "Assigned Employees",
        enableSorting: true,
        cell: ({ row }) => {
          const count = row.original.assigned_employees?.length || 0;
          return (
            <AssignedEmployeesBadge
              count={count}
              onOpenModal={() => setSelectedDateForEmployees(row.original)}
            />
          );
        },
        sortingFn: (rowA, rowB) => {
          const countA = rowA.original.assigned_employees?.length || 0;
          const countB = rowB.original.assigned_employees?.length || 0;
          return countA - countB;
        },
      },
    ];

    // Add actions column for HR Admin
    if (isHRAdmin) {
      cols.push({
        id: "actions",
        header: tDates("actions"),
        cell: ({ row }) => {
          const isArchived = !row.original.is_active;
          return (
            <div className="flex gap-2">
              {!isArchived ? (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchiveClick(row.original)}
                        disabled={isArchiving}
                        aria-label="Archive important date"
                      >
                        <Archive className="h-4 w-4 text-amber-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("archiveDate")}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(row.original)}
                        aria-label="Delete important date"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("deleteDate")}</p>
                    </TooltipContent>
                  </Tooltip>
                </>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestoreClick(row.original)}
                      disabled={isArchiving}
                      aria-label="Restore important date"
                    >
                      <ArchiveRestore className="h-4 w-4 text-green-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("restoreDate")}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        },
      });
    }

    return cols;
  }, [isHRAdmin, handleCellUpdate, handleArchiveClick, handleRestoreClick, isArchiving, t, tDates]);

  // Filter dates by category and sort with archived dates at the bottom
  const filteredDates = React.useMemo(() => {
    let filtered = dates;
    
    // Filter by category if not "All"
    if (categoryFilter !== "All") {
      filtered = dates.filter(date => date.category === categoryFilter);
    }
    
    // Sort: active dates first (by current sorting), then archived dates at the bottom
    return filtered.sort((a, b) => {
      // Archived dates always go to the bottom
      if (a.is_active !== b.is_active) {
        return a.is_active ? -1 : 1;
      }
      // For dates with same active status, maintain natural order (will be sorted by table)
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
    // Column resizing configuration (Story 9.4b)
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    defaultColumn: {
      minSize: 80,
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
      {/* Category Filter */}
      <div className="flex items-center gap-4 pt-4">
        <Label htmlFor="category-filter" className="whitespace-nowrap">
          {tDates('filterByCategory')}:
        </Label>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger id="category-filter" className="w-[200px]">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">{tDates('allCategories')}</SelectItem>
            <SelectItem value="Stena Dates">Stena Dates</SelectItem>
            <SelectItem value="ÖMC Dates">ÖMC Dates</SelectItem>
            <SelectItem value="PE3 Dates">PE3 Dates</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id}
                    className="relative"
                    style={{
                      width: header.getSize(),
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    
                    {/* Resize handle (Story 9.4b) */}
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
                ))}
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
                    className={cn(isArchived && "bg-gray-50 opacity-60")}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell 
                        key={cell.id}
                        className={cn(isArchived && "text-gray-500")}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
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

      {/* Assigned Employees Modal (Story 8.8) */}
      <AssignedEmployeesModal
        date={selectedDateForEmployees}
        onClose={() => setSelectedDateForEmployees(null)}
      />
    </div>
  );
}
