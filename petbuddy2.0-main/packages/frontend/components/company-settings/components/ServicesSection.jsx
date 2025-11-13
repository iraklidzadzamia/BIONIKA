"use client";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { Button, Input, Select, Pagination } from "@/shared/components/ui";
import { SettingsSection } from "@/components/settings";
import { openModal } from "@/core/store/slices/uiSlice";
import { useServiceManagement } from "../hooks/useServiceManagement";
import ServiceCard from "./services/ServiceCard";
import { PlusIcon, ScissorsIcon, CogIcon } from "@heroicons/react/24/outline";

/**
 * ServicesSection Component
 * Manages service categories and service items (variants) with pricing and resource requirements
 */
export default function ServicesSection() {
  const dispatch = useDispatch();
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const {
    services,
    servicesLoading,
    servicesData,
    resourceTypesData,
    handleServiceSave,
    handleServiceItemSave,
    confirmServiceDelete,
    confirmServiceItemDelete,
  } = useServiceManagement({ currentPage: page, pageSize });

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("");

  const isLoading = servicesLoading;

  /**
   * Computes duration for a service item.
   * Prefer top-level durationMinutes; fallback to sum of requiredResources.
   */
  const computeVariantDuration = (variant) => {
    const topLevel = Number(variant?.durationMinutes);
    if (Number.isFinite(topLevel) && topLevel > 0) return topLevel;
    if (!Array.isArray(variant?.requiredResources)) return null;
    const sum = variant.requiredResources.reduce(
      (acc, rr) => acc + (Number(rr?.durationMinutes) || 0),
      0
    );
    return sum || null;
  };

  /**
   * Filter services based on search term and species
   */
  const filteredServices = (services || []).filter((service) => {
    const matchesSearch =
      !searchTerm ||
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.species.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSpecies = !speciesFilter || service.species === speciesFilter;

    return matchesSearch && matchesSpecies;
  });

  /**
   * Open modal to add service category
   */
  const handleAddService = () => {
    dispatch(
      openModal({
        id: "SERVICE_CATEGORY_FORM",
        props: { service: null, onSave: handleServiceSave },
        ui: {
          title: "Add New Service Category",
          showClose: true,
          size: "md",
          align: "top",
        },
      })
    );
  };

  /**
   * Open modal to edit service category
   */
  const handleEditService = (service) => {
    dispatch(
      openModal({
        id: "SERVICE_CATEGORY_FORM",
        props: { service, onSave: handleServiceSave },
        ui: {
          title: "Edit Service Category",
          showClose: true,
          size: "md",
          align: "top",
        },
      })
    );
  };

  /**
   * Open modal to add service item
   */
  const handleAddServiceItem = (service) => {
    dispatch(
      openModal({
        id: "SERVICE_ITEM_FORM",
        props: {
          serviceItem: null,
          service,
          onSave: handleServiceItemSave,
        },
        ui: {
          title: "Add Service Item",
          showClose: true,
          size: "md",
          align: "top",
        },
      })
    );
  };

  /**
   * Open modal to edit service item
   */
  const handleEditServiceItem = (service, variant) => {
    dispatch(
      openModal({
        id: "SERVICE_ITEM_FORM",
        props: {
          serviceItem: variant,
          service,
          onSave: handleServiceItemSave,
        },
        ui: {
          title: "Edit Service Item",
          showClose: true,
          size: "md",
          align: "top",
        },
      })
    );
  };

  /**
   * Delete service item with confirmation
   */
  const handleDeleteServiceItem = (service, variant) => {
    const itemLabel =
      variant.label ||
      `${variant.size} ${
        variant.coatType !== "all" ? variant.coatType : ""
      }`.trim();
    confirmServiceItemDelete(service._id, variant._id, itemLabel);
  };

  return (
    <SettingsSection
      title="Service Categories"
      icon={ScissorsIcon}
      actions={
        <Button
          onClick={handleAddService}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Service Category
        </Button>
      }
    >
      {/* Search and Filters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              label="Search Service Categories"
              placeholder="Search by name or species..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          <div className="flex gap-2">
            <Select
              label="Species"
              value={speciesFilter}
              onChange={(e) => setSpeciesFilter(e.target.value)}
              options={[
                { value: "", label: "All Species" },
                { value: "dog", label: "Dog" },
                { value: "cat", label: "Cat" },
                { value: "other", label: "Other" },
              ]}
              className="min-w-[120px]"
            />
          </div>
        </div>
      </div>

      {/* Services List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div
              key={index}
              className="p-6 bg-white rounded-xl border border-gray-200 animate-pulse"
            >
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredServices.map((service) => (
            <ServiceCard
              key={service._id}
              service={service}
              resourceTypesData={resourceTypesData}
              onEdit={handleEditService}
              onDelete={(service) =>
                confirmServiceDelete(service._id, service.name)
              }
              onAddItem={handleAddServiceItem}
              onEditItem={handleEditServiceItem}
              onDeleteItem={handleDeleteServiceItem}
              computeDuration={computeVariantDuration}
            />
          ))}

          {filteredServices.length === 0 && (services || []).length > 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CogIcon className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No services match your filters
              </h3>
              <p className="text-gray-500 mb-4">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}

          {(services || []).length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CogIcon className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No service categories added yet
              </h3>
              <p className="text-gray-500 mb-4">
                Start by adding your first service category to offer to
                customers
              </p>
              <Button
                onClick={handleAddService}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Your First Service Category
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {servicesData?.pagination && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <Pagination
            currentPage={servicesData.pagination.page}
            totalPages={servicesData.pagination.totalPages}
            totalItems={servicesData.pagination.total}
            pageSize={servicesData.pagination.size}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </div>
      )}
    </SettingsSection>
  );
}
