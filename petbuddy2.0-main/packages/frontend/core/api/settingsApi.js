import { baseApi } from "./baseApi";

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getIntegrations: build.query({
      query: () => ({ url: "/settings/integrations" }),
    }),
    upsertIntegrations: build.mutation({
      query: (body) => ({
        url: "/settings/integrations",
        method: "POST",
        body,
      }),
    }),
    getBot: build.query({
      query: () => ({ url: "/settings/ai-agent" }),
    }),
    updateBot: build.mutation({
      query: (body) => ({ url: "/settings/ai-agent", method: "POST", body }),
    }),
    getCompany: build.query({
      query: () => ({ url: "/settings/company" }),
    }),
    updateCompany: build.mutation({
      query: (body) => ({ url: "/settings/company", method: "POST", body }),
    }),
    // Meta integration endpoints
    getMetaIntegration: build.query({
      query: () => ({ url: "/settings/meta" }),
    }),
    connectMetaIntegration: build.mutation({
      query: (body) => ({
        url: "/settings/meta/connect",
        method: "POST",
        body,
      }),
    }),
    disconnectMetaIntegration: build.mutation({
      query: (body) => ({
        url: "/settings/meta/disconnect",
        method: "POST",
        body,
      }),
    }),
    // Connect a single Facebook Page (subscribes app and stores tokens)
    connectMetaPage: build.mutation({
      query: (body) => ({
        url: "/settings/meta/page/connect",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Integrations"],
    }),
    // Google Calendar integration endpoints
    getGoogleAuthUrl: build.query({
      query: () => ({ url: "/google/auth/url" }),
    }),
    listGoogleCalendars: build.query({
      query: () => ({ url: "/google/calendars" }),
    }),
    selectGoogleCalendar: build.mutation({
      query: (body) => ({
        url: "/google/calendar/select",
        method: "POST",
        body,
      }),
    }),
    disconnectGoogle: build.mutation({
      query: () => ({ url: "/google/disconnect", method: "POST" }),
    }),
    getGoogleSettings: build.query({
      query: () => ({ url: "/google/settings" }),
    }),
    updateGoogleAutoSync: build.mutation({
      query: (body) => ({
        url: "/google/settings/auto-sync",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useGetIntegrationsQuery,
  useUpsertIntegrationsMutation,
  useGetBotQuery,
  useUpdateBotMutation,
  useGetCompanyQuery,
  useUpdateCompanyMutation,
  useGetMetaIntegrationQuery,
  useConnectMetaIntegrationMutation,
  useDisconnectMetaIntegrationMutation,
  useConnectMetaPageMutation,
  useGetGoogleAuthUrlQuery,
  useLazyGetGoogleAuthUrlQuery,
  useListGoogleCalendarsQuery,
  useSelectGoogleCalendarMutation,
  useDisconnectGoogleMutation,
  useGetGoogleSettingsQuery,
  useUpdateGoogleAutoSyncMutation,
} = settingsApi;
