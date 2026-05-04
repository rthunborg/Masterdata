'use client';

import * as React from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';

import { Checkbox } from '@/components/ui/checkbox';

import { Label } from '@/components/ui/label';

import type { ColumnConfig } from '@/lib/types/column-config';

import { useTranslations } from '@/lib/i18n';
import { useAuth } from '@/lib/hooks/use-auth';

import { useUIStore } from '@/lib/store/ui-store';
import { getRoleDisplayName, type UserRole } from '@/lib/types/user';
import { getColumnViewRole } from '@/lib/utils/role-utils';

export interface ExportField {
  id: string;
  columnId: string;
  label: string;
  fieldKey: string; // For masterdata: field name (e.g., "first_name"), for custom: db_column_name
  isMasterdata: boolean;
  category?: string | null;
}

interface ExportFieldSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnConfigs: ColumnConfig[];
  visibleColumnIds: Set<string>;
  onExport: (selectedFields: string[], impersonatedRole?: string) => void;
}

function getSelectedExportFieldIds(
  fields: ExportField[],
  visibleColumnIds: Set<string>
): Set<string> {
  return new Set(
    fields
      .filter((field) => visibleColumnIds.has(field.columnId))
      .map((field) => field.id)
  );
}

export function ExportFieldSelectionDialog({
  open,
  onOpenChange,
  columnConfigs,
  visibleColumnIds,
  onExport,
}: ExportFieldSelectionDialogProps) {
  const tDashboard = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const { user } = useAuth();
  const { previewRole } = useUIStore();

  // Determine effective role for permission filtering (for preview mode)
  const effectiveRole = previewRole || user?.role;

  // Get all available fields: masterdata fields + custom columns
  // Story 17.4: Filter fields based on user role permissions
  const availableFields = React.useMemo<ExportField[]>(() => {
    if (!effectiveRole) {
      return [];
    }

    // Story 17.4: Use column_config as the single source of truth
    // Sort by display_order to maintain the same order as in the view
    const sortedConfigs = [...columnConfigs].sort(
      (a, b) => a.display_order - b.display_order
    );
    const roleForView = getColumnViewRole(effectiveRole as UserRole);

    return sortedConfigs
      .filter((config) => config.role_permissions[roleForView]?.view === true)
      .map((config) => ({
        id: config.is_masterdata
          ? `masterdata_${config.db_column_name}`
          : config.id,
        columnId: config.id,
        label: config.column_name,
        fieldKey: config.db_column_name,
        isMasterdata: config.is_masterdata,
        category: config.category,
      }));
  }, [columnConfigs, effectiveRole]);

  // Initialize selected fields with visible columns
  const [selectedFields, setSelectedFields] = React.useState<Set<string>>(() =>
    getSelectedExportFieldIds(availableFields, visibleColumnIds)
  );

  // Update selected fields when visible columns change
  React.useEffect(() => {
    setSelectedFields(
      getSelectedExportFieldIds(availableFields, visibleColumnIds)
    );
  }, [availableFields, visibleColumnIds]);

  const toggleField = (fieldId: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);

      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }

      return next;
    });
  };

  const handleExport = () => {
    // Convert selected field IDs to field keys for export

    const fieldKeys = Array.from(selectedFields)

      .map((fieldId) => {
        const field = availableFields.find((f) => f.id === fieldId);

        return field?.fieldKey;
      })

      .filter((key): key is string => key !== undefined);

    // Pass impersonated role if in preview mode (HR Admin only)
    onExport(fieldKeys, previewRole || undefined);

    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Group fields by category for better organization

  const groupedFields = React.useMemo(() => {
    const groups: Record<string, ExportField[]> = {
      masterdata: [],

      uncategorized: [],
    };

    availableFields.forEach((field) => {
      if (field.isMasterdata) {
        groups.masterdata.push(field);
      } else if (field.category) {
        if (!groups[field.category]) {
          groups[field.category] = [];
        }

        groups[field.category].push(field);
      } else {
        groups.uncategorized.push(field);
      }
    });

    return groups;
  }, [availableFields]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>
            {tDashboard('export.selectFields') || 'Select Fields to Export'}
          </DialogTitle>

          <DialogDescription>
            {previewRole ? (
              <span className="text-amber-600 font-medium">
                {tDashboard('export.impersonationWarning', {
                  role: getRoleDisplayName(previewRole),
                })}
              </span>
            ) : (
              tDashboard('export.selectFieldsDescription') ||
              'Choose which fields to include in the export. Visible columns are pre-selected.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto pr-4">
          <div className="space-y-4">
            {/* Masterdata fields */}

            {groupedFields.masterdata.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">
                  {tDashboard('export.masterdataFields') || 'Masterdata Fields'}
                </h4>

                <div className="space-y-2 pl-2">
                  {groupedFields.masterdata.map((field) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={field.id}
                        checked={selectedFields.has(field.id)}
                        onCheckedChange={() => toggleField(field.id)}
                        data-testid={`export-field-checkbox-${field.fieldKey}`}
                      />

                      <Label
                        htmlFor={field.id}
                        className="cursor-pointer font-normal"
                      >
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom columns by category */}

            {Object.entries(groupedFields)

              .filter(
                ([key]) => key !== 'masterdata' && key !== 'uncategorized'
              )

              .map(([category, fields]) => (
                <div key={category} className="space-y-2">
                  <h4 className="font-medium text-sm">{category}</h4>

                  <div className="space-y-2 pl-2">
                    {fields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={field.id}
                          checked={selectedFields.has(field.id)}
                          onCheckedChange={() => toggleField(field.id)}
                          data-testid={`export-field-checkbox-${field.fieldKey}`}
                        />

                        <Label
                          htmlFor={field.id}
                          className="cursor-pointer font-normal"
                        >
                          {field.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

            {/* Uncategorized custom columns */}

            {groupedFields.uncategorized.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">
                  {tDashboard('export.customFields') || 'Custom Fields'}
                </h4>

                <div className="space-y-2 pl-2">
                  {groupedFields.uncategorized.map((field) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={field.id}
                        checked={selectedFields.has(field.id)}
                        onCheckedChange={() => toggleField(field.id)}
                      />

                      <Label
                        htmlFor={field.id}
                        className="cursor-pointer font-normal"
                      >
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {tCommon('cancel') || 'Cancel'}
          </Button>

          <Button onClick={handleExport} disabled={selectedFields.size === 0}>
            {tCommon('export') || 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
