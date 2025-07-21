import React from "react";

const ChatArea = () => {
  return (
    <div className="w-3/4 h-full bg-white text-black flex items-center justify-center">
      <h1 className="text-2xl font-semibold text-gray-600">
        👋 Welcome to <span className="text-purple-500">PingMe</span>! <br />
        Select a chat to start messaging.
      </h1>
    </div>
  );
};

export default ChatArea;
