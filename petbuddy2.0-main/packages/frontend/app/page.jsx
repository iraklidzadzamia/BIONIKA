import {
  LandingNavigation,
  HeroSection,
  FeaturesSection,
  HowItWorksSection,
  CTASection,
  LandingFooter,
} from "@/features/landing";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-neutral-50 to-luxury-50">
      <LandingNavigation />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
