/**
 * Enhanced Employee Service with Offline Support
 * 
 * Wraps employee service operations to queue mutations when offline
 * 
 * Story 12.3: Offline Support with Local Caching
 */

import { employeeService, type EmployeeFilters } from "./employee-service";
import { mutationQueueService } from "./mutation-queue";
import type { Employee, EmployeeFormData } from "@/lib/types/employee";

/**
 * Enhanced employee service that handles offline mutations
 * 
 * Note: This is a utility module - components should use hooks that wrap this
 */
export const employeeServiceOffline = {
  /**
   * Update employee - queues mutation if offline
   */
  async update(id: string, data: Partial<Employee>): Promise<Employee> {
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    if (!isOnline) {
      // Queue mutation for offline sync
      await mutationQueueService.queueMutation("update", data, id);
      // Return optimistic update
      return { id, ...data } as Employee;
    }

    // Online: perform normal update
    return employeeService.update(id, data);
  },

  /**
   * Create employee - queues mutation if offline
   */
  async create(data: EmployeeFormData): Promise<Employee> {
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    if (!isOnline) {
      // Generate temp ID and queue mutation
      const tempId = mutationQueueService.generateTempId();
      await mutationQueueService.queueMutation("create", data, undefined, tempId);
      // Return optimistic employee with temp ID
      return { ...data, id: tempId } as Employee;
    }

    // Online: perform normal create
    return employeeService.create(data);
  },

  /**
   * Archive employee - queues mutation if offline
   */
  async archive(id: string): Promise<void> {
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    if (!isOnline) {
      // Queue delete mutation (archive is treated as delete for sync)
      await mutationQueueService.queueMutation("delete", {}, id);
      return;
    }

    // Online: perform normal archive
    return employeeService.archive(id);
  },

  /**
   * Check if employee has pending mutations
   */
  async hasPendingMutations(employeeId: string): Promise<boolean> {
    const mutations = await mutationQueueService.getMutationsForEmployee(employeeId);
    return mutations.length > 0;
  },
};

