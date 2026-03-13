import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { type ImportantDate, DATE_CATEGORIES } from "@/lib/types/important-date";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Trash2, Archive, ArchiveRestore } from "lucide-react";
import { EditableCell } from "@/components/dashboard/editable-cell";
import { CapacityBadge } from "@/components/dashboard/capacity-badge";
import { AssignedEmployeesBadge } from "@/components/dashboard/assigned-employees-badge";
import { useTranslations } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatDateForDisplay } from "@/lib/utils/format";
import { getDeadlineStatus } from "@/lib/utils/deadline-validator";
import { Badge } from "@/components/ui/badge";

interface UseImportantDatesColumnsParams {
  isHRAdmin: boolean;
  density: "default" | "compact";
  handleCellUpdate: (id: string, field: string, value: string | number | boolean | null) => Promise<void>;
  handleCellError: (error: string) => void;
  handleArchiveClick: (date: ImportantDate) => Promise<void>;
  handleRestoreClick: (date: ImportantDate) => Promise<void>;
  handleDeleteClick: (date: ImportantDate) => void;
  setSelectedDateForEmployees: (date: ImportantDate | null) => void;
  isArchiving: boolean;
}

export function useImportantDatesColumns({
  isHRAdmin,
  density,
  handleCellUpdate,
  handleCellError,
  handleArchiveClick,
  handleRestoreClick,
  handleDeleteClick,
  setSelectedDateForEmployees,
  isArchiving,
}: UseImportantDatesColumnsParams): ColumnDef<ImportantDate>[] {
  const t = useTranslations("tooltips");
  const tDates = useTranslations("dates");

  return React.useMemo(() => {
    const isCompact = density === 'compact';
    const cellPaddingClass = isCompact ? 'px-2 py-1' : 'px-3 py-2';
    const cellHeightClass = isCompact ? 'min-h-8' : 'min-h-10';
    const fontSizeClass = isCompact ? 'text-xs' : 'text-sm';
    const iconSizeClass = isCompact ? 'h-3 w-3' : 'h-4 w-4';

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
              className={cn(cellPaddingClass, cellHeightClass, fontSizeClass)}
              isCompact={isCompact}
              onSave={handleCellUpdate}
              onError={handleCellError}
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
              options={[...DATE_CATEGORIES]}
              className={cn(cellPaddingClass, cellHeightClass, fontSizeClass)}
              isCompact={isCompact}
              onSave={handleCellUpdate}
              onError={handleCellError}
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
              className={cn(cellPaddingClass, cellHeightClass, fontSizeClass)}
              isCompact={isCompact}
              onSave={handleCellUpdate}
              onError={handleCellError}
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

          const displayValue = formatDateForDisplay(
            row.original.date_value,
            row.original.category,
            row.original.time_value
          );

          return isHRAdmin && !isArchived ? (
            <EditableCell
              value={row.original.date_value}
              employeeId={row.original.id}
              field="date_value"
              type="text"
              category={row.original.category}
              className={cn(cellPaddingClass, cellHeightClass, fontSizeClass)}
              isCompact={isCompact}
              onSave={handleCellUpdate}
              onError={handleCellError}
            />
          ) : (
            displayValue
          );
        },
      },
      {
        accessorKey: "deadline_submit",
        header: "Inlämningsdeadline",
        enableSorting: true,
        cell: ({ row }) => {
          const deadlineSubmit = row.original.deadline_submit;
          if (!deadlineSubmit) return "—";

          const formattedDate = formatDateForDisplay(deadlineSubmit);
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
        },
      },
      {
        accessorKey: "deadline_cancel",
        header: "Avbokningsdeadline",
        enableSorting: true,
        cell: ({ row }) => {
          const deadlineCancel = row.original.deadline_cancel;
          if (!deadlineCancel) return "—";

          const formattedDate = formatDateForDisplay(deadlineCancel);
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
              className={cn(cellPaddingClass, cellHeightClass, fontSizeClass)}
              isCompact={isCompact}
              onSave={handleCellUpdate}
              onError={handleCellError}
            />
          ) : (
            row.original.notes || "—"
          );
        },
      },
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
              className={cn(cellPaddingClass, cellHeightClass, fontSizeClass)}
              isCompact={isCompact}
              onSave={handleCellUpdate}
              onError={handleCellError}
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
                        className={isCompact ? "h-6 w-6 p-0" : ""}
                      >
                        <Archive className={cn(iconSizeClass, "text-amber-600")} />
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
                        className={isCompact ? "h-6 w-6 p-0" : ""}
                      >
                        <Trash2 className={cn(iconSizeClass, "text-red-600")} />
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
                        className={isCompact ? "h-6 w-6 p-0" : ""}
                      >
                        <ArchiveRestore className={cn(iconSizeClass, "text-green-600")} />
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
  }, [isHRAdmin, handleCellUpdate, handleCellError, handleArchiveClick, handleRestoreClick, handleDeleteClick, setSelectedDateForEmployees, isArchiving, t, tDates, density]);
}
