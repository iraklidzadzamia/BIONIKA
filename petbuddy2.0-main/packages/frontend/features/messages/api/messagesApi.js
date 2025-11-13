import { baseApi } from "@/core/api/baseApi";

/**
 * Messages API - RTK Query endpoints for messaging features
 * Extends the base API with message-specific endpoints
 */
export const messagesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Get unified conversations (leads + customers)
    getUnifiedConversations: build.mutation({
      query: (body) => ({
        url: "/conversations/list",
        method: "POST",
        body,
      }),
      providesTags: ["Messages", "Leads", "Customers"],
    }),

    // Get messages for a specific conversation
    getConversationMessages: build.mutation({
      query: (body) => ({
        url: "/conversations/messages",
        method: "POST",
        body,
      }),
      providesTags: ["Messages"],
    }),

    // Send a message
    addMessage: build.mutation({
      query: (body) => ({
        url: "/messages",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Messages"],
    }),

    // Mark conversation as read
    markConversationRead: build.mutation({
      query: (body) => ({
        url: "/conversations/mark-read",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Messages"],
    }),

    // Toggle bot suspended status for a conversation
    toggleBotSuspended: build.mutation({
      query: (body) => ({
        url: "/conversations/toggle-bot-suspended",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Messages", "Leads", "Customers"],
    }),

    // Convert lead to customer
    convertLeadToCustomer: build.mutation({
      query: (body) => ({
        url: "/leads/convert-to-customer",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Leads", "Customers", "Messages"],
    }),
  }),
});

// Export hooks for use in components
export const {
  useGetUnifiedConversationsMutation,
  useGetConversationMessagesMutation,
  useAddMessageMutation,
  useMarkConversationReadMutation,
  useToggleBotSuspendedMutation,
  useConvertLeadToCustomerMutation,
} = messagesApi;
