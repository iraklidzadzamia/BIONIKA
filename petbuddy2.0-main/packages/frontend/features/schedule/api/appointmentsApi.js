import { baseApi } from "./baseApi";

export const appointmentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAppointments: build.query({
      query: (params) => ({ url: "/appointments", params }),
      providesTags: (result) =>
        result?.items
          ? [
              ...result.items.map((a) => ({ type: "Appointments", id: a._id })),
              { type: "Appointments", id: "LIST" },
            ]
          : [{ type: "Appointments", id: "LIST" }],
    }),
    createAppointment: build.mutation({
      query: (body) => ({ url: "/appointments", method: "POST", body }),
      invalidatesTags: [{ type: "Appointments", id: "LIST" }],
    }),
    listCustomers: build.query({
      query: (q) => ({ url: "/catalog/customers", params: q ? { q } : {} }),
    }),
    searchCustomersByPhone: build.query({
      query: (phone) => ({
        url: "/catalog/customers/search/by-phone",
        params: { phone },
      }),
    }),
    createCustomer: build.mutation({
      query: (body) => ({ url: "/catalog/customers", method: "POST", body }),
    }),
    listPets: build.query({
      query: (params) => ({ url: "/catalog/pets", params }),
    }),
    createPet: build.mutation({
      query: (body) => ({ url: "/catalog/pets", method: "POST", body }),
    }),
    listServices: build.query({
      query: (q) => ({ url: "/catalog/services", params: q ? { q } : {} }),
      providesTags: (result) =>
        result?.items
          ? [
              ...result.items.map((s) => ({ type: "Services", id: s._id })),
              { type: "Services", id: "LIST" },
            ]
          : [{ type: "Services", id: "LIST" }],
    }),
    createService: build.mutation({
      query: (body) => ({ url: "/catalog/services", method: "POST", body }),
      invalidatesTags: [{ type: "Services", id: "LIST" }],
    }),
    updateService: build.mutation({
      query: ({ id, ...body }) => ({
        url: `/catalog/services/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (r, e, arg) => [
        { type: "Services", id: arg.id },
        { type: "Services", id: "LIST" },
      ],
    }),
    deleteService: build.mutation({
      query: ({ id }) => ({ url: `/catalog/services/${id}`, method: "DELETE" }),
      invalidatesTags: (r, e, arg) => [
        { type: "Services", id: arg.id },
        { type: "Services", id: "LIST" },
      ],
    }),
    listStaff: build.query({
      query: (params) => ({ url: "/catalog/staff", params }),
    }),
    createStaff: build.mutation({
      query: (body) => ({ url: "/catalog/staff", method: "POST", body }),
      invalidatesTags: [{ type: "Staff", id: "LIST" }],
    }),
    updateStaff: build.mutation({
      query: ({ id, ...body }) => ({
        url: `/catalog/staff/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (r, e, arg) => [
        { type: "Staff", id: arg.id },
        { type: "Staff", id: "LIST" },
      ],
    }),
    deleteStaff: build.mutation({
      query: ({ id }) => ({ url: `/catalog/staff/${id}`, method: "DELETE" }),
      invalidatesTags: (r, e, arg) => [
        { type: "Staff", id: arg.id },
        { type: "Staff", id: "LIST" },
      ],
    }),
    // Service variants
    getServiceVariants: build.query({
      query: (serviceId) => ({
        url: `/catalog/services/${serviceId}/variants`,
      }),
    }),
    // Service variant CRUD operations
    createServiceVariant: build.mutation({
      query: (body) => ({
        url: "/catalog/service-variants",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "ServiceVariants", id: "LIST" }],
    }),
    updateServiceVariant: build.mutation({
      query: ({ id, ...body }) => ({
        url: `/catalog/service-variants/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (r, e, arg) => [
        { type: "ServiceVariants", id: arg.id },
        { type: "ServiceVariants", id: "LIST" },
      ],
    }),
    deleteServiceVariant: build.mutation({
      query: ({ id }) => ({
        url: `/catalog/service-variants/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (r, e, arg) => [
        { type: "ServiceVariants", id: arg.id },
        { type: "ServiceVariants", id: "LIST" },
      ],
    }),
    // Resources CRUD operations
    listResources: build.query({
      query: (params) => ({ url: "/catalog/resources", params }),
      providesTags: (result) =>
        result?.items
          ? [
              ...result.items.map((r) => ({ type: "Resources", id: r._id })),
              { type: "Resources", id: "LIST" },
            ]
          : [{ type: "Resources", id: "LIST" }],
    }),
    getResource: build.query({
      query: (id) => ({ url: `/catalog/resources/${id}` }),
      providesTags: (result, error, id) => [{ type: "Resources", id }],
    }),
    createResource: build.mutation({
      query: (body) => ({ url: "/catalog/resources", method: "POST", body }),
      invalidatesTags: [{ type: "Resources", id: "LIST" }],
    }),
    updateResource: build.mutation({
      query: ({ id, ...body }) => ({
        url: `/catalog/resources/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (r, e, arg) => [
        { type: "Resources", id: arg.id },
        { type: "Resources", id: "LIST" },
      ],
    }),
    deleteResource: build.mutation({
      query: ({ id }) => ({
        url: `/catalog/resources/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (r, e, arg) => [
        { type: "Resources", id: arg.id },
        { type: "Resources", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetAppointmentsQuery,
  useCreateAppointmentMutation,
  useListCustomersQuery,
  useListPetsQuery,
  useListServicesQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  useListStaffQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
  useCreateCustomerMutation,
  useCreatePetMutation,
  useSearchCustomersByPhoneQuery,
  useGetServiceVariantsQuery,
  useCreateServiceVariantMutation,
  useUpdateServiceVariantMutation,
  useDeleteServiceVariantMutation,
  useListResourcesQuery,
  useGetResourceQuery,
  useCreateResourceMutation,
  useUpdateResourceMutation,
  useDeleteResourceMutation,
} = appointmentsApi;
