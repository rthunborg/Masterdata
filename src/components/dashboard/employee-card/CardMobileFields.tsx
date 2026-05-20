import type { Employee } from "@/lib/types/employee";
import type { ImportantDate } from "@/lib/types/important-date";
import { EditableCell } from "../editable-cell";
import { EditableDateCell } from "../editable-date-cell";
import { getEmployeeFieldValue } from "@/lib/utils/column-mapping";
import { toast } from "sonner";

interface CardMobileFieldsProps {
  employee: Employee;
  allImportantDates: ImportantDate[];
  checkColumnChanged: (employeeId: string, columnName: string) => boolean;
  onSave: (
    id: string,
    field: string,
    value: string | number | boolean | null
  ) => Promise<void>;
}

const DATE_FIELDS = [
  {
    label: "Stena Date",
    field: "stena_date" as keyof Employee,
    category: "Stena Dates",
  },
  {
    label: "ÖMC Date",
    field: "omc_date" as keyof Employee,
    category: "ÖMC Dates",
  },
  {
    label: "PE3 Date",
    field: "pe3_date" as keyof Employee,
    category: "PE3 Dates",
  },
] as const;

/**
 * Always-visible editable fields rendered on mobile cards (Story 12.8).
 * Shows name, rank, town district, and the three important date selectors.
 */
export function CardMobileFields({
  employee,
  allImportantDates,
  checkColumnChanged,
  onSave,
}: CardMobileFieldsProps) {
  const handleError = (error: string) => toast.error(error);

  return (
    <div className="mt-4 pt-4 border-t">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            First Name
          </label>
          <EditableCell
            value={employee.first_name}
            employeeId={employee.id}
            field="first_name"
            type="text"
            canEdit={true}
            cellRole="button"
            onSave={onSave}
            onError={handleError}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Surname
          </label>
          <EditableCell
            value={employee.surname}
            employeeId={employee.id}
            field="surname"
            type="text"
            canEdit={true}
            cellRole="button"
            onSave={onSave}
            onError={handleError}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Rank
          </label>
          <EditableCell
            value={employee.rank}
            employeeId={employee.id}
            field="rank"
            type="select"
            options={["SEV", "CHEF"]}
            canEdit={true}
            cellRole="button"
            onSave={onSave}
            onError={handleError}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            City/Town District
          </label>
          <EditableCell
            value={employee.town_district}
            employeeId={employee.id}
            field="town_district"
            type="text"
            canEdit={true}
            cellRole="button"
            onSave={onSave}
            onError={handleError}
          />
        </div>

        {DATE_FIELDS.map(({ label, field, category }) => (
          <div key={field} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              {label}
            </label>
            <EditableDateCell
              value={employee[field] as string | null}
              displayValue={
                (getEmployeeFieldValue(
                  employee,
                  label,
                  true,
                  allImportantDates
                ) as string) || "—"
              }
              employeeId={employee.id}
              field={field}
              dateCategory={category}
              allDates={allImportantDates}
              canEdit={true}
              cellRole="button"
              isChanged={checkColumnChanged(
                employee.id,
                field.toLowerCase().trim()
              )}
              onSave={onSave}
              onError={handleError}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
