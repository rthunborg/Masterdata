'use client';

import { EmployeeCard } from './employee-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { Employee } from '@/lib/types/employee';

interface EmployeeCardListProps {
  employees: Employee[];
  isLoading: boolean;
  isHRAdmin: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onArchive?: (employee: Employee) => void;
  onUnarchive?: (employee: Employee) => void;
  onTerminate?: (employee: Employee) => void;
}

export function EmployeeCardList({
  employees,
  isLoading,
  isHRAdmin,
  searchValue,
  onSearchChange,
  onArchive,
  onUnarchive,
  onTerminate,
}: EmployeeCardListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search employees..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-12"
        />
      </div>

      {/* Employee cards */}
      {employees.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No employees found
        </div>
      ) : (
        <div className="space-y-3">
          {employees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              isHRAdmin={isHRAdmin}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
              onTerminate={onTerminate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
