import { baseApi } from "./baseApi.js";
import { setCompany, updateCompany } from "@/core/store/slices/authSlice.js";

export const companyApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCompanyProfile: build.query({
      query: ({ companyId, page = 1, size = 20 }) =>
        `/company/${companyId}?page=${page}&size=${size}`,
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Store company data in Redux
          dispatch(setCompany(data.company));
        } catch (error) {
          // Failed to store company data
        }
      },
    }),

    updateCompanyProfile: build.mutation({
      query: ({ companyId, companyData }) => ({
        url: `/company/${companyId}`,
        method: "PUT",
        body: companyData,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Update company data in Redux
          dispatch(updateCompany(data.company));
        } catch (error) {
          // Failed to update company data
        }
      },
    }),

    getCompanyServices: build.query({
      query: (companyId) => `/company/${companyId}/services`,
    }),

    getCompanyServicesWithItems: build.query({
      query: ({ companyId, page = 1, size = 20 }) =>
        `/company/${companyId}/services-with-items?page=${page}&size=${size}`,
    }),

    getAllServiceItemsWithCategories: build.query({
      query: ({ companyId, page = 1, size = 20 }) =>
        `/company/${companyId}/service-items-with-categories?page=${page}&size=${size}`,
    }),

    createCompanyService: build.mutation({
      query: ({ companyId, serviceData }) => ({
        url: `/company/${companyId}/services`,
        method: "POST",
        body: serviceData,
      }),
    }),

    updateCompanyService: build.mutation({
      query: ({ companyId, serviceId, serviceData }) => ({
        url: `/company/${companyId}/services/${serviceId}`,
        method: "PUT",
        body: serviceData,
      }),
    }),

    deleteCompanyService: build.mutation({
      query: ({ companyId, serviceId }) => ({
        url: `/company/${companyId}/services/${serviceId}`,
        method: "DELETE",
      }),
    }),

    // Resource Type Management
    getCompanyResourceTypes: build.query({
      query: ({ companyId, category, includeResources = true }) => {
        const params = new URLSearchParams();
        if (category) params.append("category", category);
        if (includeResources) params.append("includeResources", "true");
        return `/company/${companyId}/resource-types?${params.toString()}`;
      },
    }),

    createResourceType: build.mutation({
      query: ({ companyId, resourceTypeData }) => ({
        url: `/company/${companyId}/resource-types`,
        method: "POST",
        body: resourceTypeData,
      }),
    }),

    updateResourceType: build.mutation({
      query: ({ companyId, resourceTypeId, resourceTypeData }) => ({
        url: `/company/${companyId}/resource-types/${resourceTypeId}`,
        method: "PUT",
        body: resourceTypeData,
      }),
    }),

    deleteResourceType: build.mutation({
      query: ({ companyId, resourceTypeId }) => ({
        url: `/company/${companyId}/resource-types/${resourceTypeId}`,
        method: "DELETE",
      }),
    }),

    // Resource Management
    getCompanyResources: build.query({
      query: ({ companyId, resourceTypeId }) => {
        const params = new URLSearchParams();
        if (resourceTypeId) params.append("resourceTypeId", resourceTypeId);
        return `/company/${companyId}/resources?${params.toString()}`;
      },
    }),

    createResource: build.mutation({
      query: ({ companyId, resourceData }) => ({
        url: `/company/${companyId}/resources`,
        method: "POST",
        body: resourceData,
      }),
    }),

    updateResource: build.mutation({
      query: ({ companyId, resourceId, resourceData }) => ({
        url: `/company/${companyId}/resources/${resourceId}`,
        method: "PUT",
        body: resourceData,
      }),
    }),

    deleteResource: build.mutation({
      query: ({ companyId, resourceId }) => ({
        url: `/company/${companyId}/resources/${resourceId}`,
        method: "DELETE",
      }),
    }),

    getWorkingHours: build.query({
      query: (companyId) => `/company/${companyId}/working-hours`,
    }),

    updateWorkingHours: build.mutation({
      query: ({ companyId, workHours }) => ({
        url: `/company/${companyId}/working-hours`,
        method: "PUT",
        body: { workHours },
      }),
    }),
  }),
});

export const {
  useGetCompanyProfileQuery,
  useUpdateCompanyProfileMutation,
  useGetCompanyServicesQuery,
  useGetCompanyServicesWithItemsQuery,
  useGetAllServiceItemsWithCategoriesQuery,
  useCreateCompanyServiceMutation,
  useUpdateCompanyServiceMutation,
  useDeleteCompanyServiceMutation,
  // Resource Type hooks
  useGetCompanyResourceTypesQuery,
  useCreateResourceTypeMutation,
  useUpdateResourceTypeMutation,
  useDeleteResourceTypeMutation,
  // Resource hooks
  useGetCompanyResourcesQuery,
  useCreateResourceMutation,
  useUpdateResourceMutation,
  useDeleteResourceMutation,
  useGetWorkingHoursQuery,
  useUpdateWorkingHoursMutation,
} = companyApi;
