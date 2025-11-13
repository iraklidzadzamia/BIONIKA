import { env } from "@/config/env";

export const apiConfig = {
  baseUrl: env.apiBaseUrl,
  // ensure absolute base for direct fetches when bypassing Next rewrites
  absoluteBase: env.apiBaseUrl.startsWith("http")
    ? env.apiBaseUrl
    : `${env.backendOrigin}${env.apiBaseUrl.startsWith("/") ? "" : "/"}${
        env.apiBaseUrl
      }`,
  credentials: "include",
  defaultHeaders: { "content-type": "application/json" },
};

export default apiConfig;
