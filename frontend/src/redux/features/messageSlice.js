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
      const newMessage = action.payload;

      // ✅ Prevent duplicate messages
      const isDuplicate = state.some((existingMsg) => {
        // Check by unique ID if available
        if (existingMsg._id && newMessage._id) {
          return existingMsg._id === newMessage._id;
        }

        // Fallback: Check by content and timestamp
        return (
          existingMsg.text === newMessage.text &&
          existingMsg.sender === newMessage.sender &&
          existingMsg.receiver === newMessage.receiver &&
          existingMsg.time === newMessage.time
        );
      });

      if (!isDuplicate) {
        state.push(action.payload); // add a new message only if not duplicate
      }
    },
    clearMessages: () => {
      return []; // optional: clear chat when switching
    },
  },
});

export const { setMessages, addMessage, clearMessages } = messagesSlice.actions;
export default messagesSlice.reducer;
