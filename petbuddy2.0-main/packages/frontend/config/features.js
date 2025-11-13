import { config } from "@/config/env";

export const features = {
  enableNewUI: config.enableNewUI,
  enableAIAssist: config.enableAIAssist,
  isProd: config.isProduction,
};

export default features;
