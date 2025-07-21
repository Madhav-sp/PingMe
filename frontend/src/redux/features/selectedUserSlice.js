import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedUser: null,
};

const selectedUserSlice = createSlice({
  name: "selectedUser",
  initialState,
  reducers: {
    setSelectedUser: (state, action) => {
      state.selectedUser = action.payload;
    },
    clearSelectedUser: (state) => {
      state.selectedUser = null;
    },
  },
});

export const { setSelectedUser, clearSelectedUser } = selectedUserSlice.actions;
export default selectedUserSlice.reducer;
