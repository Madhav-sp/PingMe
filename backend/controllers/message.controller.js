import express from "express";
import Message from "../models/message.model.js"; 

export const sendMessage = async (req, res) => {
  try {
    const { sender, receiver, text } = req.body;

    if (!sender || !receiver || !text) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const newMessage = new Message({ sender, receiver, text });
    await newMessage.save();

    // io.emit("receive_message", newMessage); 
    res.status(201).json(newMessage); 
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages=async (req,res)=>{
    try {
        const{ user1,user2}= req.params;
        const messages = await Message.find({
          $or: [
            { sender: user1, receiver: user2 },
            { sender: user2, receiver: user1 },
          ],
        }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (error) {
        res.json(error);
    }
}
