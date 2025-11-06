'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Archive, ArchiveRestore, UserX, Mail, Phone } from 'lucide-react';
import type { Employee } from '@/lib/types/employee';
import type { ColumnConfig } from '@/lib/types/column-config';
import { cn } from '@/lib/utils';
import { EditableCell } from './editable-cell';
import { employeeService } from '@/lib/services/employee-service';
import { customDataService } from '@/lib/services/custom-data-service';
import { toast } from 'sonner';
import { getEmployeeFieldValue } from '@/lib/utils/column-mapping';
import { useImportantDates } from '@/lib/hooks/use-important-dates';

interface EmployeeCardProps {
  employee: Employee;
  isHRAdmin: boolean;
  columnConfigs?: ColumnConfig[];
  onArchive?: (employee: Employee) => void;
  onUnarchive?: (employee: Employee) => void;
  onTerminate?: (employee: Employee) => void;
  onEmployeeUpdated?: () => void;
  className?: string;
}

export function EmployeeCard({
  employee,
  isHRAdmin,
  columnConfigs = [],
  onArchive,
  onUnarchive,
  onTerminate,
  onEmployeeUpdated,
  className,
}: EmployeeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { dates: allImportantDates } = useImportantDates();

  const getStatusBadge = () => {
    if (employee.is_terminated) {
      return <Badge variant="destructive">Terminated</Badge>;
    }
    if (employee.is_archived) {
      return <Badge variant="secondary">Archived</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  // Handler for masterdata column updates
  const handleMasterdataUpdate = useCallback(async (
    id: string,
    field: string,
    value: string | number | boolean | null
  ) => {
    try {
      await employeeService.update(id, { [field]: value });
      toast.success("Field updated successfully");
      onEmployeeUpdated?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update field";
      throw new Error(message);
    }
  }, [onEmployeeUpdated]);

  // Handler for custom data column updates (party tables)
  const handleCustomDataUpdate = useCallback(async (
    id: string,
    columnName: string,
    value: string | number | boolean | null
  ) => {
    try {
      await customDataService.updateCustomData(id, { [columnName]: value });
      toast.success("Field updated successfully");
      onEmployeeUpdated?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update field";
      throw new Error(message);
    }
  }, [onEmployeeUpdated]);

  // Group columns by category
  const groupedColumns = columnConfigs.reduce((acc, col) => {
    if (!col.is_visible) return acc;
    
    const category = col.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(col);
    return acc;
  }, {} as Record<string, ColumnConfig[]>);

  // Get formatted label for column
  const getColumnLabel = (col: ColumnConfig) => {
    return col.column_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate">
              {employee.first_name} {employee.surname}
            </h3>
            {employee.rank && (
              <p className="text-sm text-muted-foreground truncate">{employee.rank}</p>
            )}
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Essential info - always visible */}
        <div className="space-y-2">
          {employee.email && (
            <div className="flex items-center gap-2 text-sm min-w-0">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`mailto:${employee.email}`} className="text-blue-600 hover:underline truncate">
                {employee.email}
              </a>
            </div>
          )}
          {employee.mobile && (
            <div className="flex items-center gap-2 text-sm min-w-0">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`tel:${employee.mobile}`} className="text-blue-600 hover:underline truncate">
                {employee.mobile}
              </a>
            </div>
          )}
        </div>

        {/* All fields from column config - shown when expanded */}
        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {Object.entries(groupedColumns).map(([category, columns]) => (
              <div key={category} className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {category}
                </h4>
                <div className="space-y-3">
                  {columns.map((col) => {
                    const value = getEmployeeFieldValue(
                      employee, 
                      col.column_name, 
                      col.is_masterdata,
                      allImportantDates
                    );
                    const canEdit = col.role_permissions && 
                      Object.values(col.role_permissions).some(p => p.edit);

                    // Determine select options based on column
                    let selectOptions: string[] | undefined;
                    if (col.column_name === 'gender') {
                      selectOptions = ['Male', 'Female', 'Other'];
                    }

                    return (
                      <div key={col.id} className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          {getColumnLabel(col)}
                        </label>
                        <EditableCell
                          value={value}
                          employeeId={employee.id}
                          field={col.is_masterdata ? col.column_name : col.column_name}
                          type={col.column_type as "text" | "date" | "select" | "number" | "boolean"}
                          options={selectOptions}
                          canEdit={canEdit}
                          onSave={col.is_masterdata ? handleMasterdataUpdate : handleCustomDataUpdate}
                          onError={(error) => toast.error(error)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between pt-3">
        <Button
          variant="ghost"
          size="default"
          onClick={() => setExpanded(!expanded)}
          className="gap-2 touch-manipulation"
        >
          {expanded ? (
            <>
              Less <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              More <ChevronDown className="h-4 w-4" />
            </>
          )}
        </Button>

        {isHRAdmin && (
          <div className="flex gap-2">
            {employee.is_archived ? (
              <Button
                variant="outline"
                size="default"
                onClick={() => onUnarchive?.(employee)}
                className="gap-2 touch-manipulation"
              >
                <ArchiveRestore className="h-4 w-4" />
                <span className="hidden sm:inline">Restore</span>
              </Button>
            ) : (
              <>
                {!employee.is_terminated && (
                  <>
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => onArchive?.(employee)}
                      className="gap-2 touch-manipulation"
                    >
                      <Archive className="h-4 w-4" />
                      <span className="hidden sm:inline">Archive</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => onTerminate?.(employee)}
                      className="gap-2 touch-manipulation"
                    >
                      <UserX className="h-4 w-4" />
                      <span className="hidden sm:inline">Terminate</span>
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
