import { Logo } from "@/ui";

export default function AuthHeader({ title, subtitle, className = "" }) {
  return (
    <div className={`text-center mb-6 sm:mb-8 ${className}`}>
      <Logo size="lg" className="mx-auto mb-4 sm:mb-6" />
      <h1 className="text-2xl sm:text-3xl font-bold text-neutral-800 mb-2">
        {title}
      </h1>
      {subtitle ? (
        <p className="text-neutral-600 text-base sm:text-lg px-2">{subtitle}</p>
      ) : null}
    </div>
  );
}
