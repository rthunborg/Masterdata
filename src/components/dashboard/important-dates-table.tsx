"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
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
import { Trash2 } from "lucide-react";
import { EditableCell } from "./editable-cell";
import { importantDateService } from "@/lib/services/important-date-service";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

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
  const isHRAdmin = userRole === "hr_admin";
  const t = useTranslations("tooltips");
  const tDates = useTranslations("dates");
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<ImportantDate | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  // Category filter and sort state
  const [categoryFilter, setCategoryFilter] = React.useState<string>("All");
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "week_number", desc: false },
    { id: "year", desc: false },
  ]);

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
      
      await importantDateService.update(id, { [field]: updateValue });
      toast.success("Important date updated successfully");
      onDateUpdated?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update important date";
      throw new Error(message);
    }
  }, [onDateUpdated]);

  const handleDeleteClick = (date: ImportantDate) => {
    setSelectedDate(date);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDate) return;

    try {
      setIsDeleting(true);
      await importantDateService.delete(selectedDate.id);
      toast.success("Important date deleted successfully");
      setDeleteDialogOpen(false);
      onDateDeleted?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete important date";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: ColumnDef<ImportantDate>[] = React.useMemo(() => {
    const cols: ColumnDef<ImportantDate>[] = [
      {
        accessorKey: "week_number",
        header: tDates("weekNumber"),
        enableSorting: true,
        cell: ({ row }) =>
          isHRAdmin ? (
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
          ),
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
        cell: ({ row }) =>
          isHRAdmin ? (
            <EditableCell
              value={row.original.category}
              employeeId={row.original.id}
              field="category"
              type="select"
              options={["Stena Dates", "ÖMC Dates", "Other"]}
              onSave={handleCellUpdate}
              onError={(error) => toast.error(error)}
            />
          ) : (
            row.original.category
          ),
      },
      {
        accessorKey: "date_description",
        header: "Date Description",
        enableSorting: true,
        cell: ({ row }) =>
          isHRAdmin ? (
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
          ),
      },
      {
        accessorKey: "date_value",
        header: "Date Value",
        enableSorting: true,
        cell: ({ row }) =>
          isHRAdmin ? (
            <EditableCell
              value={row.original.date_value}
              employeeId={row.original.id}
              field="date_value"
              type="text"
              onSave={handleCellUpdate}
              onError={(error) => toast.error(error)}
            />
          ) : (
            row.original.date_value
          ),
      },
      {
        accessorKey: "notes",
        header: "Notes",
        enableSorting: true,
        cell: ({ row }) =>
          isHRAdmin ? (
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
          ),
      },
    ];

    // Add actions column for HR Admin
    if (isHRAdmin) {
      cols.push({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
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
          </div>
        ),
      });
    }

    return cols;
  }, [isHRAdmin, handleCellUpdate, t, tDates]);

  // Filter dates by category
  const filteredDates = React.useMemo(() => {
    if (categoryFilter === "All") return dates;
    return dates.filter(date => date.category === categoryFilter);
  }, [dates, categoryFilter]);

  const table = useReactTable({
    data: filteredDates,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
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
            <SelectItem value="Stena Dates">Stena Dates</SelectItem>
            <SelectItem value="ÖMC Dates">ÖMC Dates</SelectItem>
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
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
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
              {selectedDate && (
                <div className="mt-2 font-medium">
                  {selectedDate.date_description} - {selectedDate.date_value}
                </div>
              )}
            </AlertDialogDescription>
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
    </div>
  );
}
