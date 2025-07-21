import { signInWithPopup } from "firebase/auth";
import React from "react";
import { FcGoogle } from "react-icons/fc";
import { auth, provider } from "../../firebase";
import { axiosinstance } from "../../utils/axiosInstance";
import { useDispatch } from "react-redux";
import { setUser } from "../../redux/features/userSlice";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const dispatch=useDispatch();
  const navigate=useNavigate();
  const handleGoogleSignIn =async () => {
    try {
        const result= await signInWithPopup(auth,provider);
        console.log( result.user);
        const user = result.user;
        const userData = {
          displayName: user.displayName,
          email: user.email,
          emailVerified: user.emailVerified,
          photoURL: user.photoURL,
          Uid: user.uid,
        };
        const newuser = await axiosinstance.post("/user/login", userData);
        dispatch(setUser(newuser.data.user));
        console.log(newuser.data.user);
        navigate("/");
                
    } catch (error) {
        console.error("Google sign-in error:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white px-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-5xl font-bold mb-6">
          👋 Hello , Welcome to <span className="text-purple-400">PingMe</span>
        </h1>
        <p className="mb-8 text-gray-300 text-lg">
          Start chatting seamlessly with your favorite people.
        </p>

        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-white text-black rounded-lg hover:shadow-lg transition duration-200 cursor-pointer"
        >
          <FcGoogle className="text-2xl" />
          <span className="font-semibold">Sign in with Google</span>
        </button>
      </div>
    </div>
  );
};

export default Login;
