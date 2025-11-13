"use client";
import { useDispatch } from "react-redux";
import {
  useListLocationsQuery,
  useDeleteLocationMutation,
} from "@/core/api/locationsApi";
import { Card, Button } from "@/shared/components/ui";
import { openModal } from "@/core/store/slices/uiSlice";
import { SettingsSection } from "@/components/settings";
import { MapPinIcon } from "@heroicons/react/24/outline";

/**
 * Locations management section
 * Displays and manages company locations
 */
export default function LocationsSection() {
  const dispatch = useDispatch();

  const {
    data: locationsData,
    isLoading: locationsLoading,
    refetch: locationsRefetch,
  } = useListLocationsQuery();

  const [deleteLocation] = useDeleteLocationMutation();

  const locations = locationsData?.items || [];

  const handleAddLocation = () => {
    dispatch(
      openModal({
        id: "LOCATION_FORM",
        props: {
          onSaved: () => locationsRefetch && locationsRefetch(),
        },
        ui: {
          title: "Add Location",
          showClose: true,
          size: "md",
          align: "top",
        },
      })
    );
  };

  const handleEditLocation = (location) => {
    dispatch(
      openModal({
        id: "LOCATION_FORM",
        props: {
          initial: location,
          onSaved: () => locationsRefetch && locationsRefetch(),
        },
        ui: {
          title: "Edit Location",
          showClose: true,
          size: "md",
          align: "top",
        },
      })
    );
  };

  const handleDeleteLocation = async (locationId) => {
    try {
      await deleteLocation(locationId).unwrap();
      locationsRefetch && locationsRefetch();
    } catch (error) {
      // Error handled by RTK Query
    }
  };

  return (
    <SettingsSection
      title="Locations"
      description="Manage your business locations"
      icon={MapPinIcon}
      actions={
        <Button onClick={handleAddLocation}>
          Add Location
        </Button>
      }
    >
      {locationsLoading ? (
        <div className="text-center py-8 text-gray-500">Loading locations...</div>
      ) : locations.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No locations added yet</p>
          <Button onClick={handleAddLocation}>Add Your First Location</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map((location) => (
            <Card
              key={location._id}
              padding="sm"
              className="flex items-center justify-between hover:border-primary-200 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-gray-900">{location.label}</div>
                  {location.isMain && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Main
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 mt-1">{location.address}</div>
                {location.phone && (
                  <div className="text-sm text-gray-500 mt-0.5">{location.phone}</div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleEditLocation(location)}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteLocation(location._id)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </SettingsSection>
  );
}
