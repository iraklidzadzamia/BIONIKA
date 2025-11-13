import Logo from "@/shared/components/ui/Logo";

export default function LandingNavigation() {
  return (
    <nav className="w-full py-6 px-4 border-b border-neutral-100 bg-white/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Logo size="lg" />
        <div className="flex items-center gap-4">
          <a
            href="/login"
            className="inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 focus:ring-neutral-200 px-4 py-2"
          >
            Sign In
          </a>
          <a
            href="/register"
            className="inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 bg-gradient-to-r from-luxury-500 to-luxury-600 text-white hover:from-luxury-600 hover:to-luxury-700 focus:ring-luxury-200 shadow-soft hover:shadow-luxury px-4 py-2"
          >
            Get Started
          </a>
        </div>
      </div>
    </nav>
  );
}
