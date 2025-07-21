// redux/messagesSlice.js
import { createSlice } from "@reduxjs/toolkit";

const messagesSlice = createSlice({
  name: "messages",
  initialState: [],
  reducers: {
    setMessages: (state, action) => {
      return action.payload; // set all messages
    },
    addMessage: (state, action) => {
      state.push(action.payload); // add a new message
    },
    clearMessages: () => {
      return []; // optional: clear chat when switching
    },
  },
});

export const { setMessages, addMessage, clearMessages } = messagesSlice.actions;
export default messagesSlice.reducer;
