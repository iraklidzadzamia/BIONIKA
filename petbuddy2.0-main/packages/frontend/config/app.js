import { env } from "@/config/env";

export const appConfig = {
  name: env.appName,
  version: env.appVersion,
  links: {
    privacy: "/privacy-policy",
    terms: "/terms-of-use",
  },
};

export default appConfig;
