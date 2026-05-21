"use no memo";

import * as React from "react";
import { type ColumnDef, type Row } from "@tanstack/react-table";
import type { Employee } from "@/lib/types/employee";
import type { ColumnConfig } from "@/lib/types/column-config";
import type { ImportantDate } from "@/lib/types/important-date";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Archive,
  ArchiveRestore,
  UserX,
  UserCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Lock,
  Eye,
  Edit,
} from "lucide-react";
import { EditableCell } from "@/components/dashboard/editable-cell";
import { EditableDateCell } from "@/components/dashboard/editable-date-cell";
import { ChecklistProgressIndicator } from "@/components/dashboard/checklist-progress-indicator";
import {
  getEmployeeFieldValue,
  mapColumnToEmployeeField,
} from "@/lib/utils/column-mapping";
import { canEditField } from "@/lib/utils/role-utils";
import { UserRole } from "@/lib/types/user";
import { COLUMN_SELECT_OPTIONS } from "@/lib/constants/options";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n";

export interface ColumnActionHandlers {
  handleMasterdataUpdate: (
    id: string,
    field: string,
    value: string | number | boolean | null
  ) => Promise<void>;
  handleCustomDataUpdate: (
    id: string,
    columnName: string,
    value: string | number | boolean | null
  ) => Promise<void>;
  handleCellError: (error: string) => void;
  handleArchiveClick: (employee: Employee) => void;
  handleUnarchiveClick: (employee: Employee) => void;
  handleTerminateClick: (employee: Employee) => void;
  handleReactivateClick: (employee: Employee) => void;
}

export interface UseEmployeeColumnsParams {
  columnConfigs: ColumnConfig[];
  isHRAdmin: boolean;
  isEffectivelyHRAdmin: boolean;
  isEffectivelyInternalUser: boolean;
  effectiveRole: string | undefined;
  isPreviewMode: boolean;
  density: "default" | "compact";
  columnVisibility: Record<string, boolean>;
  allImportantDates: ImportantDate[];
  includeTerminated: boolean;
  filteredEmployees: Employee[];
  selectedEmployeeIds: Set<string>;
  setSelectedEmployeeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  isEmployeeSelected: (id: string) => boolean;
  toggleEmployeeSelection: (id: string) => void;
  checkColumnChanged: (employeeId: string, columnName: string) => boolean;
  actions: ColumnActionHandlers;
}

