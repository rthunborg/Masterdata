"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { EmployeeTable } from "@/components/dashboard/employee-table";
import { AddEmployeeModal } from "@/components/dashboard/add-employee-modal";
import { AddColumnModal } from "@/components/dashboard/add-column-modal";
import { EditColumnModal } from "@/components/dashboard/edit-column-modal";
import { ManageColumnsDialog } from "@/components/dashboard/manage-columns-dropdown";
import { ImportEmployeesModal } from "@/components/dashboard/import-employees-modal";
import { employeeService } from "@/lib/services/employee-service";
import { customDataService } from "@/lib/services/custom-data-service";
import { useEffect, useState } from "react";
import type { Employee } from "@/lib/types/employee";
import { Plus, Upload, Columns } from "lucide-react";
import { useUIStore } from "@/lib/store/ui-store";

export default function DashboardPage() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { openModal } = useUIStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [includeTerminated, setIncludeTerminated] = useState(false);

  const fetchEmployees = async () => {
    if (!user) return;

    try {
      setIsLoadingEmployees(true);
      setError(null);
      const data = await employeeService.getAll({ includeArchived, includeTerminated });
      
      // For external party users, fetch custom data for each employee
      if (user.role !== "hr_admin") {
        const employeesWithCustomData = await Promise.all(
          data.map(async (employee) => {
            try {
              const customData = await customDataService.getCustomData(employee.id);
              return { ...employee, customData };
            } catch (err) {
              // If custom data fetch fails, just return employee without custom data
              console.warn(`Failed to fetch custom data for employee ${employee.id}:`, err);
              return { ...employee, customData: {} };
            }
          })
        );
        setEmployees(employeesWithCustomData);
      } else {
        setEmployees(data);
      }
    } catch (err) {
      console.error("Failed to fetch employees:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load employees"
      );
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [user, includeArchived, includeTerminated]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEmployeeAdded = () => {
    fetchEmployees();
  };

  const handleEmployeesImported = () => {
    fetchEmployees();
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
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
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Employee List</h2>
          <p className="mt-2 text-gray-600">
            View and manage all active employees
          </p>
        </div>
        <div className="flex gap-2">
          {user?.role === "hr_admin" && (
            <>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
              <Button onClick={() => setIsImportModalOpen(true)} variant="outline">
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
          <Button onClick={handleLogout} variant="outline">
            Sign Out
          </Button>
        </div>
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
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
              onEmployeeUpdated={fetchEmployees}
              includeArchived={includeArchived}
              onIncludeArchivedChange={setIncludeArchived}
              includeTerminated={includeTerminated}
              onIncludeTerminatedChange={setIncludeTerminated}
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
