import { baseApi } from "./baseApi";
import {
  setSession,
  updateTokens,
  clearSession,
  setCompany,
} from "@/core/store/slices/authSlice";

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;

          // Update Redux state
          dispatch(
            setSession({
              user: data.user,
              accessToken: data.accessToken,
              tokenExpiry: data.tokenExpiry,
            })
          );

          // If company data is available in the response, store it
          if (data.company) {
            dispatch(setCompany(data.company));
          }
        } catch (error) {
          // Login failed, error handled by caller
        }
      },
    }),
    registerCompany: build.mutation({
      query: (body) => ({
        url: "/auth/register-manager",
        method: "POST",
        body,
      }),
    }),
    logout: build.mutation({
      query: () => ({ url: "/auth/logout", method: "POST", body: {} }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch (error) {
          // Even if the API call fails, we should still logout locally
        } finally {
          // Always clear client session state
          dispatch(clearSession());
        }
      },
    }),
    refreshToken: build.mutation({
      query: () => ({ url: "/auth/refresh", method: "POST", body: {} }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;

          // Update Redux state
          dispatch(
            updateTokens({
              accessToken: data.accessToken,
              tokenExpiry: data.tokenExpiry,
            })
          );
        } catch (error) {
          // If refresh fails, clear session
          dispatch(clearSession());
        }
      },
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterCompanyMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
} = authApi;
