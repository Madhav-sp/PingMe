// src/components/Sidebar.jsx

import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { setUser } from "../redux/features/userSlice";
import { useNavigate } from "react-router-dom";
import axiosinstance from "../utils/axiosInstance";
import { setSelectedUser } from "../redux/features/selectedUserSlice";
import { IoClose } from "react-icons/io5";

const Sidebar = ({ onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const handleProfile=()=>{
    navigate("/profile")
  }

  const user = useSelector((state) => state.user.user);
  const [Users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const getUsers = async () => {
      try {
        const res = await axiosinstance.get("/get-users");
        setUsers(res.data);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };
    getUsers();
  }, []);

  const handleUserSelect = (u) => {
    dispatch(setSelectedUser(u));
    if (onClose) onClose();
  };

  const handleLogout = () => {
    signOut(auth);
    dispatch(setUser(null));
    navigate("/login");
  };

  // Filter users based on search term
  const filteredUsers = Users.filter(
    (u) =>
      u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full w-full flex flex-col text-white bg-[#0D0D0D] border-r border-[#1E1E1E]">
      {/* Top Section */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Close button for mobile */}
        <div className="flex justify-between items-center md:hidden mb-4">
          <h1 className="text-2xl font-bold">
            Ping<span className="text-blue-500">Me</span>
          </h1>
          <button onClick={onClose}>
            <IoClose size={24} className="text-white" />
          </button>
        </div>

        {/* Logo for desktop */}
        <h1 className="text-2xl font-bold text-white mb-4 hidden md:block">
          Ping<span className="text-blue-500">Me</span>
        </h1>

        {/* Search input */}
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full mb-4 px-4 py-2 rounded bg-[#1E1E1E] text-white placeholder-gray-400 border border-[#333] focus:border-blue-500 focus:outline-none"
        />

        {/* Users List */}
        <div className="overflow-y-auto flex-1 space-y-2 pr-1">
          {filteredUsers.map((u, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#1E1E1E] cursor-pointer transition-colors duration-200"
              onClick={() => handleUserSelect(u)}
            >
              <div className="relative">
                <img
                  src={u.photoURL}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover"
                />
                {/* <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0D0D0D]"></div> */}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{u.displayName}</p>
                <p className="text-sm text-gray-400 truncate">
                  @{u.displayName} 
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom User Info & Logout */}
      <div className="p-4 bg-[#111] border-t border-[#1E1E1E]">
        <div className="flex items-center justify-between cursor-pointer" onClick={handleProfile}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img
              src={user?.photoURL}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover border-2 border-blue-500"
            />
            <div className="flex flex-col leading-tight flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {user?.displayName || "User"}
              </p>
              <span className="text-xs text-green-400">Logged in</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-3 py-1.5 text-sm rounded-lg transition duration-200 flex-shrink-0 ml-2 cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
