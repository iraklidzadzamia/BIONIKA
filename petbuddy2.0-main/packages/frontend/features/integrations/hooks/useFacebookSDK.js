/**
 * Facebook SDK Hook
 * Handles loading and initializing the Facebook SDK
 */
import { useState, useEffect, useCallback } from "react";
import { env } from "@/config";

export function useFacebookSDK() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load Facebook SDK script
  const loadSDK = useCallback(() => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (typeof window.FB !== "undefined") {
        resolve(window.FB);
        return;
      }

      // Check if script already exists
      if (document.getElementById("facebook-jssdk")) {
        // Script exists but FB not yet initialized, wait for it
        const checkFB = setInterval(() => {
          if (typeof window.FB !== "undefined") {
            clearInterval(checkFB);
            resolve(window.FB);
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkFB);
          reject(new Error("Facebook SDK timeout"));
        }, 10000);
        return;
      }

      // Load the script
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";

      script.onload = () => {
        // Wait for FB to be available
        const checkFB = setInterval(() => {
          if (typeof window.FB !== "undefined") {
            clearInterval(checkFB);
            resolve(window.FB);
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkFB);
          if (typeof window.FB !== "undefined") {
            resolve(window.FB);
          } else {
            reject(new Error("Facebook SDK loaded but FB object not available"));
          }
        }, 5000);
      };

      script.onerror = () => reject(new Error("Failed to load Facebook SDK"));

      document.head.appendChild(script);
    });
  }, []);

  // Initialize SDK on mount
  useEffect(() => {
    if (!env.facebookAppId) {
      setError(new Error("Facebook App ID not configured"));
      return;
    }

    setIsLoading(true);

    loadSDK()
      .then((FB) => {
        FB.init({
          appId: env.facebookAppId,
          cookie: true,
          xfbml: true,
          version: "v18.0",
        });
        setIsLoaded(true);
        setError(null);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [loadSDK]);

  // Login with Facebook
  const login = useCallback(
    (options = {}) => {
      return new Promise((resolve, reject) => {
        if (!isLoaded || typeof window.FB === "undefined") {
          reject(new Error("Facebook SDK not loaded"));
          return;
        }

        const defaultOptions = {
          scope: "pages_show_list,pages_read_engagement,pages_manage_metadata,pages_messaging,instagram_basic,instagram_manage_messages",
          auth_type: "rerequest",
        };

        window.FB.login(
          (response) => {
            if (response.status === "connected") {
              resolve(response.authResponse);
            } else if (response.status === "not_authorized") {
              reject(new Error("User denied permissions"));
            } else {
              reject(new Error("Facebook login failed"));
            }
          },
          { ...defaultOptions, ...options }
        );
      });
    },
    [isLoaded]
  );

  // Get user's Facebook pages
  const getPages = useCallback(
    (accessToken) => {
      return new Promise((resolve, reject) => {
        if (!isLoaded || typeof window.FB === "undefined") {
          reject(new Error("Facebook SDK not loaded"));
          return;
        }

        window.FB.api(
          "/me/accounts",
          {
            fields: "id,name,category,instagram_business_account,access_token",
            access_token: accessToken,
            limit: 200,
          },
          (response) => {
            if (response && !response.error) {
              resolve(response.data || []);
            } else {
              reject(
                new Error(
                  response?.error?.message || "Failed to fetch Facebook pages"
                )
              );
            }
          }
        );
      });
    },
    [isLoaded]
  );

  return {
    isLoaded,
    isLoading,
    error,
    login,
    getPages,
  };
}
