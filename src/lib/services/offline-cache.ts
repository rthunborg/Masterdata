/**
 * Offline Cache Service
 * 
 * Manages IndexedDB storage for employee data caching
 * 
 * Story 12.3: Offline Support with Local Caching
 */

import type { Employee } from "@/lib/types/employee";

const DB_NAME = "hr-masterdata-cache";
const DB_VERSION = 1;
const EMPLOYEE_STORE = "employees";
const CACHE_METADATA_STORE = "cache-metadata";

interface CacheMetadata {
  key: string;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class OfflineCacheService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  /**
   * Initialize IndexedDB database
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

        // Create employees object store
        if (!db.objectStoreNames.contains(EMPLOYEE_STORE)) {
          const employeeStore = db.createObjectStore(EMPLOYEE_STORE, {
            keyPath: "id",
          });
          employeeStore.createIndex("timestamp", "timestamp", { unique: false });
        }

        // Create cache metadata object store
        if (!db.objectStoreNames.contains(CACHE_METADATA_STORE)) {
          const metadataStore = db.createObjectStore(CACHE_METADATA_STORE, {
            keyPath: "key",
          });
          metadataStore.createIndex("timestamp", "timestamp", { unique: false });
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
   * Cache employee list
   * @param employees Employee array to cache
   * @param ttl Time to live in milliseconds (default: 24 hours)
   */
  async cacheEmployeeList(
    employees: Employee[],
    ttl: number = 24 * 60 * 60 * 1000
  ): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([EMPLOYEE_STORE, CACHE_METADATA_STORE], "readwrite");
      const employeeStore = transaction.objectStore(EMPLOYEE_STORE);
      const metadataStore = transaction.objectStore(CACHE_METADATA_STORE);

      const timestamp = Date.now();

      // Clear existing employees
      const clearRequest = employeeStore.clear();
      await new Promise<void>((resolve, reject) => {
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      });

      // Store employees with timestamp
      for (const employee of employees) {
        const putRequest = employeeStore.put({
          ...employee,
          timestamp,
        });
        await new Promise<void>((resolve, reject) => {
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        });
      }

      // Store metadata
      const metadataRequest = metadataStore.put({
        key: "employee-list",
        timestamp,
        ttl,
      });
      await new Promise<void>((resolve, reject) => {
        metadataRequest.onsuccess = () => resolve();
        metadataRequest.onerror = () => reject(metadataRequest.error);
      });

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error("Failed to cache employee list:", error);
      throw error;
    }
  }

  /**
   * Get cached employee list
   * @returns Cached employees or null if cache is expired or doesn't exist
   */
  async getCachedEmployeeList(): Promise<Employee[] | null> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([EMPLOYEE_STORE, CACHE_METADATA_STORE], "readonly");
      const employeeStore = transaction.objectStore(EMPLOYEE_STORE);
      const metadataStore = transaction.objectStore(CACHE_METADATA_STORE);

      // Check metadata
      const metadataRequest = metadataStore.get("employee-list");
      const metadata: CacheMetadata | undefined = await new Promise((resolve, reject) => {
        metadataRequest.onsuccess = () => resolve(metadataRequest.result);
        metadataRequest.onerror = () => reject(metadataRequest.error);
      });

      if (!metadata) {
        return null;
      }

      // Check if cache is expired
      const now = Date.now();
      if (now - metadata.timestamp > metadata.ttl) {
        return null;
      }

      // Get all employees
      const employees: Employee[] = await new Promise((resolve, reject) => {
        const request = employeeStore.getAll();
        request.onsuccess = () => {
          const results = request.result as Array<Employee & { timestamp: number }>;
          // Remove timestamp from employees
          const employeesWithoutTimestamp = results.map(({ timestamp, ...employee }) => employee);
          resolve(employeesWithoutTimestamp);
        };
        request.onerror = () => reject(request.error);
      });

      return employees;
    } catch (error) {
      console.error("Failed to get cached employee list:", error);
      return null;
    }
  }

  /**
   * Check if cache is expired
   * @returns true if cache is expired or doesn't exist
   */
  async isCacheExpired(): Promise<boolean> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([CACHE_METADATA_STORE], "readonly");
      const metadataStore = transaction.objectStore(CACHE_METADATA_STORE);

      const metadataRequest = metadataStore.get("employee-list");
      const metadata: CacheMetadata | undefined = await new Promise((resolve, reject) => {
        metadataRequest.onsuccess = () => resolve(metadataRequest.result);
        metadataRequest.onerror = () => reject(metadataRequest.error);
      });

      if (!metadata) {
        return true;
      }

      const now = Date.now();
      return now - metadata.timestamp > metadata.ttl;
    } catch (error) {
      console.error("Failed to check cache expiration:", error);
      return true;
    }
  }

  /**
   * Get cache age in milliseconds
   * @returns Cache age or null if cache doesn't exist
   */
  async getCacheAge(): Promise<number | null> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([CACHE_METADATA_STORE], "readonly");
      const metadataStore = transaction.objectStore(CACHE_METADATA_STORE);

      const metadataRequest = metadataStore.get("employee-list");
      const metadata: CacheMetadata | undefined = await new Promise((resolve, reject) => {
        metadataRequest.onsuccess = () => resolve(metadataRequest.result);
        metadataRequest.onerror = () => reject(metadataRequest.error);
      });

      if (!metadata) {
        return null;
      }

      return Date.now() - metadata.timestamp;
    } catch (error) {
      console.error("Failed to get cache age:", error);
      return null;
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([EMPLOYEE_STORE, CACHE_METADATA_STORE], "readwrite");
      const employeeStore = transaction.objectStore(EMPLOYEE_STORE);
      const metadataStore = transaction.objectStore(CACHE_METADATA_STORE);

      const clearEmployeeRequest = employeeStore.clear();
      await new Promise<void>((resolve, reject) => {
        clearEmployeeRequest.onsuccess = () => resolve();
        clearEmployeeRequest.onerror = () => reject(clearEmployeeRequest.error);
      });

      const clearMetadataRequest = metadataStore.clear();
      await new Promise<void>((resolve, reject) => {
        clearMetadataRequest.onsuccess = () => resolve();
        clearMetadataRequest.onerror = () => reject(clearMetadataRequest.error);
      });

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error("Failed to clear cache:", error);
      throw error;
    }
  }
}

export const offlineCacheService = new OfflineCacheService();

