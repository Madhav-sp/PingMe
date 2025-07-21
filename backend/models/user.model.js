import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    Uid: {
      type: String,
      required: true,
      unique: true,
    },
    displayName: String,
    email: {
      type: String,
      required: true,
    },
    emailVerified: Boolean,
    photoURL: String,
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
