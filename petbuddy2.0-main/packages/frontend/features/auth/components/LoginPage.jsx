"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/shared/hooks/useAuth";
import { Card, Button, EmailInput, PasswordInput, Logo, Select } from "@/ui";
import { AuthBackground } from "@/features/auth/components";
import AuthHeader from "@/features/auth/components/AuthHeader";
import AuthFooter from "@/features/auth/components/AuthFooter";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, login, isLoggingIn, error, clearError } =
    useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [companies, setCompanies] = useState([]);
  const [needsCompany, setNeedsCompany] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [localError, setLocalError] = useState(null);

  // If user becomes authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const next = searchParams?.get?.("next");
      const safeNext = next && next.startsWith("/") ? next : "/dashboard";
      router.replace(safeNext);
    }
  }, [isAuthenticated, router, searchParams]);

  // Clear any previous errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  const onSubmit = async (e) => {
    e.preventDefault();

    try {
      const body = {
        email: form.email,
        password: form.password,
        ...(needsCompany && selectedCompanyId
          ? { companyId: selectedCompanyId }
          : {}),
      };
      await login(body);
      // Login success will be handled by the API's onQueryStarted
      // and the useEffect above will redirect
    } catch (err) {
      // Handle multi-company selection flow (409)
      const code = err?.data?.error?.code;
      const companiesFromServer = err?.data?.error?.companies;
      if (
        code === "MULTIPLE_COMPANIES" &&
        Array.isArray(companiesFromServer) &&
        companiesFromServer.length
      ) {
        setCompanies(companiesFromServer);
        setNeedsCompany(true);
        setLocalError(
          "Multiple companies found for this email. Please select a company."
        );
        return;
      }
      // Otherwise, the error is already handled by the API and stored in Redux state
    }
  };

  return (
    <AuthBackground>
      <div className="w-full max-w-sm sm:max-w-md animate-fade-in px-4 sm:px-0">
        {/* Header */}
        <AuthHeader
          title="Welcome back"
          subtitle="Sign in to your PetBuddy account"
        />

        {/* Login Form */}
        <Card className="animate-slide-up">
          <form onSubmit={onSubmit} className="space-y-5 sm:space-y-6">
            <EmailInput
              label="Email address"
              placeholder="Enter your email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />

            <PasswordInput
              label="Password"
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />

            {(localError || error) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {localError || error}
              </div>
            )}

            {needsCompany && companies.length > 0 && (
              <Select
                label="Company"
                required
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                options={companies.map((c) => ({
                  value: c.companyId,
                  label: c.companyName,
                }))}
              />
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isLoggingIn || (needsCompany && !selectedCompanyId)}
              loading={isLoggingIn}
            >
              {isLoggingIn
                ? "Signing in..."
                : needsCompany
                ? "Continue"
                : "Sign in"}
            </Button>

            <div className="text-center">
              <a
                href="#"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                Forgot your password?
              </a>
            </div>
          </form>
        </Card>

        <AuthFooter
          prompt={"Don'" + "t have an account?"}
          actionHref="/register"
          actionText="Create one now"
        />
      </div>
    </AuthBackground>
  );
}
