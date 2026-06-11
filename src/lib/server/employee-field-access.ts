import type { ColumnConfig } from "@/lib/types/column-config";
import type { Employee } from "@/lib/types/employee";
import type { UserRole } from "@/lib/types/user";
import { isExternalParty } from "@/lib/types/user";
import { getColumnViewRole } from "@/lib/utils/role-utils";

type EmployeeRecord = Record<string, unknown>;
type FilteredEmployeeRecord = Pick<Employee, "id"> &
  Record<string, string | number | boolean | null | Record<string, string | number | boolean | null>>;

const BASE_RESPONSE_FIELDS = new Set(["id"]);

const COLUMN_TO_EMPLOYEE_FIELD: Record<string, keyof Employee | string> = {
  social_security_no: "ssn",
};

function toEmployeeFieldName(dbColumnName: string) {
  return COLUMN_TO_EMPLOYEE_FIELD[dbColumnName] ?? dbColumnName;
}

function canViewColumn(column: ColumnConfig, role: UserRole) {
  const roleForView = getColumnViewRole(role);
  return column.role_permissions[roleForView]?.view === true;
}

export function visibleEmployeeFieldNamesForRole(
  columns: ColumnConfig[],
  role: UserRole
): Set<string> {
  const visibleFields = new Set<string>(BASE_RESPONSE_FIELDS);

  for (const column of columns) {
    if (canViewColumn(column, role)) {
      visibleFields.add(toEmployeeFieldName(column.db_column_name));
    }
  }

  return visibleFields;
}

export function filterEmployeeForRole(
  employee: Employee,
  columns: ColumnConfig[],
  role: UserRole
): Employee | FilteredEmployeeRecord {
  if (!isExternalParty(role)) {
    return employee;
  }

  const employeeRecord = employee as unknown as EmployeeRecord;
  const filtered: FilteredEmployeeRecord = { id: employee.id };
  const customData: Record<string, string | number | boolean | null> = {};

  for (const column of columns) {
    if (!column.is_masterdata || !canViewColumn(column, role)) continue;

    const fieldName = toEmployeeFieldName(column.db_column_name);
    if (Object.prototype.hasOwnProperty.call(employeeRecord, fieldName)) {
      filtered[fieldName] = employeeRecord[fieldName] as
        | string
        | number
        | boolean
        | null;
    }
  }

  for (const column of columns) {
    if (column.is_masterdata) continue;
    if (!canViewColumn(column, role)) continue;

    const fieldName = toEmployeeFieldName(column.db_column_name);
    if (
      Object.prototype.hasOwnProperty.call(employeeRecord, fieldName)
    ) {
      customData[fieldName] = employeeRecord[fieldName] as
        | string
        | number
        | boolean
        | null;
    }
  }

  if (Object.keys(customData).length > 0) {
    filtered.customData = customData;
  }

  return filtered;
}

export function filterEmployeesForRole(
  employees: Employee[],
  columns: ColumnConfig[],
  role: UserRole
) {
  return employees.map((employee) =>
    filterEmployeeForRole(employee, columns, role)
  );
}

export function attachVisibleCustomDataForRole(
  employee: Employee,
  columns: ColumnConfig[],
  role: UserRole
): Employee {
  const employeeRecord = employee as unknown as EmployeeRecord;
  const customData: Record<string, string | number | boolean | null> = {};

  for (const column of columns) {
    if (column.is_masterdata || !canViewColumn(column, role)) continue;

    const fieldName = toEmployeeFieldName(column.db_column_name);
    if (Object.prototype.hasOwnProperty.call(employeeRecord, fieldName)) {
      customData[fieldName] = employeeRecord[fieldName] as
        | string
        | number
        | boolean
        | null;
    }
  }

  return Object.keys(customData).length > 0
    ? { ...employee, customData }
    : employee;
}

export function attachVisibleCustomDataForRoleList(
  employees: Employee[],
  columns: ColumnConfig[],
  role: UserRole
) {
  return employees.map((employee) =>
    attachVisibleCustomDataForRole(employee, columns, role)
  );
}
