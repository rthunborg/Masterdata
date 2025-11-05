'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Archive, ArchiveRestore, UserX, Mail, Phone } from 'lucide-react';
import type { Employee } from '@/lib/types/employee';
import { cn } from '@/lib/utils';

interface EmployeeCardProps {
  employee: Employee;
  isHRAdmin: boolean;
  onArchive?: (employee: Employee) => void;
  onUnarchive?: (employee: Employee) => void;
  onTerminate?: (employee: Employee) => void;
  className?: string;
}

export function EmployeeCard({
  employee,
  isHRAdmin,
  onArchive,
  onUnarchive,
  onTerminate,
  className,
}: EmployeeCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getStatusBadge = () => {
    if (employee.is_terminated) {
      return <Badge variant="destructive">Terminated</Badge>;
    }
    if (employee.is_archived) {
      return <Badge variant="secondary">Archived</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
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

        {/* Additional details - shown when expanded */}
        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-2 text-sm">
            {employee.ssn && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">SSN:</span>
                <span className="font-medium">{employee.ssn}</span>
              </div>
            )}
            {employee.hire_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hire Date:</span>
                <span className="font-medium">
                  {new Date(employee.hire_date).toLocaleDateString()}
                </span>
              </div>
            )}
            {employee.gender && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gender:</span>
                <span className="font-medium">{employee.gender}</span>
              </div>
            )}
            {employee.town_district && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-medium">{employee.town_district}</span>
              </div>
            )}
            {employee.termination_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Termination Date:</span>
                <span className="font-medium">
                  {new Date(employee.termination_date).toLocaleDateString()}
                </span>
              </div>
            )}
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
