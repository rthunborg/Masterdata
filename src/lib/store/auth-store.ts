import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authService } from "@/lib/services/auth-service";
import type { SessionUser } from "@/lib/types/user";

// Storage key for auth state - used for manual cleanup
const AUTH_STORAGE_KEY = "auth-storage";

// Timeout for auth check to prevent infinite loading (10 seconds)
const AUTH_CHECK_TIMEOUT_MS = 10000;

/**
 * Force clear auth storage from localStorage
 * Called when session is invalid to prevent stale state issues
 */
function clearAuthStorage(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      console.log("[Auth] Cleared stale auth storage");
    } catch (error) {
      console.error("[Auth] Failed to clear auth storage:", error);
    }
  }
}

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
  forceLogout: () => void;
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
        } catch (error) {
          // Log but don't throw - we want to clear state regardless
          console.error("[Auth] Logout API failed:", error);
        } finally {
          // ALWAYS clear local state and storage, even if API fails
          // This prevents users from being stuck in a logged-in state
          clearAuthStorage();
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
        }
      },

      /**
       * Force logout without calling the API
       * Used when session is known to be invalid
       */
      forceLogout: () => {
        clearAuthStorage();
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
      },

      setUser: (user: SessionUser | null) => {
        set({ 
          user, 
          isAuthenticated: !!user 
        });
      },

      checkAuth: async () => {
        set({ isLoading: true });
        
        // Create a timeout promise to prevent infinite loading
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => {
            console.warn("[Auth] Auth check timed out after", AUTH_CHECK_TIMEOUT_MS, "ms");
            resolve(null);
          }, AUTH_CHECK_TIMEOUT_MS);
        });

        try {
          // Race between auth check and timeout
          const user = await Promise.race([
            authService.getCurrentUser(),
            timeoutPromise,
          ]);
          
          if (user) {
            set({ 
              user, 
              isAuthenticated: true, 
              isLoading: false 
            });
          } else {
            // No valid session - clear any stale localStorage data
            // This prevents the "stuck logged in" issue when session expires
            clearAuthStorage();
            set({ 
              user: null, 
              isAuthenticated: false, 
              isLoading: false 
            });
          }
        } catch (error) {
          console.error("[Auth] Auth check failed:", error);
          // Clear stale storage on error to prevent stuck state
          clearAuthStorage();
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
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);