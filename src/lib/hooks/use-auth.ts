import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth-store";

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    setUser,
    checkAuth,
    setLoading,
  } = useAuthStore();

  // Check auth on mount
  useEffect(() => {
    if (!user && !isLoading) {
      checkAuth();
    }
  }, [user, isLoading, checkAuth]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    setUser,
    checkAuth,
    setLoading,
  };
};