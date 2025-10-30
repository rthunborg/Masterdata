"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { useEmployees } from "@/lib/hooks/use-employees";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmployeeTable } from "@/components/dashboard/employee-table";
import { AddEmployeeModal } from "@/components/dashboard/add-employee-modal";
import { AddColumnModal } from "@/components/dashboard/add-column-modal";
import { EditColumnModal } from "@/components/dashboard/edit-column-modal";
import { ManageColumnsDialog } from "@/components/dashboard/manage-columns-dropdown";
import { ImportEmployeesModal } from "@/components/dashboard/import-employees-modal";
import { RoleSelector } from "@/components/dashboard/role-selector";
import { RolePreviewBanner } from "@/components/dashboard/role-preview-banner";
import { useState } from "react";
import { Plus, Upload, Columns } from "lucide-react";
import { useUIStore } from "@/lib/store/ui-store";

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { openModal, isPreviewMode } = useUIStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [includeTerminated, setIncludeTerminated] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");

  // Use the new real-time enabled hook with notifications
  const { 
    employees, 
    isLoading: isLoadingEmployees, 
    error, 
    isConnected,
    refetch,
    updatedEmployeeId
  } = useEmployees({
    filters: { includeArchived, includeTerminated },
    enableRealtime: true,
    userRole: user?.role,
    enableNotifications: user?.role !== "hr_admin", // Only enable for external parties
    globalFilter,
  });

  const handleEmployeeAdded = () => {
    refetch();
  };

  const handleEmployeesImported = () => {
    refetch();
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Not authenticated</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      {/* Role Preview Banner - Shows at top when in preview mode */}
      <RolePreviewBanner />
      
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Employee List</h2>
          <p className="mt-2 text-gray-600">
            View and manage all active employees
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Role Selector - Only visible to HR Admin */}
          {user?.role === "hr_admin" && (
            <RoleSelector />
          )}
          {user?.role === "hr_admin" && (
            <>
              <Button 
                onClick={() => setIsAddModalOpen(true)}
                disabled={isPreviewMode}
                title={isPreviewMode ? "Editing disabled in preview mode" : ""}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
              <Button 
                onClick={() => setIsImportModalOpen(true)} 
                variant="outline"
                disabled={isPreviewMode}
                title={isPreviewMode ? "Editing disabled in preview mode" : ""}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Employees
              </Button>
            </>
          )}
          {user?.role !== "hr_admin" && (
            <>
              <Button onClick={() => openModal("addColumn")} variant="outline">
                <Columns className="h-4 w-4 mr-2" />
                Add Column
              </Button>
              <ManageColumnsDialog />
            </>
          )}
        </div>
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error.message}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="mt-4"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Employees</CardTitle>
            <CardDescription>
              A list of all active, non-archived employees in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeTable
              employees={employees}
              isLoading={isLoadingEmployees}
              onEmployeeUpdated={refetch}
              includeArchived={includeArchived}
              onIncludeArchivedChange={setIncludeArchived}
              includeTerminated={includeTerminated}
              onIncludeTerminatedChange={setIncludeTerminated}
              isRealtimeConnected={isConnected}
              updatedEmployeeId={updatedEmployeeId}
              onGlobalFilterChange={setGlobalFilter}
            />
          </CardContent>
        </Card>
      )}

      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleEmployeeAdded}
      />

      <ImportEmployeesModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onSuccess={handleEmployeesImported}
      />

      <AddColumnModal />
      
      <EditColumnModal />
    </div>
  );
}
