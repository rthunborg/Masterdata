/**
 * Offline Sync Service
 * 
 * Handles synchronization of queued mutations when connectivity is restored
 * 
 * Story 12.3: Offline Support with Local Caching
 */

import { mutationQueueService, type QueuedMutation } from "./mutation-queue";
import { employeeService } from "./employee-service";
import { offlineCacheService } from "./offline-cache";
import type { Employee } from "@/lib/types/employee";

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: Array<{ mutationId: string; error: string }>;
  conflicts: Array<{ mutationId: string; employeeId: string }>;
}

export interface ConflictResolution {
  mutationId: string;
  action: "keep-local" | "keep-server" | "merge";
}

class OfflineSyncService {
  private isSyncing = false;
  private syncListeners: Array<(result: SyncResult) => void> = [];

  /**
   * Add listener for sync completion
   */
  onSyncComplete(listener: (result: SyncResult) => void): () => void {
    this.syncListeners.push(listener);
    return () => {
      const index = this.syncListeners.indexOf(listener);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of sync result
   */
  private notifyListeners(result: SyncResult): void {
    this.syncListeners.forEach((listener) => listener(result));
  }

  /**
   * Sync all pending mutations
   * @param conflictResolver Optional function to resolve conflicts
   */
  async syncPendingMutations(
    conflictResolver?: (conflict: { 
      mutationId: string; 
      employeeId: string;
      localData: Partial<Employee>;
      serverData: Employee;
    }) => Promise<ConflictResolution>
  ): Promise<SyncResult> {
    if (this.isSyncing) {
      throw new Error("Sync already in progress");
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      errors: [],
      conflicts: [],
    };

    try {
      const mutations = await mutationQueueService.getPendingMutations();

      for (const mutation of mutations) {
        try {
          // Mark as syncing
          await mutationQueueService.updateMutationStatus(mutation.id, "syncing");

          let syncSuccess = false;
          let newEmployee: Employee | undefined;

          switch (mutation.type) {
            case "create":
              const createResult = await this.syncCreate(mutation);
              syncSuccess = createResult.success;
              newEmployee = createResult.newEmployee;
              break;
            case "update":
              syncSuccess = await this.syncUpdate(mutation, conflictResolver);
              break;
            case "delete":
              syncSuccess = await this.syncDelete(mutation);
              break;
          }

          if (syncSuccess) {
            // If this was a create mutation with a new employee, trigger cache refresh
            if (newEmployee && mutation.tempId) {
              // Cache already updated in syncCreate, but refresh list to ensure consistency
              try {
                const employees = await employeeService.getAll();
                await offlineCacheService.cacheEmployeeList(employees);
              } catch (error) {
                console.error("Failed to refresh cache after create sync:", error);
              }
            }
            // Remove mutation after successful sync
            await mutationQueueService.removeMutation(mutation.id);
            result.syncedCount++;
          } else {
            // Check if this was a conflict that wasn't resolved
            if (mutation.type === "update" && mutation.employeeId) {
              // Try to detect if there was a conflict by checking if employee exists
              try {
                await employeeService.getById(mutation.employeeId);
                // Employee exists - might have been a conflict
                result.conflicts.push({
                  mutationId: mutation.id,
                  employeeId: mutation.employeeId,
                });
              } catch {
                // Employee doesn't exist - not a conflict, just a failure
              }
            }
            // Mark as failed
            await mutationQueueService.updateMutationStatus(
              mutation.id,
              "failed",
              "Sync failed"
            );
            result.failedCount++;
            result.errors.push({
              mutationId: mutation.id,
              error: "Sync failed",
            });
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          await mutationQueueService.updateMutationStatus(
            mutation.id,
            "failed",
            errorMessage
          );
          result.failedCount++;
          result.errors.push({
            mutationId: mutation.id,
            error: errorMessage,
          });
        }
      }

      // Refresh cache after sync
      if (result.syncedCount > 0) {
        try {
          const employees = await employeeService.getAll();
          await offlineCacheService.cacheEmployeeList(employees);
        } catch (error) {
          console.error("Failed to refresh cache after sync:", error);
        }
      }

      result.success = result.failedCount === 0;
    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      result.errors.push({
        mutationId: "sync-process",
        error: errorMessage,
      });
    } finally {
      this.isSyncing = false;
      this.notifyListeners(result);
    }

    return result;
  }

  /**
   * Sync create mutation
   * Returns the new employee with server-assigned ID for temp ID replacement
   */
  private async syncCreate(mutation: QueuedMutation): Promise<{ success: boolean; newEmployee?: Employee }> {
    try {
      const newEmployee = await employeeService.create(mutation.data as any);

      // If there was a temp ID, we need to update references in cache and queue
      if (mutation.tempId) {
        // Update cache: replace temp ID with server ID
        await this.replaceTempIdInCache(mutation.tempId, newEmployee.id);
        
        // Update any other mutations that reference this temp ID
        await this.updateMutationsWithTempId(mutation.tempId, newEmployee.id);
      }

      return { success: true, newEmployee };
    } catch (error) {
      console.error("Failed to sync create mutation:", error);
      return { success: false };
    }
  }

  /**
   * Replace temporary ID with server ID in cache
   */
  private async replaceTempIdInCache(tempId: string, serverId: string): Promise<void> {
    try {
      const cachedEmployees = await offlineCacheService.getCachedEmployeeList();
      if (!cachedEmployees) {
        return;
      }

      // Find employee with temp ID and replace it
      const updatedEmployees = cachedEmployees.map((emp) => {
        if (emp.id === tempId) {
          return { ...emp, id: serverId };
        }
        return emp;
      });

      // Update cache with new IDs
      await offlineCacheService.cacheEmployeeList(updatedEmployees);
    } catch (error) {
      console.error("Failed to replace temp ID in cache:", error);
      // Non-critical error - continue
    }
  }

  /**
   * Update mutations that reference a temp ID to use the server ID
   */
  private async updateMutationsWithTempId(tempId: string, serverId: string): Promise<void> {
    try {
      const mutations = await mutationQueueService.getMutationsByTempId(tempId);
      
      // Update each mutation to use the server ID
      for (const mutation of mutations) {
        if (mutation.employeeId === tempId || mutation.tempId === tempId) {
          // Update the mutation to use server ID
          mutation.employeeId = serverId;
          mutation.tempId = undefined;
          
          // Re-queue with updated ID (remove old, add new)
          await mutationQueueService.removeMutation(mutation.id);
          await mutationQueueService.queueMutation(
            mutation.type,
            mutation.data,
            mutation.employeeId,
            undefined // No temp ID anymore
          );
        }
      }
    } catch (error) {
      console.error("Failed to update mutations with temp ID:", error);
      // Non-critical error - continue
    }
  }

  /**
   * Sync update mutation with proper conflict detection
   */
  private async syncUpdate(
    mutation: QueuedMutation,
    conflictResolver?: (conflict: { 
      mutationId: string; 
      employeeId: string;
      localData: Partial<Employee>;
      serverData: Employee;
    }) => Promise<ConflictResolution>
  ): Promise<boolean> {
    if (!mutation.employeeId) {
      return false;
    }

    try {
      // First, fetch current server state to detect conflicts
      let serverEmployee: Employee;
      try {
        serverEmployee = await employeeService.getById(mutation.employeeId);
      } catch (fetchError) {
        // Employee not found (404) - might have been deleted
        if (fetchError instanceof Error && fetchError.message.includes("not found")) {
          if (conflictResolver) {
            // Employee was deleted - treat as conflict
            const resolution = await conflictResolver({
              mutationId: mutation.id,
              employeeId: mutation.employeeId,
              localData: mutation.data as Partial<Employee>,
              serverData: {} as Employee, // Empty since employee was deleted
            });

            if (resolution.action === "keep-local") {
              // Try to create the employee (it was deleted)
              try {
                await employeeService.create(mutation.data as any);
                return true;
              } catch (createError) {
                console.error("Failed to recreate deleted employee:", createError);
                return false;
              }
            } else {
              // Keep server (employee was deleted, so we drop the update)
              return true;
            }
          } else {
            // No resolver - use last-write-wins (drop the update since employee was deleted)
            return true;
          }
        }
        throw fetchError;
      }

      // Compare server state with mutation data to detect conflicts
      const localData = mutation.data as Partial<Employee>;
      const conflicts = this.detectConflicts(localData, serverEmployee);

      if (conflicts.length > 0) {
        // Conflicts detected
        if (conflictResolver) {
          // Use resolver to get user's choice
          const resolution = await conflictResolver({
            mutationId: mutation.id,
            employeeId: mutation.employeeId,
            localData,
            serverData: serverEmployee,
          });

          // Apply resolution
          if (resolution.action === "keep-server") {
            // Discard local changes
            return true; // Mutation is "successful" (we're keeping server, so no update needed)
          } else if (resolution.action === "keep-local") {
            // Apply local changes (overwrite server)
            await employeeService.update(mutation.employeeId, localData);
            return true;
          } else if (resolution.action === "merge") {
            // Merge: apply local changes on top of server state
            await employeeService.update(mutation.employeeId, localData);
            return true;
          }
        } else {
          // No resolver - use last-write-wins (apply local changes)
          await employeeService.update(mutation.employeeId, localData);
          return true;
        }
      }

      // No conflicts - apply update
      await employeeService.update(mutation.employeeId, localData);
      return true;
    } catch (error) {
      console.error("Failed to sync update mutation:", error);
      return false;
    }
  }

  /**
   * Detect conflicts between local and server data
   * Returns array of conflicting field names
   */
  private detectConflicts(
    localData: Partial<Employee>,
    serverData: Employee
  ): string[] {
    const conflicts: string[] = [];
    
    // Compare each field in localData with serverData
    for (const key in localData) {
      if (key === "id" || key === "created_at" || key === "updated_at") {
        // Skip metadata fields
        continue;
      }

      const localValue = localData[key as keyof Employee];
      const serverValue = serverData[key as keyof Employee];

      // Check if values differ (deep comparison for objects/arrays)
      if (JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
        conflicts.push(key);
      }
    }

    return conflicts;
  }

  /**
   * Sync delete mutation
   */
  private async syncDelete(mutation: QueuedMutation): Promise<boolean> {
    if (!mutation.employeeId) {
      return false;
    }

    try {
      await employeeService.archive(mutation.employeeId);
      return true;
    } catch (error) {
      console.error("Failed to sync delete mutation:", error);
      return false;
    }
  }

  /**
   * Check if sync is in progress
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Get pending mutation count
   */
  async getPendingCount(): Promise<number> {
    return mutationQueueService.getPendingCount();
  }
}

export const offlineSyncService = new OfflineSyncService();

