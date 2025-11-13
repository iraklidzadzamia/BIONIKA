import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { updateTokens, clearSession } from "@/core/store/slices/authSlice";
import { apiConfig } from "@/config";

export const baseApi = createApi({
  reducerPath: "api",
  tagTypes: [
    "Appointments",
    "Customers",
    "Pets",
    "Services",
    "Staff",
    "StaffSchedule",
    "Messages",
    "Company",
    "Settings",
    "AIPrompts",
    "Locations",
    "Resources",
    "Leads",
  ],
  baseQuery: async (args, api, extraOptions) => {
    const rawBaseQuery = fetchBaseQuery({
      baseUrl: apiConfig.baseUrl,
      credentials: apiConfig.credentials,
      prepareHeaders: (headers, { getState }) => {
        const state = getState();
        const accessToken = state.auth.accessToken;

        if (accessToken) {
          headers.set("authorization", `Bearer ${accessToken}`);
        }
        headers.set("content-type", "application/json");
        return headers;
      },
    });

    let result = await rawBaseQuery(args, api, extraOptions);

    if (result.error && result.error.status === 401) {
      // Try to refresh the token
      const refreshResult = await rawBaseQuery(
        { url: "/auth/refresh", method: "POST", body: {} },
        api,
        extraOptions
      );

      if (refreshResult.data?.accessToken) {
        // Update tokens in Redux state
        api.dispatch(
          updateTokens({
            accessToken: refreshResult.data.accessToken,
            tokenExpiry: refreshResult.data.tokenExpiry || null,
          })
        );

        // Retry the original request with new token
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        // Refresh failed, clear session
        api.dispatch(clearSession());
      }
    }

    return result;
  },
  endpoints: (build) => ({
    // Staff Management
    getStaff: build.query({
      query: (params) => ({
        url: "/catalog/staff",
        params,
      }),
      providesTags: [{ type: "Staff", id: "LIST" }],
    }),

    createStaff: build.mutation({
      query: (body) => ({
        url: "/catalog/staff",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Staff", id: "LIST" }],
    }),

    updateStaff: build.mutation({
      query: ({ id, ...body }) => ({
        url: `/catalog/staff/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: [
        { type: "Staff", id: "LIST" },
        { type: "Staff", id: (arg) => arg.id },
        { type: "StaffSchedule", id: (arg) => arg.id },
      ],
    }),

    deleteStaff: build.mutation({
      query: ({ id }) => ({
        url: `/catalog/staff/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Staff", id: "LIST" },
        { type: "Staff", id: (arg) => arg.id },
        { type: "StaffSchedule", id: (arg) => arg.id },
      ],
    }),

    // Staff Schedule
    getStaffSchedule: build.query({
      query: ({ id, locationId }) => ({
        url: `/catalog/staff/${id}/schedule`,
        params: locationId ? { locationId } : {},
      }),
      providesTags: (_r, _e, arg) => [{ type: "StaffSchedule", id: arg.id }],
    }),
    saveStaffSchedule: build.mutation({
      query: ({ id, locationId, schedule }) => ({
        url: `/catalog/staff/${id}/schedule`,
        method: "PUT",
        body: { locationId, schedule },
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "StaffSchedule", id: arg.id },
        { type: "Staff", id: arg.id },
      ],
    }),

    // Messages
    addMessage: build.mutation({
      query: (body) => ({ url: "/messages", method: "POST", body }),
      invalidatesTags: ["Messages"],
    }),

    listByCustomer: build.mutation({
      query: (body) => ({
        url: "/messages/list-by-customer",
        method: "POST",
        body,
      }),
      providesTags: ["Messages"],
    }),

    companyCustomers: build.mutation({
      query: (body) => ({
        url: "/messages/company-customers",
        method: "POST",
        body,
      }),
      providesTags: ["Messages"],
    }),

    markRead: build.mutation({
      query: (body) => ({ url: "/messages/mark-read", method: "POST", body }),
      invalidatesTags: ["Messages"],
    }),

    updateMessage: build.mutation({
      query: (body) => ({ url: "/messages/update", method: "PUT", body }),
      invalidatesTags: ["Messages"],
    }),

    deleteMessage: build.mutation({
      query: (body) => ({ url: "/messages/delete", method: "DELETE", body }),
      invalidatesTags: ["Messages"],
    }),

    // Appointments
    listAppointments: build.query({
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

    updateAppointment: build.mutation({
      query: ({ id, ...body }) => ({
        url: `/appointments/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (r, e, arg) => [
        { type: "Appointments", id: arg.id },
        { type: "Appointments", id: "LIST" },
      ],
    }),

    deleteAppointment: build.mutation({
      query: ({ id, reason, notes }) => ({
        url: `/appointments/${id}`,
        method: "DELETE",
        body: { reason, notes }
      }),
      invalidatesTags: (r, e, arg) => [
        { type: "Appointments", id: arg.id },
        { type: "Appointments", id: "LIST" },
      ],
    }),

    // Company
    getCompany: build.query({
      query: () => ({ url: "/company" }),
      providesTags: ["Company"],
    }),

    updateCompany: build.mutation({
      query: (body) => ({ url: "/company", method: "PUT", body }),
      invalidatesTags: ["Company"],
    }),

    // Settings
    getSettings: build.query({
      query: () => ({ url: "/settings" }),
      providesTags: ["Settings"],
    }),

    updateSettings: build.mutation({
      query: (body) => ({ url: "/settings", method: "PUT", body }),
      invalidatesTags: ["Settings"],
    }),

    // AI Prompts
    getAIPrompts: build.query({
      query: () => ({ url: "/ai-prompts" }),
      providesTags: ["AIPrompts"],
    }),

    createAIPrompt: build.mutation({
      query: (body) => ({ url: "/ai-prompts", method: "POST", body }),
      invalidatesTags: ["AIPrompts"],
    }),

    updateAIPrompt: build.mutation({
      query: ({ id, ...body }) => ({
        url: `/ai-prompts/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["AIPrompts"],
    }),

    deleteAIPrompt: build.mutation({
      query: ({ id }) => ({ url: `/ai-prompts/${id}`, method: "DELETE" }),
      invalidatesTags: ["AIPrompts"],
    }),

    // Leads
    createLead: build.mutation({
      query: (body) => ({ url: "/leads", method: "POST", body }),
      invalidatesTags: ["Leads"],
    }),

    getLeads: build.query({
      query: (params) => ({ url: "/leads", params }),
      providesTags: ["Leads"],
    }),

    getLeadById: build.query({
      query: ({ id }) => ({ url: `/leads/${id}` }),
      providesTags: (_r, _e, arg) => [{ type: "Leads", id: arg.id }],
    }),

    updateLead: build.mutation({
      query: ({ id, ...body }) => ({
        url: `/leads/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        "Leads",
        { type: "Leads", id: arg.id },
      ],
    }),

    convertLeadToCustomer: build.mutation({
      query: ({ id, customerId }) => ({
        url: `/leads/${id}/convert`,
        method: "POST",
        body: { customerId },
      }),
      invalidatesTags: ["Leads", "Customers"],
    }),

    updateLeadMessageTracking: build.mutation({
      query: ({ id }) => ({
        url: `/leads/${id}/message-tracking`,
        method: "POST",
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: "Leads", id: arg.id }],
    }),

    toggleLeadBotSuspension: build.mutation({
      query: ({ id, suspend, suspendUntil }) => ({
        url: `/leads/${id}/bot-suspension`,
        method: "POST",
        body: { suspend, suspendUntil },
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: "Leads", id: arg.id }],
    }),

    deleteLead: build.mutation({
      query: ({ id }) => ({ url: `/leads/${id}`, method: "DELETE" }),
      invalidatesTags: ["Leads"],
    }),

    getLeadStatistics: build.query({
      query: (params) => ({ url: "/leads/statistics", params }),
      providesTags: ["Leads"],
    }),

    // Conversations (Unified Leads + Customers)
    getUnifiedConversations: build.mutation({
      query: (body) => ({
        url: "/conversations/list",
        method: "POST",
        body,
      }),
      providesTags: ["Messages", "Leads"],
    }),

    getConversationMessages: build.mutation({
      query: (body) => ({
        url: "/conversations/messages",
        method: "POST",
        body,
      }),
      providesTags: ["Messages"],
    }),

    toggleBotSuspended: build.mutation({
      query: (body) => ({
        url: "/conversations/toggle-bot-suspended",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Messages", "Leads", "Customers"],
    }),

    markConversationRead: build.mutation({
      query: (body) => ({
        url: "/conversations/mark-read",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Messages"],
    }),
  }),
});

// Export all the hooks
export const {
  // Staff
  useGetStaffQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
  useGetStaffScheduleQuery,
  useSaveStaffScheduleMutation,

  // Messages
  useAddMessageMutation,
  useListByCustomerMutation,
  useCompanyCustomersMutation,
  useMarkReadMutation,
  useUpdateMessageMutation,
  useDeleteMessageMutation,

  // Appointments
  useListAppointmentsQuery,
  useCreateAppointmentMutation,
  useUpdateAppointmentMutation,
  useDeleteAppointmentMutation,

  // Company
  useGetCompanyQuery,
  useUpdateCompanyMutation,

  // Settings
  useGetSettingsQuery,
  useUpdateSettingsMutation,

  // AI Prompts
  useGetAIPromptsQuery,
  useCreateAIPromptMutation,
  useUpdateAIPromptMutation,
  useDeleteAIPromptMutation,

  // Leads
  useCreateLeadMutation,
  useGetLeadsQuery,
  useGetLeadByIdQuery,
  useUpdateLeadMutation,
  useConvertLeadToCustomerMutation,
  useUpdateLeadMessageTrackingMutation,
  useToggleLeadBotSuspensionMutation,
  useDeleteLeadMutation,
  useGetLeadStatisticsQuery,

  // Conversations (Unified)
  useGetUnifiedConversationsMutation,
  useGetConversationMessagesMutation,
  useToggleBotSuspendedMutation,
  useMarkConversationReadMutation,
} = baseApi;
