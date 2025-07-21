// src/pages/Home.jsx
import React, { useState } from "react";
import ChatHeader from "./ChatHeader";
import ChatBox from "./ChatBox";
import MessageInput from "./MessageInput";
import Sidebar from "../componenets/Sidebar";
import { useSelector } from "react-redux";
import { IoChevronForward } from "react-icons/io5";

const Home = () => {
  const selectedUser = useSelector((state) => state.chat.selectedUser);
  const [showSidebar, setShowSidebar] = useState(false);

  return (
    <div className="h-dvh w-screen flex overflow-hidden bg-[#0D0D0D] supports-[height:100dvh]:h-dvh">
      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`w-64 h-full flex-shrink-0 z-50 transform transition-transform duration-300 ease-in-out
          md:transform-none md:translate-x-0 md:static
          ${
            showSidebar
              ? "translate-x-0 fixed"
              : "-translate-x-full fixed md:relative"
          }
        `}
      >
        <Sidebar onClose={() => setShowSidebar(false)} />
      </div>

      {/* Left Arrow Button on Mobile */}
      {!showSidebar && (
        <button
          className="absolute left-2 top-1/2 transform -translate-y-1/2 z-30 md:hidden bg-[#1E1E1E] hover:bg-[#333] text-white p-2 rounded-r-md shadow-lg"
          onClick={() => setShowSidebar(true)}
        >
          <IoChevronForward size={20} />
        </button>
      )}

      {/* Chat Section - Takes full remaining width */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {selectedUser ? (
          <>
            <ChatHeader />
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <ChatBox />
              <MessageInput />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white text-xl">
            Choose someone and start talking 🗣️
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
