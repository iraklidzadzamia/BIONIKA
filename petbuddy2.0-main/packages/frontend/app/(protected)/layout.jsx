"use client";
import { AuthGuard } from "@/features/auth/components";
import { Header } from "@/shared/components/navigation";

export default function ProtectedLayout({ children }) {
  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-7xl px-3 sm:px-4 py-4">{children}</main>
      </div>
    </AuthGuard>
  );
}