export function useEmployeeColumns({
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
  actions,
}: UseEmployeeColumnsParams): ColumnDef<Employee>[] {
  const t = useTranslations("tooltips");
  const tAdmin = useTranslations("admin");
  const tDashboard = useTranslations("dashboard");

  const {
    handleMasterdataUpdate,
    handleCustomDataUpdate,
    handleCellError,
    handleArchiveClick,
    handleUnarchiveClick,
    handleTerminateClick,
    handleReactivateClick,
  } = actions;

  return React.useMemo(() => {
    const isCompact = density === "compact";
    const cellPaddingClass = isCompact ? "px-2 py-1" : "px-3 py-2";
    const cellHeightClass = isCompact ? "min-h-8" : "min-h-10";
    const fontSizeClass = isCompact ? "text-xs" : "text-sm";
    const iconSizeClass = isCompact ? "h-3 w-3" : "h-4 w-4";

    // Selection checkbox column
    const selectionColumn: ColumnDef<Employee> = {
      id: "select",
      header: () => {
        const allVisibleIds = filteredEmployees.map((e) => e.id);
        const allSelected =
          allVisibleIds.length > 0 &&
          allVisibleIds.every((id) => selectedEmployeeIds.has(id));
        const someSelected = allVisibleIds.some((id) =>
          selectedEmployeeIds.has(id)
        );

        return (
          <div className="flex items-center justify-center w-full h-full gap-2">
            <Checkbox
              checked={
                allSelected ? true : someSelected ? "indeterminate" : false
              }
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
      enableResizing: false,
      size: 40,
      cell: ({ row }) => (
        <div>
          <Checkbox
            checked={isEmployeeSelected(row.original.id)}
            onCheckedChange={() => {
              toggleEmployeeSelection(row.original.id);
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            aria-label={`Select ${row.original.first_name} ${row.original.surname}`}
            className="w-4 h-4 cursor-pointer"
            data-testid={`employee-select-checkbox-${row.original.id}`}
          />
        </div>
      ),
    };

    const roleFilteredColumns = columnConfigs;

    const repaymentColumns = [
      "Återbetalningsskyldig ÖMC",
      "Återbetalningsskyldig PE3",
    ];

    const terminatedFilteredColumns = includeTerminated
      ? roleFilteredColumns
      : roleFilteredColumns.filter(
          (config) => !repaymentColumns.includes(config.column_name)
        );

    const visibleColumns = isHRAdmin
      ? terminatedFilteredColumns.filter(
          (config) => columnVisibility[config.id] !== false
        )
      : terminatedFilteredColumns;

    const dataColumns: ColumnDef<Employee>[] = visibleColumns.map((config) => {
      const userRole = effectiveRole || "";
      const hasEditPermission = canEditField(userRole as UserRole, config);
      const canEdit = isPreviewMode ? isHRAdmin : hasEditPermission;

      const getCellRenderer = (): ColumnDef<Employee>["cell"] => {
        if (config.column_name === "Status") {
          const StatusCell = ({ row }: { row: Row<Employee> }) => {
            if (row.original.is_archived)
              return (
                <span className="text-muted-foreground">Archived</span>
              );
            if (row.original.is_terminated)
              return <span className="text-red-600">Terminated</span>;
            return <span className="text-green-600">Active</span>;
          };
          StatusCell.displayName = "StatusCell";
          return StatusCell;
        }

        const DataCell = ({ row }: { row: Row<Employee> }) => {
          const mappedFieldKey = mapColumnToEmployeeField(config.column_name);
          const fieldKey = config.is_masterdata
            ? Object.prototype.hasOwnProperty.call(row.original, config.db_column_name)
              ? config.db_column_name
              : mappedFieldKey
            : config.db_column_name.toLowerCase().replace(/ /g, "_");

          const columnNameForChangeCheck =
            config.db_column_name?.toLowerCase().trim() || "";
          const isChanged = React.useMemo(
            () =>
              checkColumnChanged(row.original.id, columnNameForChangeCheck),
            [row.original.id, columnNameForChangeCheck]
          );

          const isRepaymentColumn = repaymentColumns.includes(
            config.column_name
          );
          if (isRepaymentColumn && !row.original.is_terminated) {
            return <div className="text-muted-foreground">—</div>;
          }

          const value = getEmployeeFieldValue(
            row.original,
            config.is_masterdata ? fieldKey : config.db_column_name,
            config.is_masterdata,
            allImportantDates,
            tDashboard("dateDeleted")
          );

          if (
            ["Stena Date", "ÖMC Date", "PE3 Date"].includes(
              config.column_name
            )
          ) {
            const dateFieldMap: Record<string, keyof Employee> = {
              "Stena Date": "stena_date",
              "ÖMC Date": "omc_date",
              "PE3 Date": "pe3_date",
            };
            const dateCategoryMap: Record<string, string> = {
              "Stena Date": "Stena Dates",
              "ÖMC Date": "ÖMC Dates",
              "PE3 Date": "PE3 Dates",
            };
            const dateField = dateFieldMap[config.column_name];
            const dateCategory = dateCategoryMap[config.column_name];
            const dateValue = row.original[dateField] as string | null;
            const dateColumnDbName = config.db_column_name;
            const isDateChanged = checkColumnChanged(
              row.original.id,
              dateColumnDbName
            );

            return (
              <EditableDateCell
                value={dateValue}
                displayValue={value as string}
                employeeId={row.original.id}
                field={dateField}
                dateCategory={dateCategory}
                allDates={allImportantDates}
                canEdit={canEdit}
                isChanged={isDateChanged}
                className={cn(cellPaddingClass, cellHeightClass, fontSizeClass)}
                isCompact={isCompact}
                onSave={handleMasterdataUpdate}
                onError={handleCellError}
              />
            );
          }

          if (
            ["repayment_needed_omc", "repayment_needed_pe3"].includes(
              config.db_column_name
            )
          ) {
            const repaymentField = config.db_column_name as
              | "repayment_needed_omc"
              | "repayment_needed_pe3";
            const repaymentValue = row.original[repaymentField] as
              | boolean
              | null;
            const isRepaymentChanged = checkColumnChanged(
              row.original.id,
              config.db_column_name
            );
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
                onError={handleCellError}
              />
            );
          }

          let cellType: "text" | "date" | "select" | "number" | "boolean" =
            "text";
          let options: string[] | undefined;
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

          const handleSave = config.is_masterdata
            ? handleMasterdataUpdate
            : handleCustomDataUpdate;

          const oneMarkedAtProp =
            config.column_name === "One" || fieldKey === "one"
              ? { oneMarkedAt: row.original.one_marked_at }
              : {};

          const talmundoConditionalProps =
            config.column_name === "Talmundo" || fieldKey === "talmundo"
              ? {
                  oneValue: row.original.one,
                  oneMarkedAt: row.original.one_marked_at,
                }
              : {};

          const crewingDoneConditionalProps =
            config.column_name === "Crewing/Done" ||
            fieldKey === "crewing_done"
              ? { employeeData: row.original }
              : {};

          return (
            <EditableCell
              value={value}
              employeeId={row.original.id}
              field={config.is_masterdata ? fieldKey : config.db_column_name}
              type={cellType}
              options={options}
              canEdit={canEdit}
              isChanged={isChanged}
              isChecklistItem={config.is_checklist_item}
              {...oneMarkedAtProp}
              {...talmundoConditionalProps}
              {...crewingDoneConditionalProps}
              className={cn(cellPaddingClass, cellHeightClass, fontSizeClass)}
              isCompact={isCompact}
              onSave={handleSave}
              onError={handleCellError}
            />
          );
        };

        DataCell.displayName = `${config.db_column_name}Cell`;
        return DataCell;
      };

      return {
        accessorKey: config.db_column_name.toLowerCase().replace(/ /g, "_"),
        header: ({ column }) => {
          const displayName = config.column_name;
          const showPermissionIndicator =
            isPreviewMode && hasEditPermission;
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
                  onClick={
                    column.getCanSort()
                      ? column.getToggleSortingHandler()
                      : undefined
                  }
                  role={column.getCanSort() ? "button" : undefined}
                  tabIndex={column.getCanSort() ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (
                      column.getCanSort() &&
                      (e.key === "Enter" || e.key === " ")
                    ) {
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
                      : !canEdit
                        ? `${displayName} (read-only)`
                        : displayName
                  }
                >
                  <span className="truncate min-w-0" title={displayName}>
                    {displayName}
                  </span>

                  {showPermissionIndicator && (
                    <Edit
                      className="h-3.5 w-3.5 text-blue-500 flex-shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  {isViewOnly && (
                    <Eye
                      className="h-3.5 w-3.5 text-blue-500 flex-shrink-0"
                      aria-hidden="true"
                    />
                  )}

                  {!canEdit && !isPreviewMode && (
                    <Lock
                      className={cn(
                        iconSizeClass,
                        "text-gray-400 flex-shrink-0"
                      )}
                      aria-hidden="true"
                    />
                  )}

                  {column.getCanSort() && (
                    <span className="ml-auto flex-shrink-0" aria-hidden="true">
                      {column.getIsSorted() === "asc" ? (
                        <ArrowUp className={iconSizeClass} />
                      ) : column.getIsSorted() === "desc" ? (
                        <ArrowDown className={iconSizeClass} />
                      ) : (
                        <ArrowUpDown
                          className={cn(iconSizeClass, "opacity-50")}
                        />
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
                      {hasEditPermission ? "Editable" : "View only"}
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
          sortingFn: (
            rowA: Row<Employee>,
            rowB: Row<Employee>
          ) => {
            const importantDateFields = [
              "stena_date",
              "omc_date",
              "pe3_date",
            ];
            const dbField = config.db_column_name.toLowerCase();

            let dateAStr: string | null = null;
            let dateBStr: string | null = null;

            if (importantDateFields.includes(dbField)) {
              const dateIdA = rowA.original[
                dbField as keyof Employee
              ] as string | null;
              const dateIdB = rowB.original[
                dbField as keyof Employee
              ] as string | null;
              const dateObjA = dateIdA
                ? allImportantDates.find((d) => d.id === dateIdA)
                : null;
              const dateObjB = dateIdB
                ? allImportantDates.find((d) => d.id === dateIdB)
                : null;
              dateAStr = dateObjA?.date_value || null;
              dateBStr = dateObjB?.date_value || null;
            } else {
              dateAStr = getEmployeeFieldValue(
                rowA.original,
                config.db_column_name,
                config.is_masterdata,
                allImportantDates,
                tDashboard("dateDeleted")
              ) as string | null;
              dateBStr = getEmployeeFieldValue(
                rowB.original,
                config.db_column_name,
                config.is_masterdata,
                allImportantDates,
                tDashboard("dateDeleted")
              ) as string | null;
            }

            if (!dateAStr && !dateBStr) return 0;
            if (!dateAStr) return 1;
            if (!dateBStr) return -1;

            const dateA = new Date(dateAStr).getTime();
            const dateB = new Date(dateBStr).getTime();

            if (isNaN(dateA) && isNaN(dateB)) return 0;
            if (isNaN(dateA)) return 1;
            if (isNaN(dateB)) return -1;

            return dateA - dateB;
          },
        }),
        ...((config.db_column_name.toLowerCase() === "loneiva" ||
          config.db_column_name.toLowerCase() === "lönenivå") && {
          sortingFn: (
            rowA: Row<Employee>,
            rowB: Row<Employee>
          ) => {
            const a = getEmployeeFieldValue(
              rowA.original,
              config.db_column_name,
              config.is_masterdata,
              allImportantDates,
              tDashboard("dateDeleted")
            ) as number | null;
            const b = getEmployeeFieldValue(
              rowB.original,
              config.db_column_name,
              config.is_masterdata,
              allImportantDates,
              tDashboard("dateDeleted")
            ) as number | null;
            if (a === null && b === null) return 0;
            if (a === null) return 1;
            if (b === null) return -1;
            return a - b;
          },
        }),
        cell: getCellRenderer(),
      };
    });

    // Actions column (HR Admin only)
    if (isEffectivelyHRAdmin) {
      dataColumns.push({
        id: "actions",
        header: tAdmin("actions"),
        enableSorting: false,
        cell: ({ row }) => {
          const employee = row.original;
          return (
            <div className="flex gap-2">
              {employee.is_terminated ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReactivateClick(employee)}
                      aria-label={`${t("reactivateEmployee")} ${employee.first_name} ${employee.surname}`}
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
                      aria-label={`${t("terminateEmployee")} ${employee.first_name} ${employee.surname}`}
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("terminateEmployee")}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {employee.is_archived ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnarchiveClick(employee)}
                      className={isCompact ? "h-6 w-6 p-0" : ""}
                      aria-label={`${t("restoreEmployee")} ${employee.first_name} ${employee.surname}`}
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
                      aria-label={`${t("archiveEmployee")} ${employee.first_name} ${employee.surname}`}
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

    // Checklist Progress column
    const hasChecklistItems = columnConfigs.some(
      (col) => col.column_type === "boolean" && col.is_checklist_item
    );
    const showProgressColumn = hasChecklistItems && isEffectivelyInternalUser;

    const progressColumn: ColumnDef<Employee> | null = showProgressColumn
      ? {
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
                  <ArrowUpDown
                    className={cn(iconSizeClass, "opacity-50")}
                  />
                )}
              </span>
            </div>
          ),
          enableSorting: true,
          enableResizing: true,
          size: 120,
          accessorFn: (row: Employee) => {
            const checklistColumns = columnConfigs.filter(
              (col) =>
                col.column_type === "boolean" && col.is_checklist_item
            );
            if (checklistColumns.length === 0) return 0;
            const completed = checklistColumns.filter((col) => {
              const value = getEmployeeFieldValue(
                row,
                col.db_column_name
              );
              return value === true;
            }).length;
            return (completed / checklistColumns.length) * 100;
          },
          sortingFn: (rowA: Row<Employee>, rowB: Row<Employee>) => {
            const a = rowA.getValue("checklist_progress") as number;
            const b = rowB.getValue("checklist_progress") as number;
            if (a !== b) return a - b;
            const createdA = rowA.original.created_at ?? "";
            const createdB = rowB.original.created_at ?? "";
            return createdA < createdB ? -1 : createdA > createdB ? 1 : 0;
          },
          cell: ({ row }) => (
            <div
              className={cn(
                cellPaddingClass,
                cellHeightClass,
                "flex items-center"
              )}
            >
              <ChecklistProgressIndicator
                employee={row.original}
                columns={columnConfigs}
              />
            </div>
          ),
        }
      : null;

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
    handleCellError,
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
    filteredEmployees,
    selectedEmployeeIds,
    setSelectedEmployeeIds,
    handleArchiveClick,
    handleUnarchiveClick,
    handleTerminateClick,
    handleReactivateClick,
  ]);
}
