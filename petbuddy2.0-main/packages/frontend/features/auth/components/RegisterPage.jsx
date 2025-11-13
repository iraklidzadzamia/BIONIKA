"use client";
import { AuthBackground } from "@/features/auth/components";
import AuthHeader from "@/features/auth/components/AuthHeader";
import AuthFooter from "@/features/auth/components/AuthFooter";
import RegisterForm from "@/features/auth/components/RegisterForm";

export default function RegisterPage() {
  return (
    <AuthBackground>
      <div className="w-full max-w-sm sm:max-w-2xl lg:max-w-4xl animate-fade-in px-4 sm:px-0">
        <AuthHeader
          title="Create your PetBuddy account"
          subtitle="Set up your pet care business and start managing appointments, customers, and services with ease"
        />
        <RegisterForm />
        <AuthFooter
          prompt="Already have an account?"
          actionHref="/login"
          actionText="Sign in here"
        />
      </div>
    </AuthBackground>
  );
}
