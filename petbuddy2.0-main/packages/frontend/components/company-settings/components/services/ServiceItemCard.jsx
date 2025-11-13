import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useSelector } from "react-redux";
import { getCurrencySymbol } from "@/shared/utils";

/**
 * ServiceItemCard - Displays a single service item/variant
 */
export default function ServiceItemCard({
  variant,
  serviceId,
  resourceTypesData,
  onEdit,
  onDelete,
  computeDuration,
}) {
  const resourceTypes = resourceTypesData?.items || [];
  const company = useSelector((state) => state.auth.company);
  const currencySymbol = getCurrencySymbol(company?.mainCurrency);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-indigo-200 transition-colors">
      {/* Header with size/coat type badges */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
              {variant.size}
            </span>
            {variant.coatType !== "all" && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                {variant.coatType}
              </span>
            )}
          </div>
          {variant.label && (
            <h5 className="font-medium text-gray-900 mb-1">{variant.label}</h5>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(variant)}
            className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
            title="Edit Service Item"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(variant)}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete Service Item"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Duration only (resources hidden temporarily) */}
      <div className="space-y-2">
        {/* Duration */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Duration</span>
          <span className="font-medium text-gray-900">
            {(() => {
              const d = Number(variant?.durationMinutes);
              if (Number.isFinite(d) && d > 0) return `${d} min`;
              const s = computeDuration(variant);
              return s ? `${s} min` : "—";
            })()}
          </span>
        </div>
      </div>

      {/* Price */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-sm text-gray-600">Price</span>
        <span className="text-base font-semibold text-green-600">
          {currencySymbol}{variant.price}
        </span>
      </div>
    </div>
  );
}
