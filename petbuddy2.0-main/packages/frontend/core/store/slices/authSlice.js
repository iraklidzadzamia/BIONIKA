import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  accessToken: null,
  tokenExpiry: null,
  company: {
    _id: null,
    name: null,
    email: null,
    phone: null,
    website: null,
    timezone: null,
    mainCurrency: null,
    businessTypes: [],
    settings: {},
    locations: [], // deprecated in UI; use locationsApi instead
    services: [],
    workHours: [],
    holidays: [],
    logo: null,
    isLoaded: false,
  },
  isInitialized: false,
  isLoading: false,
  error: null,
  selectedLocationId: null,
};

const slice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setInitialized(state) {
      state.isInitialized = true;
    },
    setLoading(state, action) {
      state.isLoading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearError(state) {
      state.error = null;
    },
    setSession(state, action) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.tokenExpiry = action.payload.tokenExpiry;
      // Set company data if available in user object
      state.company = action.payload.user?.company || null;
      // Also set company data from the company field if available
      if (action.payload.company) {
        state.company = action.payload.company;
      }
      state.error = null;
      state.isLoading = false;
    },
    setSelectedLocation(state, action) {
      state.selectedLocationId = action.payload || null;
      try {
        if (state.selectedLocationId) {
          localStorage.setItem(
            "pb_selected_location",
            state.selectedLocationId
          );
        } else {
          localStorage.removeItem("pb_selected_location");
        }
      } catch {}
    },
    updateTokens(state, action) {
      state.accessToken = action.payload.accessToken;
      state.tokenExpiry = action.payload.tokenExpiry;
      state.error = null;
    },
    clearSession(state) {
      state.user = null;
      state.accessToken = null;
      state.tokenExpiry = null;
      // Reset company to skeleton
      state.company = {
        _id: null,
        name: null,
        email: null,
        phone: null,
        website: null,
        timezone: null,
        mainCurrency: null,
        businessTypes: [],
        settings: {},
        locations: [],
        services: [],
        workHours: [],
        holidays: [],
        logo: null,
        isLoaded: false,
      };
      state.error = null;
      state.isLoading = false;
    },
    setCompany(state, action) {
      state.company = {
        ...state.company,
        ...action.payload,
        isLoaded: true,
      };
    },
    updateCompany(state, action) {
      if (state.company) {
        state.company = { ...state.company, ...action.payload };
      }
    },
    resetCompany(state) {
      state.company = {
        _id: null,
        name: null,
        email: null,
        phone: null,
        website: null,
        timezone: null,
        mainCurrency: null,
        businessTypes: [],
        settings: {},
        locations: [],
        services: [],
        workHours: [],
        holidays: [],
        logo: null,
        isLoaded: false,
      };
    },
  },
});

export const {
  setInitialized,
  setLoading,
  setError,
  clearError,
  setSession,
  updateTokens,
  clearSession,
  setCompany,
  updateCompany,
  resetCompany,
  setSelectedLocation,
} = slice.actions;

export default slice.reducer;
