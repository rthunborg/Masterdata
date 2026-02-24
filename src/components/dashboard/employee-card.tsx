'use client';

import { useState, useCallback, memo } from 'react';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';

import { ChevronDown, ChevronUp, Archive, ArchiveRestore, UserX, Mail, Phone, Edit } from 'lucide-react';

import type { Employee } from '@/lib/types/employee';

import type { ColumnConfig } from '@/lib/types/column-config';

import { cn } from '@/lib/utils';

import { employeeService } from '@/lib/services/employee-service';

import { customDataService } from '@/lib/services/custom-data-service';

import { toast } from 'sonner';
import { toastError } from '@/lib/utils/toast-helpers';

import { useTranslations } from '@/lib/i18n';

import { useImportantDates } from '@/lib/hooks/use-important-dates';

import { useMediaQuery } from '@/hooks/use-media-query';

import { useLongPress } from '@/hooks/use-long-press';

import { useCardSwipe } from '@/lib/hooks/use-card-swipe';

import { EmployeeContextMenu } from './employee-context-menu';

import { Checkbox } from '@/components/ui/checkbox';

import { ChecklistProgressIndicator } from './checklist-progress-indicator';

import { CardMobileFields } from './employee-card/CardMobileFields';

import { CardExpandedDetails } from './employee-card/CardExpandedDetails';


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

  // Story 13.2: Selection props

  isSelected?: boolean;

  onToggleSelection?: (employeeId: string) => void;

  // Story 16.5: Change detection function

  isColumnChanged?: (employeeId: string, columnName: string) => boolean;

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

  isSelected = false,

  onToggleSelection,

  isColumnChanged, // Story 16.5: Change detection function

}: EmployeeCardProps) {
  const tToasts = useTranslations('toasts');

  const [expanded, setExpanded] = useState(false);

  const { dates: allImportantDates } = useImportantDates();

  // Story 16.5: Use isColumnChanged from props (passed from dashboard page to avoid duplicate API calls)
  const checkColumnChanged = isColumnChanged || (() => false);

  const isMobile = useMediaQuery('(max-width: 1023px)');

  const actionButtonsWidth = 240;

  const {
    swipeOffset,
    isSwiping,
    cardRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetSwipe,
    triggerHapticFeedback,
  } = useCardSwipe({ isMobile, isHRAdmin, actionButtonsWidth });


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

  const getEmployeeAnnouncement = () => {

    const name = `${employee.first_name} ${employee.surname}`;

    const role = employee.rank || 'No rank';

    const status = employee.is_terminated ? 'Terminated' : employee.is_archived ? 'Archived' : 'Active';

    const position = cardIndex && totalCards ? `, ${cardIndex} of ${totalCards}` : '';

    return `${name}, ${role}, ${status}${position}`;

  };

  const handleMasterdataUpdate = useCallback(async (
    id: string,
    field: string,
    value: string | number | boolean | null,
  ) => {
    try {
      await employeeService.update(id, { [field]: value });
      toast.success(tToasts("employees.fieldUpdated"));
      if (onEmployeeUpdated) {
        onEmployeeUpdated();
      }
    } catch (error: unknown) {
      toastError(error, "Failed to update field");
    }
  }, [onEmployeeUpdated, tToasts]);
  
  const handleCustomDataUpdate = useCallback(async (

    id: string,

    columnName: string,

    value: string | number | boolean | null

  ) => {

    try {

      await customDataService.updateCustomData(id, { [columnName]: value });

      toast.success(tToasts("employees.fieldUpdated"));

      onEmployeeUpdated?.();

    } catch (error: unknown) {

      const message = error instanceof Error ? error.message : "Failed to update field";

      throw new Error(message);

    }

  }, [onEmployeeUpdated, tToasts]);

  // Long-press handler (Story 12.6: AC 1)

  const handleLongPress = useCallback((event: React.TouchEvent | React.MouseEvent) => {

    if (!isMobile) return;

    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;

    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    setContextMenuPosition({ x: clientX, y: clientY });

    setContextMenuOpen(true);

    triggerHapticFeedback();

  }, [isMobile, triggerHapticFeedback]);

  const longPressHandlers = useLongPress({

    onLongPress: handleLongPress,

    delay: 500,

    threshold: 10,

  });

  const handleViewDetails = useCallback(() => {
    setExpanded(true);
  }, [setExpanded]);

  const handleCall = useCallback((phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
  }, []);

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

          className="absolute right-0 top-0 bottom-0 flex items-start gap-0 z-10"

          style={{ width: `${actionButtonsWidth}px` }}

          role="group"

          aria-label="Swipe actions"

        >

          <Button

            variant="destructive"

            size="default"

            onClick={handleArchiveClick}

            className="rounded-none min-w-[80px] touch-manipulation h-auto"

            style={{ minHeight: '44px', height: 'auto' }}

            aria-label={`Archive ${employee.first_name} ${employee.surname}`}

          >

            <Archive className="h-5 w-5" aria-hidden="true" />

            <span className="ml-1 text-xs">Archive</span>

          </Button>

          <Button

            variant="destructive"

            size="default"

            onClick={handleTerminateClick}

            className="rounded-none min-w-[80px] touch-manipulation h-auto"

            style={{ minHeight: '44px', height: 'auto' }}

            aria-label={`Terminate ${employee.first_name} ${employee.surname}`}

          >

            <UserX className="h-5 w-5" aria-hidden="true" />

            <span className="ml-1 text-xs">Terminate</span>

          </Button>

          <Button

            variant="default"

            size="default"

            onClick={handleEditClick}

            className="rounded-none min-w-[80px] touch-manipulation h-auto"

            style={{ minHeight: '44px', height: 'auto' }}

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

          employee.is_terminated && !employee.is_archived && 'bg-red-50 dark:bg-red-950/20',
          employee.crewing_done === true && !employee.is_archived && !employee.is_terminated && 'bg-green-50/50 dark:bg-green-950/20',
          isSelected && !employee.is_archived && 'bg-gray-100/50 dark:bg-gray-800/50',

          className

        )}

        style={{

          transform: `translateX(${swipeOffset}px)`,

          willChange: isSwiping ? 'transform' : 'auto',

        }}

      >

        <CardHeader 
          className={cn("pb-3", isSelected && "bg-gray-100/50 dark:bg-gray-800/50")}
          data-testid="employee-card-header"
        >

        <div className="flex items-start justify-between gap-2">

          <div className="flex-1 min-w-0">

            <div className="flex items-center gap-2">

              {/* Story 13.2: Selection checkbox for mobile */}

              {isMobile && onToggleSelection && (

                <div onClick={(e) => e.stopPropagation()} className="shrink-0">

                  <Checkbox

                    checked={isSelected}

                    onCheckedChange={() => onToggleSelection(employee.id)}

                    aria-label={`Select ${employee.first_name} ${employee.surname}`}

                    className="w-[44px] h-[44px] min-w-[44px] min-h-[44px]"

                  />

                </div>

              )}

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

          <div className="flex items-center gap-2 shrink-0">
            {/* Story 19.5: Checklist Progress Indicator */}
            {columnConfigs.some(col => col.column_type === 'boolean' && col.is_checklist_item) && (
              <ChecklistProgressIndicator
                employee={employee}
                columns={columnConfigs}
                compact={true}
              />
            )}
            {getStatusBadge()}
          </div>

        </div>

      </CardHeader>

      <CardContent className="space-y-2">

        {/* Essential info - always visible */}

        <div className="space-y-2">

          {employee.email && (

            <div className="flex items-center gap-2 text-sm min-w-0">

              <Mail className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />

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

              <a 

                href={`tel:${employee.mobile}`} 

                className="text-blue-600 hover:underline truncate"

                aria-label={`Call ${employee.first_name} ${employee.surname} at ${employee.mobile}`}

                style={{

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
          <CardMobileFields
            employee={employee}
            allImportantDates={allImportantDates}
            checkColumnChanged={checkColumnChanged}
            onSave={handleMasterdataUpdate}
          />
        )}

        {/* All fields from column config - shown when expanded */}

        {expanded && (
          <CardExpandedDetails
            employee={employee}
            columnConfigs={columnConfigs}
            allImportantDates={allImportantDates}
            checkColumnChanged={checkColumnChanged}
            onMasterdataSave={handleMasterdataUpdate}
            onCustomDataSave={handleCustomDataUpdate}
            isMobile={isMobile}
          />
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
              !employee.is_terminated && (
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
                    variant="destructive"
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
              )
            )}
          </div>
        )}
        </CardFooter>
      </Card>
      </article>
    </>
  );
}

export const EmployeeCard = memo(EmployeeCardComponent, (prevProps, nextProps) => {
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
    prevProps.totalCards === nextProps.totalCards &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.onToggleSelection === nextProps.onToggleSelection
  );
});
