import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { toastError } from '@/lib/utils/toast-helpers';
import { useTranslations } from '@/lib/i18n';
import { employeeService } from '@/lib/services/employee-service';
import { customDataService } from '@/lib/services/custom-data-service';
import type { Employee } from '@/lib/types/employee';

interface UseEmployeeTableActionsParams {
  onEmployeeUpdated?: () => void;
  onOptimisticUpdate?: (id: string, updates: Partial<Employee>) => () => void;
  bumpStats: () => void;
  filteredEmployees: Employee[];
  selectedEmployeeIds: Set<string>;
  clearSelection: () => void;
}

export function useEmployeeTableActions({
  onEmployeeUpdated,
  onOptimisticUpdate,
  bumpStats,
  filteredEmployees,
  selectedEmployeeIds,
  clearSelection,
}: UseEmployeeTableActionsParams) {
  const tToasts = useTranslations('toasts');

  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [unarchiveDialogOpen, setUnarchiveDialogOpen] = useState(false);
  const [terminateModalOpen, setTerminateModalOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [isArchiving, setIsArchiving] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const handleArchiveClick = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
    setArchiveDialogOpen(true);
  }, []);

  const handleUnarchiveClick = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
    setUnarchiveDialogOpen(true);
  }, []);

  const handleTerminateClick = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
    setTerminateModalOpen(true);
  }, []);

  const handleReactivateClick = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
    setReactivateDialogOpen(true);
  }, []);

  const handleConfirmArchive = useCallback(async () => {
    if (!selectedEmployee) return;
    try {
      setIsArchiving(true);
      await employeeService.archive(selectedEmployee.id);
      toast.success(
        tToasts("employees.archived", { name: `${selectedEmployee.first_name} ${selectedEmployee.surname}` })
      );
      setArchiveDialogOpen(false);
      onEmployeeUpdated?.();
      bumpStats();
    } catch (error: unknown) {
      toastError(error, tToasts("employees.archiveFailed"));
    } finally {
      setIsArchiving(false);
    }
  }, [selectedEmployee, onEmployeeUpdated, bumpStats, tToasts]);

  const handleConfirmUnarchive = useCallback(async () => {
    if (!selectedEmployee) return;
    try {
      setIsArchiving(true);
      await employeeService.unarchive(selectedEmployee.id);
      toast.success(
        tToasts("employees.restored", { name: `${selectedEmployee.first_name} ${selectedEmployee.surname}` })
      );
      setUnarchiveDialogOpen(false);
      onEmployeeUpdated?.();
      bumpStats();
    } catch (error: unknown) {
      toastError(error, tToasts("employees.unarchiveFailed"));
    } finally {
      setIsArchiving(false);
    }
  }, [selectedEmployee, onEmployeeUpdated, bumpStats, tToasts]);

  const handleBulkAction = useCallback(async (action: 'archive' | 'restore') => {
    const selectedIds = Array.from(selectedEmployeeIds);
    if (selectedIds.length === 0) return;

    try {
      setIsBulkProcessing(true);
      const response = await fetch('/api/employees/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeIds: selectedIds,
          action: action === 'restore' ? 'restore' : 'archive'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to perform bulk action');
      }

      toast.success(
        action === 'archive'
          ? `Archived ${selectedIds.length} employees`
          : `Restored ${selectedIds.length} employees`
      );

      clearSelection();
      onEmployeeUpdated?.();
      bumpStats();
    } catch (error) {
      toast.error('Failed to update employees');
      console.error(error);
    } finally {
      setIsBulkProcessing(false);
    }
  }, [selectedEmployeeIds, clearSelection, onEmployeeUpdated, bumpStats]);

  const handleConfirmReactivate = useCallback(async () => {
    if (!selectedEmployee) return;
    try {
      setIsReactivating(true);

      // Story 8.13 AC 7: Handle warnings from reactivation
      const { warnings } = await employeeService.reactivate(selectedEmployee.id);

      toast.success(
        tToasts("employees.reactivated", { name: `${selectedEmployee.first_name} ${selectedEmployee.surname}` })
      );

      if (warnings && warnings.length > 0) {
        warnings.forEach((warning) => {
          toast.warning(warning, { duration: 8000 });
        });
      }

      setReactivateDialogOpen(false);
      onEmployeeUpdated?.();
      bumpStats();
    } catch (error: unknown) {
      toastError(error, tToasts("employees.reactivateFailed"));
    } finally {
      setIsReactivating(false);
    }
  }, [selectedEmployee, onEmployeeUpdated, bumpStats, tToasts]);

  const handleMasterdataUpdate = useCallback(async (
    id: string,
    field: string,
    value: string | number | boolean | null
  ) => {
    try {
      const updatedEmployee = await employeeService.update(id, { [field]: value });
      const confirmedRecord =
        updatedEmployee && typeof updatedEmployee === "object"
          ? (updatedEmployee as unknown as Record<string, unknown>)
          : {};
      const hasConfirmedField = Object.prototype.hasOwnProperty.call(
        confirmedRecord,
        field
      );

      if (onOptimisticUpdate && hasConfirmedField) {
        const confirmedValue = confirmedRecord[field] as
          | string
          | number
          | boolean
          | null;
        onOptimisticUpdate(id, { [field]: confirmedValue } as Partial<Employee>);
      } else {
        onEmployeeUpdated?.();
      }

      toast.success(tToasts("employees.updatedSuccessfully"));

      bumpStats();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tToasts("employees.updateFailed");
      throw new Error(message);
    }
  }, [bumpStats, onEmployeeUpdated, onOptimisticUpdate, tToasts]);

  const handleCustomDataUpdate = useCallback(async (
    id: string,
    columnName: string,
    value: string | number | boolean | null
  ) => {
    try {
      await customDataService.updateCustomData(id, { [columnName]: value });
      toast.success(tToasts("employees.customDataUpdated"));
      onEmployeeUpdated?.();
      bumpStats();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update custom data";
      throw new Error(message);
    }
  }, [bumpStats, onEmployeeUpdated, tToasts]);

  // Story 8.5 / 20.7: Export crew-ready employees
  const handleExportCrewReady = useCallback(async () => {
    try {
      const filteredEmployeeIds = filteredEmployees.map(e => e.id);
      const response = await fetch('/api/employees/export-crew-ready', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedEmployeeIds: filteredEmployeeIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 404) {
          toast.info(tToasts('employees.noCrewReadyFound'));
          return;
        }
        throw new Error(errorData.error?.message || 'Failed to export crew-ready employees');
      }

      const countHeader = response.headers.get('X-Employees-Exported');
      const count = countHeader ? parseInt(countHeader, 10) : 0;

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crew_ready_employees_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(tToasts("employees.exportedCrewReady", { count }));
      onEmployeeUpdated?.();
      bumpStats();
    } catch (error: unknown) {
      toastError(error, tToasts('employees.exportCrewReadyFailed'));
    }
  }, [filteredEmployees, onEmployeeUpdated, bumpStats, tToasts]);

  const handleCellError = useCallback((error: string) => {
    toast.error(error);
  }, []);

  return {
    archiveDialogOpen,
    setArchiveDialogOpen,
    unarchiveDialogOpen,
    setUnarchiveDialogOpen,
    terminateModalOpen,
    setTerminateModalOpen,
    reactivateDialogOpen,
    setReactivateDialogOpen,
    selectedEmployee,

    isArchiving,
    isReactivating,
    isBulkProcessing,

    handleArchiveClick,
    handleUnarchiveClick,
    handleTerminateClick,
    handleReactivateClick,
    handleConfirmArchive,
    handleConfirmUnarchive,
    handleConfirmReactivate,
    handleBulkAction,

    handleMasterdataUpdate,
    handleCustomDataUpdate,
    handleExportCrewReady,
    handleCellError,
    setSelectedEmployee,
  };
}
