import { PencilIcon, TrashIcon, PlusIcon, CogIcon } from "@heroicons/react/24/outline";
import ServiceItemCard from "./ServiceItemCard";
import { formatRoleName } from "@/shared/constants/roles";

/**
 * ServiceCard - Displays a service category with its items
 */
export default function ServiceCard({
  service,
  resourceTypesData,
  onEdit,
  onDelete,
  onAddItem,
  onEditItem,
  onDeleteItem,
  computeDuration,
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200">
      {/* Service Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {service.name}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {service.color && (
                <div
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: service.color }}
                  title="Service category color"
                />
              )}
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                {service.species}
              </span>
              {service.requiresBath && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  Bath Required
                </span>
              )}
            </div>
            {service.allowedRoles && service.allowedRoles.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-medium text-gray-500">Allowed Roles:</span>
                {service.allowedRoles.map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 capitalize"
                  >
                    {formatRoleName(role)}
                  </span>
                ))}
              </div>
            )}
            {service.description && (
              <p className="text-sm text-gray-600 mb-2">{service.description}</p>
            )}
            <p className="text-sm text-gray-500">
              Service Category • Add variants below for pricing and duration
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => onEdit(service)}
              className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Edit Service"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => onDelete(service)}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Service"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Service Items/Variants */}
      <div className="p-6 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium text-gray-900">
            Service Items (Variants)
          </h4>
          <button
            onClick={() => onAddItem(service)}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Service Item
          </button>
        </div>

        {service.serviceItems && service.serviceItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {service.serviceItems.map((variant, index) => (
              <ServiceItemCard
                key={variant._id || index}
                variant={variant}
                serviceId={service._id}
                resourceTypesData={resourceTypesData}
                onEdit={(item) => onEditItem(service, item)}
                onDelete={(item) => onDeleteItem(service, item)}
                computeDuration={computeDuration}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CogIcon className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-2">No service items added yet</p>
            <p className="text-sm text-gray-400">
              Add size-specific pricing, duration, and resource requirements
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
