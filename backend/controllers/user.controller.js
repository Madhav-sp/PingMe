import express from "express";
import  { User } from "../models/user.model.js";

export const loginUser = async (req, res) => {
  try {
    const { displayName, email, emailVerified, photoURL, Uid } = req.body;

    if (!displayName || !email || !emailVerified || !photoURL || !Uid) {
      return res.status(400).json({ message: "All fields are required" });
    }

    let user = await User.findOne({ Uid });

    if (!user) {
      user = await User.create({
        displayName,
        email,
        emailVerified,
        photoURL,
        Uid,
      });

      return res.status(201).json({
        message: "User created successfully",
        user,
      });
    }

    res.status(200).json({
      message: "User already exists",
      user,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getUser=async(req,res)=>{
  try {
    const allUser= await User.find({});
    res.json(allUser)
  } catch (error) {
    res.json(error)
  }
}