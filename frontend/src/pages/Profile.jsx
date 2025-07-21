import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { signOut, deleteUser } from "firebase/auth";
import { auth } from "../firebase";
import { setUser } from "../redux/features/userSlice";
import { useNavigate } from "react-router-dom";
// import { toast } from "react-toastify";

const Profile = () => {
  const user = useSelector((state) => state.user.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        dispatch(setUser(null));
        // toast.success("Logged out successfully");
        navigate("/login");
      })
      .catch((err) => toast.error("Logout failed"));
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete your account permanently?"
    );
    if (!confirmDelete) return;

    try {
      const currentUser = auth.currentUser;
      await deleteUser(currentUser);
      dispatch(setUser(null));
      toast.success("Account deleted");
      navigate("/signup");
    } catch (err) {
      toast.error(
        "Account deletion failed. Re-authentication may be required."
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-[#1A1A1A] rounded-2xl shadow-lg p-8 border border-[#2A2A2A]">
        <div className="flex flex-col items-center text-center">
          <img
            src={user?.photoURL || "/default-avatar.png"}
            alt="Profile"
            className="w-24 h-24 rounded-full border-4 border-blue-500 object-cover mb-4"
          />
          <h2 className="text-xl font-semibold">
            {user?.displayName || "Unknown User"}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {user?.email || "No email provided"}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleLogout}
            className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-700 transition duration-200 cursor-pointer"
          >
            Logout
          </button>
          <button
            onClick={handleDeleteAccount}
            className="w-full py-2 rounded-md bg-red-600 hover:bg-red-700 transition duration-200 cursor-pointer"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
