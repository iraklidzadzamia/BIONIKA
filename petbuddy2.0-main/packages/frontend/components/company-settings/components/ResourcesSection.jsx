"use client";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Card, Select } from "@/shared/components/ui";
import { SettingsSection } from "@/components/settings";
import { openModal } from "@/core/store/slices/uiSlice";
import { setSelectedLocation } from "@/core/store/slices/authSlice";
import { useResourceManagement } from "../hooks/useResourceManagement";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  WrenchScrewdriverIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";

/**
 * ResourcesSection Component
 * Manages resource types (equipment categories) and individual resources
 */
export default function ResourcesSection() {
  const dispatch = useDispatch();
  const selectedLocationId = useSelector(
    (state) => state.auth.selectedLocationId
  );
  const locations = useSelector((state) => state.auth.locations || []);

  const {
    resourceTypes,
    resourceTypesLoading,
    resourceTypesData,
    resources,
    resourcesLoading,
    resourcesData,
    handleResourceTypeSave,
    handleResourceSave,
    confirmResourceTypeDelete,
    confirmResourceDelete,
  } = useResourceManagement();

  const [editingResourceType, setEditingResourceType] = useState(null);
  const [editingResource, setEditingResource] = useState(null);
  const [initialResourceTypeId, setInitialResourceTypeId] = useState("");

  return (
    <div className="space-y-8">
      {/* Resource Types Section */}
      <SettingsSection
        title="Resource Types"
        description="Categories for organizing equipment and spaces"
        icon={CubeIcon}
        actions={
          <Button
            onClick={() => {
              setEditingResourceType(null);
              dispatch(
                openModal({
                  id: "RESOURCE_TYPE_FORM",
                  props: {
                    resourceType: null,
                    onSave: handleResourceTypeSave,
                  },
                  ui: {
                    title: "Add Resource Type",
                    showClose: true,
                    size: "md",
                    align: "top",
                  },
                })
              );
            }}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Resource Type
          </Button>
        }
      >
        {resourceTypesLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 rounded-lg animate-pulse"
              >
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {resourceTypesData?.items?.map((resourceType) => (
              <div
                key={resourceType._id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: resourceType.color }}
                    >
                      <span className="text-white text-sm font-medium">
                        {resourceType.icon}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {resourceType.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {resourceType.description}
                      </p>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {resourceType.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingResourceType(resourceType);
                        dispatch(
                          openModal({
                            id: "RESOURCE_TYPE_FORM",
                            props: {
                              resourceType,
                              onSave: handleResourceTypeSave,
                            },
                            ui: {
                              title: "Edit Resource Type",
                              showClose: true,
                              size: "md",
                              align: "top",
                            },
                          })
                        );
                      }}
                      className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit Resource Type"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() =>
                        confirmResourceTypeDelete(
                          resourceType._id,
                          resourceType.name
                        )
                      }
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Resource Type"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {(!resourceTypesData?.items ||
              resourceTypesData.items.length === 0) && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CubeIcon className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-2">
                  No resource types added yet
                </p>
                <p className="text-sm text-gray-400">
                  Add resource types to organize your equipment and spaces
                </p>
              </div>
            )}
          </div>
        )}
      </SettingsSection>

      {/* Resources Section */}
      <SettingsSection
        title="Resources"
        description="Individual equipment and spaces at your locations"
        icon={WrenchScrewdriverIcon}
        actions={
          <Button
            onClick={() => {
              setInitialResourceTypeId("");
              dispatch(
                openModal({
                  id: "RESOURCE_FORM",
                  props: {
                    resource: null,
                    resourceTypes: resourceTypesData?.items || [],
                    initialResourceTypeId: "",
                    selectedLocationId,
                    onSave: handleResourceSave,
                  },
                  ui: {
                    title: "Add Resource",
                    showClose: true,
                    size: "md",
                    align: "top",
                  },
                })
              );
            }}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Resource
          </Button>
        }
      >
        <div className="mb-4">
          <Select
            label="Location"
            value={selectedLocationId}
            onChange={(e) => dispatch(setSelectedLocation(e.target.value))}
          >
            {locations.map((l) => (
              <option key={l._id} value={l._id}>
                {l.label}
              </option>
            ))}
          </Select>
        </div>

        {resourcesLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 rounded-lg animate-pulse"
              >
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {resourcesData?.items?.map((resource) => (
              <div
                key={resource._id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor:
                          resource.resourceType?.color || "#6B7280",
                      }}
                    >
                      <span className="text-white text-sm font-medium">
                        {resource.resourceType?.icon || "cube"}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {resource.label}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {resource.resourceType?.name} • Capacity:{" "}
                        {resource.capacity}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingResource(resource);
                        setInitialResourceTypeId(
                          resource.resourceTypeId ||
                            resource.resourceType?._id ||
                            ""
                        );
                        dispatch(
                          openModal({
                            id: "RESOURCE_FORM",
                            props: {
                              resource,
                              resourceTypes: resourceTypesData?.items || [],
                              initialResourceTypeId:
                                resource.resourceTypeId ||
                                resource.resourceType?._id ||
                                "",
                              selectedLocationId,
                              onSave: handleResourceSave,
                            },
                            ui: {
                              title: "Edit Resource",
                              showClose: true,
                              size: "md",
                              align: "top",
                            },
                          })
                        );
                      }}
                      className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit Resource"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() =>
                        confirmResourceDelete(resource._id, resource.label)
                      }
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Resource"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {(!resourcesData?.items || resourcesData.items.length === 0) && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <WrenchScrewdriverIcon className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-2">No resources added yet</p>
                <p className="text-sm text-gray-400">
                  Add individual resources like grooming tubs and tables
                </p>
              </div>
            )}
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
