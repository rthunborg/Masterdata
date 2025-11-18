'use client';

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Archive, ArchiveRestore, UserX, Mail, Phone, Edit } from 'lucide-react';
import type { Employee } from '@/lib/types/employee';
import type { ColumnConfig } from '@/lib/types/column-config';
import { cn } from '@/lib/utils';
import { EditableCell } from './editable-cell';
import { employeeService } from '@/lib/services/employee-service';
import { customDataService } from '@/lib/services/custom-data-service';
import { toast } from 'sonner';
import { getEmployeeFieldValue } from '@/lib/utils/column-mapping';
import { useImportantDates } from '@/lib/hooks/use-important-dates';
import { useMediaQuery } from '@/hooks/use-media-query';

interface EmployeeCardProps {
  employee: Employee;
  isHRAdmin: boolean;
  columnConfigs?: ColumnConfig[];
  onArchive?: (employee: Employee) => void;
  onUnarchive?: (employee: Employee) => void;
  onTerminate?: (employee: Employee) => void;
  onEdit?: (employee: Employee) => void;
  onEmployeeUpdated?: () => void;
  className?: string;
}

function EmployeeCardComponent({
  employee,
  isHRAdmin,
  columnConfigs = [],
  onArchive,
  onUnarchive,
  onTerminate,
  onEdit,
  onEmployeeUpdated,
  className,
}: EmployeeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { dates: allImportantDates } = useImportantDates();
  const isMobile = useMediaQuery('(max-width: 1023px)');
  
  // Swipe gesture state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const actionButtonsWidth = 240; // 3 buttons * 80px each

  const getStatusBadge = () => {
    if (employee.is_terminated) {
      return <Badge variant="destructive">Terminated</Badge>;
    }
    if (employee.is_archived) {
      return <Badge variant="secondary">Archived</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  // Handler for masterdata column updates
  const handleMasterdataUpdate = useCallback(async (
    id: string,
    field: string,
    value: string | number | boolean | null
  ) => {
    try {
      await employeeService.update(id, { [field]: value });
      toast.success("Field updated successfully");
      onEmployeeUpdated?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update field";
      throw new Error(message);
    }
  }, [onEmployeeUpdated]);

  // Handler for custom data column updates (party tables)
  const handleCustomDataUpdate = useCallback(async (
    id: string,
    columnName: string,
    value: string | number | boolean | null
  ) => {
    try {
      await customDataService.updateCustomData(id, { [columnName]: value });
      toast.success("Field updated successfully");
      onEmployeeUpdated?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update field";
      throw new Error(message);
    }
  }, [onEmployeeUpdated]);

  // Group columns by category
  const groupedColumns = columnConfigs.reduce((acc, col) => {
    if (!col.is_visible) return acc;
    
    const category = col.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(col);
    return acc;
  }, {} as Record<string, ColumnConfig[]>);

  // Get formatted label for column
  const getColumnLabel = (col: ColumnConfig) => {
    return col.column_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Haptic feedback helper (iOS)
  const triggerHapticFeedback = useCallback(() => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10); // Short vibration
    }
  }, []);

  // Reset swipe position
  const resetSwipe = useCallback(() => {
    setSwipeOffset(0);
    setIsSwiping(false);
    touchStartRef.current = null;
  }, []);

  // Touch event handlers for swipe gesture
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !isHRAdmin) return; // Only on mobile and for HR admins
    
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setIsSwiping(true);
  }, [isMobile, isHRAdmin]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !isHRAdmin || !touchStartRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    
    // Check if gesture is primarily horizontal (AC: prioritize vertical scroll if ambiguous)
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    // If vertical movement is greater, treat as scroll and ignore
    if (absDeltaY > absDeltaX) {
      return;
    }
    
    // Prevent default scroll during horizontal swipe
    if (absDeltaX > 10) {
      e.preventDefault();
    }
    
    // Only allow left swipe (negative deltaX)
    if (deltaX < 0) {
      const newOffset = Math.max(-actionButtonsWidth, deltaX);
      setSwipeOffset(newOffset);
    }
  }, [isMobile, isHRAdmin, actionButtonsWidth]);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile || !isHRAdmin || !touchStartRef.current) return;
    
    const threshold = 50; // Minimum 50px horizontal movement (AC requirement)
    const shouldReveal = Math.abs(swipeOffset) >= threshold;
    
    if (shouldReveal && swipeOffset < -threshold) {
      // Reveal actions (swipe left)
      setSwipeOffset(-actionButtonsWidth);
      triggerHapticFeedback();
    } else {
      // Return to original position
      resetSwipe();
    }
    
    setIsSwiping(false);
    touchStartRef.current = null;
  }, [isMobile, isHRAdmin, swipeOffset, actionButtonsWidth, triggerHapticFeedback, resetSwipe]);

  // Handle click outside to close swipe
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        if (swipeOffset < 0) {
          resetSwipe();
        }
      }
    };

    if (swipeOffset < 0) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [swipeOffset, resetSwipe]);

  // Handle action button clicks
  const handleArchiveClick = useCallback(() => {
    resetSwipe();
    onArchive?.(employee);
  }, [resetSwipe, onArchive, employee]);

  const handleTerminateClick = useCallback(() => {
    resetSwipe();
    onTerminate?.(employee);
  }, [resetSwipe, onTerminate, employee]);

  const handleEditClick = useCallback(() => {
    resetSwipe();
    onEdit?.(employee);
  }, [resetSwipe, onEdit, employee]);

  return (
    <div 
      className="relative overflow-hidden"
      ref={cardRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Action buttons revealed on swipe */}
      {isMobile && isHRAdmin && !employee.is_archived && !employee.is_terminated && (
        <div 
          className="absolute right-0 top-0 h-full flex items-center gap-0 z-10"
          style={{ width: `${actionButtonsWidth}px` }}
        >
          <Button
            variant="destructive"
            size="default"
            onClick={handleArchiveClick}
            className="h-full rounded-none min-w-[80px] touch-manipulation"
            style={{ minHeight: '44px' }}
          >
            <Archive className="h-5 w-5" />
            <span className="ml-1 text-xs">Archive</span>
          </Button>
          <Button
            variant="destructive"
            size="default"
            onClick={handleTerminateClick}
            className="h-full rounded-none min-w-[80px] touch-manipulation"
            style={{ minHeight: '44px' }}
          >
            <UserX className="h-5 w-5" />
            <span className="ml-1 text-xs">Terminate</span>
          </Button>
          <Button
            variant="default"
            size="default"
            onClick={handleEditClick}
            className="h-full rounded-none min-w-[80px] touch-manipulation"
            style={{ minHeight: '44px' }}
          >
            <Edit className="h-5 w-5" />
            <span className="ml-1 text-xs">Edit</span>
          </Button>
        </div>
      )}
      
      {/* Main card with swipe transform */}
      <Card 
        className={cn(
          'w-full transition-transform duration-300 ease-out',
          isSwiping && 'transition-none',
          className
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          willChange: isSwiping ? 'transform' : 'auto',
        }}
      >
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

        {/* All fields from column config - shown when expanded */}
        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-4 max-h-[70vh] overflow-y-auto">
            {Object.entries(groupedColumns).map(([category, columns]) => (
              <div key={category} className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {category}
                </h4>
                <div className="space-y-3">
                  {columns.map((col) => {
                    const value = getEmployeeFieldValue(
                      employee, 
                      col.db_column_name, 
                      col.is_masterdata,
                      allImportantDates
                    );
                    const canEdit = col.role_permissions && 
                      Object.values(col.role_permissions).some(p => p.edit);

                    // Determine select options based on column_name (display name for special columns)
                    let selectOptions: string[] | undefined;
                    if (col.column_name === 'Gender') {
                      selectOptions = ['Man', 'Woman'];
                    } else if (col.column_name === 'Rank') {
                      selectOptions = ['SEV', 'CHEF'];
                    }

                    return (
                      <div key={col.id} className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          {getColumnLabel(col)}
                        </label>
                        <EditableCell
                          value={value}
                          employeeId={employee.id}
                          field={col.db_column_name}
                          type={col.column_type as "text" | "date" | "select" | "number" | "boolean"}
                          options={selectOptions}
                          canEdit={canEdit}
                          onSave={col.is_masterdata ? handleMasterdataUpdate : handleCustomDataUpdate}
                          onError={(error) => toast.error(error)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
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
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders (Story 12.5: Performance optimization)
export const EmployeeCard = memo(EmployeeCardComponent, (prevProps, nextProps) => {
  // Custom comparison function for better memoization
  return (
    prevProps.employee.id === nextProps.employee.id &&
    prevProps.employee.first_name === nextProps.employee.first_name &&
    prevProps.employee.surname === nextProps.employee.surname &&
    prevProps.employee.is_archived === nextProps.employee.is_archived &&
    prevProps.employee.is_terminated === nextProps.employee.is_terminated &&
    prevProps.isHRAdmin === nextProps.isHRAdmin &&
    (prevProps.columnConfigs?.length ?? 0) === (nextProps.columnConfigs?.length ?? 0) &&
    prevProps.onArchive === nextProps.onArchive &&
    prevProps.onUnarchive === nextProps.onUnarchive &&
    prevProps.onTerminate === nextProps.onTerminate &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onEmployeeUpdated === nextProps.onEmployeeUpdated
  );
});
