import { useState, useEffect } from "react";
import socket from "../socket";
import { useSelector } from "react-redux";
import axiosInstance from "../utils/axiosInstance";

const MessageInput = () => {
  const [message, setMessage] = useState("");
  const user = useSelector((state) => state.user.user);
  const selectedUser = useSelector((state) => state.chat.selectedUser);

  useEffect(() => {
    if (user?._id) {
      socket.emit("join", user._id); // Join user's own room
    }
  }, [user]);

  const sendMessage = async () => {
    if (!message.trim() || !user || !selectedUser) return;

    const data = {
      sender: user._id,
      receiver: selectedUser._id,
      senderName: user.name || "You",
      text: message,
      time: new Date().toISOString(),
    };

    socket.emit("sendMessage", data);

    try {
      await axiosInstance.post("/message", data);
    } catch (error) {
      console.error("Failed to save message:", error.message);
    }

    setMessage("");
  };

  return (
    <div className="flex items-center px-4 py-3 border-t border-[#1E1E1E] bg-[#111] flex-shrink-0 sticky bottom-0">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        className="flex-1 bg-[#1E1E1E] px-4 py-2 rounded-full text-white placeholder-gray-400 outline-none border border-[#333] focus:border-blue-500"
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        autoComplete="off"
        autoCapitalize="sentences"
        autoCorrect="on"
        spellCheck="true"
      />
      <button
        className="ml-3 bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-colors duration-200 flex-shrink-0"
        onClick={sendMessage}
      >
        Send
      </button>
    </div>
  );
};

export default MessageInput;
