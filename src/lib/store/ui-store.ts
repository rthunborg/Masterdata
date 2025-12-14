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

  // Density preference
  density: 'default' | 'compact';
  setDensity: (density: 'default' | 'compact') => void;
  
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
  
  // Density state
  density: 'default',
  setDensity: (density) => {
    set({ density });
    // Persist to localStorage
    if (typeof window !== "undefined") {
      const userId = localStorage.getItem("currentUserId");
      if (userId) {
        const storageKey = `hr_masterdata_density_${userId}`;
        localStorage.setItem(storageKey, density);
      }
    }
  },

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

    set({ columnVisibility: newVisibility });
    
    // Persist to localStorage
    if (typeof window !== "undefined") {
      const userId = localStorage.getItem("currentUserId");
      if (userId) {
        const storageKey = `hr_masterdata_column_visibility_${userId}`;
        localStorage.setItem(storageKey, JSON.stringify(newVisibility));
      }
    }
  },
  
  resetColumnVisibility: () => {
    set({ columnVisibility: {} });
    
    // Clear from localStorage
    if (typeof window !== "undefined") {
      const userId = localStorage.getItem("currentUserId");
      if (userId) {
        const storageKey = `hr_masterdata_column_visibility_${userId}`;
        localStorage.removeItem(storageKey);
      }
    }
  },
  
  initColumnVisibility: (userId: string) => {
    if (typeof window === "undefined") return;
    
    // Store userId for persistence operations
    localStorage.setItem("currentUserId", userId);
    
    // Load column visibility from localStorage
    const visibilityKey = `hr_masterdata_column_visibility_${userId}`;
    const storedVisibility = localStorage.getItem(visibilityKey);
    
    // Load density from localStorage
    const densityKey = `hr_masterdata_density_${userId}`;
    const storedDensity = localStorage.getItem(densityKey);
    
    const updates: Partial<UIStore> = {};
    
    if (storedVisibility) {
      try {
        const parsed = JSON.parse(storedVisibility);
        updates.columnVisibility = parsed;
      } catch (error) {
        console.error("Failed to parse column visibility preferences:", error);
        updates.columnVisibility = {};
      }
    }

    if (storedDensity && (storedDensity === 'default' || storedDensity === 'compact')) {
      updates.density = storedDensity as 'default' | 'compact';
    }
    
    if (Object.keys(updates).length > 0) {
      set(updates as Partial<UIStore>);
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
