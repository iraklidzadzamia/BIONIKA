import Link from "next/link";

export default function AuthFooter({
  prompt,
  actionHref,
  actionText,
  className = "",
}) {
  return (
    <div
      className={`text-center mt-6 sm:mt-8 animate-fade-in px-2 ${className}`}
      style={{ animationDelay: "0.2s" }}
    >
      {(prompt || actionHref) && (
        <p className="text-neutral-600 mb-4 text-sm sm:text-base">
          {prompt}{" "}
          {actionHref && actionText ? (
            <Link
              href={actionHref}
              className="text-primary-600 hover:text-primary-700 font-semibold transition-colors"
            >
              {actionText}
            </Link>
          ) : null}
        </p>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-neutral-500">
        <Link
          href="/privacy-policy"
          className="hover:text-neutral-700 transition-colors"
        >
          Privacy Policy
        </Link>
        <span className="hidden sm:inline">•</span>
        <Link
          href="/terms-of-use"
          className="hover:text-neutral-700 transition-colors"
        >
          Terms of Service
        </Link>
      </div>
    </div>
  );
}
