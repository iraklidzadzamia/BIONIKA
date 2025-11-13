import { useSelector, useDispatch } from "react-redux";
import { openModal } from "@/core/store/slices/uiSlice";
import {
  useGetCompanyServicesWithItemsQuery,
  useCreateCompanyServiceMutation,
  useUpdateCompanyServiceMutation,
  useDeleteCompanyServiceMutation,
} from "@/core/api/companyApi";
import {
  useCreateServiceItemMutation,
  useUpdateServiceItemMutation,
  useDeleteServiceItemMutation,
} from "@/core/api/serviceItemApi";
import { useGetCompanyResourceTypesQuery } from "@/core/api/companyApi";

/**
 * Hook for managing services and service items
 */
export function useServiceManagement({
  currentPage = 1,
  pageSize = 20,
  activeTab = "services",
} = {}) {
  const dispatch = useDispatch();
  const { user, company } = useSelector((state) => state.auth);

  const {
    data: servicesData,
    isLoading: servicesLoading,
    error: servicesError,
    refetch: refetchServices,
  } = useGetCompanyServicesWithItemsQuery(
    {
      companyId: user?.companyId || company?._id,
      page: currentPage,
      size: pageSize,
    },
    { skip: !(user?.companyId || company?._id) || activeTab !== "services" }
  );

  // Service mutations
  const [createService, { isLoading: isCreatingService }] =
    useCreateCompanyServiceMutation();
  const [updateService, { isLoading: isUpdatingService }] =
    useUpdateCompanyServiceMutation();
  const [deleteService, { isLoading: isDeletingService }] =
    useDeleteCompanyServiceMutation();

  // Service item mutations
  const [createServiceItem, { isLoading: isCreatingItem }] =
    useCreateServiceItemMutation();
  const [updateServiceItem, { isLoading: isUpdatingItem }] =
    useUpdateServiceItemMutation();
  const [deleteServiceItem, { isLoading: isDeletingItem }] =
    useDeleteServiceItemMutation();

  // Get resource types for service items
  const { data: resourceTypesData } = useGetCompanyResourceTypesQuery(
    { companyId: user?.companyId || company?._id, includeResources: true },
    { skip: !(user?.companyId || company?._id) }
  );

  const services = servicesData?.items || [];
  const companyId = user?.companyId || company?._id;

  // Service handlers
  const handleServiceSave = async (serviceData) => {
    try {
      if (!companyId) return;

      if (serviceData._id) {
        await updateService({
          companyId,
          serviceId: serviceData._id,
          serviceData,
        }).unwrap();
      } else {
        await createService({ companyId, serviceData }).unwrap();
      }
      refetchServices();
    } catch (error) {
      console.error("Failed to save service:", error);
    }
  };

  const handleServiceDelete = async (serviceId) => {
    try {
      if (!companyId) return;
      await deleteService({ companyId, serviceId }).unwrap();
      refetchServices();
    } catch (error) {
      console.error("Failed to delete service:", error);
    }
  };

  const confirmServiceDelete = (serviceId, serviceName) => {
    dispatch(
      openModal({
        id: "CONFIRM_DIALOG",
        props: {
          title: "Delete Service Category",
          message: `Are you sure you want to delete "${serviceName}"? This will also remove all associated service items and cannot be undone.`,
          confirmText: "Delete Service",
          cancelText: "Cancel",
          onConfirm: () => handleServiceDelete(serviceId),
        },
        ui: { size: "sm", showClose: true },
      })
    );
  };

  // Service item handlers
  const handleServiceItemSave = async (serviceItemData) => {
    try {
      if (!companyId) return;

      const toNumber = (v) =>
        v === "" || v === null || v === undefined ? undefined : Number(v);

      const cleaned = {
        ...serviceItemData,
        price: toNumber(serviceItemData.price),
        durationMinutes: toNumber(serviceItemData.durationMinutes),
        requiredResources: Array.isArray(serviceItemData.requiredResources)
          ? serviceItemData.requiredResources.map((r) => ({
              resourceTypeId: r.resourceTypeId,
              quantity: toNumber(r.quantity) || 1,
              durationMinutes: toNumber(r.durationMinutes),
            }))
          : undefined,
      };

      if (serviceItemData._id) {
        await updateServiceItem({
          itemId: serviceItemData._id,
          serviceItemData: cleaned,
        }).unwrap();
      } else {
        await createServiceItem({
          serviceId: serviceItemData.serviceId,
          serviceItemData: cleaned,
        }).unwrap();
      }
      refetchServices();
    } catch (error) {
      console.error("Failed to save service item:", error);
      throw error;
    }
  };

  const handleServiceItemDelete = async (serviceId, itemId) => {
    try {
      if (!companyId) return;
      await deleteServiceItem({ itemId }).unwrap();
      refetchServices();
    } catch (error) {
      console.error("Failed to delete service item:", error);
    }
  };

  const confirmServiceItemDelete = (serviceId, itemId, itemLabel) => {
    dispatch(
      openModal({
        id: "CONFIRM_DIALOG",
        props: {
          title: "Delete Service Item",
          message: `Are you sure you want to delete "${itemLabel}"? This action cannot be undone.`,
          confirmText: "Delete Item",
          cancelText: "Cancel",
          onConfirm: () => handleServiceItemDelete(serviceId, itemId),
        },
        ui: { size: "sm", showClose: true },
      })
    );
  };

  const handlePageChange = (newPage) => {
    // Page change handled by parent component via state
  };

  const handlePageSizeChange = (newSize) => {
    // Page size change handled by parent component via state
  };

  return {
    services,
    servicesData,
    servicesLoading,
    resourceTypesData,
    companyId,
    isLoading: servicesLoading,
    error: servicesError,
    refetch: refetchServices,
    // Service operations
    handleServiceSave,
    confirmServiceDelete,
    // Service item operations
    handleServiceItemSave,
    confirmServiceItemDelete,
    // Pagination
    handlePageChange,
    handlePageSizeChange,
  };
}
