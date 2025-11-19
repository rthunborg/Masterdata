"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import type { Employee } from "@/lib/types/employee";

interface ConflictResolutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  localData: Partial<Employee>;
  serverData: Employee;
  onResolve: (action: "keep-local" | "keep-server" | "merge") => void;
}

/**
 * Conflict Resolution Dialog
 * 
 * Displays when a conflict is detected during sync (server data changed while offline)
 * 
 * Story 12.3: Offline Support with Local Caching (AC: 3)
 */
export function ConflictResolutionDialog({
  isOpen,
  onClose,
  employee,
  localData,
  serverData,
  onResolve,
}: ConflictResolutionDialogProps) {
  // Find fields that differ between local and server
  const conflictingFields = Object.keys(localData).filter((key) => {
    const localValue = localData[key as keyof Employee];
    const serverValue = serverData[key as keyof Employee];
    return localValue !== serverValue;
  });

  // Determine employee name for display
  const employeeName = employee 
    ? `${employee.first_name} ${employee.surname}`
    : localData.first_name && localData.surname
    ? `${localData.first_name} ${localData.surname}`
    : "Unknown Employee";

  // Check if employee was deleted (empty serverData)
  const isDeleted = !serverData || Object.keys(serverData).length === 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <AlertDialogTitle>Conflict Detected</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            {isDeleted ? (
              <>
                The employee <strong>{employeeName}</strong> was deleted on the server
                while you were offline. Please choose how to resolve the conflict.
              </>
            ) : (
              <>
                The employee <strong>{employeeName}</strong> was modified
                on the server while you were offline. Please choose how to resolve the conflict.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-4">
          {conflictingFields.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Conflicting fields:</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {conflictingFields.map((field) => (
                  <li key={field}>
                    <strong>{field}:</strong> Local: {String(localData[field as keyof Employee] ?? "N/A")} | 
                    Server: {String(serverData[field as keyof Employee] ?? "N/A")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-muted p-4 rounded-md space-y-2">
            <p className="text-sm font-medium">Resolution options:</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>
                <strong>Keep Local:</strong> Your offline changes will overwrite the server data
              </li>
              <li>
                <strong>Keep Server:</strong> Server data will be kept, your offline changes will be discarded
              </li>
              <li>
                <strong>Merge:</strong> Attempt to merge changes (currently uses last-write-wins)
              </li>
            </ul>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onResolve("keep-server");
              onClose();
            }}
            className="border border-input bg-background hover:bg-accent hover:text-accent-foreground"
          >
            Keep Server
          </AlertDialogAction>
          <AlertDialogAction
            onClick={() => {
              onResolve("merge");
              onClose();
            }}
            className="border border-input bg-background hover:bg-accent hover:text-accent-foreground"
          >
            Merge
          </AlertDialogAction>
          <AlertDialogAction
            onClick={() => {
              onResolve("keep-local");
              onClose();
            }}
          >
            Keep Local
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

