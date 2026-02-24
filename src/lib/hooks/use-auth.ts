import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/store/auth-store";

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    _hasHydrated,
    login,
    logout,
    forceLogout,
    setUser,
    checkAuth,
    setLoading,
  } = useAuthStore();

  const hasCheckedRef = useRef(false);

  // Wait for Zustand to hydrate from localStorage before deciding to call the API.
  // Without this, the first render sees user=null (pre-hydration) and fires an
  // unnecessary GET /api/auth/user even though the data is in localStorage.
  useEffect(() => {
    if (!_hasHydrated) return;
    if (!hasCheckedRef.current && !user && !isLoading) {
      hasCheckedRef.current = true;
      checkAuth();
    }
  }, [_hasHydrated, user, isLoading, checkAuth]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    forceLogout,
    setUser,
    checkAuth,
    setLoading,
  };
};