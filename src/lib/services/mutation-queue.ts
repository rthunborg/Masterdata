/**
 * Mutation Queue Service
 * 
 * Manages queue of offline mutations (create, update, delete) for sync when online
 * 
 * Story 12.3: Offline Support with Local Caching
 */

import type { Employee, EmployeeFormData } from "@/lib/types/employee";

const DB_NAME = "hr-masterdata-cache";
const DB_VERSION = 1;
const MUTATION_QUEUE_STORE = "mutation-queue";

export type MutationType = "create" | "update" | "delete";

export interface QueuedMutation {
  id: string; // Unique ID for this mutation
  type: MutationType;
  timestamp: number;
  employeeId?: string; // For update/delete operations
  tempId?: string; // For create operations (temporary ID)
  data: EmployeeFormData | Partial<Employee>; // Data for create/update
  status: "pending" | "syncing" | "synced" | "failed";
  error?: string;
  retryCount: number;
}

class MutationQueueService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  /**
   * Initialize IndexedDB database (reuses same DB as cache)
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !window.indexedDB) {
        reject(new Error("IndexedDB is not supported"));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error}`));
        this.initPromise = null;
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initPromise = null;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create mutation queue object store
        if (!db.objectStoreNames.contains(MUTATION_QUEUE_STORE)) {
          const mutationStore = db.createObjectStore(MUTATION_QUEUE_STORE, {
            keyPath: "id",
          });
          mutationStore.createIndex("timestamp", "timestamp", { unique: false });
          mutationStore.createIndex("status", "status", { unique: false });
          mutationStore.createIndex("employeeId", "employeeId", { unique: false });
          mutationStore.createIndex("tempId", "tempId", { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Get database instance (initializes if needed)
   */
  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB();
    }
    if (!this.db) {
      throw new Error("Failed to initialize database");
    }
    return this.db;
  }

  /**
   * Generate unique mutation ID
   */
  private generateMutationId(): string {
    return `mutation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate temporary ID for new employees
   */
  generateTempId(): string {
    return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add mutation to queue
   */
  async queueMutation(
    type: MutationType,
    data: EmployeeFormData | Partial<Employee>,
    employeeId?: string,
    tempId?: string
  ): Promise<string> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([MUTATION_QUEUE_STORE], "readwrite");
      const store = transaction.objectStore(MUTATION_QUEUE_STORE);

      const mutation: QueuedMutation = {
        id: this.generateMutationId(),
        type,
        timestamp: Date.now(),
        employeeId,
        tempId,
        data,
        status: "pending",
        retryCount: 0,
      };

      const putRequest = store.put(mutation);
      await new Promise<void>((resolve, reject) => {
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      });

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });

      return mutation.id;
    } catch (error) {
      console.error("Failed to queue mutation:", error);
      throw error;
    }
  }

  /**
   * Get all pending mutations (ordered by timestamp)
   */
  async getPendingMutations(): Promise<QueuedMutation[]> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([MUTATION_QUEUE_STORE], "readonly");
      const store = transaction.objectStore(MUTATION_QUEUE_STORE);
      const index = store.index("status");

      const mutations: QueuedMutation[] = await new Promise((resolve, reject) => {
        const request = index.getAll("pending");
        request.onsuccess = () => {
          const results = request.result as QueuedMutation[];
          // Sort by timestamp (oldest first)
          results.sort((a, b) => a.timestamp - b.timestamp);
          resolve(results);
        };
        request.onerror = () => reject(request.error);
      });

      return mutations;
    } catch (error) {
      console.error("Failed to get pending mutations:", error);
      return [];
    }
  }

  /**
   * Get mutations for a specific employee
   */
  async getMutationsForEmployee(employeeId: string): Promise<QueuedMutation[]> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([MUTATION_QUEUE_STORE], "readonly");
      const store = transaction.objectStore(MUTATION_QUEUE_STORE);
      const index = store.index("employeeId");

      const mutations: QueuedMutation[] = await new Promise((resolve, reject) => {
        const request = index.getAll(employeeId);
        request.onsuccess = () => {
          const results = request.result as QueuedMutation[];
          // Filter to only pending mutations
          const pending = results.filter((m) => m.status === "pending");
          resolve(pending);
        };
        request.onerror = () => reject(request.error);
      });

      return mutations;
    } catch (error) {
      console.error("Failed to get mutations for employee:", error);
      return [];
    }
  }

  /**
   * Get mutations by temporary ID (for new employees)
   */
  async getMutationsByTempId(tempId: string): Promise<QueuedMutation[]> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([MUTATION_QUEUE_STORE], "readonly");
      const store = transaction.objectStore(MUTATION_QUEUE_STORE);
      const index = store.index("tempId");

      const mutations: QueuedMutation[] = await new Promise((resolve, reject) => {
        const request = index.getAll(tempId);
        request.onsuccess = () => {
          const results = request.result as QueuedMutation[];
          resolve(results);
        };
        request.onerror = () => reject(request.error);
      });

      return mutations;
    } catch (error) {
      console.error("Failed to get mutations by temp ID:", error);
      return [];
    }
  }

  /**
   * Update mutation status
   */
  async updateMutationStatus(
    mutationId: string,
    status: QueuedMutation["status"],
    error?: string
  ): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([MUTATION_QUEUE_STORE], "readwrite");
      const store = transaction.objectStore(MUTATION_QUEUE_STORE);

      const mutation = await new Promise<QueuedMutation | undefined>((resolve, reject) => {
        const request = store.get(mutationId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!mutation) {
        throw new Error(`Mutation ${mutationId} not found`);
      }

      mutation.status = status;
      if (error) {
        mutation.error = error;
      }
      if (status === "syncing") {
        mutation.retryCount += 1;
      }

      const putRequest = store.put(mutation);
      await new Promise<void>((resolve, reject) => {
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      });

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error("Failed to update mutation status:", error);
      throw error;
    }
  }

  /**
   * Remove mutation from queue (after successful sync)
   */
  async removeMutation(mutationId: string): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([MUTATION_QUEUE_STORE], "readwrite");
      const store = transaction.objectStore(MUTATION_QUEUE_STORE);

      const deleteRequest = store.delete(mutationId);
      await new Promise<void>((resolve, reject) => {
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      });

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error("Failed to remove mutation:", error);
      throw error;
    }
  }

  /**
   * Get count of pending mutations
   */
  async getPendingCount(): Promise<number> {
    const mutations = await this.getPendingMutations();
    return mutations.length;
  }
}

export const mutationQueueService = new MutationQueueService();

