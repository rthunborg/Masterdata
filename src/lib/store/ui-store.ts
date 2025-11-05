import { create } from "zustand";
import type { UserRole } from "@/lib/types/user";
import type { ColumnConfig } from "@/lib/types/column-config";

/**
 * UI Store for managing application UI state
 * Includes modal state management and role preview mode
 */
interface UIStore {
  // Role preview mode (for HR Admin to preview external party views)
  previewRole: UserRole | null;
  setPreviewRole: (role: UserRole | null) => void;
  isPreviewMode: boolean;
  
  // Modal states
  modals: {
    addEmployee: boolean;
    importCSV: boolean;
    terminate: boolean;
    addColumn: boolean;
    addUser: boolean;
    editColumn: boolean;
  };
  
  // Edit column modal state
  editColumnId: string | null;
  
  // Column visibility preferences (for HR Admin)
  columnVisibility: Record<string, boolean>; // columnId -> visible boolean
  
  openModal: (modal: keyof UIStore["modals"]) => void;
  closeModal: (modal: keyof UIStore["modals"]) => void;
  openEditColumnModal: (columnId: string) => void;
  closeEditColumnModal: () => void;
  
  // Column visibility actions
  toggleColumnVisibility: (columnId: string) => void;
  resetColumnVisibility: () => void;
  initColumnVisibility: (userId: string) => void;
  getVisibleColumns: (allColumns: ColumnConfig[]) => ColumnConfig[];
}

export const useUIStore = create<UIStore>((set, get) => ({
  // Preview mode state
  previewRole: null,
  isPreviewMode: false,
  setPreviewRole: (role) => set({ previewRole: role, isPreviewMode: !!role }),
  
  // Modal states
  modals: {
    addEmployee: false,
    importCSV: false,
    terminate: false,
    addColumn: false,
    addUser: false,
    editColumn: false,
  },
  
  // Edit column modal state
  editColumnId: null,
  
  // Column visibility state
  columnVisibility: {},
  
  openModal: (modal) => 
    set((state) => ({ 
      modals: { ...state.modals, [modal]: true } 
    })),
  
  closeModal: (modal) => 
    set((state) => ({ 
      modals: { ...state.modals, [modal]: false } 
    })),
  
  openEditColumnModal: (columnId) =>
    set({
      modals: { 
        addEmployee: false,
        importCSV: false,
        terminate: false,
        addColumn: false,
        addUser: false,
        editColumn: true,
      },
      editColumnId: columnId,
    }),
  
  closeEditColumnModal: () =>
    set((state) => ({
      modals: { ...state.modals, editColumn: false },
      editColumnId: null,
    })),
  
  // Column visibility actions
  toggleColumnVisibility: (columnId) => {
    const { columnVisibility } = get();
    const currentValue = columnVisibility[columnId] ?? true; // default to visible
    const newValue = !currentValue; // Toggle: true -> false, false -> true
    
    const newVisibility = {
      ...columnVisibility,
      [columnId]: newValue,
    };
    
    // Debug logging (can be removed after verification)
    if (typeof window !== "undefined" && window.location.hostname === "localhost") {
      console.log("[Column Visibility] Toggling column:", {
        columnId,
        before: currentValue,
        after: newValue,
        allVisibility: newVisibility,
      });
    }
    
    set({ columnVisibility: newVisibility });
    
    // Persist to localStorage
    if (typeof window !== "undefined") {
      const userId = localStorage.getItem("currentUserId");
      if (userId) {
        const storageKey = `hr_masterdata_column_visibility_${userId}`;
        localStorage.setItem(storageKey, JSON.stringify(newVisibility));
        
        // Debug logging
        if (window.location.hostname === "localhost") {
          console.log("[Column Visibility] Saved to localStorage:", {
            key: storageKey,
            value: newVisibility,
          });
        }
      }
    }
  },
  
  resetColumnVisibility: () => {
    // Debug logging
    if (typeof window !== "undefined" && window.location.hostname === "localhost") {
      console.log("[Column Visibility] Resetting all column visibility preferences");
    }
    
    set({ columnVisibility: {} });
    
    // Clear from localStorage
    if (typeof window !== "undefined") {
      const userId = localStorage.getItem("currentUserId");
      if (userId) {
        const storageKey = `hr_masterdata_column_visibility_${userId}`;
        localStorage.removeItem(storageKey);
        
        // Debug logging
        if (window.location.hostname === "localhost") {
          console.log("[Column Visibility] Cleared localStorage:", storageKey);
        }
      }
    }
  },
  
  initColumnVisibility: (userId: string) => {
    if (typeof window === "undefined") return;
    
    // Store userId for persistence operations
    localStorage.setItem("currentUserId", userId);
    
    // Load from localStorage
    const storageKey = `hr_masterdata_column_visibility_${userId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        set({ columnVisibility: parsed });
        
        // Debug logging
        if (window.location.hostname === "localhost") {
          console.log("[Column Visibility] Loaded preferences from localStorage:", {
            key: storageKey,
            preferences: parsed,
          });
        }
      } catch (error) {
        console.error("Failed to parse column visibility preferences:", error);
        // Reset to empty on parse error
        set({ columnVisibility: {} });
      }
    } else {
      // No stored preferences, initialize with empty
      set({ columnVisibility: {} });
      
      // Debug logging
      if (window.location.hostname === "localhost") {
        console.log("[Column Visibility] No stored preferences found, initialized empty");
      }
    }
  },
  
  getVisibleColumns: (allColumns) => {
    const { columnVisibility } = get();
    return allColumns.filter((column) => {
      // Default to visible if not explicitly set to false
      return columnVisibility[column.id] !== false;
    });
  },
}));
