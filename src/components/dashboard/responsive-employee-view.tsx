'use client';

import { useMediaQuery } from '@/hooks/use-media-query';
import { EmployeeTable } from './employee-table';
import { EmployeeCardList } from './employee-card-list';
import type { Employee } from '@/lib/types/employee';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TerminateEmployeeModal } from './terminate-employee-modal';
import { EditEmployeeModal } from './edit-employee-modal';
import { employeeService } from '@/lib/services/employee-service';
import { toast } from 'sonner';
import { useAuth } from '@/lib/hooks/use-auth';
import { useColumns } from '@/lib/hooks/use-columns';
import { useUIStore } from '@/lib/store/ui-store';

interface ResponsiveEmployeeViewProps {
  employees: Employee[];
  isLoading: boolean;
  isHRAdmin: boolean;
  onEmployeeUpdated?: () => void | Promise<void>;
  includeArchived?: boolean;
  onIncludeArchivedChange?: (value: boolean) => void;
  includeTerminated?: boolean;
  onIncludeTerminatedChange?: (value: boolean) => void;
  needsRepayment?: boolean; // Story 8.13 AC 9
  onNeedsRepaymentChange?: (value: boolean) => void; // Story 8.13 AC 9
  updatedEmployeeId?: string | null;
  onGlobalFilterChange?: (value: string) => void;
  onOptimisticUpdate?: (id: string, updates: Partial<Employee>) => () => void;
}

export function ResponsiveEmployeeView({
  employees,
  isLoading,
  isHRAdmin,
  onEmployeeUpdated,
  includeArchived = false,
  onIncludeArchivedChange,
  includeTerminated = false,
  onIncludeTerminatedChange,
  needsRepayment = false, // Story 8.13 AC 9
  onNeedsRepaymentChange, // Story 8.13 AC 9
  updatedEmployeeId = null,
  onGlobalFilterChange,
  onOptimisticUpdate,
}: ResponsiveEmployeeViewProps) {
  // Detect if we're on mobile (less than 1024px - lg breakpoint)
  const isMobile = useMediaQuery('(max-width: 1023px)');

  // Get user and preview role for column filtering
  const { user } = useAuth();
  const { previewRole } = useUIStore();
  const effectiveRole = previewRole || user?.role;

  // Fetch column configurations for mobile view
  const { columns: columnConfigs } = useColumns(effectiveRole);

  // State for mobile card view dialogs
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [unarchiveDialogOpen, setUnarchiveDialogOpen] = useState(false);
  const [terminateModalOpen, setTerminateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const handleArchive = (employee: Employee) => {
    setSelectedEmployee(employee);
    setArchiveDialogOpen(true);
  };

  const handleUnarchive = (employee: Employee) => {
    setSelectedEmployee(employee);
    setUnarchiveDialogOpen(true);
  };

  const handleTerminate = (employee: Employee) => {
    setSelectedEmployee(employee);
    setTerminateModalOpen(true);
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEditModalOpen(true);
  };

  const handleConfirmArchive = async () => {
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
      const message = error instanceof Error ? error.message : 'Failed to archive employee';
      toast.error(message);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleConfirmUnarchive = async () => {
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
      const message = error instanceof Error ? error.message : 'Failed to unarchive employee';
      toast.error(message);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleTerminated = () => {
    setTerminateModalOpen(false);
    onEmployeeUpdated?.();
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onGlobalFilterChange?.(value);
  };

  // Filter employees based on search value for mobile view
  const filteredEmployees = searchValue
    ? employees.filter((emp) => {
      const searchLower = searchValue.toLowerCase();
      return (
        emp.first_name?.toLowerCase().includes(searchLower) ||
        emp.surname?.toLowerCase().includes(searchLower) ||
        emp.email?.toLowerCase().includes(searchLower) ||
        emp.mobile?.toLowerCase().includes(searchLower) ||
        emp.rank?.toLowerCase().includes(searchLower)
      );
    })
    : employees;

  return (
    <>
      {isMobile ? (
        <EmployeeCardList
          employees={filteredEmployees}
          isLoading={isLoading}
          isHRAdmin={isHRAdmin}
          searchValue={searchValue}
          onSearchChange={handleSearchChange}
          onArchive={handleArchive}
          onUnarchive={handleUnarchive}
          onTerminate={handleTerminate}
          onEdit={handleEdit}
          columnConfigs={columnConfigs}
          onEmployeeUpdated={onEmployeeUpdated}
          onOptimisticUpdate={onOptimisticUpdate}
        />
      ) : (
        <EmployeeTable
          employees={employees}
          isLoading={isLoading}
          onEmployeeUpdated={onEmployeeUpdated}
          includeArchived={includeArchived}
          onIncludeArchivedChange={onIncludeArchivedChange}
          includeTerminated={includeTerminated}
          onIncludeTerminatedChange={onIncludeTerminatedChange}
          needsRepayment={needsRepayment}
          onNeedsRepaymentChange={onNeedsRepaymentChange}
          updatedEmployeeId={updatedEmployeeId}
          onGlobalFilterChange={onGlobalFilterChange}
          onOptimisticUpdate={onOptimisticUpdate}
        />
      )}

      {/* Archive Dialog for Mobile */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive {selectedEmployee?.first_name}{' '}
              {selectedEmployee?.surname}? They will be hidden from the active employee list
              but can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmArchive} disabled={isArchiving}>
              {isArchiving ? 'Archiving...' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unarchive Dialog for Mobile */}
      <AlertDialog open={unarchiveDialogOpen} onOpenChange={setUnarchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore {selectedEmployee?.first_name}{' '}
              {selectedEmployee?.surname}? They will be visible in the active employee list
              again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isArchiving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUnarchive} disabled={isArchiving}>
              {isArchiving ? 'Restoring...' : 'Restore'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Terminate Modal for Mobile */}
      {selectedEmployee && (
        <TerminateEmployeeModal
          employee={selectedEmployee}
          open={terminateModalOpen}
          onOpenChange={setTerminateModalOpen}
          onSuccess={handleTerminated}
        />
      )}

      {/* Edit Modal for Mobile */}
      <EditEmployeeModal
        employee={selectedEmployee}
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedEmployee(null);
        }}
        onSuccess={() => {
          setEditModalOpen(false);
          setSelectedEmployee(null);
          onEmployeeUpdated?.();
        }}
      />
    </>
  );
}
