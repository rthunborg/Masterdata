import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authService } from "@/lib/services/auth-service";
import type { SessionUser } from "@/lib/types/user";

interface AuthState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: SessionUser | null) => void;
  checkAuth: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const user = await authService.login(email, password);
          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false 
          });
          
          // NOTE: We no longer refresh user data after login because:
          // 1. The user object from login already has the updated last_active_at
          // 2. It also has previous_last_active_at which is needed for change detection
          // 3. Refreshing would lose previous_last_active_at and cause the baseline to change
          // 4. This prevents the banner/highlights from disappearing after login
        } catch (error) {
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authService.logout();
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
        } catch (error) {
          // Even if logout fails, clear local state
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
          throw error;
        }
      },

      setUser: (user: SessionUser | null) => {
        set({ 
          user, 
          isAuthenticated: !!user 
        });
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const user = await authService.getCurrentUser();
          set({ 
            user, 
            isAuthenticated: !!user, 
            isLoading: false 
          });
        } catch {
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);