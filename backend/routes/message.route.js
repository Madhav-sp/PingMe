import express from "express";
import { getMessages, sendMessage } from "../controllers/message.controller.js";
const messagerouter=express.Router();

messagerouter.post("/message" , sendMessage);
messagerouter.get("/:user1/:user2", getMessages);

export default messagerouter;