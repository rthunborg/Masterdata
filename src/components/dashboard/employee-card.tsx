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
import { EditableDateCell } from './editable-date-cell';
import { employeeService } from '@/lib/services/employee-service';
import { customDataService } from '@/lib/services/custom-data-service';
import { toast } from 'sonner';
import { getEmployeeFieldValue } from '@/lib/utils/column-mapping';
import { useImportantDates } from '@/lib/hooks/use-important-dates';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useLongPress } from '@/hooks/use-long-press';
import { EmployeeContextMenu } from './employee-context-menu';

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
  cardIndex?: number;
  totalCards?: number;
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
  cardIndex,
  totalCards,
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

  // Long-press context menu state (Story 12.6: AC 1)
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);

  const getStatusBadge = () => {
    if (employee.is_terminated) {
      return <Badge variant="destructive" aria-label="Status: Terminated">Terminated</Badge>;
    }
    if (employee.is_archived) {
      return <Badge variant="secondary" aria-label="Status: Archived">Archived</Badge>;
    }
    return <Badge variant="default" aria-label="Status: Active">Active</Badge>;
  };

  // Generate screen reader announcement for employee card
  const getEmployeeAnnouncement = () => {
    const name = `${employee.first_name} ${employee.surname}`;
    const role = employee.rank || 'No rank';
    const status = employee.is_terminated ? 'Terminated' : employee.is_archived ? 'Archived' : 'Active';
    const position = cardIndex && totalCards ? `, ${cardIndex} of ${totalCards}` : '';
    return `${name}, ${role}, ${status}${position}`;
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

  // Story 12.8: Fields that should always be visible on mobile (not in expanded section)
  const alwaysVisibleFieldNames = ['First Name', 'Surname', 'Rank', 'Town District', 'Stena Date', 'ÖMC Date', 'PE3 Date'];
  const alwaysVisibleDbFieldNames = ['first_name', 'surname', 'rank', 'town_district', 'stena_date', 'omc_date', 'pe3_date'];
  
  // Filter out always-visible fields from expanded section
  const filteredGroupedColumns = Object.entries(groupedColumns).reduce((acc, [category, columns]) => {
    const filteredColumns = columns.filter((col) => {
      const columnName = col.column_name;
      const dbColumnName = col.db_column_name.toLowerCase();
      // Exclude if it's in the always-visible list
      return !alwaysVisibleFieldNames.includes(columnName) && !alwaysVisibleDbFieldNames.includes(dbColumnName);
    });
    
    if (filteredColumns.length > 0) {
      acc[category] = filteredColumns;
    }
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

  // Long-press handler (Story 12.6: AC 1)
  const handleLongPress = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (!isMobile) return; // Only on mobile
    
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    setContextMenuPosition({ x: clientX, y: clientY });
    setContextMenuOpen(true);
    triggerHapticFeedback();
  }, [isMobile, triggerHapticFeedback]);

  // Long-press hook (Story 12.6: AC 1)
  const longPressHandlers = useLongPress({
    onLongPress: handleLongPress,
    delay: 500,
    threshold: 10,
  });

  // Handle context menu actions
  const handleViewDetails = useCallback(() => {
    setExpanded(true);
  }, []);

  const handleCall = useCallback((phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
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
    <>
      {/* Story 12.6: AC 1 - Long-press context menu */}
      {isMobile && (
        <EmployeeContextMenu
          employee={employee}
          isOpen={contextMenuOpen}
          onClose={() => setContextMenuOpen(false)}
          position={contextMenuPosition}
          onEdit={onEdit}
          onArchive={onArchive}
          onViewDetails={handleViewDetails}
          onCall={handleCall}
        />
      )}
      <article 
        className="relative overflow-hidden"
        ref={cardRef}
        onTouchStart={(e) => {
          handleTouchStart(e);
          longPressHandlers.onTouchStart(e);
        }}
        onTouchMove={(e) => {
          handleTouchMove(e);
          longPressHandlers.onTouchMove(e);
        }}
        onTouchEnd={(e) => {
          handleTouchEnd();
          longPressHandlers.onTouchEnd(e);
        }}
        aria-label={getEmployeeAnnouncement()}
        aria-posinset={cardIndex}
        aria-setsize={totalCards}
      >
      {/* Action buttons revealed on swipe */}
      {isMobile && isHRAdmin && !employee.is_archived && !employee.is_terminated && (
        <div 
          className="absolute right-0 top-0 h-full flex items-center gap-0 z-10"
          style={{ width: `${actionButtonsWidth}px` }}
          role="group"
          aria-label="Swipe actions"
        >
          <Button
            variant="destructive"
            size="default"
            onClick={handleArchiveClick}
            className="h-full rounded-none min-w-[80px] touch-manipulation"
            style={{ minHeight: '44px' }}
            aria-label={`Archive ${employee.first_name} ${employee.surname}`}
          >
            <Archive className="h-5 w-5" aria-hidden="true" />
            <span className="ml-1 text-xs">Archive</span>
          </Button>
          <Button
            variant="destructive"
            size="default"
            onClick={handleTerminateClick}
            className="h-full rounded-none min-w-[80px] touch-manipulation"
            style={{ minHeight: '44px' }}
            aria-label={`Terminate ${employee.first_name} ${employee.surname}`}
          >
            <UserX className="h-5 w-5" aria-hidden="true" />
            <span className="ml-1 text-xs">Terminate</span>
          </Button>
          <Button
            variant="default"
            size="default"
            onClick={handleEditClick}
            className="h-full rounded-none min-w-[80px] touch-manipulation"
            style={{ minHeight: '44px' }}
            aria-label={`Edit ${employee.first_name} ${employee.surname}`}
          >
            <Edit className="h-5 w-5" aria-hidden="true" />
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
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold truncate">
                <span className="sr-only">Employee: </span>
                {employee.first_name} {employee.surname}
              </h3>
              {/* Story 12.8: "Less" button in CardHeader when expanded */}
              {isMobile && expanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(false)}
                  className="gap-1 touch-manipulation shrink-0"
                  aria-label={`Collapse card for ${employee.first_name} ${employee.surname}`}
                >
                  Less <ChevronUp className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
            {employee.rank && !isMobile && (
              <p className="text-sm text-muted-foreground truncate">
                <span className="sr-only">Role: </span>
                {employee.rank}
              </p>
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
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
              {/* Story 12.6: AC 2 - Email with pre-filled subject */}
              <a 
                href={`mailto:${employee.email}?subject=${encodeURIComponent(`Re: ${employee.first_name} ${employee.surname}`)}`} 
                className="text-blue-600 hover:underline truncate"
                aria-label={`Email ${employee.first_name} ${employee.surname} at ${employee.email}`}
              >
                {employee.email}
              </a>
            </div>
          )}
          {employee.mobile && (
            <div className="flex items-center gap-2 text-sm min-w-0">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
              {/* Story 12.6: AC 3 - Phone with native styling */}
              <a 
                href={`tel:${employee.mobile}`} 
                className="text-blue-600 hover:underline truncate"
                aria-label={`Call ${employee.first_name} ${employee.surname} at ${employee.mobile}`}
                style={{
                  // iOS native styling for phone links
                  WebkitTapHighlightColor: 'rgba(0, 122, 255, 0.3)',
                }}
              >
                {employee.mobile}
              </a>
            </div>
          )}
        </div>

        {/* Story 12.8: Always-visible fields on mobile */}
        {isMobile && (
          <div className="mt-4 pt-4 border-t space-y-3">
            {/* First Name */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">First Name</label>
              <EditableCell
                value={employee.first_name}
                employeeId={employee.id}
                field="first_name"
                type="text"
                canEdit={true}
                onSave={handleMasterdataUpdate}
                onError={(error) => toast.error(error)}
              />
            </div>

            {/* Surname */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Surname</label>
              <EditableCell
                value={employee.surname}
                employeeId={employee.id}
                field="surname"
                type="text"
                canEdit={true}
                onSave={handleMasterdataUpdate}
                onError={(error) => toast.error(error)}
              />
            </div>

            {/* Rank */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Rank</label>
              <EditableCell
                value={employee.rank}
                employeeId={employee.id}
                field="rank"
                type="select"
                options={['SEV', 'CHEF']}
                canEdit={true}
                onSave={handleMasterdataUpdate}
                onError={(error) => toast.error(error)}
              />
            </div>

            {/* City/Town District */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">City/Town District</label>
              <EditableCell
                value={employee.town_district}
                employeeId={employee.id}
                field="town_district"
                type="text"
                canEdit={true}
                onSave={handleMasterdataUpdate}
                onError={(error) => toast.error(error)}
              />
            </div>

            {/* Stena Date */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Stena Date</label>
              <EditableDateCell
                value={employee.stena_date}
                displayValue={getEmployeeFieldValue(employee, 'Stena Date', true, allImportantDates) as string || '—'}
                employeeId={employee.id}
                field="stena_date"
                dateCategory="Stena Dates"
                allDates={allImportantDates}
                canEdit={true}
                onSave={handleMasterdataUpdate}
                onError={(error) => toast.error(error)}
              />
            </div>

            {/* ÖMC Date */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">ÖMC Date</label>
              <EditableDateCell
                value={employee.omc_date}
                displayValue={getEmployeeFieldValue(employee, 'ÖMC Date', true, allImportantDates) as string || '—'}
                employeeId={employee.id}
                field="omc_date"
                dateCategory="ÖMC Dates"
                allDates={allImportantDates}
                canEdit={true}
                onSave={handleMasterdataUpdate}
                onError={(error) => toast.error(error)}
              />
            </div>

            {/* PE3 Date */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">PE3 Date</label>
              <EditableDateCell
                value={employee.pe3_date}
                displayValue={getEmployeeFieldValue(employee, 'PE3 Date', true, allImportantDates) as string || '—'}
                employeeId={employee.id}
                field="pe3_date"
                dateCategory="PE3 Dates"
                allDates={allImportantDates}
                canEdit={true}
                onSave={handleMasterdataUpdate}
                onError={(error) => toast.error(error)}
              />
            </div>
          </div>
        )}

        {/* All fields from column config - shown when expanded (filtered to exclude always-visible fields on mobile) */}
        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-4 max-h-[70vh] overflow-y-auto">
            {Object.entries(isMobile ? filteredGroupedColumns : groupedColumns).map(([category, columns]) => (
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

                    // Special handling for Important Date columns (Stena Date, ÖMC Date, PE3 Date)
                    if (["Stena Date", "ÖMC Date", "PE3 Date"].includes(col.column_name)) {
                      const dateFieldMap: Record<string, keyof Employee> = {
                        "Stena Date": "stena_date",
                        "ÖMC Date": "omc_date",
                        "PE3 Date": "pe3_date"
                      };
                      
                      const dateCategoryMap: Record<string, string> = {
                        "Stena Date": "Stena Dates",
                        "ÖMC Date": "ÖMC Dates",
                        "PE3 Date": "PE3 Dates"
                      };
                      
                      const dateField = dateFieldMap[col.column_name];
                      const dateCategory = dateCategoryMap[col.column_name];
                      const dateValue = employee[dateField] as string | null;
                      
                      return (
                        <div key={col.id} className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">
                            {getColumnLabel(col)}
                          </label>
                          <EditableDateCell
                            value={dateValue}
                            displayValue={value as string}
                            employeeId={employee.id}
                            field={dateField}
                            dateCategory={dateCategory}
                            allDates={allImportantDates}
                            canEdit={canEdit}
                            onSave={handleMasterdataUpdate}
                            onError={(error) => toast.error(error)}
                          />
                        </div>
                      );
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
          aria-label={expanded ? `Collapse details for ${employee.first_name} ${employee.surname}` : `Expand details for ${employee.first_name} ${employee.surname}`}
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              Less <ChevronUp className="h-4 w-4" aria-hidden="true" />
            </>
          ) : (
            <>
              More <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Button>

        {/* Story 12.8: Archive/Delete buttons only show when expanded on mobile */}
        {isHRAdmin && (!isMobile || expanded) && (
          <div className="flex gap-2" role="group" aria-label="Employee actions">
            {employee.is_archived ? (
              <Button
                variant="outline"
                size="default"
                onClick={() => onUnarchive?.(employee)}
                className="gap-2 touch-manipulation"
                style={{ minHeight: isMobile ? '44px' : undefined }}
                aria-label={`Restore ${employee.first_name} ${employee.surname}`}
              >
                <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
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
                      style={{ minHeight: isMobile ? '44px' : undefined }}
                      aria-label={`Archive ${employee.first_name} ${employee.surname}`}
                    >
                      <Archive className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">Archive</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => onTerminate?.(employee)}
                      className="gap-2 touch-manipulation"
                      style={{ minHeight: isMobile ? '44px' : undefined }}
                      aria-label={`Terminate ${employee.first_name} ${employee.surname}`}
                    >
                      <UserX className="h-4 w-4" aria-hidden="true" />
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
    </article>
    </>
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
    prevProps.onEmployeeUpdated === nextProps.onEmployeeUpdated &&
    prevProps.cardIndex === nextProps.cardIndex &&
    prevProps.totalCards === nextProps.totalCards
  );
});
