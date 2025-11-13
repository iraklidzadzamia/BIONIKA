import { baseApi } from "./baseApi";

export const aiPromptsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Get default prompts (no auth required)
    getDefaultPrompts: build.query({
      query: () => ({ url: "/ai-prompts/defaults" }),
    }),

    // Get prompts by category
    getPromptsByCategory: build.query({
      query: (category) => ({ url: `/ai-prompts/categories/${category}` }),
    }),

    // Search prompts
    searchPrompts: build.query({
      query: (params) => ({
        url: "/ai-prompts/search",
        params,
      }),
    }),

    // Get prompt preview
    getPromptPreview: build.query({
      query: (id) => ({ url: `/ai-prompts/${id}/preview` }),
    }),

    // Get all prompts with filtering and pagination
    getPrompts: build.query({
      query: (params) => ({
        url: "/ai-prompts",
        params,
      }),
    }),

    // Increment usage count
    incrementUsage: build.mutation({
      query: (id) => ({
        url: `/ai-prompts/${id}/usage`,
        method: "POST",
      }),
    }),
  }),
});

export const {
  useGetDefaultPromptsQuery,
  useGetPromptsByCategoryQuery,
  useSearchPromptsQuery,
  useGetPromptPreviewQuery,
  useGetPromptsQuery,
  useIncrementUsageMutation,
} = aiPromptsApi;
