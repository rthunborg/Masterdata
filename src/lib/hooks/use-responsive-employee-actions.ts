import { useState, useCallback } from "react";
import { employeeService } from "@/lib/services/employee-service";
import { toast } from "sonner";
import { toastError } from "@/lib/utils/toast-helpers";
import type { Employee } from "@/lib/types/employee";

interface UseResponsiveEmployeeActionsOptions {
  onEmployeeUpdated?: () => void | Promise<void>;
}

export function useResponsiveEmployeeActions({
  onEmployeeUpdated,
}: UseResponsiveEmployeeActionsOptions) {
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [unarchiveDialogOpen, setUnarchiveDialogOpen] = useState(false);
  const [terminateModalOpen, setTerminateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const handleArchive = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
    setArchiveDialogOpen(true);
  }, []);

  const handleUnarchive = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
    setUnarchiveDialogOpen(true);
  }, []);

  const handleTerminate = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
    setTerminateModalOpen(true);
  }, []);

  const handleEdit = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
    setEditModalOpen(true);
  }, []);

  const handleConfirmArchive = useCallback(async () => {
    if (!selectedEmployee) return;

    try {
      setIsArchiving(true);
      await employeeService.archive(selectedEmployee.id);
      toast.success(
        `${selectedEmployee.first_name} ${selectedEmployee.surname} has been archived.`
      );
      setArchiveDialogOpen(false);
      onEmployeeUpdated?.();
    } catch (error: unknown) {
      toastError(error, "Misslyckades att arkivera anställd");
    } finally {
      setIsArchiving(false);
    }
  }, [selectedEmployee, onEmployeeUpdated]);

  const handleConfirmUnarchive = useCallback(async () => {
    if (!selectedEmployee) return;

    try {
      setIsArchiving(true);
      await employeeService.unarchive(selectedEmployee.id);
      toast.success(
        `${selectedEmployee.first_name} ${selectedEmployee.surname} has been restored.`
      );
      setUnarchiveDialogOpen(false);
      onEmployeeUpdated?.();
    } catch (error: unknown) {
      toastError(error, "Misslyckades att avarkivera anställd");
    } finally {
      setIsArchiving(false);
    }
  }, [selectedEmployee, onEmployeeUpdated]);

  const handleTerminated = useCallback(() => {
    setTerminateModalOpen(false);
    onEmployeeUpdated?.();
  }, [onEmployeeUpdated]);

  const handleCloseEdit = useCallback(() => {
    setEditModalOpen(false);
    setSelectedEmployee(null);
  }, []);

  const handleEditSuccess = useCallback(() => {
    setEditModalOpen(false);
    setSelectedEmployee(null);
    onEmployeeUpdated?.();
  }, [onEmployeeUpdated]);

  return {
    selectedEmployee,
    isArchiving,

    archiveDialogOpen,
    setArchiveDialogOpen,
    unarchiveDialogOpen,
    setUnarchiveDialogOpen,
    terminateModalOpen,
    setTerminateModalOpen,
    editModalOpen,

    handleArchive,
    handleUnarchive,
    handleTerminate,
    handleEdit,
    handleConfirmArchive,
    handleConfirmUnarchive,
    handleTerminated,
    handleCloseEdit,
    handleEditSuccess,
  };
}
