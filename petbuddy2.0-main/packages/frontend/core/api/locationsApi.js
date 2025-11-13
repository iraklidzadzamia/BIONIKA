import { baseApi } from "./baseApi";

export const locationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listLocations: build.query({
      query: () => ({ url: "/locations" }),
      providesTags: (result) =>
        result?.items
          ? [
              ...result.items.map((l) => ({ type: "Locations", id: l._id })),
              { type: "Locations", id: "LIST" },
            ]
          : [{ type: "Locations", id: "LIST" }],
    }),
    getLocation: build.query({
      query: (id) => ({ url: `/locations/${id}` }),
      providesTags: (_r, _e, id) => [{ type: "Locations", id }],
    }),
    createLocation: build.mutation({
      query: (body) => ({ url: "/locations", method: "POST", body }),
      invalidatesTags: [{ type: "Locations", id: "LIST" }],
    }),
    updateLocation: build.mutation({
      query: ({ id, ...body }) => ({
        url: `/locations/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "Locations", id: arg.id },
        { type: "Locations", id: "LIST" },
      ],
    }),
    deleteLocation: build.mutation({
      query: (id) => ({ url: `/locations/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Locations", id: "LIST" }],
    }),
  }),
});

export const {
  useListLocationsQuery,
  useGetLocationQuery,
  useCreateLocationMutation,
  useUpdateLocationMutation,
  useDeleteLocationMutation,
} = locationsApi;
