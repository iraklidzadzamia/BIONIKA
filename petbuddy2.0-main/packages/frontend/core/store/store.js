import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "@/core/api/baseApi";
import authReducer from "./slices/authSlice";
import uiReducer from "./slices/uiSlice";

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
