/**
 * Meta Integration API
 * Clean API definitions for Facebook and Instagram integration
 */
import { baseApi } from "./baseApi";

export const metaApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Get Meta integration status
    getMetaStatus: build.query({
      query: () => ({ url: "/meta" }),
      providesTags: ["MetaIntegration"],
    }),

    // Connect Facebook page
    connectFacebookPage: build.mutation({
      query: (body) => ({
        url: "/meta/facebook/connect",
        method: "POST",
        body,
      }),
      invalidatesTags: ["MetaIntegration", "Integrations"],
    }),

    // Disconnect Facebook
    disconnectFacebook: build.mutation({
      query: () => ({
        url: "/meta/facebook/disconnect",
        method: "POST",
      }),
      invalidatesTags: ["MetaIntegration", "Integrations"],
    }),

    // Disconnect Instagram
    disconnectInstagram: build.mutation({
      query: () => ({
        url: "/meta/instagram/disconnect",
        method: "POST",
      }),
      invalidatesTags: ["MetaIntegration", "Integrations"],
    }),
  }),
});

export const {
  useGetMetaStatusQuery,
  useConnectFacebookPageMutation,
  useDisconnectFacebookMutation,
  useDisconnectInstagramMutation,
} = metaApi;
