import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import socket from "../socket";
import { addMessage, setMessages } from "../redux/features/messageSlice";
import axiosInstance from "../utils/axiosInstance";

const ChatBox = () => {
  const dispatch = useDispatch();
  const messages = useSelector((state) => state.messages);
  const currentUser = useSelector((state) => state.user.user);
  const selectedUser = useSelector((state) => state.chat.selectedUser);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentUser?._id || !selectedUser?._id) return;

      try {
        const response = await axiosInstance.get(
          `/${currentUser._id}/${selectedUser._id}`
        );
        dispatch(setMessages(response.data));
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    };

    fetchMessages();
  }, [currentUser, selectedUser, dispatch]);

  useEffect(() => {
    if (!currentUser?._id) return;

    socket.emit("join", currentUser._id);

    const handleReceiveMessage = (msg) => {
      if (
        (msg.sender === selectedUser?._id &&
          msg.receiver === currentUser._id) ||
        (msg.sender === currentUser._id && msg.receiver === selectedUser?._id)
      ) {
        dispatch(addMessage(msg));
      }
    };

    socket.on("receiveMessage", handleReceiveMessage);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
    };
  }, [currentUser?._id, selectedUser?._id, dispatch]);

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain p-4 flex flex-col gap-4 text-white bg-[#0D0D0D] min-h-0">
      {messages.map((msg, idx) => {
        const isMe = msg.sender === currentUser?._id;

        return (
          <div
            key={idx}
            className={`max-w-md ${
              isMe ? "self-end text-right" : "self-start text-left"
            }`}
          >
            <p className="text-sm text-gray-400 mb-1">
              {isMe ? "You" : msg.senderName || "Other"} •{" "}
              {msg.time && !isNaN(Date.parse(msg.time))
                ? new Date(msg.time).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Just now"}
            </p>
            <div
              className={`px-4 py-2 rounded-lg inline-block ${
                isMe ? "bg-blue-600 text-white" : "bg-[#1E1E1E] text-white"
              }`}
            >
              {msg.text}
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatBox;
