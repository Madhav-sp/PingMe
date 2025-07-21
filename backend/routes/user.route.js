import express from "express";
import { getUser, loginUser } from "../controllers/user.controller.js";
const userRouter=express.Router();

userRouter.post("/user/login", loginUser);
userRouter.get("/get-users",getUser);

export default userRouter;