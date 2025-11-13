import { Card } from "@/ui";
import { SectionErrorBoundary } from "@/guards";

/**
 * Reusable settings section wrapper
 * Mobile-friendly responsive design with consistent styling
 */
export default function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
  actions,
  className = "",
}) {
  return (
    <SectionErrorBoundary sectionName={title}>
      <Card className={`mb-4 sm:mb-6 ${className}`}>
        {/* Section Header */}
        <div className="border-b border-gray-200 pb-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              {Icon && (
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
                  </div>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                  {title}
                </h2>
                {description && (
                  <p className="mt-1 text-xs sm:text-sm text-gray-600 line-clamp-2">
                    {description}
                  </p>
                )}
              </div>
            </div>
            {actions && (
              <div className="flex items-center gap-2 sm:flex-shrink-0">
                {actions}
              </div>
            )}
          </div>
        </div>

        {/* Section Content */}
        <div>{children}</div>
      </Card>
    </SectionErrorBoundary>
  );
}
