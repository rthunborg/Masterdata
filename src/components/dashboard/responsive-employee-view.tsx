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
import { useAuth } from '@/lib/hooks/use-auth';
import { useColumns } from '@/lib/hooks/use-columns';
import { useUIStore } from '@/lib/store/ui-store';
import { useResponsiveEmployeeActions } from '@/lib/hooks/use-responsive-employee-actions';

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
  isColumnChanged?: (employeeId: string, columnName: string) => boolean; // Story 16.5: Change detection function
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
  isColumnChanged, // Story 16.5: Change detection function
}: ResponsiveEmployeeViewProps) {
  const isMobile = useMediaQuery('(max-width: 1023px)');

  const { user } = useAuth();
  const { previewRole } = useUIStore();
  const effectiveRole = previewRole || user?.role;
  const isEffectivelyHRAdmin = effectiveRole === "hr_admin";

  const { columns: columnConfigs } = useColumns(effectiveRole);

  const [searchValue, setSearchValue] = useState('');

  const {
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
  } = useResponsiveEmployeeActions({ onEmployeeUpdated });

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onGlobalFilterChange?.(value);
  };

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
          isHRAdmin={isEffectivelyHRAdmin}
          searchValue={searchValue}
          onSearchChange={handleSearchChange}
          onArchive={handleArchive}
          onUnarchive={handleUnarchive}
          onTerminate={handleTerminate}
          onEdit={handleEdit}
          columnConfigs={columnConfigs}
          onEmployeeUpdated={onEmployeeUpdated}
          onOptimisticUpdate={onOptimisticUpdate}
          isColumnChanged={isColumnChanged}
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
          isColumnChanged={isColumnChanged}
        />
      )}

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

      {selectedEmployee && (
        <TerminateEmployeeModal
          employee={selectedEmployee}
          open={terminateModalOpen}
          onOpenChange={setTerminateModalOpen}
          onSuccess={handleTerminated}
        />
      )}

      <EditEmployeeModal
        employee={selectedEmployee}
        isOpen={editModalOpen}
        onClose={handleCloseEdit}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}
