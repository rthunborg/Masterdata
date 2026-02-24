import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { toastError } from '@/lib/utils/toast-helpers';
import { useTranslations } from '@/lib/i18n';

interface UseEmployeeExportParams {
  selectedEmployeeIds: Set<string>;
  isFilterActive: boolean;
}

export function useEmployeeExport({
  selectedEmployeeIds,
  isFilterActive,
}: UseEmployeeExportParams) {
  const tDashboard = useTranslations('dashboard');
  const tToasts = useTranslations('toasts');

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportConfirmationOpen, setExportConfirmationOpen] = useState(false);
  const [pendingExport, setPendingExport] = useState<{
    selectedIds: string[];
    isFiltered: boolean;
  } | null>(null);

  const handleExportClick = useCallback(() => {
    const selectedIds = Array.from(selectedEmployeeIds);
    if (selectedIds.length === 0) {
      toast.error(tDashboard("noEmployeesSelected") || tToasts("employees.noEmployeesSelected"));
      return;
    }

    const dismissedConfirmation = typeof window !== 'undefined'
      ? localStorage.getItem("export-confirmation-dismissed") === "true"
      : false;

    if (isFilterActive && !dismissedConfirmation) {
      setPendingExport({ selectedIds, isFiltered: true });
      setExportConfirmationOpen(true);
    } else {
      setExportDialogOpen(true);
    }
  }, [selectedEmployeeIds, isFilterActive, tDashboard, tToasts]);

  const handleExportConfirmed = useCallback(() => {
    setExportConfirmationOpen(false);
    setExportDialogOpen(true);
  }, []);

  const handleExportWithFields = useCallback(async (selectedFields: string[], impersonatedRole?: string) => {
    try {
      const selectedIds = Array.from(selectedEmployeeIds);
      if (selectedIds.length === 0) {
        toast.error(tDashboard("noEmployeesSelected") || tToasts("employees.noEmployeesSelected"));
        return;
      }

      if (selectedFields.length === 0) {
        toast.error(tDashboard("noFieldsSelected") || tToasts("employees.noFieldsSelected"));
        return;
      }

      const response = await fetch('/api/employees/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          employeeIds: selectedIds,
          fields: selectedFields,
          impersonatedRole,
          format: 'xlsx',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = errorData.error?.code;
        let errorMessage = errorData.error?.message || 'Failed to export employees';

        if (errorCode) {
          switch (errorCode) {
            case 'NO_EMPLOYEES_SELECTED':
              errorMessage = tDashboard("noEmployeesSelected") || errorMessage;
              break;
            case 'NO_FIELDS_SELECTED':
              errorMessage = tDashboard("noFieldsSelected") || errorMessage;
              break;
            case 'PERMISSION_DENIED': {
              const deniedFields = errorData.error?.details?.deniedFields?.join(", ") ||
                errorData.error?.message?.match(/following fields: (.+)/)?.[1] || '';
              errorMessage = tDashboard("exportPermissionDenied", { fields: deniedFields }) || errorMessage;
              break;
            }
            case 'NO_PERMITTED_FIELDS':
              errorMessage = tDashboard("exportNoPermittedFields") || errorMessage;
              break;
            case 'NO_EMPLOYEES_FOUND':
              errorMessage = tDashboard("exportNoEmployeesFound") || errorMessage;
              break;
            case 'IMPERSONATION_FORBIDDEN':
              errorMessage = "Only HR Admins can export with impersonated role context.";
              break;
            case 'INVALID_FORMAT':
              errorMessage = "Invalid export format specified.";
              break;
          }
        }

        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      const contentType = response.headers.get('Content-Type') || '';
      const isExcel = contentType.includes('spreadsheetml') || contentType.includes('excel');
      const extension = isExcel ? 'xlsx' : 'csv';
      a.download = `employees_export_${dateStr}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(tDashboard("exportSuccess", { count: selectedIds.length }) || tToasts("employees.exportSuccess", { count: selectedIds.length }));
    } catch (error: unknown) {
      toastError(error, tToasts('employees.exportFailed'));
    }
  }, [selectedEmployeeIds, tDashboard, tToasts]);

  return {
    exportDialogOpen,
    setExportDialogOpen,
    exportConfirmationOpen,
    setExportConfirmationOpen,
    pendingExport,
    handleExportClick,
    handleExportConfirmed,
    handleExportWithFields,
  };
}
