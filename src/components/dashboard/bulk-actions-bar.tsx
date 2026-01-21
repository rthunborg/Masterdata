"use client";

import { Button } from "@/components/ui/button";
import { Archive, ArchiveRestore, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkActionsBarProps {
  selectedCount: number;
  onArchive?: () => void;
  onRestore?: () => void;
  onClear: () => void;
  isArchivedView: boolean;
  isProcessing?: boolean;
  /** Only HR Admin users can archive/restore employees */
  isHRAdmin?: boolean;
}

export function BulkActionsBar({
  selectedCount,
  onArchive,
  onRestore,
  onClear,
  isArchivedView,
  isProcessing = false,
  isHRAdmin = false,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  // Determine if we should show archive/restore actions (HR Admin only)
  const showArchiveActions = isHRAdmin;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-background border rounded-lg shadow-lg p-4 px-6 min-w-[300px]",
        "animate-in slide-in-from-bottom-10 fade-in duration-300"
      )}
    >
      <div className={cn(
        "flex items-center gap-4",
        showArchiveActions && "border-r pr-4"
      )}>
        <span className="font-medium text-sm">
          {selectedCount} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Clear selection</span>
        </Button>
      </div>

      {/* Archive/Restore buttons - only visible to HR Admin users */}
      {showArchiveActions && (
        <div className="flex items-center gap-2">
          {isArchivedView ? (
            <Button
              onClick={onRestore}
              disabled={isProcessing}
              size="sm"
              className="gap-2"
            >
              <ArchiveRestore className="h-4 w-4" />
              Restore Selected
            </Button>
          ) : (
            <Button
              onClick={onArchive}
              disabled={isProcessing}
              size="sm"
              variant="destructive"
              className="gap-2"
            >
              <Archive className="h-4 w-4" />
              Archive Selected
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
