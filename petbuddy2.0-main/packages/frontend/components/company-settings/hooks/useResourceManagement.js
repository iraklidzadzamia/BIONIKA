import { useSelector, useDispatch } from "react-redux";
import { openModal } from "@/core/store/slices/uiSlice";
import {
  useGetCompanyResourceTypesQuery,
  useCreateResourceTypeMutation,
  useUpdateResourceTypeMutation,
  useDeleteResourceTypeMutation,
} from "@/core/api/companyApi";
import {
  useListResourcesQuery,
  useCreateResourceMutation,
  useUpdateResourceMutation,
  useDeleteResourceMutation,
} from "@/core/api/appointmentsApi";

/**
 * Hook for managing resources and resource types
 */
export function useResourceManagement() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const companyId = user?.companyId;

  // Resource types
  const {
    data: resourceTypesData,
    isLoading: resourceTypesLoading,
    refetch: refetchResourceTypes,
  } = useGetCompanyResourceTypesQuery(
    { companyId, includeResources: true },
    { skip: !companyId }
  );

  // Resources
  const {
    data: resourcesData,
    isLoading: resourcesLoading,
    refetch: refetchResources,
  } = useListResourcesQuery({ companyId }, { skip: !companyId });

  // Resource type mutations
  const [createResourceType, { isLoading: isCreatingType }] = useCreateResourceTypeMutation();
  const [updateResourceType, { isLoading: isUpdatingType }] = useUpdateResourceTypeMutation();
  const [deleteResourceType, { isLoading: isDeletingType }] = useDeleteResourceTypeMutation();

  // Resource mutations
  const [createResource, { isLoading: isCreatingResource }] = useCreateResourceMutation();
  const [updateResource, { isLoading: isUpdatingResource }] = useUpdateResourceMutation();
  const [deleteResource, { isLoading: isDeletingResource }] = useDeleteResourceMutation();

  // Resource type handlers
  const handleResourceTypeSave = async (resourceTypeData) => {
    try {
      if (!companyId) return;

      if (resourceTypeData._id) {
        await updateResourceType({
          companyId,
          resourceTypeId: resourceTypeData._id,
          resourceTypeData,
        }).unwrap();
      } else {
        await createResourceType({
          companyId,
          resourceTypeData,
        }).unwrap();
      }
      refetchResourceTypes();
    } catch (error) {
      console.error("Failed to save resource type:", error);
    }
  };

  const handleResourceTypeDelete = async (resourceTypeId) => {
    try {
      if (!companyId) return;
      await deleteResourceType({ companyId, resourceTypeId }).unwrap();
      refetchResourceTypes();
    } catch (error) {
      console.error("Failed to delete resource type:", error);
    }
  };

  const confirmResourceTypeDelete = (resourceTypeId, resourceTypeName) => {
    dispatch(
      openModal({
        id: "CONFIRM_DIALOG",
        props: {
          title: "Delete Resource Type",
          message: `Are you sure you want to delete "${resourceTypeName}"? All resources of this type will also be deleted.`,
          confirmText: "Delete",
          cancelText: "Cancel",
          onConfirm: () => handleResourceTypeDelete(resourceTypeId),
        },
        ui: { size: "sm", showClose: true },
      })
    );
  };

  // Resource handlers
  const handleResourceSave = async (resourceData) => {
    try {
      if (!companyId) return;

      if (resourceData._id) {
        await updateResource({
          resourceId: resourceData._id,
          resourceData,
        }).unwrap();
      } else {
        await createResource({ companyId, resourceData }).unwrap();
      }
      refetchResources();
    } catch (error) {
      console.error("Failed to save resource:", error);
    }
  };

  const handleResourceDelete = async (resourceId) => {
    try {
      if (!companyId) return;
      await deleteResource({ resourceId }).unwrap();
      refetchResources();
    } catch (error) {
      console.error("Failed to delete resource:", error);
    }
  };

  const confirmResourceDelete = (resourceId, resourceLabel) => {
    dispatch(
      openModal({
        id: "CONFIRM_DIALOG",
        props: {
          title: "Delete Resource",
          message: `Are you sure you want to delete "${resourceLabel}"?`,
          confirmText: "Delete",
          cancelText: "Cancel",
          onConfirm: () => handleResourceDelete(resourceId),
        },
        ui: { size: "sm", showClose: true },
      })
    );
  };

  return {
    companyId,
    // Resource types
    resourceTypes: resourceTypesData?.items || [],
    resourceTypesData,
    resourceTypesLoading,
    handleResourceTypeSave,
    confirmResourceTypeDelete,
    // Resources
    resources: resourcesData?.items || [],
    resourcesData,
    resourcesLoading,
    handleResourceSave,
    confirmResourceDelete,
  };
}
