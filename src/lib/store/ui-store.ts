import { create } from "zustand";
import type { UserRole } from "@/lib/types/user";

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
  
  openModal: (modal: keyof UIStore["modals"]) => void;
  closeModal: (modal: keyof UIStore["modals"]) => void;
  openEditColumnModal: (columnId: string) => void;
  closeEditColumnModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
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
}));
