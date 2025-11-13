import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  setSession,
  clearSession,
  updateTokens,
  setLoading,
  setError,
  clearError,
} from "@/core/store/slices/authSlice";
import {
  useLoginMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
} from "@/core/api/authApi";

export const useAuth = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { user, accessToken, tokenExpiry, isInitialized, isLoading, error } =
    useSelector((state) => state.auth);
  
  const [isMounted, setIsMounted] = useState(false);

  const [login, { isLoading: isLoggingIn }] = useLoginMutation();
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [refreshTokenMutation, { isLoading: isRefreshing }] =
    useRefreshTokenMutation();

  // Ensure component is mounted before doing anything
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check if user is authenticated
  const isAuthenticated = !!user && !!accessToken;

  // Check if token is expired or about to expire (within 5 minutes)
  const isTokenExpired = (tokenExpiryToCheck = null) => {
    const expiryToCheck = tokenExpiryToCheck || tokenExpiry;
    if (!expiryToCheck) return true;

    try {
      const expiryTime = new Date(expiryToCheck).getTime();
      const currentTime = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      return currentTime >= expiryTime - fiveMinutes;
    } catch (error) {
      // Token expiry parsing failed, consider expired
      return true;
    }
  };

  // Check if user has specific role
  const hasRole = (role) => user?.role === role;
  const isManager = hasRole("manager");
  const isGroomer = hasRole("groomer");
  const isReceptionist = hasRole("receptionist");

  // Login function
  const handleLogin = async (credentials) => {
    if (!isMounted) {
      return;
    }

    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      const result = await login(credentials).unwrap();

      // Security: Tokens stored only in memory (Redux state)
      // Refresh tokens handled via httpOnly cookies by the server

      return result;
    } catch (error) {
      const errorMessage = error?.data?.error?.message || "Login failed";
      dispatch(setError(errorMessage));
      throw error;
    }
  };

  // Logout function
  const handleLogout = async () => {
    if (!isMounted) return;

    try {
      dispatch(setLoading(true));
      await logout().unwrap();
    } catch (error) {
      // Continue with local logout even if API fails
    } finally {
      // Clear session from Redux state (memory)
      dispatch(clearSession());

      // Redirect to login
      router.push("/login");
    }
  };

  // Refresh token function
  const handleRefreshToken = async () => {
    if (!isMounted) return;

    try {
      dispatch(setLoading(true));
      const result = await refreshTokenMutation().unwrap();
      // Tokens updated in Redux state via baseApi updateTokens dispatch
      return result;
    } catch (error) {
      // If refresh fails, logout user
      await handleLogout();
      throw error;
    }
  };

  // Manual token refresh if needed
  const refreshTokenIfNeeded = async () => {
    if (!isMounted) return null;
    if (isTokenExpired()) {
      return await handleRefreshToken();
    }
    return null;
  };

  // Initialize auth state by attempting token refresh from httpOnly cookie
  const initializeAuth = async () => {
    if (!isMounted || typeof window === 'undefined') return;

    try {
      // Try to refresh using httpOnly cookie
      const result = await refreshTokenMutation().unwrap();

      if (result.accessToken && result.user) {
        dispatch(
          setSession({
            user: result.user,
            accessToken: result.accessToken,
            tokenExpiry: result.tokenExpiry,
            company: result.company,
          })
        );
      }
    } catch (error) {
      // No valid session, user needs to login
    }
  };

  return {
    // State
    user,
    accessToken,
    tokenExpiry,
    isInitialized,
    isLoading,
    error,
    isAuthenticated,
    isMounted,

    // Role checks
    hasRole,
    isManager,
    isGroomer,
    isReceptionist,

    // Actions
    login: handleLogin,
    logout: handleLogout,
    refreshToken: handleRefreshToken,
    refreshTokenIfNeeded,
    initializeAuth,
    clearError: () => dispatch(clearError()),

    // Loading states
    isLoggingIn,
    isLoggingOut,
    isRefreshing,

    // Utilities
    isTokenExpired,
  };
};
