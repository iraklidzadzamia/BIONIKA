"use client";
import { Provider } from "react-redux";
import { makeStore } from "@/core/store/store";
import { useEffect, useState } from "react";
import {
  setInitialized,
  updateTokens,
  clearSession,
  setSession,
  setSelectedLocation,
} from "@/core/store/slices/authSlice";
import { apiConfig } from "@/config";

const store = makeStore();

export default function StoreProvider({ children }) {
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Separate useEffect for auth initialization to avoid hydration issues
  useEffect(() => {
    if (!mounted) return; // Only run after component is mounted

    // Initialize authentication state from localStorage
    const initializeAuth = () => {
      try {
        const savedUser = localStorage.getItem("pb_user");
        const savedToken = localStorage.getItem("pb_accessToken");
        const savedExpiry = localStorage.getItem("pb_tokenExpiry");

        if (savedUser && savedToken && savedExpiry) {
          const user = JSON.parse(savedUser);

          // Check if token is expired
          const expiryTime = new Date(savedExpiry).getTime();
          const currentTime = Date.now();
          const fiveMinutes = 5 * 60 * 1000;
          const isExpired = currentTime >= expiryTime - fiveMinutes;

          if (!isExpired) {
            store.dispatch(
              setSession({
                user,
                accessToken: savedToken,
                tokenExpiry: savedExpiry,
              })
            );
            // Restore selected location if any
            try {
              const savedLoc = localStorage.getItem("pb_selected_location");
              if (savedLoc) store.dispatch(setSelectedLocation(savedLoc));
            } catch {}
          } else {
            // Token expired, clear storage
            localStorage.removeItem("pb_user");
            localStorage.removeItem("pb_accessToken");
            localStorage.removeItem("pb_tokenExpiry");
          }
        }
      } catch (error) {
        // Clear corrupted storage
        try {
          localStorage.removeItem("pb_user");
          localStorage.removeItem("pb_accessToken");
          localStorage.removeItem("pb_tokenExpiry");
        } catch {}
      }
    };

    // Initialize auth after a small delay to ensure proper mounting
    const initTimeout = setTimeout(() => {
      try {
        initializeAuth();
        // Mark auth as initialized after component mounts
        store.dispatch(setInitialized());
      } catch (error) {
        setError(error);
      }
    }, 100);

    return () => clearTimeout(initTimeout);
  }, [mounted]);

  // Set up periodic token refresh check
  useEffect(() => {
    if (!mounted) return;

    const tokenRefreshInterval = setInterval(() => {
      try {
        const state = store.getState();
        const { accessToken, tokenExpiry } = state.auth;

        if (accessToken && tokenExpiry) {
          try {
            const expiryTime = new Date(tokenExpiry).getTime();
            const currentTime = Date.now();
            const tenMinutes = 10 * 60 * 1000; // Refresh 10 minutes before expiry

            if (currentTime >= expiryTime - tenMinutes) {
              // Token will expire soon, attempt to refresh
              fetch(`${apiConfig.absoluteBase}/auth/refresh`, {
                method: "POST",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
              })
                .then((response) => response.json())
                .then((data) => {
                  if (data.accessToken) {
                    // Update tokens in Redux state and localStorage
                    store.dispatch(
                      updateTokens({
                        accessToken: data.accessToken,
                        tokenExpiry: data.tokenExpiry || null,
                      })
                    );

                    localStorage.setItem("pb_accessToken", data.accessToken);
                    if (data.tokenExpiry) {
                      localStorage.setItem("pb_tokenExpiry", data.tokenExpiry);
                    }
                  }
                })
                .catch((error) => {
                  // If refresh fails, clear session
                  store.dispatch(clearSession());
                  localStorage.removeItem("pb_user");
                  localStorage.removeItem("pb_accessToken");
                  localStorage.removeItem("pb_tokenExpiry");
                });
            }
          } catch (error) {
            // Token expiry check failed
          }
        }
      } catch (error) {
        // Token refresh interval error
      }
    }, 60000); // Check every minute

    // Cleanup interval on unmount
    return () => {
      clearInterval(tokenRefreshInterval);
    };
  }, [mounted]);

  // Listen for storage changes across tabs
  useEffect(() => {
    if (!mounted) return;

    const handleStorageChange = (event) => {
      try {
        if (
          event.key === "pb_accessToken" ||
          event.key === "pb_user" ||
          event.key === "pb_tokenExpiry"
        ) {
          // Re-initialize auth state when storage changes
          const savedUser = localStorage.getItem("pb_user");
          const savedToken = localStorage.getItem("pb_accessToken");
          const savedExpiry = localStorage.getItem("pb_tokenExpiry");

          if (savedUser && savedToken && savedExpiry) {
            try {
              const user = JSON.parse(savedUser);
              const expiryTime = new Date(savedExpiry).getTime();
              const currentTime = Date.now();
              const fiveMinutes = 5 * 60 * 1000;
              const isExpired = currentTime >= expiryTime - fiveMinutes;

              if (!isExpired) {
                store.dispatch(
                  setSession({
                    user,
                    accessToken: savedToken,
                    tokenExpiry: savedExpiry,
                  })
                );
              } else {
                // Token expired, clear session
                store.dispatch(clearSession());
              }
            } catch (error) {
              store.dispatch(clearSession());
            }
          } else {
            // No auth data, clear session
            store.dispatch(clearSession());
          }
        }
      } catch (error) {
        // Storage change handler error
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [mounted]);

  // Listen for visibility changes to refresh auth state when tab becomes visible
  useEffect(() => {
    if (!mounted) return;

    const handleVisibilityChange = () => {
      try {
        if (!document.hidden) {
          // Tab became visible, check if we need to refresh auth state
          const state = store.getState();
          const { accessToken, tokenExpiry } = state.auth;

          if (accessToken && tokenExpiry) {
            try {
              const expiryTime = new Date(tokenExpiry).getTime();
              const currentTime = Date.now();
              const fiveMinutes = 5 * 60 * 1000;

              if (currentTime >= expiryTime - fiveMinutes) {
                // Token will expire soon, attempt to refresh
                fetch(`${apiConfig.absoluteBase}/auth/refresh`, {
                  method: "POST",
                  credentials: "include",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                  },
                })
                  .then((response) => response.json())
                  .then((data) => {
                    if (data.accessToken) {
                      store.dispatch(
                        updateTokens({
                          accessToken: data.accessToken,
                          tokenExpiry: data.tokenExpiry || null,
                        })
                      );

                      localStorage.setItem("pb_accessToken", data.accessToken);
                      if (data.tokenExpiry) {
                        localStorage.setItem(
                          "pb_tokenExpiry",
                          data.tokenExpiry
                        );
                      }
                    }
                  })
                  .catch((error) => {
                    // Token refresh failed
                  });
              }
            } catch (error) {
              // Token expiry check failed
            }
          }
        }
      } catch (error) {
        // Visibility change handler error
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [mounted]);

  // Error boundary
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-4">
            There was an error initializing the application.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Suppress hydration warnings by only rendering after mount
  if (!mounted) {
    return null;
  }

  return <Provider store={store}>{children}</Provider>;
}
