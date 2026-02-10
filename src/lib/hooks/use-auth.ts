import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/store/auth-store";

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    forceLogout,
    setUser,
    checkAuth,
    setLoading,
  } = useAuthStore();

  // Track if we've already checked auth to prevent infinite loops
  const hasCheckedRef = useRef(false);

  // Check auth only once on mount
  useEffect(() => {
    if (!hasCheckedRef.current && !user && !isLoading) {
      hasCheckedRef.current = true;
      checkAuth();
    }
  }, [user, isLoading, checkAuth]);

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