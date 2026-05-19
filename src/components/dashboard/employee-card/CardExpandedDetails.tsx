import type { Employee } from "@/lib/types/employee";
import type { ColumnConfig } from "@/lib/types/column-config";
import type { ImportantDate } from "@/lib/types/important-date";
import { EditableCell } from "../editable-cell";
import { EditableDateCell } from "../editable-date-cell";
import { getEmployeeFieldValue } from "@/lib/utils/column-mapping";
import { toast } from "sonner";

interface CardExpandedDetailsProps {
  employee: Employee;
  columnConfigs: ColumnConfig[];
  allImportantDates: ImportantDate[];
  checkColumnChanged: (employeeId: string, columnName: string) => boolean;
  onMasterdataSave: (
    id: string,
    field: string,
    value: string | number | boolean | null
  ) => Promise<void>;
  onCustomDataSave: (
    id: string,
    field: string,
    value: string | number | boolean | null
  ) => Promise<void>;
  isMobile: boolean;
}

const ALWAYS_VISIBLE_FIELDS = [
  "First Name",
  "Surname",
  "Rank",
  "Town District",
  "Stena Date",
  "ÖMC Date",
  "PE3 Date",
];
const ALWAYS_VISIBLE_DB_FIELDS = [
  "first_name",
  "surname",
  "rank",
  "town_district",
  "stena_date",
  "omc_date",
  "pe3_date",
];

const DATE_COLUMN_MAP: Record<string, keyof Employee> = {
  "Stena Date": "stena_date",
  "ÖMC Date": "omc_date",
  "PE3 Date": "pe3_date",
};
const DATE_CATEGORY_MAP: Record<string, string> = {
  "Stena Date": "Stena Dates",
  "ÖMC Date": "ÖMC Dates",
  "PE3 Date": "PE3 Dates",
};

function getColumnLabel(col: ColumnConfig) {
  return col.column_name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function getSelectOptions(columnName: string): string[] | undefined {
  if (columnName === "Gender") return ["Man", "Woman"];
  if (columnName === "Rank") return ["SEV", "CHEF"];
  return undefined;
}

/**
 * Expanded section of the employee card showing all column-config fields
 * grouped by category. On mobile, fields that are always visible in the
 * card header are excluded to avoid duplication.
 */
export function CardExpandedDetails({
  employee,
  columnConfigs,
  allImportantDates,
  checkColumnChanged,
  onMasterdataSave,
  onCustomDataSave,
  isMobile,
}: CardExpandedDetailsProps) {
  const handleError = (error: string) => toast.error(error);

  const groupedColumns = columnConfigs.reduce(
    (acc, col) => {
      if (!col.is_visible) return acc;
      const category = col.category || "General";
      if (!acc[category]) acc[category] = [];
      acc[category].push(col);
      return acc;
    },
    {} as Record<string, ColumnConfig[]>
  );

  // On mobile, filter out fields already shown in CardMobileFields
  const displayColumns = isMobile
    ? Object.entries(groupedColumns).reduce(
        (acc, [category, columns]) => {
          const filtered = columns.filter(
            (col) =>
              !ALWAYS_VISIBLE_FIELDS.includes(col.column_name) &&
              !ALWAYS_VISIBLE_DB_FIELDS.includes(col.db_column_name.toLowerCase())
          );
          if (filtered.length > 0) acc[category] = filtered;
          return acc;
        },
        {} as Record<string, ColumnConfig[]>
      )
    : groupedColumns;

  return (
    <div className="mt-4 pt-4 border-t space-y-4 max-h-[70vh] overflow-y-auto">
      {Object.entries(displayColumns).map(([category, columns]) => (
        <div key={category} className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {category}
          </h4>
          <div className="space-y-3">
            {columns.map((col) => {
              const value = getEmployeeFieldValue(
                employee,
                col.db_column_name,
                col.is_masterdata,
                allImportantDates
              );
              const canEdit =
                col.role_permissions &&
                Object.values(col.role_permissions).some((p) => p.edit);

              if (DATE_COLUMN_MAP[col.column_name]) {
                const dateField = DATE_COLUMN_MAP[col.column_name];
                const dateCategory = DATE_CATEGORY_MAP[col.column_name];
                return (
                  <div key={col.id} className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      {getColumnLabel(col)}
                    </label>
                    <EditableDateCell
                      value={employee[dateField] as string | null}
                      displayValue={value as string}
                      employeeId={employee.id}
                      field={dateField}
                      dateCategory={dateCategory}
                      allDates={allImportantDates}
                      canEdit={canEdit}
                      isChanged={checkColumnChanged(
                        employee.id,
                        col.db_column_name?.toLowerCase().trim() || ""
                      )}
                      onSave={onMasterdataSave}
                      onError={handleError}
                    />
                  </div>
                );
              }

              return (
                <div key={col.id} className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {getColumnLabel(col)}
                  </label>
                  <EditableCell
                    value={value}
                    employeeId={employee.id}
                    field={col.db_column_name}
                    type={
                      col.column_type as
                        | "text"
                        | "date"
                        | "select"
                        | "number"
                        | "boolean"
                    }
                    options={getSelectOptions(col.column_name)}
                    canEdit={canEdit}
                    isChanged={checkColumnChanged(
                      employee.id,
                      col.db_column_name?.toLowerCase().trim() || ""
                    )}
                    isChecklistItem={col.is_checklist_item}
                    onSave={
                      col.is_masterdata ? onMasterdataSave : onCustomDataSave
                    }
                    onError={handleError}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
