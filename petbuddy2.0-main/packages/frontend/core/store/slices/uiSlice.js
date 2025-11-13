import { createSlice } from "@reduxjs/toolkit";

const slice = createSlice({
  name: "ui",
  initialState: { modals: [] },
  reducers: {
    openModal(state, action) {
      state.modals.push({
        id: action.payload.id,
        props: action.payload.props || {},
        ui: action.payload.ui || {},
      });
    },
    closeModal(state, action) {
      const id = action.payload.id;
      state.modals = state.modals.filter((m) => m.id !== id);
    },
    resetModals(state) {
      state.modals = [];
    },
  },
});

export const { openModal, closeModal, resetModals } = slice.actions;
export default slice.reducer;
