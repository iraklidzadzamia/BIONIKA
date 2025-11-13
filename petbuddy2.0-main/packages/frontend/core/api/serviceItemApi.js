import { baseApi } from "./baseApi.js";

export const serviceItemApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Get service items for a specific service category
    getServiceItems: build.query({
      query: ({ serviceId, page = 1, size = 20 }) =>
        `/catalog/services/${serviceId}/items?page=${page}&size=${size}`,
    }),

    // Create a new service item
    createServiceItem: build.mutation({
      query: ({ serviceId, serviceItemData }) => ({
        url: `/catalog/services/${serviceId}/items`,
        method: "POST",
        body: serviceItemData,
      }),
    }),

    // Update an existing service item
    updateServiceItem: build.mutation({
      query: ({ itemId, serviceItemData }) => ({
        url: `/catalog/service-items/${itemId}`,
        method: "PUT",
        body: serviceItemData,
      }),
    }),

    // Delete a service item
    deleteServiceItem: build.mutation({
      query: ({ itemId }) => ({
        url: `/catalog/service-items/${itemId}`,
        method: "DELETE",
      }),
    }),
  }),
});

export const {
  useGetServiceItemsQuery,
  useCreateServiceItemMutation,
  useUpdateServiceItemMutation,
  useDeleteServiceItemMutation,
} = serviceItemApi;
