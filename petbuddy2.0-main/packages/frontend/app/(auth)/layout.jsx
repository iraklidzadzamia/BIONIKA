"use client";
import { AuthGuard } from "@/features/auth/components";

export default function AuthLayout({ children }) {
  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-luxury-50 overflow-x-hidden">
        {children}
      </div>
    </AuthGuard>
  );
}
