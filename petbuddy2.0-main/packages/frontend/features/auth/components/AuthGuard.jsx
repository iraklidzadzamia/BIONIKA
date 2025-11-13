"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/shared/hooks/useAuth";
import { Loader } from "@/ui";

export default function AuthGuard({
  children,
  requireAuth = true,
  requireRole = null,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, hasRole, isInitialized, initializeAuth } =
    useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted before doing anything
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize auth state on mount if not already initialized
  useEffect(() => {
    if (!isMounted || isInitialized) return;

    // Small delay to ensure proper mounting
    const timeoutId = setTimeout(() => {
      initializeAuth();
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [isMounted, isInitialized, initializeAuth]);

  // Handle authentication checks
  useEffect(() => {
    if (!isMounted || !isInitialized) return; // Wait for auth to be initialized

    const checkAuth = async () => {
      setIsChecking(true);

      try {
        // If authentication is required but user is not authenticated
        if (requireAuth && !isAuthenticated) {
          // Don't redirect if already on login page to prevent loops
          if (pathname !== "/login") {
            const qs =
              typeof searchParams?.toString === "function"
                ? searchParams.toString()
                : "";
            const nextPath = qs ? `${pathname}?${qs}` : pathname;
            router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
          }
          return;
        }

        // If user is authenticated but shouldn't be (e.g., on login page)
        if (!requireAuth && isAuthenticated) {
          const next =
            typeof searchParams?.get === "function"
              ? searchParams.get("next")
              : null;
          if (next && next.startsWith("/")) {
            router.replace(next);
          } else {
            router.replace("/dashboard");
          }
          return;
        }

        // If specific role is required
        if (requireRole && !hasRole(requireRole)) {
          router.replace("/dashboard");
          return;
        }
      } finally {
        setIsChecking(false);
      }
    };

    // Add a small delay to ensure auth state is fully settled
    const timeoutId = setTimeout(checkAuth, 100);

    return () => clearTimeout(timeoutId);
  }, [
    isMounted,
    isInitialized,
    isAuthenticated,
    requireAuth,
    requireRole,
    hasRole,
    router,
    pathname,
    searchParams,
  ]);

  // Show loading while checking auth state or not mounted
  if (!isMounted || !isInitialized || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader type="spinner" size="lg" variant="primary" />
        </div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated, don't render children
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  // If user shouldn't be authenticated but is, don't render children
  if (!requireAuth && isAuthenticated) {
    return null;
  }

  // If specific role is required but user doesn't have it, don't render children
  if (requireRole && !hasRole(requireRole)) {
    return null;
  }

  return <>{children}</>;
}
