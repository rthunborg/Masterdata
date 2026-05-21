"use client";

import { useState, useEffect, useRef } from "react";
import { ColumnConfig } from "@/lib/types/column-config";
import { UserRole, EXTERNAL_PARTY_ROLES } from "@/lib/types/user";
import { useTranslations } from "@/lib/i18n";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ListChecks } from "lucide-react";
import { DeleteColumnModal } from "./delete-column-modal";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { StickyScrollbar } from "@/components/ui/sticky-scrollbar";
import { useColumnSettingsActions } from "@/lib/hooks/use-column-settings-actions";
import { DraggableRow } from "./column-settings/DraggableRow";

interface ColumnSettingsTableProps {
  columns: ColumnConfig[];
  allColumns: ColumnConfig[];
  onPermissionsUpdated: () => void;
}

export function ColumnSettingsTable({
  columns,
  allColumns,
  onPermissionsUpdated,
}: ColumnSettingsTableProps) {
  const [items, setItems] = useState(columns);
  const t = useTranslations("tooltips");
  const tAdmin = useTranslations("admin");

  const [isMobile, setIsMobile] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setItems(columns);
  }, [columns]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const allRoles: UserRole[] = [UserRole.HR_ADMIN, ...EXTERNAL_PARTY_ROLES];

  const {
    updatingColumnId,
    updatingColumnField,
    deleteModalOpen,
    setDeleteModalOpen,
    columnToDelete,
    handleDragEnd,
    handleMoveUp,
    handleMoveDown,
    handlePermissionChange,
    handleCategoryUpdate,
    handleCategoryColorUpdate,
    handleColumnNameUpdate,
    handleChecklistItemToggle,
    handleDeleteClick,
    handleToggleVisibility,
    handleDeleteConfirm,
    isPermissionDisabled,
  } = useColumnSettingsActions({
    items,
    setItems,
    columns,
    allColumns,
    onPermissionsUpdated,
  });

  return (
    <TooltipProvider>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="rounded-md border w-full lg:overflow-hidden">
          <Table className="w-full table-auto lg:table-fixed" containerRef={tableContainerRef} maxHeight="calc(100vh - 300px)">
            <colgroup className="hidden lg:table-column-group">
              <col style={{ width: '2.5%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '10%' }} />
              {allRoles.map((role, index) => (
                <col key={`role-${role}-${index}`} style={{ width: `${42.5 / allRoles.length}%` }} />
              ))}
              <col style={{ width: '10%' }} />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="w-12 lg:w-auto lg:p-2 sticky left-0 z-20 bg-background"
                  style={{ left: 0 }}
                ></TableHead>
                <TableHead 
                  className="min-w-[150px] lg:min-w-0 lg:p-2 sticky z-20 bg-background text-left"
                  style={{ left: 40 }}
                >Visningsnamn</TableHead>
                <TableHead 
                  className="min-w-[150px] lg:min-w-0 lg:p-2 sticky z-20 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-left"
                  style={{ left: 190 }}
                >Databasnamn</TableHead>
                <TableHead className="w-16 lg:w-auto lg:p-2">{tAdmin("type")}</TableHead>
                <TableHead className="w-24 lg:w-auto lg:p-2">Masterdata</TableHead>
                <TableHead className="w-24 lg:w-auto lg:p-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <ListChecks className="h-4 w-4" />
                        <span className="hidden xl:inline">Checklista</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Inkludera i medarbetarens checklista-indikator</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="w-40 lg:w-auto lg:p-2 text-left">{tAdmin("category")}</TableHead>
                {allRoles.map((role) => (
                  <TableHead key={role} className="w-40 lg:w-auto lg:p-2">
                      {role === UserRole.HR_ADMIN ? tAdmin("hrAdmin") : role.toUpperCase()}
                  </TableHead>
                ))}
                <TableHead className="w-40 lg:w-auto text-left lg:pl-4 lg:pr-2">{tAdmin("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SortableContext items={items} strategy={verticalListSortingStrategy}>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8 + allRoles.length}
                      className="text-center text-gray-500"
                    >
                      No columns found
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((column, index) => (
                    <DraggableRow
                      key={column.id}
                      column={column}
                      allRoles={allRoles}
                      allColumns={allColumns}
                      updatingColumnId={updatingColumnId}
                      updatingColumnField={updatingColumnField}
                      isPermissionDisabled={isPermissionDisabled}
                      handlePermissionChange={handlePermissionChange}
                      handleCategoryUpdate={handleCategoryUpdate}
                      handleCategoryColorUpdate={handleCategoryColorUpdate}
                      handleColumnNameUpdate={handleColumnNameUpdate}
                      handleChecklistItemToggle={handleChecklistItemToggle}
                      handleDeleteClick={handleDeleteClick}
                      handleToggleVisibility={handleToggleVisibility}
                      isMobile={isMobile}
                      onMoveUp={() => handleMoveUp(index)}
                      onMoveDown={() => handleMoveDown(index)}
                      isFirst={index === 0}
                      isLast={index === items.length - 1}
                      t={t}
                    />
                  ))
                )}
              </SortableContext>
            </TableBody>
          </Table>

          <StickyScrollbar containerRef={tableContainerRef} />
        </div>
        <DeleteColumnModal
          column={columnToDelete}
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onDeleted={handleDeleteConfirm}
        />
      </DndContext>
    </TooltipProvider>
  );
}
